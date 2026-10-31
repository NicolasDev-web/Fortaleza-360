"""Modelo de custo de trajeto a pé sobre a malha viária (SDD-036).

Todo tempo vem de caminhos na malha de `scripts/network.py`; nunca de distância
em linha reta. Velocidade e fatores de via são hipóteses documentadas em
`docs/TRAVEL_TIME.md`, não medições locais.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import unicodedata
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import networkx as nx
import numpy as np
import shapely

from scripts.network import MAX_SNAP_M, haversine_m, read_facility_points

# km/h: central de planejamento urbano; faixa para adultos mais lentos e mais rápidos.
SPEED_KMH: dict[str, float] = {"slow": 4.0, "central": 4.8, "fast": 5.5}

# Multiplicador do tempo por tipo de via: só o que o OSM informa; sem calibração.
IMPEDANCE: dict[str, float] = {"steps": 2.0, "track": 1.25, "path": 1.25}

NOT_MODELED = [
    "gradient",
    "crossing_wait",
    "surface",
    "lighting",
    "safety",
    "sidewalk_presence",
    "weather_and_heat",
    "connector_to_network",
]

DEFAULT_NEIGHBORHOODS = [
    "Parque Araxá",
    "Jangurussu",
    "Meireles",
    "Messejana",
    "Pirambu",
]


def _check_scenario(scenario: str) -> None:
    if scenario not in SPEED_KMH:
        raise ValueError(f"Cenário de velocidade desconhecido: {scenario!r}.")


def edge_minutes(length_m: float, highway: str, scenario: str) -> float:
    """Minutos para percorrer um trecho: metros ÷ velocidade × fator do tipo de via."""

    _check_scenario(scenario)
    if not math.isfinite(length_m) or length_m < 0:
        raise ValueError(f"Comprimento inválido: {length_m!r}.")
    metres_per_minute = SPEED_KMH[scenario] * 1000 / 60
    return length_m / metres_per_minute * IMPEDANCE.get(highway, 1.0)


def load_cost_graph(network_dir: Path) -> nx.Graph:
    """Lê `nodes.csv` e `edges.csv` e acrescenta `minutes_<cenário>` a cada trecho."""

    graph = nx.Graph()
    with (network_dir / "nodes.csv").open(encoding="utf-8", newline="") as file:
        for row in csv.DictReader(file):
            graph.add_node(int(row["id"]), lon=float(row["lon"]), lat=float(row["lat"]))

    with (network_dir / "edges.csv").open(encoding="utf-8", newline="") as file:
        for row in csv.DictReader(file):
            length = float(row["length_m"])
            highway = row["highway"]
            attributes: dict[str, Any] = {
                "length_m": length,
                "way_id": int(row["way_id"]),
                "highway": highway,
                "factor": IMPEDANCE.get(highway, 1.0),
            }
            if row.get("coordinates"):
                attributes["coordinates"] = json.loads(row["coordinates"])
            for scenario in SPEED_KMH:
                attributes[f"minutes_{scenario}"] = edge_minutes(
                    length, highway, scenario
                )
            graph.add_edge(int(row["u"]), int(row["v"]), **attributes)
    return graph


def network_minutes(
    graph: nx.Graph, source: int, target: int, scenario: str = "central"
) -> dict[str, Any] | None:
    """Menor tempo pela malha entre dois nós; `None` se não existem ou não se ligam."""

    _check_scenario(scenario)
    weight = f"minutes_{scenario}"
    if source not in graph or target not in graph:
        return None
    try:
        path = nx.shortest_path(graph, source, target, weight=weight)
    except nx.NetworkXNoPath:
        return None

    edges = [graph[a][b] for a, b in zip(path, path[1:], strict=False)]
    return {
        "minutes": sum(edge[weight] for edge in edges),
        "length_m": sum(edge["length_m"] for edge in edges),
        "path_nodes": path,
        "scenario": scenario,
    }


def nearest_by_network(
    graph: nx.Graph, source: int, targets: dict[str, int], scenario: str = "central"
) -> dict[str, Any] | None:
    """Destino mais rápido pela malha; um destino isolado não conta, mesmo se perto."""

    _check_scenario(scenario)
    if source not in graph:
        return None
    weight = f"minutes_{scenario}"
    reached = nx.single_source_dijkstra_path_length(graph, source, weight=weight)
    candidates = [
        (reached[node], name) for name, node in targets.items() if node in reached
    ]
    if not candidates:
        return None

    _, name = min(candidates)
    result = network_minutes(graph, source, targets[name], scenario)
    return None if result is None else {"target": name, **result}


class NodeIndex:
    """Liga um ponto (lon, lat) ao nó mais próximo, recusando o que fica longe."""

    def __init__(self, graph: nx.Graph) -> None:
        self._ids = sorted(graph.nodes)
        self._coords = np.array(
            [(graph.nodes[n]["lon"], graph.nodes[n]["lat"]) for n in self._ids]
        )
        self._scale = math.cos(math.radians(float(self._coords[:, 1].mean())))
        self._tree = shapely.STRtree(
            shapely.points(self._planar(self._coords[:, 0], self._coords[:, 1]))
        )

    def _planar(self, lon: Any, lat: Any) -> np.ndarray:
        return np.column_stack([np.asarray(lon) * self._scale, np.asarray(lat)])

    def snap(
        self, lon: float, lat: float, max_snap_m: float = MAX_SNAP_M
    ) -> tuple[int, float] | None:
        """Devolve (nó, distância em metros) ou `None` se passar do limite."""

        query = shapely.points(self._planar([lon], [lat]))
        index = int(self._tree.nearest(query)[0])
        node_lon, node_lat = self._coords[index]
        distance = haversine_m((lon, lat), (float(node_lon), float(node_lat)))
        return (self._ids[index], distance) if distance <= max_snap_m else None


def circuity(network_m: float, straight_m: float) -> float | None:
    """Razão caminho pela malha ÷ linha reta; só confere o modelo, não gera tempo."""

    return network_m / straight_m if straight_m > 0 else None


def model_report(graph: nx.Graph) -> dict[str, Any]:
    return {
        "speed_kmh": SPEED_KMH,
        "impedance": IMPEDANCE,
        "impedance_basis": "hipótese não calibrada com medição local",
        "formula": "minutos = comprimento_m ÷ (km/h × 1000 ÷ 60) × fator_da_via",
        "not_modeled": NOT_MODELED,
        "nodes": graph.number_of_nodes(),
        "edges": graph.number_of_edges(),
        "total_length_km": round(
            sum(data["length_m"] for _, _, data in graph.edges(data=True)) / 1000, 3
        ),
    }


def _normalize(text: str) -> str:
    folded = unicodedata.normalize("NFKD", text)
    return "".join(c for c in folded if not unicodedata.combining(c)).casefold().strip()


def validation_pairs(
    graph: nx.Graph,
    neighborhoods: Path,
    facilities: Path,
    names: list[str],
    max_snap_m: float = MAX_SNAP_M,
) -> list[dict[str, Any]]:
    """Pares reais para conferência manual: centro do bairro → UAPS mais rápida a pé."""

    import geopandas

    index = NodeIndex(graph)
    units = read_facility_points(facilities)
    unit_names = {
        str(f["properties"]["id"]): f["properties"]["name"]
        for f in json.loads(facilities.read_text(encoding="utf-8"))["features"]
    }
    targets: dict[str, int] = {}
    unit_position: dict[str, tuple[float, float]] = {}
    for unit_id, lon, lat in units:
        snapped = index.snap(lon, lat, max_snap_m)
        if snapped:
            targets[unit_id] = snapped[0]
            unit_position[unit_id] = (lon, lat)

    frame = geopandas.read_file(neighborhoods)
    centers = frame.to_crs(31984).representative_point().to_crs(4326)
    by_name = {
        _normalize(row["name"]): center
        for (_, row), center in zip(frame.iterrows(), centers, strict=True)
    }

    rows: list[dict[str, Any]] = []
    for name in names:
        center = by_name.get(_normalize(name))
        if center is None:
            continue
        origin = (center.x, center.y)
        snapped = index.snap(*origin, max_snap_m)
        if snapped is None:
            rows.append(
                {"neighborhood": name, "result": "origem longe demais da malha"}
            )
            continue

        row: dict[str, Any] = {
            "neighborhood": name,
            "origin": {"lon": round(origin[0], 6), "lat": round(origin[1], 6)},
            "origin_snap_m": round(snapped[1], 1),
        }
        best = nearest_by_network(graph, snapped[0], targets, "central")
        if best is None:
            row["result"] = "nenhuma UAPS alcançável pela malha"
            rows.append(row)
            continue

        straight = haversine_m(origin, unit_position[best["target"]])
        row.update(
            {
                "facility_id": best["target"],
                "facility": unit_names[best["target"]],
                "network_m": round(best["length_m"], 1),
                "straight_line_m": round(straight, 1),
                "circuity": round(circuity(best["length_m"], straight) or 0, 2),
                "minutes": {
                    scenario: round(
                        network_minutes(
                            graph, snapped[0], targets[best["target"]], scenario
                        )["minutes"],
                        1,
                    )
                    for scenario in SPEED_KMH
                },
                "manual_check": "pendente",
            }
        )
        rows.append(row)
    return rows


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--network-dir", type=Path, default=Path("data/processed/walk_network")
    )
    parser.add_argument(
        "--neighborhoods", type=Path, default=Path("public/data/neighborhoods.geojson")
    )
    parser.add_argument(
        "--facilities", type=Path, default=Path("public/data/facilities.geojson")
    )
    parser.add_argument("--max-snap-m", type=float, default=MAX_SNAP_M)
    parser.add_argument("--neighborhood", action="append", dest="names")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    graph = load_cost_graph(args.network_dir)
    pairs = validation_pairs(
        graph,
        args.neighborhoods,
        args.facilities,
        args.names or DEFAULT_NEIGHBORHOODS,
        args.max_snap_m,
    )
    report = {
        "generated_at": datetime.now(UTC)
        .isoformat(timespec="seconds")
        .replace("+00:00", "Z"),
        "network": str(args.network_dir),
        "model": model_report(graph),
        "validation_pairs": pairs,
    }
    path = args.network_dir / "travel_time_model.json"
    path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    for pair in pairs:
        if "minutes" in pair:
            print(
                f"{pair['neighborhood']} -> {pair['facility']}: "
                f"{pair['network_m']} m pela malha "
                f"({pair['straight_line_m']} m em linha reta), "
                f"{pair['minutes']['central']} min "
                f"(faixa {pair['minutes']['fast']}-{pair['minutes']['slow']})"
            )
        else:
            print(f"{pair['neighborhood']}: {pair['result']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
