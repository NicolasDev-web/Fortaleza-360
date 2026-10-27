"""Importa bairros oficiais e valida códigos e topologia sem reparo automático."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import geopandas as gpd
from shapely.geometry import shape
from shapely.validation import explain_validity

REQUIRED_PROPERTIES = {"id", "Nome", "Código do  Bairro", "ano_ref"}


@dataclass(frozen=True)
class BoundaryIssue:
    source_id: str
    reasons: tuple[str, ...]


@dataclass(frozen=True)
class BoundaryImportReport:
    input_count: int
    output_count: int
    valid_count: int
    rejected_count: int
    codes_unique: bool
    geometry_types: tuple[str, ...]
    issues: tuple[BoundaryIssue, ...]


class BoundaryValidationError(ValueError):
    def __init__(self, report: BoundaryImportReport) -> None:
        self.report = report
        super().__init__(f"{report.rejected_count} bairros rejeitados")


def _text(value: Any) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip()
    return normalized or None


def load_neighborhoods(
    path: Path,
) -> tuple[gpd.GeoDataFrame, BoundaryImportReport]:
    with path.open(encoding="utf-8") as file:
        collection = json.load(file)

    if collection.get("type") != "FeatureCollection":
        raise ValueError("A fonte de bairros deve ser um FeatureCollection")
    features = collection.get("features")
    if not isinstance(features, list):
        raise ValueError("A fonte de bairros não contém uma lista de feições")

    all_properties = {
        key
        for feature in features
        for key in (feature.get("properties") or {}).keys()
    }
    missing_properties = REQUIRED_PROPERTIES.difference(all_properties)
    if missing_properties:
        missing = ", ".join(sorted(missing_properties))
        raise ValueError(f"Campos obrigatórios ausentes nos bairros: {missing}")

    codes = [
        _text((feature.get("properties") or {}).get("Código do  Bairro"))
        for feature in features
    ]
    code_counts = Counter(code for code in codes if code)
    rows: list[dict[str, Any]] = []
    geometries = []
    issues: list[BoundaryIssue] = []
    observed_geometry_types: set[str] = set()

    for feature, code in zip(features, codes, strict=True):
        properties = feature.get("properties") or {}
        source_id = _text(properties.get("id")) or "ausente"
        name = _text(properties.get("Nome"))
        reasons: list[str] = []

        if source_id == "ausente":
            reasons.append("source_id ausente")
        if not code:
            reasons.append("código do bairro ausente")
        elif code_counts[code] > 1:
            reasons.append(f"código do bairro duplicado: {code}")
        if not name:
            reasons.append("nome do bairro ausente")

        geometry = None
        try:
            geometry = shape(feature.get("geometry"))
        except (AttributeError, TypeError, ValueError) as error:
            reasons.append(f"geometria ilegível: {error}")

        if geometry is not None:
            observed_geometry_types.add(geometry.geom_type)
            if geometry.is_empty:
                reasons.append("geometria vazia")
            elif geometry.geom_type not in {"Polygon", "MultiPolygon"}:
                reasons.append(
                    "geometria deve ser Polygon/MultiPolygon, "
                    f"recebido {geometry.geom_type}"
                )
            elif not geometry.is_valid:
                reasons.append(
                    f"topologia inválida: {explain_validity(geometry)}"
                )

        if reasons:
            issues.append(BoundaryIssue(source_id, tuple(reasons)))
            continue

        rows.append(
            {
                "code": code,
                "name": name,
                "source_id": source_id,
                "reference_date": _text(properties.get("ano_ref")),
            }
        )
        geometries.append(geometry)

    report = BoundaryImportReport(
        input_count=len(features),
        output_count=len(rows),
        valid_count=len(rows),
        rejected_count=len(issues),
        codes_unique=all(count == 1 for count in code_counts.values()),
        geometry_types=tuple(sorted(observed_geometry_types)),
        issues=tuple(issues),
    )
    if issues:
        raise BoundaryValidationError(report)

    neighborhoods = gpd.GeoDataFrame(
        rows,
        geometry=geometries,
        crs="EPSG:4326",
    )
    return neighborhoods, report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("data/raw/neighborhoods.geojson"),
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        _, report = load_neighborhoods(args.input)
    except BoundaryValidationError as error:
        print(json.dumps(asdict(error.report), ensure_ascii=True, indent=2))
        return 1
    print(json.dumps(asdict(report), ensure_ascii=True, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
