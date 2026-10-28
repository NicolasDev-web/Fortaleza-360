"""Associa a população do Censo 2022 aos setores e documenta o crosswalk com bairros."""

from __future__ import annotations

import argparse
import csv
import io
import json
import zipfile
from pathlib import Path
from typing import Any

import geopandas as gpd
import pandas as pd

FORTALEZA_IBGE = "2304400"
# SIRGAS 2000 / UTM 24S: áreas em metros quadrados para Fortaleza.
AREA_CRS = "EPSG:31984"
SPLIT_THRESHOLD = 0.95
REMAINDER_TOLERANCE = 1e-3
MISSING_POPULATION = "setor sem registro no agregado"


def load_sectors(path: Path, municipality: str = FORTALEZA_IBGE) -> gpd.GeoDataFrame:
    sectors = gpd.read_file(path, where=f"CD_MUN = '{municipality}'")
    if sectors.empty:
        raise ValueError(f"Nenhum setor do município {municipality} em {path}")
    invalid = sectors.loc[~sectors.geometry.is_valid, "CD_SETOR"].tolist()
    if invalid:
        raise ValueError(f"Setores com geometria inválida: {', '.join(invalid)}")
    return gpd.GeoDataFrame(
        {
            "geo_id": sectors["CD_SETOR"].astype(str),
            "situation": sectors["CD_SIT"].astype(str),
            "ibge_neighborhood_code": sectors["CD_BAIRRO"].astype(str),
            "ibge_neighborhood_name": sectors["NM_BAIRRO"],
        },
        geometry=sectors.geometry,
        crs=sectors.crs,
    ).to_crs("EPSG:4326")


def load_population(path: Path, municipality: str = FORTALEZA_IBGE) -> pd.DataFrame:
    with zipfile.ZipFile(path) as archive:
        (member,) = [name for name in archive.namelist() if name.endswith(".csv")]
        with archive.open(member) as file:
            reader = csv.DictReader(
                io.TextIOWrapper(file, encoding="latin-1"), delimiter=";"
            )
            rows = [
                {"geo_id": row["CD_SETOR"], "population": row["v0001"]}
                for row in reader
                if row["CD_MUN"] == municipality
            ]
    if not rows:
        raise ValueError(f"Nenhum setor do município {municipality} em {path}")
    population = pd.DataFrame(rows)
    non_numeric = population.loc[~population["population"].str.isdigit(), "geo_id"]
    if not non_numeric.empty:
        raise ValueError(
            "População não numérica (sigilo ou erro) em: "
            + ", ".join(non_numeric.tolist())
        )
    population["population"] = population["population"].astype(int)
    return population


def join_population(
    sectors: gpd.GeoDataFrame, population: pd.DataFrame
) -> tuple[gpd.GeoDataFrame, dict[str, Any]]:
    """Junta população à geometria sem descartar setores de nenhum dos lados."""
    duplicated = population.loc[population["geo_id"].duplicated(), "geo_id"]
    if not duplicated.empty:
        raise ValueError(f"Setores duplicados no agregado: {', '.join(duplicated)}")
    orphan = sorted(set(population["geo_id"]) - set(sectors["geo_id"]))
    if orphan:
        raise ValueError(
            "População sem geometria correspondente (seria perdida): "
            + ", ".join(orphan)
        )

    joined = sectors.merge(population, on="geo_id", how="left", validate="one_to_one")
    joined["population"] = joined["population"].astype("Int64")
    missing = joined["population"].isna()
    joined["population_missing_reason"] = None
    joined.loc[missing, "population_missing_reason"] = MISSING_POPULATION

    audit = {
        "sectors": len(joined),
        "sectors_without_population": sorted(joined.loc[missing, "geo_id"]),
        "sectors_with_zero_population": int((joined["population"] == 0).sum()),
        "population_total": int(joined["population"].sum()),
    }
    return joined, audit


