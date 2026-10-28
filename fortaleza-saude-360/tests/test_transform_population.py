import geopandas as gpd
import pandas as pd
import pytest
from shapely.geometry import box

from scripts.transform_population import build_crosswalk, join_population


def _sectors() -> gpd.GeoDataFrame:
    # Quadrados DEMO de ~1 km perto de Fortaleza, em graus.
    return gpd.GeoDataFrame(
        {
            "geo_id": ["DEMO-A", "DEMO-B", "DEMO-C", "DEMO-D"],
            "situation": ["1", "1", "1", "1"],
        },
        geometry=[
            box(-38.55, -3.75, -38.54, -3.74),
            box(-38.535, -3.75, -38.525, -3.74),
            box(-38.40, -3.75, -38.39, -3.74),
            box(-38.55, -3.73, -38.54, -3.72),
        ],
        crs="EPSG:4326",
    )


def _neighborhoods() -> gpd.GeoDataFrame:
    return gpd.GeoDataFrame(
        {"code": ["1", "2"], "name": ["Bairro DEMO 1", "Bairro DEMO 2"]},
        geometry=[
            box(-38.56, -3.76, -38.53, -3.715),
            box(-38.53, -3.76, -38.50, -3.715),
        ],
        crs="EPSG:4326",
    )


def test_join_keeps_sectors_without_population_and_explains_why() -> None:
    population = pd.DataFrame(
        {"geo_id": ["DEMO-A", "DEMO-B", "DEMO-C"], "population": [100, 0, 50]}
    )

    joined, audit = join_population(_sectors(), population)

    assert len(joined) == 4
    missing = joined.set_index("geo_id").loc["DEMO-D"]
    assert pd.isna(missing["population"])
    assert missing["population_missing_reason"] == "setor sem registro no agregado"
    assert joined.set_index("geo_id").loc["DEMO-B", "population"] == 0
    assert audit["sectors"] == 4
    assert audit["sectors_without_population"] == ["DEMO-D"]
    assert audit["population_total"] == 150


def test_join_fails_when_population_has_no_geometry() -> None:
    population = pd.DataFrame({"geo_id": ["DEMO-A", "DEMO-Z"], "population": [1, 2]})

    with pytest.raises(ValueError, match="DEMO-Z"):
        join_population(_sectors(), population)


def test_join_fails_on_duplicated_population_rows() -> None:
    population = pd.DataFrame({"geo_id": ["DEMO-A", "DEMO-A"], "population": [1, 2]})

    with pytest.raises(ValueError, match="duplicad"):
        join_population(_sectors(), population)


def test_crosswalk_records_shares_and_unassigned_sectors() -> None:
    crosswalk, audit = build_crosswalk(_sectors(), _neighborhoods())

    by_sector = crosswalk.groupby("geo_id")["area_share"].sum()
    assert set(crosswalk["geo_id"]) == {"DEMO-A", "DEMO-B", "DEMO-C", "DEMO-D"}
    assert by_sector["DEMO-A"] == pytest.approx(1, abs=1e-6)
    shares_b = crosswalk[crosswalk["geo_id"] == "DEMO-B"].set_index("neighborhood_code")
    assert shares_b.loc["1", "area_share"] == pytest.approx(0.5, abs=0.01)
    assert shares_b.loc["2", "area_share"] == pytest.approx(0.5, abs=0.01)
    outside = crosswalk[crosswalk["geo_id"] == "DEMO-C"].iloc[0]
    assert pd.isna(outside["neighborhood_code"])
    assert outside["area_share"] == pytest.approx(1, abs=1e-6)
    assert audit["split_sectors"] == ["DEMO-B"]
    assert audit["unassigned_sectors"] == ["DEMO-C"]
    primary = crosswalk[crosswalk["is_primary"]].set_index("geo_id")
    primary = primary["neighborhood_code"]
    assert primary["DEMO-A"] == "1"
    assert len(primary) == 4
