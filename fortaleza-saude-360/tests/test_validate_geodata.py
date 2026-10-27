import geopandas as gpd
import pytest
from shapely.geometry import Point

from scripts.validate_geodata import GeodataValidationError, validate_points


def test_rejects_empty_and_out_of_bounds_coordinates_with_report() -> None:
    facilities = gpd.GeoDataFrame(
        {"id": ["demo-valid", "demo-outside", "demo-empty"]},
        geometry=[Point(-38.5, -3.8), Point(0, 0), Point()],
        crs="EPSG:4326",
    )

    with pytest.raises(GeodataValidationError) as error:
        validate_points(
            facilities,
            bounds=(-38.7, -4.0, -38.3, -3.6),
        )

    report = error.value.report
    assert report.total_count == 3
    assert report.valid_count == 1
    assert report.invalid_count == 2
    assert {issue.feature_id for issue in report.issues} == {
        "demo-outside",
        "demo-empty",
    }
    all_reasons = [reason for issue in report.issues for reason in issue.reasons]
    assert any("bounding box" in reason for reason in all_reasons)
    assert any("vazia" in reason for reason in all_reasons)
