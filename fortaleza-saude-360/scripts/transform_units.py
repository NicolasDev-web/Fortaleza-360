"""Importa UPAs e hospitais municipais para o mesmo contrato `facility` das UAPS."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import geopandas as gpd
from shapely.geometry import Point

# Tipo do contrato -> (valor de `natureza` na fonte, prefixo do id estável).
UNIT_TYPES = {
    "UPA": ("UPA", "upa"),
    "HOSPITAL": ("HOSP", "hospital"),
}


def _text(value: Any) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip()
    return normalized or None


def load_units(path: Path, unit_type: str) -> gpd.GeoDataFrame:
    """Lê uma camada SMS de MultiPoint com um ponto por unidade, sem corrigir dados."""
    natureza, prefix = UNIT_TYPES[unit_type]
    collection = json.loads(path.read_text(encoding="utf-8"))
    if collection.get("type") != "FeatureCollection":
        raise ValueError(f"{path} não é um FeatureCollection")
    features = collection.get("features")
    if not isinstance(features, list) or not features:
        raise ValueError(f"{path} não contém feições")

    rows: list[dict[str, Any]] = []
    geometries: list[Point] = []
    for index, feature in enumerate(features):
        properties = feature.get("properties") or {}
        source_id = _text(properties.get("id"))
        name = _text(properties.get("name"))
        label = f"{unit_type} {source_id or index}"
        if not source_id or not name:
            raise ValueError(f"{label}: id e nome são obrigatórios")
        if _text(properties.get("natureza")) != natureza:
            found = properties.get("natureza")
            raise ValueError(f"{label}: natureza {found!r}, esperado {natureza!r}")
        geometry = feature.get("geometry") or {}
        points = geometry.get("coordinates") or []
        if geometry.get("type") != "MultiPoint" or len(points) != 1:
            raise ValueError(f"{label}: MultiPoint deve ter exatamente 1 ponto")
        longitude, latitude = points[0][:2]

        rows.append(
            {
                "id": f"{prefix}-{source_id}",
                "name": name,
                "type": unit_type,
                # A fonte não publica gestão nem vínculo SUS: ficam nulos explícitos.
                "management": None,
                "sus": None,
                "neighborhood": _text(properties.get("nm_bairro")),
                "source_id": source_id,
                "reference_date": _text(properties.get("ano")),
                "cnes": _text(properties.get("cnes_n")),
            }
        )
        geometries.append(Point(longitude, latitude))

    units = gpd.GeoDataFrame(rows, geometry=geometries, crs="EPSG:4326")
    if not units["id"].is_unique:
        duplicated = units.loc[units["id"].duplicated(), "id"].tolist()
        raise ValueError(f"{unit_type}: ids duplicados: {', '.join(duplicated)}")
    return units
