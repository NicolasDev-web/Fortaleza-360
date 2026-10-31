"""Testes da malha viária a pé (SDD-035) com extratos OSM sintéticos `DEMO`."""

from __future__ import annotations

import csv
import hashlib
from pathlib import Path

import pytest

from scripts import network
from scripts.network import (
    build_graph,
    connectivity_report,
    facility_access_report,
    haversine_m,
    is_walkable,
    write_network,
)

BBOX = (-38.60, -3.90, -38.40, -3.70)

# Cruzamento em "+" no nó 5, com nós intermediários 2, 4, 6, 8 (grau 2).
CROSS = {
    1: (-38.520, -3.800),
    2: (-38.515, -3.800),
    5: (-38.510, -3.800),
    6: (-38.505, -3.800),
    7: (-38.500, -3.800),
    3: (-38.510, -3.790),
    4: (-38.510, -3.795),
    8: (-38.510, -3.805),
    9: (-38.510, -3.810),
}


def osm_xml(nodes: dict[int, tuple[float, float]], ways: list[dict]) -> str:
    lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<osm version="0.6">']
    for node_id, (lon, lat) in sorted(nodes.items()):
        lines.append(f'  <node id="{node_id}" version="1" lat="{lat}" lon="{lon}"/>')
    for way in ways:
        lines.append(f'  <way id="{way["id"]}" version="1">')
        lines.extend(f'    <nd ref="{ref}"/>' for ref in way["refs"])
        for key, value in way["tags"].items():
            lines.append(f'    <tag k="{key}" v="{value}"/>')
        lines.append("  </way>")
    lines.append("</osm>")
    return "\n".join(lines) + "\n"


def write_osm(tmp_path: Path, nodes, ways, name="demo.osm") -> Path:
    path = tmp_path / name
    path.write_text(osm_xml(nodes, ways), encoding="utf-8")
    return path


def way(way_id: int, refs: list[int], **tags: str) -> dict:
    return {"id": way_id, "refs": refs, "tags": tags}


def cross_ways() -> list[dict]:
    return [
        way(100, [1, 2, 5, 6, 7], highway="residential"),
        way(101, [3, 4, 5, 8, 9], highway="footway"),
    ]


def test_is_walkable_conservative_rules():
    assert is_walkable({"highway": "residential"})
    assert is_walkable({"highway": "steps"})
    assert is_walkable({"highway": "footway"})
    assert not is_walkable({"highway": "motorway"})
    assert not is_walkable({"highway": "trunk"})
    assert not is_walkable({"highway": "construction"})
    assert not is_walkable({"building": "yes"})
    assert not is_walkable({"highway": "residential", "foot": "no"})
    assert not is_walkable({"highway": "residential", "access": "private"})
    assert not is_walkable({"highway": "service", "access": "customers"})
    assert not is_walkable({"highway": "pedestrian", "area": "yes"})
    # foot explícito vence o acesso geral
    assert is_walkable({"highway": "service", "access": "private", "foot": "yes"})
    assert is_walkable({"highway": "track", "access": "no", "foot": "designated"})
    # ciclovia só entra com pedestre liberado
    assert not is_walkable({"highway": "cycleway"})
    assert is_walkable({"highway": "cycleway", "foot": "designated"})


def test_compresses_degree_two_nodes_and_keeps_junctions(tmp_path):
    graph = build_graph(write_osm(tmp_path, CROSS, cross_ways()), BBOX)

    # Extremidades 1, 7, 3, 9 e o cruzamento 5; os nós 2, 4, 6, 8 somem.
    assert set(graph.nodes) == {1, 3, 5, 7, 9}
    assert graph.number_of_edges() == 4

    expected = haversine_m(CROSS[1], CROSS[2]) + haversine_m(CROSS[2], CROSS[5])
    assert graph[1][5]["length_m"] == pytest.approx(expected, abs=0.05)
    assert graph[1][5]["highway"] == "residential"
    assert graph[3][5]["way_id"] == 101


def test_excludes_non_walkable_ways(tmp_path):
    nodes = {**CROSS, 20: (-38.480, -3.800), 21: (-38.470, -3.800)}
    ways = [
        *cross_ways(),
        way(102, [7, 20], highway="motorway"),
        way(103, [20, 21], highway="residential", access="private"),
        way(104, [7, 21], highway="service", access="private", foot="yes"),
    ]
    graph = build_graph(write_osm(tmp_path, nodes, ways), BBOX)

    assert 20 not in graph
    assert graph.has_edge(7, 21)
    assert graph[7][21]["way_id"] == 104


def test_cuts_ways_at_the_bounding_box(tmp_path):
    nodes = {
        1: (-38.45, -3.80),
        2: (-38.41, -3.80),
        3: (-38.30, -3.80),  # fora da caixa
        4: (-38.42, -3.79),
    }
    ways = [way(1, [1, 2, 3], highway="residential"), way(2, [2, 4], highway="path")]
    graph = build_graph(write_osm(tmp_path, nodes, ways), BBOX)

    assert 3 not in graph
    assert set(graph.nodes) == {1, 2, 4}


