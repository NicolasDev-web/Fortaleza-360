"""Valida CRS, coordenadas e extensão espacial de camadas de pontos."""

from __future__ import annotations

import argparse
import json
import math
from dataclasses import asdict, dataclass
from pathlib import Path

import geopandas as gpd
from shapely.geometry import shape
from shapely.ops import unary_union

try:
    from scripts.transform_facilities import load_facilities
except ModuleNotFoundError:  # Execução direta: python scripts/validate_geodata.py
    from transform_facilities import load_facilities

Bounds = tuple[float, float, float, float]


@dataclass(frozen=True)
class ValidationIssue:
    feature_id: str
    reasons: tuple[str, ...]


@dataclass(frozen=True)
class ValidationReport:
    crs: str | None
    bounds: Bounds
    total_count: int
    valid_count: int
    invalid_count: int
    issues: tuple[ValidationIssue, ...]


class GeodataValidationError(ValueError):
    def __init__(self, report: ValidationReport) -> None:
        self.report = report
        super().__init__(
            f"{report.invalid_count} de {report.total_count} feições inválidas"
        )


def load_bounds(path: Path) -> Bounds:
    with path.open(encoding="utf-8") as file:
        collection = json.load(file)
    if collection.get("type") != "FeatureCollection":
        raise ValueError("O limite municipal deve ser um FeatureCollection")
    geometries = [
        shape(feature["geometry"])
        for feature in collection.get("features", [])
        if feature.get("geometry")
    ]
    if not geometries:
        raise ValueError("O limite municipal não contém geometrias")
    return tuple(float(value) for value in unary_union(geometries).bounds)


def validate_points(
    data: gpd.GeoDataFrame,
    *,
    bounds: Bounds,
) -> ValidationReport:
    crs = data.crs.to_string() if data.crs else None
    if data.crs is None or data.crs.to_epsg() != 4326:
        report = ValidationReport(
            crs=crs,
            bounds=bounds,
            total_count=len(data),
            valid_count=0,
            invalid_count=len(data),
            issues=(
                ValidationIssue(
                    feature_id="*",
                    reasons=("CRS deve ser EPSG:4326",),
                ),
            ),
        )
        raise GeodataValidationError(report)

    min_x, min_y, max_x, max_y = bounds
    issues: list[ValidationIssue] = []
    valid_count = 0

    for index, row in data.iterrows():
        feature_id = str(row.get("id", index))
        geometry = row.geometry
        reasons: list[str] = []

        if geometry is None or geometry.is_empty:
            reasons.append("geometria vazia")
        elif geometry.geom_type != "Point":
            reasons.append(f"geometria deve ser Point, recebido {geometry.geom_type}")
        else:
            longitude, latitude = geometry.x, geometry.y
            if not math.isfinite(longitude) or not math.isfinite(latitude):
                reasons.append("latitude/longitude não finitas")
            elif not (-180 <= longitude <= 180 and -90 <= latitude <= 90):
                reasons.append("latitude/longitude fora dos limites globais")
            elif not (
                min_x <= longitude <= max_x and min_y <= latitude <= max_y
            ):
                reasons.append("coordenada fora da bounding box de Fortaleza")

        if reasons:
            issues.append(ValidationIssue(feature_id, tuple(reasons)))
        else:
            valid_count += 1

    report = ValidationReport(
        crs=crs,
        bounds=bounds,
        total_count=len(data),
        valid_count=valid_count,
        invalid_count=len(issues),
        issues=tuple(issues),
    )
    if issues:
        raise GeodataValidationError(report)
    return report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--facilities",
        type=Path,
        default=Path("data/raw/uaps.geojson"),
    )
    parser.add_argument(
        "--boundary",
        type=Path,
        default=Path("data/raw/municipal-boundary.geojson"),
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    facilities, _ = load_facilities(args.facilities)
    bounds = load_bounds(args.boundary)
    try:
        report = validate_points(facilities, bounds=bounds)
    except GeodataValidationError as error:
        print(json.dumps(asdict(error.report), ensure_ascii=True, indent=2))
        return 1
    print(json.dumps(asdict(report), ensure_ascii=True, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
