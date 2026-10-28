"""Soma a população do Censo 2022 por bairro, com a faixa entre dois métodos."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import pandas as pd

METHOD = (
    "Valor central: cada setor censitário entra inteiro no bairro onde fica a maior "
    "parte da sua área. Faixa: mínimo e máximo entre esse valor e a ponderação pela "
    "área do setor dentro de cada bairro."
)


def aggregate_by_neighborhood(
    population: pd.DataFrame,
    crosswalk: pd.DataFrame,
    neighborhood_codes: list[str],
) -> list[dict[str, Any]]:
    """Agrega sem perder bairros nem setores; a faixa expõe a incerteza da divisa."""
    missing = sorted(set(crosswalk["geo_id"]) - set(population["geo_id"]))
    if missing:
        raise ValueError(f"Setores sem população: {', '.join(missing)}")
    if population["population"].isna().any():
        raise ValueError("População nula: resolva antes de agregar")

    rows = crosswalk.dropna(subset=["neighborhood_code"]).merge(
        population, on="geo_id", validate="many_to_one"
    )
    rows["weighted"] = rows["population"] * rows["area_share"]
    whole = rows[rows["is_primary"]].groupby("neighborhood_code")["population"].agg(
        ["sum", "count"]
    )
    weighted = rows.groupby("neighborhood_code")["weighted"].sum()

    result: list[dict[str, Any]] = []
    empty = []
    for code in neighborhood_codes:
        if code not in weighted.index:
            empty.append(code)
            continue
        central = int(whole["sum"].get(code, 0))
        areal = int(round(float(weighted[code])))
        result.append(
            {
                "code": code,
                "population": central,
                "population_low": min(central, areal),
                "population_high": max(central, areal),
                "sectors": int(whole["count"].get(code, 0)),
            }
        )
    if empty:
        raise ValueError(f"Bairros sem nenhum setor no crosswalk: {', '.join(empty)}")
    return result


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--sectors", type=Path, default=Path("data/processed/demand_units.geojson")
    )
    parser.add_argument(
        "--crosswalk",
        type=Path,
        default=Path("data/processed/sector_neighborhood_crosswalk.csv"),
    )
    parser.add_argument(
        "--neighborhoods", type=Path, default=Path("public/data/neighborhoods.geojson")
    )
    parser.add_argument("--raw-dir", type=Path, default=Path("data/raw"))
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("public/data/neighborhood-population.json"),
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    sectors = json.loads(args.sectors.read_text(encoding="utf-8"))["features"]
    population = pd.DataFrame(
        [
            {
                "geo_id": str(feature["properties"]["geo_id"]),
                "population": feature["properties"]["population"],
            }
            for feature in sectors
        ]
    )
    crosswalk = pd.read_csv(
        args.crosswalk, dtype={"geo_id": str, "neighborhood_code": str}
    )
    neighborhoods = json.loads(args.neighborhoods.read_text(encoding="utf-8"))
    codes = [str(item["properties"]["code"]) for item in neighborhoods["features"]]

    rows = aggregate_by_neighborhood(population, crosswalk, codes)
    sources = [
        json.loads((args.raw_dir / name).read_text(encoding="utf-8"))
        for name in (
            "ibge-agregados-basico-br-20260520.zip.metadata.json",
            "ibge-setores-ce-2022.gpkg.metadata.json",
        )
    ]
    payload = {
        "reference_year": 2022,
        "method": METHOD,
        "total_population": int(population["population"].sum()),
        "sources": [
            {
                "id": source["source_id"],
                "organization": source["organization"],
                "download_url": source["download_url"],
                "collected_at": source["collected_at"],
                "sha256": source["sha256"],
                "license": source["license"],
                "attribution": source["attribution"],
            }
            for source in sources
        ],
        "neighborhoods": rows,
    }
    args.output.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
        newline="\n",
    )
    total = payload["total_population"]
    print(f"{len(rows)} bairros, {total} pessoas -> {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
