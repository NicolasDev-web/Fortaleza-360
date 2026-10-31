"""Setores DEMO: ordenação, zero, desempate e ausência de dados."""

import geopandas as gpd
import pandas as pd
import pytest
from shapely.geometry import Point, box

from scripts.sector_ranking import rank_sectors


def test_rank_distance_not_population_and_reject_invalid_population():
    sectors = gpd.GeoDataFrame(
        {"geo_id": ["DEMO-B", "DEMO-A", "DEMO-C"], "population": [0, 200, 100]},
        geometry=[
            box(-38.55, -3.8, -38.54, -3.79),
            box(-38.55, -3.8, -38.54, -3.79),
            box(-38.51, -3.8, -38.50, -3.79),
        ],
        crs=4326,
    )
    units = gpd.GeoDataFrame(
        {"id": ["DEMO-UAPS"]}, geometry=[Point(-38.50, -3.795)], crs=4326
    )
    crosswalk = pd.DataFrame(
        {
            "geo_id": sectors.geo_id,
            "neighborhood_code": ["DEMO-1"] * 3,
            "is_primary": [True] * 3,
        }
    )
    rows = rank_sectors(sectors, units, crosswalk)
    assert [row["geo_id"] for row in rows] == ["DEMO-A", "DEMO-B", "DEMO-C"]
    assert rows[1]["population"] == 0
    assert sum(row["population"] for row in rows) == 300
    with pytest.raises(ValueError, match="UAPS"):
        rank_sectors(sectors, units.iloc[:0], crosswalk)
    sectors.loc[0, "population"] = float("nan")
    with pytest.raises(ValueError, match="população"):
        rank_sectors(sectors, units, crosswalk)
