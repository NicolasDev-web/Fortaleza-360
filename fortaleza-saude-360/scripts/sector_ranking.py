"""Lista descritiva de setores por distância em linha reta à UAPS, SDD-050."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import geopandas as gpd
import pandas as pd


def distances(
    origin: tuple[float, float], destinations: list[tuple[float, float]]
) -> list[float]:
    lon, lat = map(math.radians, origin)
    result = []
    for x, y in destinations:
        x, y = math.radians(x), math.radians(y)
        a = (
            math.sin((y - lat) / 2) ** 2
            + math.cos(lat) * math.cos(y) * math.sin((x - lon) / 2) ** 2
        )
        result.append(6371008.8 * 2 * math.asin(min(1, math.sqrt(a))))
    return result


def rank_sectors(
    sectors: gpd.GeoDataFrame, facilities: gpd.GeoDataFrame, crosswalk: pd.DataFrame
) -> list[dict]:
    if sectors.crs is None or facilities.crs is None or facilities.empty:
        raise ValueError("CRS e UAPS são obrigatórios")
    if (
        sectors.geo_id.duplicated().any()
        or sectors.population.isna().any()
        or (sectors.population < 0).any()
        or (sectors.population % 1 != 0).any()
    ):
        raise ValueError("Setores duplicados ou população inválida")
    if sectors.geometry.is_empty.any() or not sectors.geometry.is_valid.all():
        raise ValueError("Geometria de setor inválida")
    primary = crosswalk[crosswalk.is_primary].copy()
    if primary.geo_id.duplicated().any() or set(primary.geo_id) != set(sectors.geo_id):
        raise ValueError("Cada setor precisa de um bairro principal")
    neighborhoods = primary.set_index("geo_id").neighborhood_code.to_dict()
    points = sectors.to_crs(31984).representative_point().to_crs(4326)
    units = facilities.to_crs(4326).sort_values("id")
    destinations = [(p.x, p.y) for p in units.geometry]
    ids = list(units.id)
    rows = []
    for (_, sector), point in zip(sectors.iterrows(), points, strict=True):
        measured = distances((point.x, point.y), destinations)
        nearest = min(range(len(ids)), key=lambda i: (measured[i], ids[i]))
        rows.append(
            {
                "geo_id": str(sector.geo_id),
                "neighborhood_code": str(neighborhoods[sector.geo_id]),
                "population": int(sector.population),
                "distance_m": round(measured[nearest], 1),
                "facility_id": str(ids[nearest]),
            }
        )
    return sorted(rows, key=lambda row: (-row["distance_m"], row["geo_id"]))


def main() -> None:
    sector_file = Path("data/processed/demand_units.geojson")
    unit_file = Path("public/data/facilities.geojson")
    crosswalk_file = Path("data/processed/sector_neighborhood_crosswalk.csv")
    rows = rank_sectors(
        gpd.read_file(sector_file),
        gpd.read_file(unit_file),
        pd.read_csv(crosswalk_file, dtype={"geo_id": str, "neighborhood_code": str}),
    )
    population = json.loads(
        Path("public/data/neighborhood-population.json").read_text(encoding="utf-8")
    )
    manifest = json.loads(Path("public/data/manifest.json").read_text(encoding="utf-8"))
    sources = population["sources"] + [
        layer
        for layer in manifest["layers"]
        if layer["id"] in ("facilities", "neighborhoods")
    ]
    payload = {
        "schema": 1,
        "reference_year": 2022,
        "total_population": sum(row["population"] for row in rows),
        "rows": rows,
        "method": (
            "Ponto representativo interno de cada setor em EPSG:31984; distância "
            "haversine em WGS84 até a UAPS mais próxima de toda a cidade. Ordem "
            "decrescente por distância arredondada a 0,1 m, desempate por código. "
            "Bairro principal por maior fração de área."
        ),
        "sources": sources,
        "inputs": {
            str(path): hashlib.sha256(path.read_bytes()).hexdigest()
            for path in (sector_file, unit_file, crosswalk_file)
        },
        "limitations": [
            "Não é percurso nem tempo pelas ruas; não representa a distância "
            "de todos os moradores",
            "Não classifica vulnerabilidade, atendimento, capacidade ou "
            "prioridade de implantação",
            "Inclui setores de população zero; Censo 2022 e UAPS 2026, "
            "sem projeção demográfica",
            "Licença padronizada IBGE não confirmada na coleta",
        ],
        "dictionary": {
            "geo_id": "Código do setor censitário IBGE",
            "neighborhood_code": "Bairro principal por maior fração de área",
            "population": "Moradores do setor, Censo 2022",
            "distance_m": (
                "Distância do ponto representativo à UAPS em metros, linha reta"
            ),
            "facility_id": "Identificador da UAPS mais próxima",
        },
    }
    output = Path("public/data/sector-ranking.json")
    output.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(
        f"{len(rows)} setores; {payload['total_population']} moradores; "
        f"{output.stat().st_size} bytes"
    )


if __name__ == "__main__":
    main()
