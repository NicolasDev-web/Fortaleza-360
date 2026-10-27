import json
from pathlib import Path

import pytest

from scripts.transform_boundaries import BoundaryValidationError, load_neighborhoods


def _feature(coordinates: list, *, code: int = 77) -> dict:
    return {
        "type": "Feature",
        "geometry": {"type": "MultiPolygon", "coordinates": coordinates},
        "properties": {
            "id": code,
            "Nome": "BAIRRO DEMO",
            "Código do  Bairro": code,
            "ano_ref": 2019,
            "Fonte": "DEMO",
        },
    }


def _write_collection(path: Path, features: list[dict]) -> None:
    path.write_text(
        json.dumps({"type": "FeatureCollection", "features": features}),
        encoding="utf-8",
    )


def test_maps_valid_neighborhood_to_contract(tmp_path: Path) -> None:
    path = tmp_path / "neighborhoods-demo.geojson"
    coordinates = [[[[-38.6, -3.8], [-38.5, -3.8], [-38.5, -3.7], [-38.6, -3.8]]]]
    _write_collection(path, [_feature(coordinates)])

    neighborhoods, report = load_neighborhoods(path)

    assert report.input_count == 1
    assert report.valid_count == 1
    assert report.rejected_count == 0
    assert neighborhoods.crs.to_epsg() == 4326
    assert neighborhoods.iloc[0]["code"] == "77"
    assert neighborhoods.iloc[0]["name"] == "BAIRRO DEMO"
    assert neighborhoods.iloc[0]["reference_date"] == "2019"


def test_rejects_invalid_topology_with_auditable_reason(tmp_path: Path) -> None:
    path = tmp_path / "neighborhoods-invalid-demo.geojson"
    bow_tie_ring = [
        [-38.6, -3.8],
        [-38.5, -3.7],
        [-38.6, -3.7],
        [-38.5, -3.8],
        [-38.6, -3.8],
    ]
    bow_tie = [[bow_tie_ring]]
    _write_collection(path, [_feature(bow_tie)])

    with pytest.raises(BoundaryValidationError) as error:
        load_neighborhoods(path)

    assert error.value.report.rejected_count == 1
    assert "topologia inválida" in error.value.report.issues[0].reasons[0]
