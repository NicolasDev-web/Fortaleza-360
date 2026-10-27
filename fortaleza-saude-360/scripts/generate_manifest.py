"""Gera o manifesto público de proveniência das camadas geográficas."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import tempfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

LAYER_CONFIG = {
    "facilities": {
        "source_file": "uaps.geojson",
        "methodology": [
            "Mapeamento de campos oficiais para o contrato facility",
            "Validação de CRS, coordenadas e bounding box municipal",
            "Deduplicação conservadora por source_id",
        ],
        "limitations": [
            "Cadastro não representa horário, capacidade ou disponibilidade",
            "CNES repetido não implica que duas feições sejam a mesma unidade",
        ],
    },
    "neighborhoods": {
        "source_file": "neighborhoods.geojson",
        "methodology": [
            "Normalização de nomes de campos sem alterar geometrias",
            "Validação de topologia e unicidade do código municipal",
        ],
        "limitations": [
            "Referência administrativa de 2019 em catálogo atualizado em 2023",
            "Código rotulado como IBGE não foi adotado como chave oficial",
        ],
    },
    "municipal-boundary": {
        "source_file": "municipal-boundary.geojson",
        "methodology": [
            "Exportação compacta sem simplificação da geometria oficial",
        ],
        "limitations": [
            "Limite de referência 2019; diferenças não são corrigidas automaticamente",
        ],
    },
}


def _utc_now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def _walk_coordinates(value: Any, bounds: list[float]) -> None:
    if (
        isinstance(value, list)
        and len(value) >= 2
        and all(isinstance(coordinate, (int, float)) for coordinate in value[:2])
    ):
        longitude, latitude = value[:2]
        if math.isfinite(longitude) and math.isfinite(latitude):
            bounds[0] = min(bounds[0], longitude)
            bounds[1] = min(bounds[1], latitude)
            bounds[2] = max(bounds[2], longitude)
            bounds[3] = max(bounds[3], latitude)
        return
    if isinstance(value, list):
        for child in value:
            _walk_coordinates(child, bounds)


def _inspect_geojson(path: Path) -> dict[str, Any]:
    content = path.read_bytes()
    collection = json.loads(content.decode("utf-8"))
    if collection.get("type") != "FeatureCollection":
        raise ValueError(f"{path} não é um FeatureCollection")
    features = collection.get("features")
    if not isinstance(features, list) or not features:
        raise ValueError(f"{path} não contém feições")

    bounds = [math.inf, math.inf, -math.inf, -math.inf]
    for feature in features:
        _walk_coordinates((feature.get("geometry") or {}).get("coordinates"), bounds)

    return {
        "bytes": len(content),
        "sha256": hashlib.sha256(content).hexdigest(),
        "feature_count": len(features),
        "geometry_types": sorted(
            {
                (feature.get("geometry") or {}).get("type")
                for feature in features
            }
        ),
        "properties": sorted(
            {
                key
                for feature in features
                for key in (feature.get("properties") or {}).keys()
            }
        ),
        "bbox": bounds,
    }


def generate_manifest(
    raw_dir: Path,
    public_dir: Path,
    *,
    generated_at: str | None = None,
) -> dict[str, Any]:
    layers = []
    for layer_id, config in LAYER_CONFIG.items():
        source_file = str(config["source_file"])
        metadata_path = raw_dir / f"{source_file}.metadata.json"
        public_path = public_dir / f"{layer_id}.geojson"
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        inspection = _inspect_geojson(public_path)

        layers.append(
            {
                "id": layer_id,
                "file": f"/data/{layer_id}.geojson",
                "crs": "EPSG:4326",
                "extent": "Fortaleza, Ceará",
                **inspection,
                "source": {
                    "id": metadata["source_id"],
                    "organization": metadata["organization"],
                    "reference_year": metadata["reference_year"],
                    "page_url": metadata["page_url"],
                    "download_url": metadata["download_url"],
                    "collected_at": metadata["collected_at"],
                    "raw_sha256": metadata["sha256"],
                    "license": metadata["license"],
                    "attribution": metadata["attribution"],
                },
                "methodology": list(config["methodology"]),
                "limitations": list(config["limitations"]),
            }
        )

    return {
        "schema_version": "1.0",
        "generated_at": generated_at or _utc_now(),
        "layers": layers,
    }


def write_manifest(manifest: dict[str, Any], path: Path) -> None:
    content = (
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        dir=path.parent,
        prefix=f".{path.name}.",
    )
    temporary_path = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as file:
            file.write(content)
        temporary_path.replace(path)
    except BaseException:
        temporary_path.unlink(missing_ok=True)
        raise


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw-dir", type=Path, default=Path("data/raw"))
    parser.add_argument("--public-dir", type=Path, default=Path("public/data"))
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    manifest = generate_manifest(args.raw_dir, args.public_dir)
    output_path = args.public_dir / "manifest.json"
    write_manifest(manifest, output_path)
    print(f"Manifesto gerado: {output_path} ({len(manifest['layers'])} camadas)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
