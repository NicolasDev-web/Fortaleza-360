"""População do Censo em corredores de acessibilidade modelada (SDD-038)."""

from __future__ import annotations

import argparse
import csv
import json
import math
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
import shapely

from scripts.isochrones import BUDGETS, CRS_METRIC, sha256
from scripts.travel_time import SPEED_KMH

LIMITATIONS = [
    "Acessibilidade modelada até alguma UAPS; não representa atendimento, vaga, "
    "capacidade assistencial ou população adscrita.",
    "População do Censo 2022 comparada a UAPS e OSM de 2026, sem projeção demográfica.",
    "Um ponto representa cada setor inteiro; ponderação por área supõe densidade "
    "uniforme. Os limites espaciais não são intervalos de confiança.",
    "Corredores com raio registrado em buffer_m dependem das vias OSM; "
    "podem atravessar barreiras. Conectores até a UAPS não entram no tempo. "
    "Rotas sem validação local.",
    "Licença padronizada do IBGE não confirmada na coleta; atribuição obrigatória.",
]
MEASURES = {
    "representative": "Soma dos setores cujo ponto representativo está no corredor",
    "area_weighted": "Soma de população × fração da área do setor no corredor",
    "full_sector": "Limite espacial inferior: setores inteiramente contidos",
    "any_overlap": "Limite espacial superior: setores com interseção de área positiva",
}


def validate_sectors(sectors):
    ids = sectors["geo_id"]
    if (
        ids.isna().any()
        or ids.duplicated().any()
        or ids.astype(str).str.strip().eq("").any()
    ):
        raise ValueError("Setor sem identificador ou com identificador duplicado.")
    values = pd.to_numeric(sectors["population"], errors="coerce")
    if (
        values.isna().any()
        or not np.isfinite(values).all()
        or (values < 0).any()
        or (values % 1 != 0).any()
    ):
        raise ValueError("População ausente, negativa, não inteira ou não finita.")
    if sectors.empty or sectors.crs is None or set(sectors["year"]) != {2022}:
        raise ValueError("Setores vazios, sem CRS ou com ano diferente de 2022.")
    geometry = sectors.geometry
    if (
        geometry.isna().any()
        or geometry.is_empty.any()
        or not geometry.is_valid.all()
        or not geometry.geom_type.isin(["Polygon", "MultiPolygon"]).all()
        or (geometry.area <= 0).any()
    ):
        raise ValueError("Geometria de setor ausente ou inválida.")


def count_population(sectors, area):
    """Conta cada setor uma vez; usa a mesma população total em todas as medidas."""
    validate_sectors(sectors)
    if sectors.crs.to_epsg() != CRS_METRIC:
        raise ValueError("Projetar setores para EPSG:31984 antes de calcular áreas.")
    if (
        area.is_empty
        or not area.is_valid
        or area.geom_type not in {"Polygon", "MultiPolygon"}
    ):
        raise ValueError("Corredor vazio ou inválido.")
    geometry = sectors.geometry.to_numpy()
    population = sectors["population"].to_numpy(dtype=np.int64)
    shapely.prepare(area)
    full = shapely.covers(area, geometry)
    partial = ~full & shapely.intersects(area, geometry)
    shares = full.astype(float)
    shares[partial] = shapely.area(
        shapely.intersection(geometry[partial], area)
    ) / shapely.area(geometry[partial])
    if (
        not np.isfinite(shares).all()
        or (shares < -1e-9).any()
        or (shares > 1 + 1e-9).any()
    ):
        raise ValueError("Fração de área fora de 0–1.")
    shares = np.clip(shares, 0, 1)
    representative = shapely.covers(area, shapely.point_on_surface(geometry))
    total = int(population.sum())
    values = {
        "representative": int(population[representative].sum()),
        "area_weighted": math.fsum(population * shares),
        "full_sector": int(population[full].sum()),
        "any_overlap": int(population[shares > 0].sum()),
    }
    result = {
        "total_population": total,
        "sectors": len(sectors),
        "zero_population_sectors": int((population == 0).sum()),
    }
    for name, value in values.items():
        if not 0 <= value <= total + 1e-6:
            raise ValueError("Contagem fora do denominador.")
        result[f"{name}_population"] = value
        result[f"{name}_percent"] = value / total * 100 if total else None
    if not (
        values["full_sector"]
        <= min(values["representative"], values["area_weighted"])
        <= max(values["representative"], values["area_weighted"])
        <= values["any_overlap"] + 1e-6
    ):
        raise ValueError("Contagens fora dos limites espaciais.")
    details = [
        {
            "geo_id": str(row.geo_id),
            "population": int(pop),
            "representative_included": bool(rep),
            "area_share": float(share),
            "weighted_population": float(pop * share),
            "full_sector": bool(whole),
            "any_overlap": bool(share > 0),
        }
        for row, pop, rep, share, whole in zip(
            sectors.itertuples(), population, representative, shares, full, strict=True
        )
    ]
    return result, details


def verify_counts(rows):
    expected = {(s, t) for s in SPEED_KMH for t in BUDGETS}
    lookup = {(r["scenario"], r["minutes"]): r for r in rows}
    if len(rows) != len(expected) or set(lookup) != expected:
        raise ValueError("Esperadas nove combinações únicas de tempo e velocidade.")
    if len({r["total_population"] for r in rows}) != 1:
        raise ValueError("Denominador varia entre cenários.")
    for measure in MEASURES:
        key = f"{measure}_population"
        sequences = [[lookup[s, t][key] for t in BUDGETS] for s in SPEED_KMH]
        sequences += [
            [lookup[s, t][key] for s in ("slow", "central", "fast")] for t in BUDGETS
        ]
        if any(a > b + 1e-6 for seq in sequences for a, b in zip(seq, seq[1:])):
            raise ValueError("Contagem não monotônica entre tempos ou velocidades.")


