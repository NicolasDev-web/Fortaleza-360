"""SDD-037: grafos DEMO em coordenadas métricas, sem representar ruas reais."""

import json

import networkx as nx
import pytest
from shapely.geometry import LineString, Point, box

from scripts.isochrones import (
    corridor,
    generate,
    preserve_nesting,
    reachable_lines,
    sha256,
    verify_areas,
)
from scripts.network import build_graph, write_network
from tests.test_network import BBOX, way, write_osm


def demo_graph():
    graph = nx.Graph()
    graph.add_edge(
        1,
        2,
        geometry=LineString([(0, 0), (0, 800), (800, 800)]),
        minutes_central=20,
        minutes_slow=24,
        minutes_fast=17,
    )
    graph.add_edge(
        3,
        4,
        geometry=LineString([(10, 0), (10, -800)]),
        minutes_central=10,
        minutes_slow=12,
        minutes_fast=8.5,
    )
    return graph


def test_partial_edge_follows_curve_and_excludes_nearby_island():
    lines = reachable_lines(demo_graph(), [1], 10, "central")
    assert len(lines) == 1
    assert lines[0].equals(LineString([(0, 0), (0, 800)]))
    area = corridor(lines, 5, box(-100, -1000, 1000, 1000))
    assert area.covers(Point(0, 400))
    assert not area.covers(Point(400, 400))  # interior do casco convexo
    assert not area.covers(Point(10, -400))  # ilha sem conexão


def test_both_ends_reached_keep_middle_gap():
    lines = reachable_lines(demo_graph(), [1, 2], 4, "central")
    assert sum(line.length for line in lines) == pytest.approx(640)
    assert not corridor(lines, 1, box(-10, -10, 1000, 1000)).covers(Point(0, 700))


def test_time_and_speed_areas_are_nested_and_clipped():
    graph = demo_graph()
    clip = box(-20, -20, 700, 700)
    areas = [
        corridor(reachable_lines(graph, [1], t, "central"), 25, clip)
        for t in (10, 20, 30)
    ]
    verify_areas(areas, clip)
    for area in areas:
        assert area.is_valid and not area.is_empty
        assert clip.covers(area)
    slow, central, fast = [
        corridor(reachable_lines(graph, [1], 10, s), 25, clip)
        for s in ("slow", "central", "fast")
    ]
    verify_areas([slow, central, fast], clip)


def test_full_edge_is_not_doubled_and_zero_budget_is_empty():
    assert len(reachable_lines(demo_graph(), [1, 2], 30, "central")) == 1
    assert reachable_lines(demo_graph(), [1], 0, "central") == []


@pytest.mark.parametrize(
    "budget,scenario,sources",
    [
        (-1, "central", [1]),
        (float("nan"), "central", [1]),
        (10, "turbo", [1]),
        (10, "central", []),
        (10, "central", [999]),
    ],
)
def test_invalid_requests_fail(budget, scenario, sources):
    with pytest.raises(ValueError):
        reachable_lines(demo_graph(), sources, budget, scenario)


def test_missing_geometry_is_rejected():
    graph = demo_graph()
    del graph[1][2]["geometry"]
    with pytest.raises(ValueError, match="geometria"):
        reachable_lines(graph, [1], 10, "central")


def test_verification_rejects_non_nested_areas():
    with pytest.raises(ValueError, match="encaix"):
        verify_areas([box(0, 0, 3, 3), box(0, 0, 2, 2)], box(-1, -1, 4, 4))


def test_verification_rejects_empty_areas():
    with pytest.raises(ValueError):
        verify_areas([Point().buffer(1)], box(-1, -1, 1, 1))


def test_small_buffer_discretization_is_reported_and_material_gap_is_blocked():
    area = box(0, 0, 100, 100)
    smaller = box(-0.001, 0, 50, 50)
    fixed, added = preserve_nesting(area, [smaller])
    assert added == pytest.approx(0.05)
    assert fixed.covers(smaller)
    with pytest.raises(ValueError, match="material"):
        preserve_nesting(area, [box(-20, 0, 50, 50)])


def test_offline_pipeline_preserves_curves_orientation_and_provenance(tmp_path):
    # Via DEMO invertida com curva em L; o nó intermediário deve sobreviver no CSV.
    nodes = {1: (-38.52, -3.80), 2: (-38.52, -3.79), 3: (-38.51, -3.79)}
    osm = write_osm(tmp_path, nodes, [way(1, [3, 2, 1], highway="residential")])
    network_dir = tmp_path / "network"
    write_network(build_graph(osm, BBOX), network_dir)
    (network_dir / "audit.json").write_text(
        '{"source":"DEMO", "osm":{"sha256":"DEMO"}}', encoding="utf-8"
    )
    osm_meta = tmp_path / "osm.metadata.json"
    osm_meta.write_text('{"sha256":"DEMO"}', encoding="utf-8")
    facilities = tmp_path / "facilities.geojson"
    boundary = tmp_path / "boundary.geojson"
    facilities.write_text(
        json.dumps(
            {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "properties": {"id": "DEMO"},
                        "geometry": {"type": "Point", "coordinates": nodes[1]},
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    boundary.write_text(
        json.dumps(
            {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "properties": {"name": "DEMO"},
                        "geometry": {
                            "type": "Polygon",
                            "coordinates": [
                                [
                                    [-38.53, -3.81],
                                    [-38.50, -3.81],
                                    [-38.50, -3.78],
                                    [-38.53, -3.78],
                                    [-38.53, -3.81],
                                ]
                            ],
                        },
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    manifest = tmp_path / "sources.json"
    manifest.write_text(
        json.dumps(
            {
                "layers": [
                    {"file": p.name, "sha256": sha256(p), "source": "DEMO"}
                    for p in (facilities, boundary)
                ]
            }
        ),
        encoding="utf-8",
    )
    output = tmp_path / "output"
    report = generate(
        network_dir,
        facilities,
        boundary,
        output,
        source_manifest=manifest,
        osm_metadata=osm_meta,
    )
    first = (output / "isochrones.geojson").read_bytes()
    assert len(report["areas"]) == 9
    assert report["excluded_facilities"] == []
    assert report["source_layers"][0]["source"] == "DEMO"
    assert report["output"]["sha256"] == sha256(output / "isochrones.geojson")
    assert report["manual_route_validation"] == "pendente"
    generate(
        network_dir,
        facilities,
        boundary,
        output,
        source_manifest=manifest,
        osm_metadata=osm_meta,
    )
    assert (output / "isochrones.geojson").read_bytes() == first
    # Proveniência incompatível é rejeitada antes de gerar.
    facilities.write_text("{}", encoding="utf-8")
    with pytest.raises(ValueError, match="proveniência"):
        generate(
            network_dir,
            facilities,
            boundary,
            output,
            source_manifest=manifest,
            osm_metadata=osm_meta,
        )
