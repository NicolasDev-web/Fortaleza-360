"""Testes do modelo de custo de trajeto a pé (SDD-036) com grafos sintéticos `DEMO`."""

from __future__ import annotations

import networkx as nx
import pytest

from scripts import travel_time
from scripts.network import haversine_m, write_network
from scripts.travel_time import (
    IMPEDANCE,
    SPEED_KMH,
    edge_minutes,
    load_cost_graph,
    nearest_by_network,
    network_minutes,
)


def demo_graph() -> nx.Graph:
    """Quatro nós em linha reta de ~111 m cada (0,001° de latitude)."""

    graph = nx.Graph()
    for node, lat in enumerate([-3.800, -3.801, -3.802, -3.803], start=1):
        graph.add_node(node, lon=-38.5, lat=lat)
    for index, (u, v) in enumerate([(1, 2), (2, 3), (3, 4)], start=1):
        length = haversine_m(
            (graph.nodes[u]["lon"], graph.nodes[u]["lat"]),
            (graph.nodes[v]["lon"], graph.nodes[v]["lat"]),
        )
        graph.add_edge(
            u, v, length_m=round(length, 2), way_id=index, highway="residential"
        )
    return graph


def with_costs(tmp_path, graph: nx.Graph) -> nx.Graph:
    write_network(graph, tmp_path)
    return load_cost_graph(tmp_path)


def test_scenarios_follow_the_decided_speeds():
    assert SPEED_KMH == {"slow": 4.0, "central": 4.8, "fast": 5.5}


def test_edge_minutes_is_length_over_speed():
    # 4,8 km/h = 80 m/min
    assert edge_minutes(480, "residential", "central") == pytest.approx(6.0)
    assert edge_minutes(400, "residential", "slow") == pytest.approx(6.0)
    assert edge_minutes(550, "footway", "fast") == pytest.approx(6.0)
    assert edge_minutes(0, "residential", "central") == 0


def test_slower_speed_never_gives_fewer_minutes():
    values = [edge_minutes(1000, "residential", s) for s in ("slow", "central", "fast")]
    assert values[0] > values[1] > values[2]


def test_steps_and_unpaved_ways_cost_more_but_other_types_do_not():
    base = edge_minutes(100, "residential", "central")
    assert IMPEDANCE["steps"] > 1
    assert edge_minutes(100, "steps", "central") == pytest.approx(
        base * IMPEDANCE["steps"]
    )
    assert edge_minutes(100, "track", "central") == pytest.approx(
        base * IMPEDANCE["track"]
    )
    assert edge_minutes(100, "path", "central") == pytest.approx(
        base * IMPEDANCE["path"]
    )
    for highway in ("residential", "footway", "primary", "service", "pedestrian"):
        assert edge_minutes(100, highway, "central") == pytest.approx(base)
    # só o que o OSM informa: nenhum fator por travessia, semáforo ou relevo
    assert set(IMPEDANCE) == {"steps", "track", "path"}


def test_invalid_inputs_are_rejected():
    with pytest.raises(ValueError, match="Cenário"):
        edge_minutes(100, "residential", "turbo")
    with pytest.raises(ValueError, match="Comprimento"):
        edge_minutes(-1, "residential", "central")
    with pytest.raises(ValueError, match="Comprimento"):
        edge_minutes(float("nan"), "residential", "central")


def test_load_cost_graph_adds_minutes_per_scenario(tmp_path):
    graph = with_costs(tmp_path, demo_graph())

    assert graph.number_of_edges() == 3
    data = graph[1][2]
    assert data["minutes_central"] == pytest.approx(data["length_m"] / 80, abs=1e-3)
    assert data["minutes_slow"] > data["minutes_central"] > data["minutes_fast"]
    assert data["factor"] == 1.0
    assert graph.nodes[1]["lon"] == pytest.approx(-38.5)


def test_routing_prefers_the_faster_path_not_the_shorter_one(tmp_path):
    graph = nx.Graph()
    for node, (lon, lat) in {
        1: (-38.5, -3.8),
        2: (-38.499, -3.8),
        3: (-38.4995, -3.7995),
    }.items():
        graph.add_node(node, lon=lon, lat=lat)
    graph.add_edge(1, 2, length_m=100.0, way_id=1, highway="steps")  # 100 m, fator 2
    graph.add_edge(1, 3, length_m=70.0, way_id=2, highway="residential")
    graph.add_edge(
        3, 2, length_m=70.0, way_id=3, highway="residential"
    )  # desvio: 140 m
    loaded = with_costs(tmp_path, graph)

    result = network_minutes(loaded, 1, 2, "central")
    assert result is not None
    assert result["minutes"] == pytest.approx(
        140 / 80, abs=1e-3
    )  # 1,75 < 100*2/80 = 2,5
    assert result["length_m"] == pytest.approx(140.0)
    assert result["path_nodes"] == [1, 3, 2]