def test_parallel_ways_keep_the_shortest_and_self_loops_are_dropped(tmp_path):
    nodes = {
        1: (-38.52, -3.80),
        2: (-38.51, -3.80),
        3: (-38.515, -3.79),
        4: (-38.525, -3.795),
        5: (-38.525, -3.805),
    }
    ways = [
        way(4, [1, 4, 5, 1], highway="path"),  # laço que volta ao mesmo nó
        way(1, [1, 2], highway="residential"),
        way(2, [1, 3, 2], highway="footway"),
        way(3, [1, 2, 3, 1], highway="path"),
    ]
    graph = build_graph(write_osm(tmp_path, nodes, ways), BBOX)

    assert graph[1][2]["way_id"] == 1
    assert graph[1][2]["length_m"] == pytest.approx(
        haversine_m(nodes[1], nodes[2]), abs=0.01
    )
    assert not any(u == v for u, v in graph.edges)
    assert graph.graph["self_loops_dropped"] == 1
    assert graph.graph["parallel_edges_collapsed"] >= 1


def test_connectivity_report_flags_islands(tmp_path):
    nodes = {**CROSS, 30: (-38.40, -3.71), 31: (-38.41, -3.71)}
    ways = [*cross_ways(), way(200, [30, 31], highway="footway")]
    graph = build_graph(write_osm(tmp_path, nodes, ways), BBOX)
    report = connectivity_report(graph)

    assert report["components"] == 2
    assert report["nodes"] == 7
    assert report["edges"] == 5
    assert report["largest_component_nodes"] == 5
    assert report["largest_component_share_of_length"] == pytest.approx(
        report["largest_component_length_km"] / report["total_length_km"],
        abs=1e-3,
    )
    assert 0 < report["largest_component_share_of_length"] < 1
    assert report["cost"] == "length_m"


def test_facility_access_report_measures_snap_and_component(tmp_path):
    nodes = {**CROSS, 30: (-38.40, -3.71), 31: (-38.41, -3.71)}
    ways = [*cross_ways(), way(200, [30, 31], highway="footway")]
    graph = build_graph(write_osm(tmp_path, nodes, ways), BBOX)

    points = [
        ("near", -38.5101, -3.8001),  # a ~15 m do cruzamento
        ("island", -38.4099, -3.7101),  # na ilha de 2 nós
        ("far", -38.55, -3.85),  # a vários km de qualquer via
    ]
    report = facility_access_report(graph, points, max_snap_m=300)
    by_id = {row["id"]: row for row in report["facilities"]}

    assert by_id["near"]["snap_m"] < 30
    assert by_id["near"]["in_largest_component"] is True
    assert by_id["island"]["in_largest_component"] is False
    assert by_id["far"]["within_snap_limit"] is False
    assert report["total"] == 3
    assert report["in_largest_component_within_limit"] == 1
    assert report["max_snap_m_limit"] == 300


def test_write_network_is_deterministic_and_csv_has_costs(tmp_path):
    osm = write_osm(tmp_path, CROSS, cross_ways())
    graph = build_graph(osm, BBOX)

    first = write_network(graph, tmp_path / "a")
    second = write_network(build_graph(osm, BBOX), tmp_path / "b")
    for key in ("nodes", "edges"):
        assert (
            hashlib.sha256(first[key].read_bytes()).hexdigest()
            == hashlib.sha256(second[key].read_bytes()).hexdigest()
        )

    with first["edges"].open(encoding="utf-8", newline="") as file:
        rows = list(csv.DictReader(file))
    assert list(rows[0]) == ["u", "v", "length_m", "way_id", "highway", "coordinates"]
    assert len(rows) == 4
    assert all(float(row["length_m"]) > 0 for row in rows)
    assert "duration" not in rows[0] and "minutes" not in rows[0]

    with first["nodes"].open(encoding="utf-8", newline="") as file:
        assert list(csv.DictReader(file))[0].keys() == {"id", "lon", "lat"}


def test_osm_snapshot_reads_header_timestamp(tmp_path):
    pbf = tmp_path / "demo.osm"
    pbf.write_text(
        '<?xml version="1.0"?><osm version="0.6">'
        '<bounds minlat="0" minlon="0" maxlat="1" maxlon="1"/></osm>',
        encoding="utf-8",
    )
    snapshot = network.osm_snapshot(pbf)
    assert snapshot["file"] == "demo.osm"
    assert snapshot["sha256"] is None
    assert "data_timestamp" in snapshot


def test_build_fails_without_any_walkable_way(tmp_path):
    osm = write_osm(
        tmp_path,
        {1: (-38.52, -3.80), 2: (-38.51, -3.80)},
        [way(1, [1, 2], highway="motorway")],
    )
    with pytest.raises(ValueError, match="Nenhuma via"):
        build_graph(osm, BBOX)


def test_bbox_uses_boundary_with_margin(tmp_path):
    boundary = tmp_path / "boundary.geojson"
    boundary.write_text(
        '{"type":"FeatureCollection","features":[{"type":"Feature","properties":{},'
        '"geometry":{"type":"Polygon","coordinates":[[[-38.6,-3.9],[-38.4,-3.9],'
        "[-38.4,-3.7],[-38.6,-3.7],[-38.6,-3.9]]]}}]}",
        encoding="utf-8",
    )
    assert network.bbox_from_boundary(boundary) == (-38.63, -3.93, -38.37, -3.67)