def build_crosswalk(
    sectors: gpd.GeoDataFrame, neighborhoods: gpd.GeoDataFrame
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Fração da área de cada setor em cada bairro; o resto fica sem bairro."""
    projected = sectors[["geo_id", "geometry"]].to_crs(AREA_CRS)
    projected["sector_area"] = projected.geometry.area
    pieces = gpd.overlay(
        projected,
        neighborhoods[["code", "geometry"]].to_crs(AREA_CRS),
        how="intersection",
        keep_geom_type=True,
    )
    pieces["area_share"] = pieces.geometry.area / pieces["sector_area"]
    rows = pieces[pieces["area_share"] > 0][["geo_id", "code", "area_share"]].rename(
        columns={"code": "neighborhood_code"}
    )

    covered = rows.groupby("geo_id")["area_share"].sum()
    coverage = projected.set_index("geo_id").index.to_series().map(covered).fillna(0)
    remainder = (1 - coverage)[lambda share: share > REMAINDER_TOLERANCE]
    rows = pd.concat(
        [
            rows,
            pd.DataFrame(
                {
                    "geo_id": remainder.index,
                    "neighborhood_code": None,
                    "area_share": remainder.to_numpy(),
                }
            ),
        ],
        ignore_index=True,
    )
    rows = rows.sort_values(
        ["geo_id", "area_share"], ascending=[True, False], kind="stable"
    )
    rows["is_primary"] = ~rows["geo_id"].duplicated()
    rows = rows.reset_index(drop=True)

    primary = rows[rows["is_primary"]].set_index("geo_id")
    audit = {
        "sectors": int(projected["geo_id"].nunique()),
        "crosswalk_rows": len(rows),
        "split_sectors": sorted(
            primary.index[
                primary["neighborhood_code"].notna()
                & (primary["area_share"] < SPLIT_THRESHOLD)
            ]
        ),
        "unassigned_sectors": sorted(
            primary.index[primary["neighborhood_code"].isna()]
        ),
        "overlapping_sectors": sorted(
            coverage.index[coverage > 1 + REMAINDER_TOLERANCE]
        ),
        "neighborhoods_without_sector": sorted(
            set(neighborhoods["code"]) - set(rows["neighborhood_code"].dropna())
        ),
    }
    lost = set(sectors["geo_id"]) - set(rows["geo_id"])
    if lost or audit["sectors"] != len(sectors):
        raise ValueError(f"Crosswalk perdeu setores: {', '.join(sorted(lost))}")
    return rows, audit


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--sectors", type=Path, default=Path("data/raw/ibge-setores-ce-2022.gpkg")
    )
    parser.add_argument(
        "--population",
        type=Path,
        default=Path("data/raw/ibge-agregados-basico-br-20260520.zip"),
    )
    parser.add_argument(
        "--neighborhoods", type=Path, default=Path("public/data/neighborhoods.geojson")
    )
    parser.add_argument("--output-dir", type=Path, default=Path("data/processed"))
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    sectors, join_audit = join_population(
        load_sectors(args.sectors), load_population(args.population)
    )
    neighborhoods = gpd.read_file(args.neighborhoods)
    crosswalk, crosswalk_audit = build_crosswalk(sectors, neighborhoods)

    allocated = crosswalk.merge(sectors[["geo_id", "population"]], on="geo_id")
    allocated["weighted"] = (
        allocated["population"].astype(float) * allocated["area_share"]
    )
    weighted_total = float(allocated["weighted"].sum())
    unassigned_population = float(
        allocated.loc[allocated["neighborhood_code"].isna(), "weighted"].sum()
    )

    sectors["year"] = 2022
    sectors["population_source_id"] = "IBGE-AGREGADOS-SETORES-BASICO-CD2022-20260520"
    sectors["geometry_source_id"] = "IBGE-MALHA-SETORES-CD2022-CE"
    sectors["aggregation_method"] = "setor censitário (sem agregação)"

    args.output_dir.mkdir(parents=True, exist_ok=True)
    sectors.to_file(args.output_dir / "demand_units.geojson", driver="GeoJSON")
    crosswalk.to_csv(
        args.output_dir / "sector_neighborhood_crosswalk.csv",
        index=False,
        lineterminator="\n",
    )
    audit = {
        "join": join_audit,
        "crosswalk": crosswalk_audit,
        "population_weighted_total": round(weighted_total, 3),
        "population_outside_neighborhoods": round(unassigned_population, 3),
    }
    (args.output_dir / "population_audit.json").write_text(
        json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(
        f"{join_audit['sectors']} setores, população {join_audit['population_total']}, "
        f"{len(crosswalk_audit['split_sectors'])} divididos, "
        f"{len(crosswalk_audit['unassigned_sectors'])} sem bairro"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
