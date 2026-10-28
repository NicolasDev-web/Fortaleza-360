import pandas as pd
import pytest

from scripts.aggregate_population import aggregate_by_neighborhood


def _population() -> pd.DataFrame:
    return pd.DataFrame(
        {"geo_id": ["DEMO-A", "DEMO-B", "DEMO-C"], "population": [100, 60, 0]}
    )


def _crosswalk() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "geo_id": ["DEMO-A", "DEMO-B", "DEMO-B", "DEMO-C"],
            "neighborhood_code": ["1", "1", "2", "2"],
            "area_share": [1.0, 0.75, 0.25, 1.0],
            "is_primary": [True, True, False, True],
        }
    )


def test_aggregates_with_both_methods_and_a_range() -> None:
    rows = aggregate_by_neighborhood(_population(), _crosswalk(), ["1", "2"])

    by_code = {row["code"]: row for row in rows}
    # Bairro 1: setor inteiro = 100 + 60; por área = 100 + 45.
    assert by_code["1"] == {
        "code": "1",
        "population": 160,
        "population_low": 145,
        "population_high": 160,
        "sectors": 2,
    }
    # Bairro 2: setor inteiro = 0 (C); por área = 15 (parte de B).
    assert by_code["2"]["population"] == 0
    assert by_code["2"]["population_low"] == 0
    assert by_code["2"]["population_high"] == 15


def test_total_by_whole_sector_matches_input() -> None:
    rows = aggregate_by_neighborhood(_population(), _crosswalk(), ["1", "2"])

    assert sum(row["population"] for row in rows) == 160


def test_fails_when_a_neighborhood_has_no_sector() -> None:
    with pytest.raises(ValueError, match="DEMO-SEM-SETOR"):
        aggregate_by_neighborhood(
            _population(), _crosswalk(), ["1", "2", "DEMO-SEM-SETOR"]
        )


def test_fails_when_population_is_missing_for_a_sector() -> None:
    population = _population().iloc[:2]

    with pytest.raises(ValueError, match="DEMO-C"):
        aggregate_by_neighborhood(population, _crosswalk(), ["1", "2"])
