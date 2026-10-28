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

TERMS_URL = "https://mapas.fortaleza.ce.gov.br/dados-abertos/api"
NOTICE = (
    "Camadas oficiais de localização e limites administrativos. Não há "
    "indicadores de capacidade, oferta ou cobertura populacional."
)

LAYER_CONFIG: dict[str, dict[str, Any]] = {
    "facilities": {
        "title": "Unidades de Atenção Primária à Saúde",
        "source_file": "uaps.geojson",
        "catalog_updated_at": "2026-06-08",
        "dictionary": {
            "id": "Identificador estável do projeto: uaps-{source_id}",
            "name": "Nome da unidade (campo de origem `nome`)",
            "type": "Tipo de equipamento; nesta fonte, sempre UAPS",
            "nature": "Natureza como publicada (campo `natureza`)",
            "management": "Código de gestão como publicado (campo `gestão`)",
            "sus": "Atende SUS conforme `atende_sus`; null se ausente",
            "neighborhood": "Bairro declarado na fonte; não é o vínculo espacial",
            "source_id": "Identificador da feição na API Fortaleza em Mapas",
            "reference_date": "Ano de referência declarado (campo `ano`)",
            "cnes": "Código CNES como publicado; não é chave de deduplicação",
        },
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
    "upas": {
        "title": "Unidades de Pronto Atendimento (UPA)",
        "source_file": "upas.geojson",
        "catalog_updated_at": None,
        "catalog_update_note": "A API não informa a data de atualização desta camada",
        "dictionary": {
            "id": "Identificador estável do projeto: {prefixo}-{source_id}",
            "name": "Nome da unidade (campo de origem `name`)",
            "type": "Tipo de equipamento atribuído pela camada de origem",
            "management": "Sempre null: a fonte não publica gestão",
            "nature": "Sempre null: `natureza` na fonte é o código do tipo",
            "sus": "Sempre null: a fonte não publica vínculo SUS",
            "neighborhood": "Bairro declarado na fonte (`nm_bairro`); não é o vínculo "
            "espacial",
            "source_id": "Identificador da feição na API Fortaleza em Mapas",
            "reference_date": "Ano de referência declarado (campo `ano`)",
            "cnes": "Código CNES como publicado (`cnes_n`)",
        },
        "methodology": [
            "MultiPoint de um ponto convertido em Point, sem mover a coordenada",
            "Validação de natureza UPA, bounding box municipal e ano 2026",
        ],
        "limitations": [
            "Cadastro não representa horário, capacidade, lotação ou tempo de espera",
            "UPA atende urgência; não é porta de entrada da atenção primária",
        ],
    },
    "hospitals": {
        "title": "Hospitais municipais",
        "source_file": "hospitals.geojson",
        "catalog_updated_at": None,
        "catalog_update_note": "A API não informa a data de atualização desta camada",
        "dictionary": {
            "id": "Identificador estável do projeto: {prefixo}-{source_id}",
            "name": "Nome da unidade (campo de origem `name`)",
            "type": "Tipo de equipamento atribuído pela camada de origem",
            "management": "Sempre null: a fonte não publica gestão",
            "nature": "Sempre null: `natureza` na fonte é o código do tipo",
            "sus": "Sempre null: a fonte não publica vínculo SUS",
            "neighborhood": "Bairro declarado na fonte (`nm_bairro`); não é o vínculo "
            "espacial",
            "source_id": "Identificador da feição na API Fortaleza em Mapas",
            "reference_date": "Ano de referência declarado (campo `ano`)",
            "cnes": "Código CNES como publicado (`cnes_n`)",
        },
        "methodology": [
            "MultiPoint de um ponto convertido em Point, sem mover a coordenada",
            "Validação de natureza HOSP, bounding box municipal e ano 2026",
        ],
        "limitations": [
            "Somente hospitais da gestão municipal; estaduais, federais e privados "
            "não estão na camada",
            "Cadastro não representa leitos, especialidades, lotação ou "
            "disponibilidade",
        ],
    },
    "neighborhoods": {
        "title": "Bairros de Fortaleza",
        "source_file": "neighborhoods.geojson",
        "catalog_updated_at": "2023-09-22",
        "dictionary": {
            "code": "Código municipal do bairro (campo `Código do  Bairro`)",
            "name": "Nome do bairro (campo `Nome`)",
            "source_id": "Código municipal usado como referência da fonte",
            "reference_date": "Ano de referência administrativa (`ano_ref`)",
        },
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
        "title": "Limite administrativo de Fortaleza",
        "source_file": "municipal-boundary.geojson",
        "catalog_updated_at": "2023-07-25",
        "dictionary": {
            "id": "Identificador da feição na fonte",
            "nome": "Nome do município",
            "ano_criacao": "Ano de criação do município declarado na fonte",
            "regiao": "Região de planejamento declarada na fonte",
            "area_ha": "Área declarada pela fonte, em hectares",
            "area_km2": "Área declarada pela fonte, em km²",
            "cod_ibge": "Código IBGE do município",
            "fonte": "Órgão produtor declarado na fonte",
            "ano_ref": "Ano de referência do limite",
            "epsg_codif": "CRS e codificação do arquivo original, como publicados",
        },
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


POPULATION_DICTIONARY = {
    "code": "Código municipal do bairro (o mesmo de neighborhoods.geojson)",
    "population": "Pessoas no bairro: soma dos setores com a maior parte da área nele",
    "population_low": "Menor valor entre o central e a ponderação por área",
    "population_high": "Maior valor entre o central e a ponderação por área",
    "sectors": "Quantidade de setores censitários contados inteiros no bairro",
}


def _population_entry(public_dir: Path) -> dict[str, Any] | None:
    """Proveniência de neighborhood-population.json (aggregate_population.py)."""
    path = public_dir / "neighborhood-population.json"
    if not path.exists():
        return None
    content = path.read_bytes()
    data = json.loads(content.decode("utf-8"))
    rows = data["neighborhoods"]
    fields = sorted({key for row in rows for key in row})
    undocumented = [name for name in fields if name not in POPULATION_DICTIONARY]
    if undocumented:
        raise ValueError(
            f"população: propriedades sem dicionário: {', '.join(undocumented)}"
        )
    return {
        "file": "/data/neighborhood-population.json",
        "bytes": len(content),
        "sha256": hashlib.sha256(content).hexdigest(),
        "rows": len(rows),
        "reference_year": data["reference_year"],
        "total_population": data["total_population"],
        "method": data["method"],
        "sources": data["sources"],
        "dictionary": {name: POPULATION_DICTIONARY[name] for name in fields},
        "limitations": [
            "Censo 2022: quatro anos antes da lista de postos de 2026, sem projeção",
            "Não é a população atendida por nenhum posto; bairro não é território "
            "de equipe de saúde",
            "Licença do IBGE não confirmada: página de termos indisponível na coleta",
        ],
    }


def _basemap_entry(public_dir: Path) -> dict[str, Any] | None:
    """Proveniência do recorte OSM gerado por scripts/build_basemap.py, se existir."""
    tiles = public_dir.parent / "basemap" / "fortaleza.pmtiles"
    report_path = tiles.with_name(f"{tiles.name}.json")
    if not tiles.exists() or not report_path.exists():
        return None
    report = json.loads(report_path.read_text(encoding="utf-8"))
    content = tiles.read_bytes()
    if hashlib.sha256(content).hexdigest() != report["sha256"]:
        raise ValueError("fortaleza.pmtiles não corresponde ao relatório da extração")
    return {
        "file": "/basemap/fortaleza.pmtiles",
        "bytes": len(content),
        "sha256": report["sha256"],
        "bbox": report["bbox"],
        "max_zoom": report["max_zoom"],
        "tiles": report["tiles"],
        "source": {
            "organization": "OpenStreetMap (dados) e Protomaps (build diário)",
            "download_url": report["source"],
            "tiles_version": report["tiles_version"],
            "collected_at": report["collected_at"],
            "license": report["license"],
            "attribution": "© colaboradores do OpenStreetMap; tiles Protomaps",
            "terms_url": "https://www.openstreetmap.org/copyright",
        },
        "fonts": {
            "family": "Noto Sans Regular (glyphs Protomaps basemaps-assets)",
            "license": "SIL Open Font License 1.1",
            "license_file": "/basemap/fonts/OFL.txt",
        },
        "limitations": [
            "Referência visual de ruas; não entra em cálculos nem em tempos "
            "de trajeto",
            "Recorte de Fortaleza com margem de ~3 km; fora dele o mapa fica vazio",
            "Dados colaborativos do OSM podem estar incompletos ou desatualizados",
        ],
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
        dictionary = dict(config["dictionary"])
        undocumented = [
            name for name in inspection["properties"] if name not in dictionary
        ]
        if undocumented:
            raise ValueError(
                f"{layer_id}: propriedades sem dicionário: {', '.join(undocumented)}"
            )

        layers.append(
            {
                "id": layer_id,
                "title": config["title"],
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
                    "catalog_updated_at": config["catalog_updated_at"],
                    **(
                        {"catalog_update_note": config["catalog_update_note"]}
                        if config.get("catalog_update_note")
                        else {}
                    ),
                    "collected_at": metadata["collected_at"],
                    "raw_sha256": metadata["sha256"],
                    "license": metadata["license"],
                    "terms_url": TERMS_URL,
                    "attribution": metadata["attribution"],
                },
                "dictionary": {
                    name: dictionary[name] for name in inspection["properties"]
                },
                "methodology": list(config["methodology"]),
                "limitations": list(config["limitations"]),
            }
        )

    manifest: dict[str, Any] = {
        "schema_version": "1.2",
        "mode": "official",
        "notice": NOTICE,
        "generated_at": generated_at or _utc_now(),
        "layers": layers,
    }
    population = _population_entry(public_dir)
    if population:
        manifest["population"] = population
    basemap = _basemap_entry(public_dir)
    if basemap:
        manifest["basemap"] = basemap
    return manifest


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
