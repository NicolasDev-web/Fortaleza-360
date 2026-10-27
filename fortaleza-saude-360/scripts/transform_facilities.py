"""Lê a camada oficial de UAPS e mapeia seus campos para o contrato interno."""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import geopandas as gpd
import pandas as pd
from shapely.geometry import shape

REQUIRED_PROPERTIES = {
    "id",
    "nome",
    "gestão",
    "atende_sus",
    "cnes",
    "bairro",
    "ano",
}


@dataclass(frozen=True)
class ImportReport:
    input_count: int
    output_count: int
    input_properties: tuple[str, ...]
    output_schema: dict[str, str]
    geometry_types: tuple[str, ...]


@dataclass(frozen=True)
class DeduplicationReport:
    input_count: int
    output_count: int
    exact_duplicates_removed: int
    conflict_source_ids: tuple[str, ...]
    cnes_collisions: tuple[str, ...]


class DuplicateConflictError(ValueError):
    def __init__(self, report: DeduplicationReport) -> None:
        self.report = report
        conflicts = ", ".join(report.conflict_source_ids)
        super().__init__(f"Registros conflitantes para source_id: {conflicts}")


def _text(value: Any) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip()
    return normalized or None


def _sus_value(value: Any) -> bool | None:
    normalized = (_text(value) or "").casefold()
    if normalized == "sim":
        return True
    if normalized in {"não", "nao"}:
        return False
    return None


def load_facilities(path: Path) -> tuple[gpd.GeoDataFrame, ImportReport]:
    """Carrega o GeoJSON UTF-8 sem corrigir ou criar registros da fonte."""

    with path.open(encoding="utf-8") as file:
        collection = json.load(file)

    if collection.get("type") != "FeatureCollection":
        raise ValueError("A fonte UAPS deve ser um GeoJSON FeatureCollection")

    features = collection.get("features")
    if not isinstance(features, list):
        raise ValueError("A fonte UAPS não contém uma lista de feições")

    input_properties = sorted(
        {
            key
            for feature in features
            for key in (feature.get("properties") or {}).keys()
        }
    )
    missing_properties = REQUIRED_PROPERTIES.difference(input_properties)
    if missing_properties:
        missing = ", ".join(sorted(missing_properties))
        raise ValueError(f"Campos obrigatórios ausentes na fonte UAPS: {missing}")

    rows: list[dict[str, Any]] = []
    geometries = []
    for feature in features:
        properties = feature.get("properties") or {}
        source_id = _text(properties.get("id"))
        name = _text(properties.get("nome"))
        if not source_id or not name:
            raise ValueError("Toda UAPS deve possuir id e nome na fonte")

        geometry = shape(feature.get("geometry"))
        rows.append(
            {
                "id": f"uaps-{source_id}",
                "name": name,
                "type": "UAPS",
                "management": _text(properties.get("gestão")),
                "sus": _sus_value(properties.get("atende_sus")),
                "neighborhood": _text(properties.get("bairro")),
                "source_id": source_id,
                "reference_date": _text(properties.get("ano")),
                "cnes": _text(properties.get("cnes")),
            }
        )
        geometries.append(geometry)

    facilities = gpd.GeoDataFrame(rows, geometry=geometries, crs="EPSG:4326")
    report = ImportReport(
        input_count=len(features),
        output_count=len(facilities),
        input_properties=tuple(input_properties),
        output_schema={
            str(column): str(dtype)
            for column, dtype in facilities.dtypes.items()
        },
        geometry_types=tuple(sorted(facilities.geometry.geom_type.unique())),
    )
    return facilities, report


def _signature_value(value: Any) -> Any:
    if value is None or pd.isna(value):
        return None
    return value


def _record_signature(row: pd.Series, columns: list[str]) -> tuple[Any, ...]:
    geometry = row.geometry
    geometry_signature = None if geometry is None else geometry.wkb_hex
    return (
        *(_signature_value(row[column]) for column in columns),
        geometry_signature,
    )


def deduplicate_facilities(
    facilities: gpd.GeoDataFrame,
) -> tuple[gpd.GeoDataFrame, DeduplicationReport]:
    """Remove somente cópias idênticas; conflitos nunca são resolvidos por palpite."""

    required = {"source_id", "cnes", "geometry"}
    missing = required.difference(facilities.columns)
    if missing:
        raise ValueError(
            "Campos ausentes para deduplicação: " + ", ".join(sorted(missing))
        )
    if facilities["source_id"].isna().any():
        raise ValueError("source_id não pode ser nulo")

    comparison_columns = sorted(
        column for column in facilities.columns if column not in {"id", "geometry"}
    )
    keep_indices: list[Any] = []
    exact_duplicates_removed = 0
    conflicts: list[str] = []

    for source_id, group in facilities.groupby("source_id", sort=False):
        signatures = {
            _record_signature(row, comparison_columns)
            for _, row in group.iterrows()
        }
        if len(signatures) > 1:
            conflicts.append(str(source_id))
            continue
        keep_indices.append(group.index[0])
        exact_duplicates_removed += len(group) - 1

    populated_cnes = facilities.dropna(subset=["cnes"])
    collision_counts = populated_cnes.groupby("cnes")["source_id"].nunique()
    cnes_collisions = tuple(
        sorted(str(cnes) for cnes, count in collision_counts.items() if count > 1)
    )
    report = DeduplicationReport(
        input_count=len(facilities),
        output_count=len(keep_indices),
        exact_duplicates_removed=exact_duplicates_removed,
        conflict_source_ids=tuple(sorted(conflicts)),
        cnes_collisions=cnes_collisions,
    )
    if conflicts:
        raise DuplicateConflictError(report)

    result = facilities.loc[keep_indices].copy().reset_index(drop=True)
    result["id"] = "uaps-" + result["source_id"].astype(str)
    if not result["id"].is_unique:
        raise ValueError("A chave estável id não é única após deduplicação")
    return result, report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("data/raw/uaps.geojson"),
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    facilities, import_report = load_facilities(args.input)
    _, deduplication_report = deduplicate_facilities(facilities)
    report = {
        "import": asdict(import_report),
        "deduplication": asdict(deduplication_report),
    }
    print(json.dumps(report, ensure_ascii=True, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
