import json
from pathlib import Path

import geopandas as gpd
import pytest
from shapely.geometry import Point

from scripts.export_public import export_geojson


def test_exports_compact_utf8_geojson_without_losing_contract_fields(
    tmp_path: Path,
) -> None:
    data = gpd.GeoDataFrame(
        {
            "id": ["uaps-demo"],
            "name": ["UAPS DEMO ACENTUAÇÃO"],
            "type": ["UAPS"],
            "source_id": ["demo"],
        },
        geometry=[Point(-38.5, -3.8)],
        crs="EPSG:4326",
    )
    output_path = tmp_path / "facilities.geojson"

    result = export_geojson(data, output_path)

    text = output_path.read_text(encoding="utf-8")
    collection = json.loads(text)
    assert "ACENTUAÇÃO" in text
    assert "\n" not in text
    assert collection["type"] == "FeatureCollection"
    assert collection["features"][0]["properties"] == {
        "id": "uaps-demo",
        "name": "UAPS DEMO ACENTUAÇÃO",
        "type": "UAPS",
        "source_id": "demo",
    }
    assert result.feature_count == 1
    assert result.bytes == len(output_path.read_bytes())


def test_rejects_export_outside_wgs84(tmp_path: Path) -> None:
    data = gpd.GeoDataFrame(
        {"id": ["demo"]},
        geometry=[Point(500_000, 9_500_000)],
        crs="EPSG:31984",
    )

    with pytest.raises(ValueError, match="EPSG:4326"):
        export_geojson(data, tmp_path / "invalid.geojson")