def test_time_follows_the_network_not_the_straight_line(tmp_path):
    """Vizinhos separados por um rio com ponte a 1 km: o tempo é o do desvio."""

    graph = nx.Graph()
    coords = {
        1: (-38.5000, -3.8),
        2: (-38.4995, -3.8),
        3: (-38.5000, -3.81),
        4: (-38.4995, -3.81),
    }
    for node, (lon, lat) in coords.items():
        graph.add_node(node, lon=lon, lat=lat)
    graph.add_edge(1, 3, length_m=1100.0, way_id=1, highway="residential")
    graph.add_edge(3, 4, length_m=55.0, way_id=2, highway="residential")  # a ponte
    graph.add_edge(4, 2, length_m=1100.0, way_id=3, highway="residential")
    loaded = with_costs(tmp_path, graph)

    straight = haversine_m(coords[1], coords[2])
    result = network_minutes(loaded, 1, 2, "central")
    assert straight < 60
    assert result is not None
    assert result["minutes"] == pytest.approx((1100 + 55 + 1100) / 80, abs=1e-2)
    assert result["minutes"] > 20 * (straight / 80)


def test_unreachable_destination_is_none_not_zero_or_infinite(tmp_path):
    graph = demo_graph()
    graph.add_node(10, lon=-38.4, lat=-3.7)
    graph.add_node(11, lon=-38.4, lat=-3.701)
    graph.add_edge(10, 11, length_m=100.0, way_id=9, highway="footway")
    loaded = with_costs(tmp_path, graph)

    assert network_minutes(loaded, 1, 11, "central") is None
    assert network_minutes(loaded, 1, 999, "central") is None


def test_nearest_by_network_ignores_closer_but_disconnected_targets(tmp_path):
    graph = nx.Graph()
    coords = {
        1: (-38.5, -3.8),
        2: (-38.5, -3.801),
        3: (-38.5, -3.8005),
        4: (-38.5, -3.84),
    }
    for node, (lon, lat) in coords.items():
        graph.add_node(node, lon=lon, lat=lat)
    graph.add_edge(1, 2, length_m=111.0, way_id=1, highway="residential")
    graph.add_edge(3, 4, length_m=4400.0, way_id=2, highway="residential")  # ilha
    loaded = with_costs(tmp_path, graph)

    best = nearest_by_network(
        loaded, 1, {"near-but-island": 3, "reachable": 2}, "central"
    )
    assert best is not None
    assert best["target"] == "reachable"
    assert best["minutes"] == pytest.approx(111 / 80, abs=1e-3)
    assert nearest_by_network(loaded, 1, {"island": 3}, "central") is None


def test_node_index_rejects_points_too_far_from_the_network(tmp_path):
    loaded = with_costs(tmp_path, demo_graph())
    index = travel_time.NodeIndex(loaded)

    node, snap = index.snap(-38.5, -3.8001, max_snap_m=300)
    assert node == 1 and snap < 20
    assert index.snap(-38.6, -3.9, max_snap_m=300) is None


def test_result_never_adds_the_straight_connector_into_minutes(tmp_path):
    loaded = with_costs(tmp_path, demo_graph())
    result = network_minutes(loaded, 1, 4, "central")

    assert result is not None
    assert set(result) == {"minutes", "length_m", "path_nodes", "scenario"}
    assert result["scenario"] == "central"


def test_circuity_is_network_over_straight_line():
    assert travel_time.circuity(1300.0, 1000.0) == pytest.approx(1.3)
    assert travel_time.circuity(100.0, 0.0) is None


def test_model_report_is_deterministic_and_states_assumptions(tmp_path):
    loaded = with_costs(tmp_path, demo_graph())
    first = travel_time.model_report(loaded)
    second = travel_time.model_report(loaded)

    assert first == second
    assert first["speed_kmh"] == SPEED_KMH
    assert first["impedance"] == IMPEDANCE
    assert first["impedance_basis"] == "hipótese não calibrada com medição local"
    assert (
        "gradient" in first["not_modeled"] and "crossing_wait" in first["not_modeled"]
    )
    assert first["edges"] == 3
