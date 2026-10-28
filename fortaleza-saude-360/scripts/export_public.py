"""Gera GeoJSON públicos compactos a partir das camadas aprovadas."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
from dataclasses import asdict, dataclass
from pathlib import Path

import geopandas as gpd

try:
    from scripts.fetch_data import SOURCES
    from scripts.transform_boundaries import load_neighborhoods
    from scripts.transform_facilities import (
        deduplicate_facilities,
        load_facilities,
    )
    from scripts.validate_geodata import load_bounds, validate_points
    from scripts.validate_period import validate_period
except ModuleNotFoundError:  # Execução direta em scripts/
    from fetch_data import SOURCES
    from transform_boundaries import load_neighborhoods
    from transform_facilities import deduplicate_facilities, load_facilities
    from validate_geodata import load_bounds, validate_points
    from validate_period import validate_period


@dataclass(frozen=True)
class ExportResult:
    path: Path
    feature_count: int
    bytes: int
    sha256: str
    properties: tuple[str, ...]


def _atomic_bytes(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        dir=path.parent,
        prefix=f".{path.name}.",
    )
    temporary_path = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "wb") as file:
            file.write(content)
        temporary_path.replace(path)
    except BaseException:
        temporary_path.unlink(missing_ok=True)
        raise


def export_geojson(data: gpd.GeoDataFrame, path: Path) -> ExportResult:
    if data.crs is None or data.crs.to_epsg() != 4326:
        raise ValueError("A exportação pública exige CRS EPSG:4326")
    if data.geometry.isna().any() or data.geometry.is_empty.any():
        raise ValueError("A exportação pública não aceita geometrias vazias")
    if not data.geometry.is_valid.all():
        raise ValueError("A exportação pública não aceita geometrias inválidas")

    expected_properties = tuple(
        str(column) for column in data.columns if column != data.geometry.name
    )
    collection = {
        "type": "FeatureCollection",
        "features": list(data.iterfeatures(drop_id=True)),
    }
    content = json.dumps(
        collection,
        ensure_ascii=False,
        separators=(",", ":"),
    ).encode("utf-8")
    _atomic_bytes(path, content)

    exported = json.loads(path.read_text(encoding="utf-8"))
    if exported.get("type") != "FeatureCollection":
        raise ValueError("O arquivo exportado não é um FeatureCollection")
    if len(exported.get("features", [])) != len(data):
        raise ValueError("A contagem mudou durante a exportação")
    for feature in exported["features"]:
        if tuple(feature["properties"].keys()) != expected_properties:
            raise ValueError("Atributos foram alterados durante a exportação")

    return ExportResult(
        path=path,
        feature_count=len(data),
        bytes=len(content),
        sha256=hashlib.sha256(content).hexdigest(),
        properties=expected_properties,
    )


def _load_municipal_boundary(path: Path) -> gpd.GeoDataFrame:
    with path.open(encoding="utf-8") as file:
        collection = json.load(file)
    if collection.get("type") != "FeatureCollection":
        raise ValueError("O limite municipal deve ser um FeatureCollection")
    return gpd.GeoDataFrame.from_features(
        collection.get("features", []),
        crs="EPSG:4326",
    )


def export_public_data(raw_dir: Path, output_dir: Path) -> list[ExportResult]:
    facilities, _ = load_facilities(raw_dir / "uaps.geojson")
    facilities, _ = deduplicate_facilities(facilities)
    bounds = load_bounds(raw_dir / "municipal-boundary.geojson")
    validate_points(facilities, bounds=bounds)
    validate_period(
        facilities,
        "reference_date",
        SOURCES["uaps"].reference_year,
        layer="UAPS",
    )

    neighborhoods, _ = load_neighborhoods(raw_dir / "neighborhoods.geojson")
    validate_period(
        neighborhoods,
        "reference_date",
        SOURCES["neighborhoods"].reference_year,
        layer="bairros",
    )
    municipal_boundary = _load_municipal_boundary(
        raw_dir / "municipal-boundary.geojson"
    )
    validate_period(
        municipal_boundary,
        "ano_ref",
        SOURCES["municipal-boundary"].reference_year,
        layer="limite municipal",
    )

    return [
        export_geojson(facilities, output_dir / "facilities.geojson"),
        export_geojson(neighborhoods, output_dir / "neighborhoods.geojson"),
        export_geojson(
            municipal_boundary,
            output_dir / "municipal-boundary.geojson",
        ),
    ]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw-dir", type=Path, default=Path("data/raw"))
    parser.add_argument("--output-dir", type=Path, default=Path("public/data"))
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    results = export_public_data(args.raw_dir, args.output_dir)
    print(
        json.dumps(
            [asdict(result) for result in results],
            ensure_ascii=True,
            indent=2,
            default=str,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
