"""Pipeline público de ponta a ponta: deve falhar com dados irregulares."""

import copy
import json
from collections.abc import Callable
from pathlib import Path
from typing import Any

import pytest

from scripts.export_public import export_public_data

Raw = dict[str, dict[str, Any]]


def _square(x: float, y: float, size: float = 0.01) -> list[list[list[float]]]:
    return [[[x, y], [x + size, y], [x + size, y + size], [x, y + size], [x, y]]]


def _uaps(source_id: int, name: str | None, coordinates: list[float] | None) -> dict:
    return {
        "type": "Feature",
        "geometry": None
        if coordinates is None
        else {"type": "Point", "coordinates": coordinates},
        "properties": {
            "id": source_id,
            "nome": name,
            "gestão": "M",
            "atende_sus": "SIM",
            "cnes": f"000000{source_id}",
            "bairro": "BAIRRO DEMO",
            "ano": "2026",
        },
    }


def _bairro(code: str, ring: list[list[list[float]]], year: int = 2019) -> dict:
    return {
        "type": "Feature",
        "geometry": {"type": "MultiPolygon", "coordinates": [ring]},
        "properties": {
            "id": int(code),
            "Nome": f"Bairro DEMO {code}",
            "Código do  Bairro": code,
            "ano_ref": year,
        },
    }


def _valid_raw() -> Raw:
    return {
        "uaps.geojson": {
            "type": "FeatureCollection",
            "features": [
                _uaps(1, "UAPS DEMO 1", [-38.545, -3.745]),
                _uaps(2, "UAPS DEMO 2", [-38.535, -3.745]),
            ],
        },
        "neighborhoods.geojson": {
            "type": "FeatureCollection",
            "features": [
                _bairro("1", _square(-38.55, -3.75)),
                _bairro("2", _square(-38.54, -3.75)),
            ],
        },
        "municipal-boundary.geojson": {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "MultiPolygon",
                        "coordinates": [_square(-38.56, -3.76, 0.04)],
                    },
                    "properties": {"nome": "Município DEMO", "ano_ref": 2019},
                }
            ],
        },
    }


def _write(raw: Raw, directory: Path) -> Path:
    directory.mkdir()
    for name, collection in raw.items():
        (directory / name).write_text(json.dumps(collection), encoding="utf-8")
    return directory


def _mutate(change: Callable[[Raw], None]) -> Raw:
    raw = copy.deepcopy(_valid_raw())
    change(raw)
    return raw


def _uaps_props(raw: Raw, index: int) -> dict[str, Any]:
    return raw["uaps.geojson"]["features"][index]["properties"]


def _bairro_props(raw: Raw, index: int) -> dict[str, Any]:
    return raw["neighborhoods.geojson"]["features"][index]["properties"]


IRREGULAR: dict[str, Callable[[Raw], None]] = {
    "nome nulo": lambda raw: _uaps_props(raw, 0).update(nome=None),
    "id nulo": lambda raw: _uaps_props(raw, 0).update(id=None),
    "coordenada nula": lambda raw: raw["uaps.geojson"]["features"][0].update(
        geometry=None
    ),
    "código de bairro nulo": lambda raw: _bairro_props(raw, 0).update(
        **{"Código do  Bairro": None}
    ),
    "id UAPS duplicado com conflito": lambda raw: _uaps_props(raw, 1).update(id=1),
    "código de bairro duplicado": lambda raw: _bairro_props(raw, 1).update(
        **{"Código do  Bairro": "1"}
    ),
    "ponto fora do município": lambda raw: raw["uaps.geojson"]["features"][0][
        "geometry"
    ].update(coordinates=[-40.0, -3.745]),
    "bairro com auto-interseção": lambda raw: raw["neighborhoods.geojson"][
        "features"
    ][0]["geometry"].update(
        coordinates=[
            [[[-38.55, -3.75], [-38.54, -3.74], [-38.54, -3.75], [-38.55, -3.74],
              [-38.55, -3.75]]]
        ]
    ),
    "anos misturados nas UAPS": lambda raw: _uaps_props(raw, 1).update(ano="2019"),
    "ano de UAPS fora da referência": lambda raw: [
        _uaps_props(raw, index).update(ano="2025") for index in (0, 1)
    ],
    "ano de bairro fora da referência": lambda raw: [
        _bairro_props(raw, index).update(ano_ref=2023) for index in (0, 1)
    ],
    "ano de UAPS ausente": lambda raw: _uaps_props(raw, 0).update(ano=None),
}


def test_valid_demo_pipeline_exports_all_layers(tmp_path: Path) -> None:
    raw_dir = _write(_valid_raw(), tmp_path / "raw")

    results = export_public_data(raw_dir, tmp_path / "public")

    assert [result.feature_count for result in results] == [2, 2, 1]


def test_exact_duplicate_is_removed_not_rejected(tmp_path: Path) -> None:
    raw = _mutate(
        lambda raw: raw["uaps.geojson"]["features"].append(
            copy.deepcopy(raw["uaps.geojson"]["features"][0])
        )
    )

    results = export_public_data(_write(raw, tmp_path / "raw"), tmp_path / "public")

    assert results[0].feature_count == 2


@pytest.mark.parametrize("case", sorted(IRREGULAR))
def test_pipeline_fails_with_irregular_data(case: str, tmp_path: Path) -> None:
    raw_dir = _write(_mutate(IRREGULAR[case]), tmp_path / "raw")
    output_dir = tmp_path / "public"

    with pytest.raises(ValueError):
        export_public_data(raw_dir, output_dir)

    assert not output_dir.exists() or not any(output_dir.iterdir())
