"""PNG transparente para visualizar corredores centrais; não altera métricas."""

from __future__ import annotations

import hashlib
import json
import math
import struct
import zlib
from pathlib import Path

import geopandas as gpd
import numpy as np
import shapely


def raster_mask(geometry, bbox, width: int, height: int) -> np.ndarray:
    """Norte no topo; cada pixel usa seu centro, incluindo fronteiras."""
    min_x, min_y, max_x, max_y = bbox
    if width <= 0 or height <= 0 or max_x <= min_x or max_y <= min_y:
        raise ValueError("Extensão ou tamanho inválido")
    shapely.prepare(geometry)
    xs = min_x + (np.arange(width) + 0.5) * (max_x - min_x) / width
    ys = max_y - (np.arange(height) + 0.5) * (max_y - min_y) / height
    mask = np.zeros((height, width), dtype=np.uint8)
    for start in range(0, height, 64):
        mask[start : start + 64] = shapely.intersects_xy(
            geometry, xs[None, :], ys[start : start + 64, None]
        )
    return mask


def encode_png(mask: np.ndarray) -> bytes:
    """Paleta de dois índices: fora transparente, corredor lilás semitransparente."""
    height, width = mask.shape
    if not np.isin(mask, [0, 1]).all():
        raise ValueError("Máscara precisa ser binária")

    def chunk(kind: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + kind
            + data
            + struct.pack(">I", zlib.crc32(kind + data))
        )

    scanlines = b"".join(b"\0" + row.tobytes() for row in mask)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 3, 0, 0, 0))
        + chunk(b"PLTE", bytes([0, 0, 0, 156, 163, 219]))
        + chunk(b"tRNS", bytes([0, 120]))
        + chunk(b"IDAT", zlib.compress(scanlines, 9))
        + chunk(b"IEND", b"")
    )


def main() -> None:
    source = Path("data/processed/isochrones/isochrones.geojson")
    source_manifest = Path("data/processed/isochrones/manifest.json")
    metadata = json.loads(source_manifest.read_text(encoding="utf-8"))
    boundary = gpd.read_file("public/data/municipal-boundary.geojson").to_crs(4326)
    bbox = [float(value) for value in boundary.total_bounds]
    min_x, min_y, max_x, max_y = bbox
    meters_per_degree = 2 * math.pi * 6371008.8 / 360
    width = math.ceil(
        (max_x - min_x)
        * math.cos(math.radians((min_y + max_y) / 2))
        * meters_per_degree
        / 12
    )
    height = math.ceil((max_y - min_y) * meters_per_degree / 12)
    corridors = gpd.read_file(source).to_crs(4326)
    images = []
    previous = None
    for minutes in (10, 20, 30):
        geometry = corridors[
            (corridors.scenario == "central") & (corridors.minutes == minutes)
        ].geometry.iloc[0]
        mask = raster_mask(geometry, bbox, width, height)
        if previous is not None and np.any(previous & ~mask):
            raise ValueError("Corredores rasterizados não são cumulativos")
        if not mask.any():
            raise ValueError("Corredor vazio na grade")
        png = encode_png(mask)
        path = Path(f"public/data/corridor-central-{minutes}.png")
        path.write_bytes(png)
        images.append(
            {
                "file": f"/data/{path.name}",
                "sha256": hashlib.sha256(png).hexdigest(),
                "bytes": len(png),
                "minutes": minutes,
                "width": width,
                "height": height,
                "bbox": bbox,
                "included_pixels": int(mask.sum()),
            }
        )
        previous = mask
        print(f"{minutes} min: {len(png)} bytes, {int(mask.sum())} pixels", flush=True)
    output = {
        "schema": 1,
        "images": images,
        "scenario": "central",
        "speed_kmh": 4.8,
        "max_pixel_size_m": 12,
        "method": (
            "Centros de pixels em grade comum WGS84, norte no topo; apenas "
            "visualização dos corredores centrais originais. Sem recalcular contagens."
        ),
        "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "sources": {
            key: metadata[key]
            for key in ("source_layers", "source_osm", "source_network")
        },
        "limitations": [
            "Aproximação visual em pixels de até 12 m; fronteiras podem variar "
            "cerca de meia diagonal do pixel",
            "Base de todas as UAPS a 4,8 km/h, não cenário candidato nem "
            "território de atendimento",
            "Rotas locais não verificadas em campo; conectores excluídos do tempo",
        ],
        "dictionary": {
            "images": (
                "Arquivos PNG transparentes, tamanho, SHA-256, caixa WGS84 e "
                "contagem de pixels centrais incluídos"
            ),
            "max_pixel_size_m": (
                "Limite aproximado do lado do pixel na latitude média do município; "
                "não precisão do modelo"
            ),
        },
    }
    Path("public/data/corridor-preview.json").write_text(
        json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
        newline="\n",
    )


if __name__ == "__main__":
    main()
