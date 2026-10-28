import json
from pathlib import Path

import pytest

from scripts.transform_units import load_units


def _unit(source_id: int, natureza: str, coordinates: list[list[float]]) -> dict:
    return {
        "type": "Feature",
        "geometry": {"type": "MultiPoint", "coordinates": coordinates},
        "properties": {
            "id": source_id,
            "name": f"UNIDADE DEMO {source_id}",
            "natureza": natureza,
            "cnes_n": 1000000 + source_id,
            "nm_bairro": "Bairro DEMO",
            "fonte": "SMS",
            "ano": 2026,
        },
    }


def _write(path: Path, features: list[dict]) -> Path:
    path.write_text(
        json.dumps({"type": "FeatureCollection", "features": features}),
        encoding="utf-8",
    )
    return path


def test_maps_single_point_multipoint_to_facility_contract(tmp_path: Path) -> None:
    source = _write(tmp_path / "upas.geojson", [_unit(6, "UPA", [[-38.52, -3.83, 0]])])

    units = load_units(source, "UPA")

    row = units.iloc[0]
    assert row["id"] == "upa-6"
    assert row["type"] == "UPA"
    assert row["cnes"] == "1000006"
    assert row["neighborhood"] == "Bairro DEMO"
    assert row["reference_date"] == "2026"
    assert row["management"] is None
    assert row["sus"] is None
    assert row.geometry.geom_type == "Point"
    assert (row.geometry.x, row.geometry.y) == (-38.52, -3.83)
    assert not row.geometry.has_z


def test_hospital_ids_use_their_own_prefix(tmp_path: Path) -> None:
    source = _write(tmp_path / "h.geojson", [_unit(1, "HOSP", [[-38.5, -3.8]])])

    assert load_units(source, "HOSPITAL").iloc[0]["id"] == "hospital-1"


@pytest.mark.parametrize(
    ("features", "message"),
    [
        ([_unit(1, "UPA", [[-38.5, -3.8], [-38.4, -3.7]])], "1 ponto"),
        ([_unit(1, "UPA", [])], "1 ponto"),
        ([_unit(1, "HOSP", [[-38.5, -3.8]])], "natureza"),
        ([{**_unit(1, "UPA", [[-38.5, -3.8]]), "properties": {"id": 1}}], "nome"),
    ],
)
def test_rejects_irregular_units(
    tmp_path: Path, features: list[dict], message: str
) -> None:
    source = _write(tmp_path / "bad.geojson", features)

    with pytest.raises(ValueError, match=message):
        load_units(source, "UPA")
