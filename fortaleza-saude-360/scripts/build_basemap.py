"""Recorta o basemap OSM (Protomaps) de Fortaleza num PMTiles servido pelo app."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import tempfile
import time
from collections.abc import Callable, Iterator
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from functools import lru_cache
from http.client import IncompleteRead
from pathlib import Path
from typing import Any
from urllib.request import Request, urlopen

from pmtiles.reader import Reader
from pmtiles.tile import zxy_to_tileid
from pmtiles.writer import Writer

BUILD_URL = "https://build.protomaps.com/{build}.pmtiles"
USER_AGENT = "Fortaleza-Saude-360/0.1 (+dados-publicos)"
# Margem em graus ao redor do limite municipal (~3 km) para o entorno imediato.
MARGIN = 0.03
ATTEMPTS = 3
WORKERS = 6

Bbox = tuple[float, float, float, float]


def tile_range(bbox: Bbox, zoom: int) -> tuple[range, range]:
    """Colunas e linhas Web Mercator que cobrem a caixa (lon/lat) no zoom dado."""
    min_lon, min_lat, max_lon, max_lat = bbox
    count = 2**zoom

    def column(lon: float) -> int:
        return min(count - 1, max(0, math.floor((lon + 180) / 360 * count)))

    def row(lat: float) -> int:
        rad = math.radians(lat)
        y = (1 - math.asinh(math.tan(rad)) / math.pi) / 2
        return min(count - 1, max(0, math.floor(y * count)))

    return range(column(min_lon), column(max_lon) + 1), range(
        row(max_lat), row(min_lat) + 1
    )


def tiles_for_bbox(bbox: Bbox, max_zoom: int) -> Iterator[tuple[int, int, int]]:
    for zoom in range(max_zoom + 1):
        columns, rows = tile_range(bbox, zoom)
        for x in columns:
            for y in rows:
                yield zoom, x, y


def http_range_source(
    url: str, *, timeout: float = 60, opener: Callable[..., Any] = urlopen
) -> Callable[[int, int], bytes]:
    @lru_cache(maxsize=512)
    def get_bytes(offset: int, length: int) -> bytes:
        request = Request(
            url,
            headers={
                "Range": f"bytes={offset}-{offset + length - 1}",
                "User-Agent": USER_AGENT,
            },
        )
        for attempt in range(1, ATTEMPTS + 1):
            try:
                with opener(request, timeout=timeout) as response:
                    data = response.read()
                if len(data) == length:
                    return data
                error: Exception = ValueError(
                    f"Faixa incompleta: {len(data)} de {length} bytes"
                )
            except (IncompleteRead, OSError) as exception:
                error = exception
            if attempt < ATTEMPTS:
                time.sleep(2**attempt)
        raise error

    return get_bytes


def extract(
    get_bytes: Callable[[int, int], bytes],
    bbox: Bbox,
    max_zoom: int,
    output: Path,
    *,
    source_label: str,
) -> dict[str, Any]:
    reader = Reader(get_bytes)
    source_header = reader.header()
    metadata = reader.metadata()
    max_zoom = min(max_zoom, source_header["max_zoom"])

    coordinates = list(tiles_for_bbox(bbox, max_zoom))
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        contents = list(pool.map(lambda zxy: reader.get(*zxy), coordinates))
    tiles = [
        (zxy_to_tileid(*zxy), data)
        for zxy, data in zip(coordinates, contents, strict=True)
        if data
    ]
    if not tiles:
        raise ValueError("Nenhum tile encontrado na caixa pedida")
    tiles.sort()

    min_lon, min_lat, max_lon, max_lat = bbox
    header = {
        "tile_type": source_header["tile_type"],
        "tile_compression": source_header["tile_compression"],
        "min_lon_e7": int(min_lon * 1e7),
        "min_lat_e7": int(min_lat * 1e7),
        "max_lon_e7": int(max_lon * 1e7),
        "max_lat_e7": int(max_lat * 1e7),
        "center_zoom": min(12, max_zoom),
        "center_lon_e7": int((min_lon + max_lon) / 2 * 1e7),
        "center_lat_e7": int((min_lat + max_lat) / 2 * 1e7),
    }
    metadata = {
        **metadata,
        "f360_source": source_label,
        "f360_bbox": list(bbox),
        "f360_max_zoom": max_zoom,
    }

    output.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        dir=output.parent, prefix=f".{output.name}."
    )
    temporary_path = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "wb") as file:
            writer = Writer(file)
            for tile_id, data in tiles:
                writer.write_tile(tile_id, data)
            writer.finalize(header, metadata)
        temporary_path.replace(output)
    except BaseException:
        temporary_path.unlink(missing_ok=True)
        raise

    content = output.read_bytes()
    return {
        "source": source_label,
        "bbox": list(bbox),
        "max_zoom": max_zoom,
        "tiles": len(tiles),
        "bytes": len(content),
        "sha256": hashlib.sha256(content).hexdigest(),
        "attribution": metadata.get("attribution"),
        "tiles_version": metadata.get("version"),
        "license": "ODbL 1.0 (dados OpenStreetMap)",
        "collected_at": datetime.now(UTC)
        .isoformat(timespec="seconds")
        .replace("+00:00", "Z"),
    }


def municipal_bbox(boundary: Path, margin: float = MARGIN) -> Bbox:
    layers = json.loads(boundary.read_text(encoding="utf-8"))["layers"]
    min_lon, min_lat, max_lon, max_lat = next(
        layer["bbox"] for layer in layers if layer["id"] == "municipal-boundary"
    )
    return (
        round(min_lon - margin, 4),
        round(min_lat - margin, 4),
        round(max_lon + margin, 4),
        round(max_lat + margin, 4),
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--build", required=True, help="Data do build, ex.: 20261025")
    parser.add_argument("--max-zoom", type=int, default=14)
    parser.add_argument(
        "--manifest", type=Path, default=Path("public/data/manifest.json")
    )
    parser.add_argument(
        "--output", type=Path, default=Path("public/basemap/fortaleza.pmtiles")
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    url = BUILD_URL.format(build=args.build)
    report = extract(
        http_range_source(url),
        municipal_bbox(args.manifest),
        args.max_zoom,
        args.output,
        source_label=url,
    )
    args.output.with_name(f"{args.output.name}.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
