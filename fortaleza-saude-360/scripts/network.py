"""Gera a malha viária a pé de Fortaleza a partir de um extrato OSM (SDD-035).

O custo de cada trecho é só o comprimento em metros. Velocidade, tempo e
impedâncias pertencem à SDD-036; nenhum minuto é calculado aqui.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
from collections.abc import Mapping
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import networkx as nx
import numpy as np
import osmium
import shapely

Bbox = tuple[float, float, float, float]
Point = tuple[str, float, float]

# Margem em graus ao redor do limite municipal (~3 km), a mesma do basemap.
MARGIN = 0.03
EARTH_RADIUS_M = 6371008.8
# Triagem, não regra: além desta distância até o nó da malha, a unidade fica sem acesso.
MAX_SNAP_M = 300

# Conservador: fora ficam motorway e trunk (sem acesso garantido a pedestres),
# construction, proposed, raceway, bus_guideway e vias só para ciclistas.
WALKABLE_HIGHWAYS = frozenset(
    {
        "primary",
        "primary_link",
        "secondary",
        "secondary_link",
        "tertiary",
        "tertiary_link",
        "unclassified",
        "residential",
        "living_street",
        "service",
        "pedestrian",
        "track",
        "road",
        "footway",
        "path",
        "steps",
        "cycleway",
    }
)
# Só entram com pedestre liberado explicitamente (foot=yes/designated/permissive).
FOOT_REQUIRED_HIGHWAYS = frozenset({"cycleway"})
FOOT_ALLOWED = frozenset({"yes", "designated", "permissive"})
FOOT_BLOCKED = frozenset({"no", "private"})
ACCESS_BLOCKED = frozenset(
    {"no", "private", "customers", "delivery", "military", "agricultural", "forestry"}
)

EDGE_FIELDS = ["u", "v", "length_m", "way_id", "highway"]


def haversine_m(a: tuple[float, float], b: tuple[float, float]) -> float:
    """Distância geodésica entre dois pontos (lon, lat), em metros."""

    lon1, lat1 = map(math.radians, a)
    lon2, lat2 = map(math.radians, b)
    h = (
        math.sin((lat2 - lat1) / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    )
    return 2 * EARTH_RADIUS_M * math.asin(min(1.0, math.sqrt(h)))


def is_walkable(tags: Mapping[str, str]) -> bool:
    """Regra conservadora de acesso a pedestres, documentada em docs/WALK_NETWORK.md."""

    highway = tags.get("highway")
    if highway not in WALKABLE_HIGHWAYS:
        return False
    if tags.get("area") == "yes":
        return False

    foot = tags.get("foot")
    if foot in FOOT_ALLOWED:
        return True
    if foot in FOOT_BLOCKED:
        return False
    if highway in FOOT_REQUIRED_HIGHWAYS:
        return False
    return tags.get("access") not in ACCESS_BLOCKED


Run = tuple[int, str, list[tuple[int, float, float]]]


def read_runs(pbf: Path, bbox: Bbox) -> list[Run]:
    """Lê as vias a pé e corta cada uma nos trechos que ficam dentro da caixa."""

    min_lon, min_lat, max_lon, max_lat = bbox
    processor = (
        osmium.FileProcessor(str(pbf), osmium.osm.NODE | osmium.osm.WAY)
        .with_locations()
        .with_filter(osmium.filter.KeyFilter("highway"))
    )
    runs: list[Run] = []

    for way in processor:
        if not way.is_way():  # nós com `highway` também passam o filtro
            continue
        tags = {tag.k: tag.v for tag in way.tags}
        if not is_walkable(tags):
            continue

        current: list[tuple[int, float, float]] = []

        def flush(way_id: int = way.id, highway: str = tags["highway"]) -> None:
            if len(current) >= 2:
                runs.append((way_id, highway, list(current)))
            current.clear()

        for node in way.nodes:
            location = node.location
            if (
                location.valid()
                and min_lon <= location.lon <= max_lon
                and min_lat <= location.lat <= max_lat
            ):
                current.append((node.ref, location.lon, location.lat))
            else:
                flush()
        flush()

    return runs


def build_graph(pbf: Path, bbox: Bbox) -> nx.Graph:
    """Grafo não direcionado: nós são cruzamentos e pontas; custo é `length_m`."""

    runs = read_runs(pbf, bbox)
    if not runs:
        raise ValueError(
            f"Nenhuma via a pé encontrada em {pbf} dentro da caixa {bbox}."
        )

    usage: dict[int, int] = {}
    for _, _, points in runs:
        for ref, _, _ in points:
            usage[ref] = usage.get(ref, 0) + 1

    graph = nx.Graph()
    self_loops = 0
    collapsed = 0

    for way_id, highway, points in runs:
        last = len(points) - 1
        start = points[0]
        start_index = 0
        length = 0.0
        for index in range(1, last + 1):
            previous = points[index - 1]
            ref, lon, lat = points[index]
            length += haversine_m((previous[1], previous[2]), (lon, lat))
            if usage[ref] < 2 and index != last:
                continue

            u, v = start[0], ref
            if u == v:
                self_loops += 1
            else:
                for node_id, node_lon, node_lat in (start, points[index]):
                    graph.add_node(node_id, lon=node_lon, lat=node_lat)
                rounded = round(length, 2)
                if graph.has_edge(u, v):
                    collapsed += 1
                    current = graph[u][v]
                    if (rounded, way_id) >= (current["length_m"], current["way_id"]):
                        start, length = points[index], 0.0
                        start_index = index
                        continue
                coordinates = [(p[1], p[2]) for p in points[start_index : index + 1]]
                if u > v:
                    coordinates.reverse()
                graph.add_edge(
                    u,
                    v,
                    length_m=rounded,
                    way_id=way_id,
                    highway=highway,
                    coordinates=coordinates,
                )
            start, length = points[index], 0.0
            start_index = index

    graph.graph["self_loops_dropped"] = self_loops
    graph.graph["parallel_edges_collapsed"] = collapsed
    graph.graph["ways_kept"] = len({way_id for way_id, _, _ in runs})
    return graph


def _components(graph: nx.Graph) -> list[set[int]]:
    """Componentes do maior para o menor; empate pelo menor id (determinístico)."""

    return sorted(nx.connected_components(graph), key=lambda c: (-len(c), min(c)))


def _length_km(graph: nx.Graph, nodes: set[int] | None = None) -> float:
    view = graph if nodes is None else graph.subgraph(nodes)
    return sum(data["length_m"] for _, _, data in view.edges(data=True)) / 1000


def connectivity_report(graph: nx.Graph) -> dict[str, Any]:
    components = _components(graph)
    largest = components[0]
    total = _length_km(graph)
    largest_km = _length_km(graph, largest)
    return {
        "cost": "length_m",
        "nodes": graph.number_of_nodes(),
        "edges": graph.number_of_edges(),
        "total_length_km": round(total, 3),
        "components": len(components),
        "largest_component_nodes": len(largest),
        "largest_component_length_km": round(largest_km, 3),
        "largest_component_share_of_nodes": round(
            len(largest) / graph.number_of_nodes(), 6
        ),
        "largest_component_share_of_length": round(largest_km / total, 6)
        if total
        else 0.0,
        "self_loops_dropped": graph.graph.get("self_loops_dropped", 0),
        "parallel_edges_collapsed": graph.graph.get("parallel_edges_collapsed", 0),
        "ways_kept": graph.graph.get("ways_kept", 0),
    }


def facility_access_report(
    graph: nx.Graph, points: list[Point], max_snap_m: float = MAX_SNAP_M
) -> dict[str, Any]:
    """Liga cada unidade ao nó mais próximo e vê se ele está na maior componente."""

    node_ids = sorted(graph.nodes)
    largest = _components(graph)[0]
    coords = np.array(
        [(graph.nodes[n]["lon"], graph.nodes[n]["lat"]) for n in node_ids]
    )
    scale = math.cos(math.radians(float(coords[:, 1].mean())))

    def planar(lon: Any, lat: Any) -> np.ndarray:
        return np.column_stack([np.asarray(lon) * scale, np.asarray(lat)])

    tree = shapely.STRtree(shapely.points(planar(coords[:, 0], coords[:, 1])))
    queries = shapely.points(planar([p[1] for p in points], [p[2] for p in points]))
    nearest = tree.nearest(queries)

    rows = []
    for (facility_id, lon, lat), index in zip(points, nearest, strict=True):
        node = node_ids[int(index)]
        snap = haversine_m(
            (lon, lat), (graph.nodes[node]["lon"], graph.nodes[node]["lat"])
        )
        rows.append(
            {
                "id": facility_id,
                "nearest_node": node,
                "snap_m": round(snap, 1),
                "in_largest_component": node in largest,
                "within_snap_limit": snap <= max_snap_m,
            }
        )

    snaps = sorted(row["snap_m"] for row in rows)
    return {
        "total": len(rows),
        "max_snap_m_limit": max_snap_m,
        "within_snap_limit": sum(row["within_snap_limit"] for row in rows),
        "in_largest_component": sum(row["in_largest_component"] for row in rows),
        "in_largest_component_within_limit": sum(
            row["in_largest_component"] and row["within_snap_limit"] for row in rows
        ),
        "snap_m_median": snaps[len(snaps) // 2] if snaps else None,
        "snap_m_max": snaps[-1] if snaps else None,
        "facilities": rows,
    }


def write_network(graph: nx.Graph, output_dir: Path) -> dict[str, Path]:
    """Grava nós e arestas em CSV, em ordem estável (mesma entrada, mesmos bytes)."""

    output_dir.mkdir(parents=True, exist_ok=True)
    nodes_path = output_dir / "nodes.csv"
    edges_path = output_dir / "edges.csv"

    with nodes_path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.writer(file, lineterminator="\n")
        writer.writerow(["id", "lon", "lat"])
        for node in sorted(graph.nodes):
            data = graph.nodes[node]
            writer.writerow([node, f"{data['lon']:.7f}", f"{data['lat']:.7f}"])

    edges = sorted(
        (min(u, v), max(u, v), data) for u, v, data in graph.edges(data=True)
    )
    with edges_path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.writer(file, lineterminator="\n")
        writer.writerow([*EDGE_FIELDS, "coordinates"])
        for u, v, data in edges:
            writer.writerow(
                [
                    u,
                    v,
                    f"{data['length_m']:.2f}",
                    data["way_id"],
                    data["highway"],
                    json.dumps(data["coordinates"], separators=(",", ":"))
                    if "coordinates" in data
                    else "",
                ]
            )

    return {"nodes": nodes_path, "edges": edges_path}


def bbox_from_boundary(boundary: Path, margin: float = MARGIN) -> Bbox:
    import geopandas

    min_lon, min_lat, max_lon, max_lat = geopandas.read_file(boundary).total_bounds
    return (
        round(float(min_lon) - margin, 4),
        round(float(min_lat) - margin, 4),
        round(float(max_lon) + margin, 4),
        round(float(max_lat) + margin, 4),
    )


def read_facility_points(path: Path) -> list[Point]:
    collection = json.loads(path.read_text(encoding="utf-8"))
    return [
        (
            str(feature["properties"]["id"]),
            feature["geometry"]["coordinates"][0],
            feature["geometry"]["coordinates"][1],
        )
        for feature in collection["features"]
    ]


def osm_snapshot(pbf: Path) -> dict[str, Any]:
    """Data dos dados OSM (cabeçalho do arquivo) e checksum do arquivo bruto."""

    timestamp = None
    try:
        reader = osmium.io.Reader(str(pbf), osmium.osm.NOTHING)
        timestamp = reader.header().get("osmosis_replication_timestamp") or None
        reader.close()
    except Exception:  # cabeçalho ausente não impede a malha; fica registrado como nulo
        timestamp = None

    checksum = pbf.with_name(f"{pbf.name}.sha256")
    sha256 = (
        checksum.read_text(encoding="utf-8").split()[0] if checksum.exists() else None
    )
    return {"file": pbf.name, "data_timestamp": timestamp, "sha256": sha256}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--pbf", type=Path, default=Path("data/raw/osm-nordeste-261027.osm.pbf")
    )
    parser.add_argument(
        "--boundary", type=Path, default=Path("data/raw/municipal-boundary.geojson")
    )
    parser.add_argument(
        "--facilities", type=Path, default=Path("public/data/facilities.geojson")
    )
    parser.add_argument(
        "--output-dir", type=Path, default=Path("data/processed/walk_network")
    )
    parser.add_argument("--max-snap-m", type=float, default=MAX_SNAP_M)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    bbox = bbox_from_boundary(args.boundary)
    graph = build_graph(args.pbf, bbox)
    paths = write_network(graph, args.output_dir)

    audit = {
        "generated_at": datetime.now(UTC)
        .isoformat(timespec="seconds")
        .replace("+00:00", "Z"),
        "osm": osm_snapshot(args.pbf),
        "license": "ODbL 1.0 — © OpenStreetMap contributors",
        "bbox": list(bbox),
        "cost": {"attribute": "length_m", "unit": "metro", "speed": None},
        "rules": {
            "walkable_highways": sorted(WALKABLE_HIGHWAYS),
            "foot_required_highways": sorted(FOOT_REQUIRED_HIGHWAYS),
            "foot_allowed": sorted(FOOT_ALLOWED),
            "foot_blocked": sorted(FOOT_BLOCKED),
            "access_blocked": sorted(ACCESS_BLOCKED),
            "area_yes_excluded": True,
            "oneway_ignored": True,
        },
        "connectivity": connectivity_report(graph),
        "facility_access": facility_access_report(
            graph, read_facility_points(args.facilities), args.max_snap_m
        ),
        "outputs": {key: str(path) for key, path in paths.items()},
    }
    audit_path = args.output_dir / "audit.json"
    audit_path.write_text(
        json.dumps(audit, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    connectivity = audit["connectivity"]
    access = audit["facility_access"]
    share = connectivity["largest_component_share_of_length"]
    print(
        f"{connectivity['nodes']} nós, {connectivity['edges']} trechos, "
        f"{connectivity['total_length_km']} km; "
        f"{connectivity['components']} componentes; "
        f"maior = {share:.2%} do comprimento; "
        f"UAPS na maior componente e a até {access['max_snap_m_limit']:.0f} m: "
        f"{access['in_largest_component_within_limit']}/{access['total']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
