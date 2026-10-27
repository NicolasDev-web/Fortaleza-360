import json
from pathlib import Path

import geopandas as gpd
import pytest
from shapely.geometry import Point

from scripts.transform_facilities import (
    DuplicateConflictError,
    deduplicate_facilities,
    load_facilities,
)


def test_maps_official_columns_to_facility_contract(tmp_path: Path) -> None:
    fixture = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [-38.5, -3.8]},
                "properties": {
                    "id": 7,
                    "nome": "UAPS DEMO",
                    "natureza": "ADMINISTRAÇÃO PÚBLICA",
                    "gestão": "M",
                    "atende_sus": "SIM",
                    "cnes": "0000000",
                    "bairro": "BAIRRO DEMO",
                    "fonte": "DEMO",
                    "ano": 2026,
                },
            }
        ],
    }
    input_path = tmp_path / "uaps-demo.geojson"
    input_path.write_text(
        json.dumps(fixture, ensure_ascii=False),
        encoding="utf-8",
    )

    facilities, report = load_facilities(input_path)

    assert report.input_count == 1
    assert report.output_count == 1
    assert facilities.crs.to_epsg() == 4326
    expected = {
        "id": "uaps-7",
        "name": "UAPS DEMO",
        "type": "UAPS",
        "management": "M",
        "sus": True,
        "neighborhood": "BAIRRO DEMO",
        "source_id": "7",
        "reference_date": "2026",
        "cnes": "0000000",
    }
    record = facilities.iloc[0].to_dict()
    for key, value in expected.items():
        assert record[key] == value


def test_deduplicates_only_identical_source_ids_and_reports_cnes_collision() -> None:
    facilities = gpd.GeoDataFrame(
        {
            "id": ["uaps-1", "uaps-1", "uaps-2"],
            "name": ["UAPS DEMO A", "UAPS DEMO A", "UAPS DEMO B"],
            "source_id": ["1", "1", "2"],
            "cnes": ["0000000", "0000000", "0000000"],
        },
        geometry=[Point(-38.5, -3.8), Point(-38.5, -3.8), Point(-38.6, -3.7)],
        crs="EPSG:4326",
    )

    result, report = deduplicate_facilities(facilities)

    assert len(result) == 2
    assert report.exact_duplicates_removed == 1
    assert report.cnes_collisions == ("0000000",)
    assert set(result["source_id"]) == {"1", "2"}


def test_rejects_conflicting_records_with_same_source_id() -> None:
    facilities = gpd.GeoDataFrame(
        {
            "id": ["uaps-1", "uaps-1"],
            "name": ["UAPS DEMO A", "UAPS DEMO CONFLITO"],
            "source_id": ["1", "1"],
            "cnes": ["0000001", "0000001"],
        },
        geometry=[Point(-38.5, -3.8), Point(-38.5, -3.8)],
        crs="EPSG:4326",
    )

    with pytest.raises(DuplicateConflictError) as error:
        deduplicate_facilities(facilities)

    assert error.value.report.conflict_source_ids == ("1",)
