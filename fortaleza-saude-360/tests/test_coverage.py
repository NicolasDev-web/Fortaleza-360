"""SDD-038: setores e população sintéticos DEMO, sem locais reais."""

import csv
import json

import geopandas as gpd
import pytest
from shapely.geometry import box

from scripts.coverage import count_population, generate, validate_sectors, verify_counts
from scripts.generate_manifest import _coverage_entry
from scripts.isochrones import sha256


def demo_sectors():
    return gpd.GeoDataFrame(
        {
            "geo_id": ["DEMO-1", "DEMO-2", "DEMO-3"],
            "population": [100, 200, 0],
            "year": [2022] * 3,
        },
        geometry=[box(0, 0, 10, 10), box(10, 0, 20, 10), box(20, 0, 30, 10)],
        crs=31984,
    )


def test_partial_sector_has_known_denominator_and_method_sensitivity():
    result, details = count_population(demo_sectors(), box(-1, -1, 12, 11))
    assert result["total_population"] == 300
    assert result["representative_population"] == 100
    assert result["representative_percent"] == pytest.approx(100 / 3)
    assert result["area_weighted_population"] == pytest.approx(140)
    assert result["full_sector_population"] == 100
    assert result["any_overlap_population"] == 300
    assert [r["area_share"] for r in details] == pytest.approx([1, 0.2, 0])


def test_union_prevents_double_counting_and_edge_contact_has_zero_area():
    from shapely import union_all

    area = union_all([box(-1, -1, 10, 11), box(0, 0, 9, 9)])
    result, details = count_population(demo_sectors(), area)
    assert result["area_weighted_population"] == 100
    assert result["any_overlap_population"] == 100
    assert details[1]["area_share"] == 0


def test_empty_coverage_preserves_zero_and_total():
    result, _ = count_population(demo_sectors(), box(100, 100, 110, 110))
    assert result["representative_population"] == 0
    assert result["representative_percent"] == 0
    assert result["total_population"] == 300


@pytest.mark.parametrize("value", [None, -1, float("inf"), 1.5])
def test_missing_invalid_population_blocks_publication(value):
    sectors = demo_sectors()
    sectors["population"] = sectors["population"].astype(object)
    sectors.loc[0, "population"] = value
    with pytest.raises(ValueError, match="População"):
        validate_sectors(sectors)


def test_duplicate_ids_and_invalid_geometry_fail():
    sectors = demo_sectors()
    sectors.loc[1, "geo_id"] = "DEMO-1"
    with pytest.raises(ValueError, match="identificador"):
        validate_sectors(sectors)
    sectors = demo_sectors()
    sectors.loc[0, "geometry"] = None
    with pytest.raises(ValueError, match="Geometria"):
        validate_sectors(sectors)


def test_zero_denominator_percent_is_null():
    sectors = demo_sectors()
    sectors["population"] = 0
    result, _ = count_population(sectors, box(-1, -1, 50, 50))
    assert result["representative_percent"] is None
    assert result["area_weighted_percent"] is None


def test_full_area_equals_denominator_and_is_monotone():
    results = [
        count_population(demo_sectors(), box(-1, -1, end, 11))[0] for end in (9, 15, 31)
    ]
    for key in (
        "representative_population",
        "area_weighted_population",
        "full_sector_population",
        "any_overlap_population",
    ):
        values = [r[key] for r in results]
        assert values == sorted(values)
        assert values[-1] == 300


def test_pipeline_is_auditable_reproducible_and_checksums_block_tampering(tmp_path):
    sectors = demo_sectors()
    sectors["population_source_id"] = "DEMO-P"
    sectors["geometry_source_id"] = "DEMO-G"
    sectors_path = tmp_path / "sectors.geojson"
    sectors.to_file(sectors_path, driver="GeoJSON")
    audit = tmp_path / "population_audit.json"
    audit.write_text(
        json.dumps(
            {
                "join": {
                    "population_total": 300,
                    "sectors": 3,
                    "sectors_without_population": [],
                }
            }
        )
    )
    for filename, source_id in (
        ("ibge-agregados-basico-br-20260520.zip.metadata.json", "DEMO-P"),
        ("ibge-setores-ce-2022.gpkg.metadata.json", "DEMO-G"),
    ):
        (tmp_path / filename).write_text(
            json.dumps({"source_id": source_id, "license": "DEMO"})
        )
    geometries, scenarios, minutes = [], [], []
    for scenario in ("slow", "central", "fast"):
        for minute, width in ((10, 12), (20, 20), (30, 31)):
            geometries.append(box(-1, -1, width, 11))
            scenarios.append(scenario)
            minutes.append(minute)
    isos = gpd.GeoDataFrame(
        {"scenario": scenarios, "minutes": minutes}, geometry=geometries, crs=31984
    )
    isos_path = tmp_path / "isochrones.geojson"
    isos.to_file(isos_path, driver="GeoJSON")
    (tmp_path / "manifest.json").write_text(
        json.dumps(
            {
                "output": {"file": isos_path.name, "sha256": sha256(isos_path)},
                "buffer_m": 25,
                "max_snap_m": 300,
                "model": {"DEMO": True},
                "source_osm": {"license": "DEMO"},
                "source_layers": [],
            }
        )
    )
    public = tmp_path / "public"
    output = public / "population-coverage.json"
    audit_dir = tmp_path / "coverage"
    result = generate(sectors_path, tmp_path, tmp_path, audit, output, audit_dir)
    original = output.read_bytes()
    assert result["denominator"]["population"] == 300
    assert len(result["rows"]) == 9
    assert result["sensitivity"][0]["population_min"] == 100
    with (audit_dir / "sector_coverage.csv").open() as file:
        rows = list(csv.DictReader(file))
    assert len(rows) == 27
    for group in result["rows"]:
        selected = [
            r
            for r in rows
            if r["scenario"] == group["scenario"]
            and int(r["minutes"]) == group["minutes"]
        ]
        assert sum(float(r["weighted_population"]) for r in selected) == pytest.approx(
            group["area_weighted_population"]
        )
        assert (
            sum(
                int(r["population"])
                for r in selected
                if r["representative_included"] == "True"
            )
            == group["representative_population"]
        )
    assert _coverage_entry(public)["sha256"] == sha256(output)
    generate(sectors_path, tmp_path, tmp_path, audit, output, audit_dir)
    assert output.read_bytes() == original
    result["rows"][0]["representative_percent"] = 999
    output.write_text(json.dumps(result))
    with pytest.raises(ValueError, match="percentual"):
        _coverage_entry(public)
    isos_path.write_text("{}")
    with pytest.raises(ValueError, match="Checksum"):
        generate(sectors_path, tmp_path, tmp_path, audit, output, audit_dir)


def test_incomplete_scenarios_and_inconsistent_denominators_fail():
    with pytest.raises(ValueError, match="nove"):
        verify_counts([])
    rows = []
    for scenario in ("slow", "central", "fast"):
        for minutes in (10, 20, 30):
            result, _ = count_population(demo_sectors(), box(-1, -1, 50, 50))
            rows.append({"scenario": scenario, "minutes": minutes, **result})
    rows[0]["total_population"] = 301
    with pytest.raises(ValueError, match="Denominador"):
        verify_counts(rows)
    rows[0]["total_population"] = 300
    rows[0]["representative_population"] = 999
    with pytest.raises(ValueError, match="monotônica"):
        verify_counts(rows)