def generate(sectors_path, iso_dir, raw_dir, population_audit, output, audit_dir):
    iso_manifest_path = iso_dir / "manifest.json"
    iso_manifest = json.loads(iso_manifest_path.read_text(encoding="utf-8"))
    iso_path = iso_dir / iso_manifest["output"]["file"]
    if sha256(iso_path) != iso_manifest["output"]["sha256"]:
        raise ValueError("Checksum das isócronas divergente.")
    sectors = gpd.read_file(sectors_path).to_crs(CRS_METRIC).sort_values("geo_id")
    validate_sectors(sectors)
    join_audit = json.loads(population_audit.read_text(encoding="utf-8"))["join"]
    if (
        int(sectors["population"].sum()) != join_audit["population_total"]
        or len(sectors) != join_audit["sectors"]
        or join_audit["sectors_without_population"]
    ):
        raise ValueError("Denominador diverge da auditoria do Censo.")
    sources = [
        json.loads((raw_dir / name).read_text(encoding="utf-8"))
        for name in (
            "ibge-agregados-basico-br-20260520.zip.metadata.json",
            "ibge-setores-ce-2022.gpkg.metadata.json",
        )
    ]
    for field, source in zip(
        ("population_source_id", "geometry_source_id"), sources, strict=True
    ):
        if set(sectors[field]) != {source["source_id"]}:
            raise ValueError("Fonte dos setores diverge dos metadados.")
    isochrones = gpd.read_file(iso_path).to_crs(CRS_METRIC)
    keys = list(zip(isochrones["scenario"], isochrones["minutes"], strict=True))
    if len(keys) != 9 or set(keys) != {(s, t) for s in SPEED_KMH for t in BUDGETS}:
        raise ValueError("Isócronas incompletas ou duplicadas.")
    rows, details = [], []
    for scenario in SPEED_KMH:
        for minutes in BUDGETS:
            area = isochrones.loc[
                (isochrones.scenario == scenario) & (isochrones.minutes == minutes)
            ].geometry.iloc[0]
            result, sectors_detail = count_population(sectors, area)
            rows.append({"scenario": scenario, "minutes": minutes, **result})
            details.extend(
                {"scenario": scenario, "minutes": minutes, **r} for r in sectors_detail
            )
            percent = result["representative_percent"]
            label = f"{percent:.2f}%" if percent is not None else "sem denominador"
            print(
                f"{scenario} / {minutes}: {result['representative_population']} "
                f"({label})",
                flush=True,
            )
    verify_counts(rows)
    sensitivity = []
    for minutes in BUDGETS:
        group = [r for r in rows if r["minutes"] == minutes]
        values = [
            r[f"{method}_population"]
            for r in group
            for method in ("representative", "area_weighted")
        ]
        sensitivity.append(
            {
                "minutes": minutes,
                "population_min": min(values),
                "population_max": max(values),
                "basis": "3 velocidades × 2 métodos de alocação",
            }
        )
    audit_dir.mkdir(parents=True, exist_ok=True)
    audit_csv = audit_dir / "sector_coverage.csv"
    with audit_csv.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=list(details[0]), lineterminator="\n")
        writer.writeheader()
        writer.writerows(details)
    result = {
        "reference_year": 2022,
        "central_method": "representative",
        "denominator": {
            "population": int(sectors.population.sum()),
            "sectors": len(sectors),
            "missing_population_sectors": 0,
        },
        "rows": rows,
        "sensitivity": sensitivity,
        "methods": MEASURES,
        "limitations": LIMITATIONS,
        "buffer_m": iso_manifest["buffer_m"],
        "model": iso_manifest["model"],
        "max_snap_m": iso_manifest["max_snap_m"],
        "sources": sources
        + [iso_manifest["source_osm"]]
        + [layer["source"] for layer in iso_manifest["source_layers"]],
        "inputs": {
            str(p): sha256(p)
            for p in (sectors_path, iso_path, iso_manifest_path, population_audit)
        },
        "audit": {
            "file": str(audit_csv),
            "sha256": sha256(audit_csv),
            "rows": len(details),
        },
        "dictionary": {
            "scenario": "Cenário slow, central ou fast",
            "minutes": "Limiar acumulado de caminhada modelada",
            "total_population": "Denominador: soma de todos os setores com população",
            "sectors": "Número de setores censitários no denominador",
            "zero_population_sectors": "Setores com população zero, preservados",
            **{f"{m}_population": text for m, text in MEASURES.items()},
            **{
                f"{m}_percent": f"100 × {m}_population / total_population; null se zero"
                for m in MEASURES
            },
        },
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(
            result, ensure_ascii=False, indent=2, sort_keys=True, allow_nan=False
        )
        + "\n",
        encoding="utf-8",
        newline="\n",
    )
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--sectors", type=Path, default=Path("data/processed/demand_units.geojson")
    )
    parser.add_argument(
        "--iso-dir", type=Path, default=Path("data/processed/isochrones")
    )
    parser.add_argument("--raw-dir", type=Path, default=Path("data/raw"))
    parser.add_argument(
        "--population-audit",
        type=Path,
        default=Path("data/processed/population_audit.json"),
    )
    parser.add_argument(
        "--output", type=Path, default=Path("public/data/population-coverage.json")
    )
    parser.add_argument(
        "--audit-dir", type=Path, default=Path("data/processed/coverage")
    )
    args = parser.parse_args()
    generate(
        args.sectors,
        args.iso_dir,
        args.raw_dir,
        args.population_audit,
        args.output,
        args.audit_dir,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
