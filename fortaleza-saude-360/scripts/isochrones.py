"""Isócronas modeladas até alguma UAPS: 10/20/30 min (SDD-037), offline."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import geopandas as gpd
import networkx as nx
import shapely
from pyproj import Transformer
from shapely.geometry import LineString, mapping
from shapely.ops import substring

from scripts.network import MAX_SNAP_M, read_facility_points
from scripts.travel_time import SPEED_KMH, NodeIndex, load_cost_graph, model_report

CRS_METRIC = 31984  # SIRGAS 2000 / UTM 24S
BUDGETS = (10, 20, 30)
CAVEAT = (
    "Acessibilidade modelada até alguma UAPS; não representa capacidade, "
    "vaga, horário, população atendida ou área de responsabilidade da unidade. "
    "Corredor geométrico aproximado; travessias e barreiras locais não verificadas."
)


def reachable_lines(graph, sources, budget, scenario):
    """Partes das curvas alcançadas; geometry orientada de min(u,v) para max(u,v)."""
    sources = set(sources)
    if (
        not math.isfinite(budget)
        or budget < 0
        or scenario not in SPEED_KMH
        or not sources
        or not sources.issubset(graph.nodes)
    ):
        raise ValueError("Origens, tempo ou cenário inválidos.")
    weight = f"minutes_{scenario}"
    for _, _, data in graph.edges(data=True):
        if "geometry" not in data:
            raise ValueError("Malha sem geometria; execute novamente scripts.network.")
        cost = data.get(weight)
        if cost is None or not math.isfinite(cost) or cost <= 0:
            raise ValueError("Custo de aresta deve ser finito e positivo.")
    distances = nx.multi_source_dijkstra_path_length(
        graph, sources, cutoff=budget, weight=weight
    )
    lines = []
    for u, v, data in graph.edges(data=True):
        u, v = min(u, v), max(u, v)
        cost = data[weight]
        left = min(1.0, max(0.0, (budget - distances.get(u, math.inf)) / cost))
        right = min(1.0, max(0.0, (budget - distances.get(v, math.inf)) / cost))
        line = data["geometry"]
        if left + right >= 1:
            lines.append(line)
        else:
            if left > 0:
                lines.append(substring(line, 0, left, normalized=True))
            if right > 0:
                lines.append(substring(line, 1 - right, 1, normalized=True))
    return lines


def corridor(lines, buffer_m, boundary):
    """União de buffers em metros, recortada pelo município, com buracos preservados."""
    if not math.isfinite(buffer_m) or buffer_m <= 0:
        raise ValueError("Buffer deve ser positivo e finito.")
    buffered = shapely.buffer(lines, buffer_m, quad_segs=4)
    return shapely.union_all(buffered).intersection(boundary)


def verify_areas(areas, boundary):
    """Validade e encaixe espacial, com tolerância de 0,0001 m² para ponto flutuante."""
    for index, area in enumerate(areas):
        if (
            area.is_empty
            or not area.is_valid
            or area.geom_type not in {"Polygon", "MultiPolygon"}
            or not math.isfinite(area.area)
            or area.area <= 0
            or area.difference(boundary).area > 1e-4
        ):
            raise ValueError("Área vazia, inválida ou fora do município.")
        if index and areas[index - 1].difference(area).area > 1e-4:
            raise ValueError("Áreas sem encaixe espacial entre tempos/cenários.")


def preserve_nesting(area, smaller):
    """Preserva envelopes menores sob discretização dos arcos do buffer."""
    envelope = shapely.union_all(smaller)
    added = envelope.difference(area).area
    if added > max(1.0, area.area * 0.0001):
        raise ValueError(f"Diferença material no encaixe: {added:.3f} m².")
    return area.union(envelope), added


def project_graph(graph):
    project = Transformer.from_crs(4326, CRS_METRIC, always_xy=True).transform
    for u, v, data in graph.edges(data=True):
        coords = data.get("coordinates")
        if not coords:
            raise ValueError("Malha sem geometria; execute novamente scripts.network.")
        for node, coord in ((min(u, v), coords[0]), (max(u, v), coords[-1])):
            expected = (graph.nodes[node]["lon"], graph.nodes[node]["lat"])
            if max(abs(a - b) for a, b in zip(expected, coord, strict=True)) > 1e-6:
                raise ValueError("Geometria de aresta com orientação incorreta.")
        data["geometry"] = shapely.transform(
            LineString(coords), project, interleaved=False
        )


def sha256(path):
    with path.open("rb") as file:
        return hashlib.file_digest(file, "sha256").hexdigest()


def generate(
    network_dir,
    facilities,
    boundary_path,
    output_dir,
    buffer_m=25.0,
    max_snap_m=MAX_SNAP_M,
    source_manifest=Path("public/data/manifest.json"),
    osm_metadata=Path("data/raw/osm-nordeste-261027.osm.pbf.metadata.json"),
):
    if not math.isfinite(max_snap_m) or max_snap_m < 0:
        raise ValueError("Limite de ligação inválido.")
    registered = json.loads(source_manifest.read_text(encoding="utf-8"))["layers"]
    audit = json.loads((network_dir / "audit.json").read_text(encoding="utf-8"))
    osm_source = json.loads(osm_metadata.read_text(encoding="utf-8"))
    if osm_source["sha256"] != audit["osm"]["sha256"]:
        raise ValueError("Checksum da fonte OSM diverge da malha.")
    source_layers = []
    for path in (facilities, boundary_path):
        matches = [
            layer
            for layer in registered
            if Path(layer["file"]).name == path.name and layer["sha256"] == sha256(path)
        ]
        if len(matches) != 1:
            raise ValueError(f"Fonte sem proveniência ou checksum divergente: {path}")
        source_layers.append(matches[0])
    graph = load_cost_graph(network_dir)
    index = NodeIndex(graph)
    snaps, excluded = [], []
    for unit_id, lon, lat in read_facility_points(facilities):
        snapped = index.snap(lon, lat, max_snap_m)
        if snapped is None:
            excluded.append(unit_id)
        else:
            snaps.append({"id": unit_id, "node": snapped[0], "snap_m": snapped[1]})
    if not snaps:
        raise ValueError("Nenhuma UAPS ligada à malha dentro do limite.")
    project_graph(graph)
    boundary = gpd.read_file(boundary_path).to_crs(CRS_METRIC).geometry.union_all()
    if boundary.is_empty or not boundary.is_valid:
        raise ValueError("Limite municipal inválido.")
    inverse = Transformer.from_crs(CRS_METRIC, 4326, always_xy=True).transform
    sources = sorted({row["node"] for row in snaps})
    geometries = {}
    features = []
    for scenario in SPEED_KMH:
        areas = []
        for minutes in BUDGETS:
            area = corridor(
                reachable_lines(graph, sources, minutes, scenario), buffer_m, boundary
            )
            smaller = areas[-1:] + [
                geometries[other, minutes]
                for other in SPEED_KMH
                if (other, minutes) in geometries
            ]
            area, nesting_added = preserve_nesting(area, smaller)
            areas.append(area)
            geometries[scenario, minutes] = area
            geographic = shapely.transform(area, inverse, interleaved=False)
            if not geographic.is_valid:
                raise ValueError("Geometria WGS84 inválida.")
            properties = {
                "scenario": scenario,
                "minutes": minutes,
                "speed_kmh": SPEED_KMH[scenario],
                "area_km2": area.area / 1e6,
                "buffer_m": buffer_m,
                "method": "network_corridor",
                "facilities": len(snaps),
                "limitation": CAVEAT,
                "nesting_added_m2": nesting_added,
            }
            features.append(
                {
                    "type": "Feature",
                    "properties": properties,
                    "geometry": mapping(geographic),
                }
            )
            print(
                f"{scenario} / {minutes} min: {area.area / 1e6:.3f} km²; "
                f"ajuste de encaixe: {nesting_added:.3f} m²",
                flush=True,
            )
        verify_areas(areas, boundary)
    for minutes in BUDGETS:
        verify_areas(
            [geometries[s, minutes] for s in ("slow", "central", "fast")], boundary
        )

    output_dir.mkdir(parents=True, exist_ok=True)
    geojson = output_dir / "isochrones.geojson"
    geojson.write_text(
        json.dumps(
            {"type": "FeatureCollection", "features": features},
            ensure_ascii=False,
            separators=(",", ":"),
        )
        + "\n",
        encoding="utf-8",
    )
    report = {
        "source_network": audit,
        "source_osm": osm_source,
        "source_layers": source_layers,
        "inputs": {
            str(p): sha256(p)
            for p in (
                network_dir / "nodes.csv",
                network_dir / "edges.csv",
                facilities,
                boundary_path,
            )
        },
        "model": model_report(graph),
        "method": "network_corridor",
        "metric_crs": f"EPSG:{CRS_METRIC}",
        "output_crs": "EPSG:4326",
        "buffer_m": buffer_m,
        "buffer_quad_segs": 4,
        "max_snap_m": max_snap_m,
        "snapped_facilities": snaps,
        "excluded_facilities": excluded,
        "connector_minutes_included": False,
        "manual_route_validation": "pendente",
        "geometry_checks": "validade, área positiva, recorte e encaixe espaço-temporal",
        "areas": [f["properties"] for f in features],
        "limitation": CAVEAT,
        "output": {"file": geojson.name, "sha256": sha256(geojson)},
        "dictionary": {
            "minutes": "limiar acumulado, em minutos de caminho pela malha",
            "scenario": "slow (4,0), central (4,8) ou fast (5,5 km/h)",
            "area_km2": "área do corredor recortado, calculada em UTM 24S",
            "buffer_m": "raio geométrico ao redor dos trechos; não soma tempo",
            "facilities": "UAPS aceitas no snap; não representa capacidade",
            "method": "network_corridor: união dos trechos alcançáveis com buffer",
            "speed_kmh": "hipótese de velocidade do cenário",
            "limitation": "ressalva de interpretação",
            "nesting_added_m2": "área reincluída para preservar envelopes menores",
        },
    }
    (output_dir / "manifest.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--network-dir", type=Path, default=Path("data/processed/walk_network")
    )
    parser.add_argument(
        "--facilities", type=Path, default=Path("public/data/facilities.geojson")
    )
    parser.add_argument(
        "--boundary", type=Path, default=Path("public/data/municipal-boundary.geojson")
    )
    parser.add_argument(
        "--output-dir", type=Path, default=Path("data/processed/isochrones")
    )
    parser.add_argument("--buffer-m", type=float, default=25.0)
    parser.add_argument("--max-snap-m", type=float, default=MAX_SNAP_M)
    parser.add_argument(
        "--source-manifest", type=Path, default=Path("public/data/manifest.json")
    )
    parser.add_argument(
        "--osm-metadata",
        type=Path,
        default=Path("data/raw/osm-nordeste-261027.osm.pbf.metadata.json"),
    )
    args = parser.parse_args()
    generate(
        args.network_dir,
        args.facilities,
        args.boundary,
        args.output_dir,
        args.buffer_m,
        args.max_snap_m,
        args.source_manifest,
        args.osm_metadata,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
