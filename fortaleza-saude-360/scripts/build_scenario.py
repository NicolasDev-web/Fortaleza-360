"""Prepara acesso aos corredores para simular sem trocar a base (SDD-039)."""

from __future__ import annotations

import csv
import json
import math
from pathlib import Path

import geopandas as gpd
import networkx as nx
import numpy as np
import shapely
from shapely.geometry import LineString
from shapely.ops import substring

from scripts.isochrones import CRS_METRIC, project_graph, sha256
from scripts.travel_time import SPEED_KMH, load_cost_graph


def entry_fraction(line, point, radius):
    """Primeira fração da curva cujo buffer alcança o ponto (quad_segs=4)."""
    if not line.buffer(radius, quad_segs=4).covers(point):
        return None
    low, high = 0.0, 1.0
    for _ in range(42):
        middle = (low + high) / 2
        prefix = substring(line, 0, middle, normalized=True)
        if prefix.buffer(radius, quad_segs=4).covers(point):
            high = middle
        else:
            low = middle
    return high


def main():
    network = Path("data/processed/walk_network")
    iso = Path("data/processed/isochrones/manifest.json")
    coverage_path = Path("public/data/population-coverage.json")
    sectors_path = Path("data/processed/demand_units.geojson")
    audit_path = Path("data/processed/coverage/sector_coverage.csv")
    coverage = json.loads(coverage_path.read_text(encoding="utf-8"))
    meta = json.loads(iso.read_text(encoding="utf-8"))
    if sha256(audit_path) != coverage["audit"]["sha256"]:
        raise ValueError("Auditoria de população divergente.")
    for path in (sectors_path, network / "nodes.csv", network / "edges.csv"):
        registry = coverage["inputs"] if path == sectors_path else meta["inputs"]
        if registry[str(path)] != sha256(path):
            raise ValueError(f"Entrada divergente: {path}")
    graph = load_cost_graph(network)
    ids = sorted(graph.nodes)
    indexes = {node: i for i, node in enumerate(ids)}
    nodes = [[graph.nodes[n]["lon"], graph.nodes[n]["lat"]] for n in ids]
    project_graph(graph)
    edges = sorted((min(u, v), max(u, v), d) for u, v, d in graph.edges(data=True))
    lines = [d["geometry"] for _, _, d in edges]
    tree = shapely.STRtree(lines)
    sectors = gpd.read_file(sectors_path).to_crs(CRS_METRIC).sort_values("geo_id")
    points = sectors.representative_point()
    municipal = (
        gpd.read_file("public/data/municipal-boundary.geojson")
        .to_crs(CRS_METRIC)
        .geometry.union_all()
    )
    shapely.prepare(municipal)
    radius = meta["buffer_m"]
    audit = {}
    with audit_path.open(encoding="utf-8", newline="") as file:
        for row in csv.DictReader(file):
            audit[row["geo_id"], row["scenario"], int(row["minutes"])] = (
                row["representative_included"] == "True"
            )
    baseline_times = nx.multi_source_dijkstra_path_length(
        graph,
        {row["node"] for row in meta["snapped_facilities"]},
        cutoff=30 * SPEED_KMH["fast"] / SPEED_KMH["central"],
        weight="minutes_central",
    )
    records, mismatches = [], []
    order = [(s, t) for s in SPEED_KMH for t in (10, 20, 30)]
    for (_, row), point in zip(sectors.iterrows(), points, strict=True):
        links = {}
        candidates = (
            tree.query(point, predicate="dwithin", distance=radius)
            if municipal.covers(point)
            else []
        )
        for edge_index in sorted(candidates):
            u, v, data = edges[edge_index]
            line = data["geometry"]
            for node, directed in ((u, line), (v, LineString(list(line.coords)[::-1]))):
                fraction = entry_fraction(directed, point, radius)
                if fraction is not None:
                    cost = fraction * data["minutes_central"]
                    links[node] = min(links.get(node, math.inf), cost)
        central_time = min(
            (baseline_times.get(n, math.inf) + c for n, c in links.items()),
            default=math.inf,
        )
        mask = 0
        for k, (scenario, minutes) in enumerate(order):
            expected = audit[str(row.geo_id), scenario, minutes]
            actual = (
                central_time <= minutes * SPEED_KMH[scenario] / SPEED_KMH["central"]
            )
            if expected:
                mask |= 1 << k
            if actual != expected:
                mismatches.append(
                    [str(row.geo_id), scenario, minutes, expected, actual]
                )
        records.append(
            [
                int(row.population),
                mask,
                [[indexes[n], c] for n, c in sorted(links.items())],
            ]
        )
    if mismatches:
        path = Path("data/processed/scenario-parity-errors.json")
        path.write_text(json.dumps(mismatches, indent=2), encoding="utf-8")
        raise ValueError(f"Paridade falhou em {len(mismatches)} casos; veja {path}")
    boundary = json.loads(
        Path("public/data/municipal-boundary.geojson").read_text(encoding="utf-8")
    )["features"][0]["geometry"]
    result = {
        "schema": 1,
        "nodes": nodes,
        "edges": [[indexes[u], indexes[v], d["minutes_central"]] for u, v, d in edges],
        "sectors": records,
        "sectorIds": list(sectors.geo_id.astype(str)),
        "seeds": sorted({indexes[r["node"]] for r in meta["snapped_facilities"]}),
        "snapScale": math.cos(math.radians(float(np.mean([p[1] for p in nodes])))),
        "maxSnapM": meta["max_snap_m"],
        "boundary": boundary,
        "baseline": coverage["rows"],
        "total": coverage["denominator"]["population"],
        "order": order,
        "speeds": SPEED_KMH,
        "bufferM": radius,
        "provenance": {
            "coverageSha256": sha256(coverage_path),
            "isoManifestSha256": sha256(iso),
            "sources": coverage["sources"],
            "limitations": coverage["limitations"],
            "parity": {"checked": len(records) * 9, "mismatches": 0},
        },
    }
    output = Path("public/data/scenario-model.json")
    output.write_text(
        json.dumps(result, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
        + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(
        f"Paridade: {len(records) * 9} casos; {output.stat().st_size} bytes", flush=True
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
