import gzip
import io
from pathlib import Path

from pmtiles.reader import MemorySource, Reader
from pmtiles.tile import Compression, TileType, zxy_to_tileid
from pmtiles.writer import Writer

from scripts.build_basemap import extract, tile_range, tiles_for_bbox

FORTALEZA_DEMO_BBOX = (-38.66, -3.92, -38.37, -3.66)


def test_tile_range_matches_known_web_mercator_tiles() -> None:
    # Fórmula OSM (y = (1 - ln(tan φ + sec φ)/π)/2 · 2^z): z10 x=402, y=522–523.
    columns, rows = tile_range(FORTALEZA_DEMO_BBOX, 10)
    assert list(columns) == [402]
    assert list(rows) == [522, 523]
    assert list(tile_range(FORTALEZA_DEMO_BBOX, 0)) == [range(0, 1), range(0, 1)]


def test_tiles_for_bbox_covers_every_zoom() -> None:
    zooms = {z for z, _, _ in tiles_for_bbox(FORTALEZA_DEMO_BBOX, 6)}
    assert zooms == set(range(7))


def _demo_archive() -> bytes:
    buffer = io.BytesIO()
    writer = Writer(buffer)
    tiles = sorted(
        (zxy_to_tileid(z, x, y), gzip.compress(f"DEMO {z}/{x}/{y}".encode()))
        for z, x, y in [(0, 0, 0), (1, 0, 1), (1, 1, 1), (2, 3, 0)]
    )
    for tile_id, data in tiles:
        writer.write_tile(tile_id, data)
    writer.finalize(
        {
            "tile_type": TileType.MVT,
            "tile_compression": Compression.GZIP,
            "min_lon_e7": -1800000000,
            "min_lat_e7": -850000000,
            "max_lon_e7": 1800000000,
            "max_lat_e7": 850000000,
            "center_zoom": 0,
            "center_lon_e7": 0,
            "center_lat_e7": 0,
        },
        {"attribution": "DEMO © OpenStreetMap", "version": "DEMO"},
    )
    return buffer.getvalue()


def test_extract_keeps_only_tiles_inside_bbox(tmp_path: Path) -> None:
    output = tmp_path / "demo.pmtiles"

    report = extract(
        MemorySource(_demo_archive()),
        (-10.0, -10.0, 10.0, -1.0),
        2,
        output,
        source_label="DEMO",
    )

    extracted = Reader(MemorySource(output.read_bytes()))
    assert report["tiles"] == 3
    assert report["attribution"] == "DEMO © OpenStreetMap"
    assert extracted.get(1, 1, 1) is not None
    assert extracted.get(2, 3, 0) is None
    assert extracted.metadata()["f360_source"] == "DEMO"
