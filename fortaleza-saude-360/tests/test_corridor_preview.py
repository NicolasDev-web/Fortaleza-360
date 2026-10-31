"""Máscara DEMO: orientação, buracos, encaixe e PNG sem dependência extra."""

import struct
import zlib

import numpy as np
import pytest
from shapely.geometry import box

from scripts.corridor_preview import encode_png, raster_mask


def test_north_top_hole_and_cumulative_masks():
    north = box(0, 1, 2, 2)
    mask = raster_mask(north, [0, 0, 2, 2], 2, 2)
    assert mask.tolist() == [[1, 1], [0, 0]]
    outer = raster_mask(box(0, 0, 2, 2), [0, 0, 2, 2], 2, 2)
    assert not np.any(mask & ~outer)
    ring = box(0, 0, 3, 3).difference(box(1, 1, 2, 2))
    assert raster_mask(ring, [0, 0, 3, 3], 3, 3)[1, 1] == 0


def test_png_dimensions_and_pixel_bytes():
    png = encode_png(np.array([[0, 1], [1, 0]], dtype=np.uint8))
    assert png[:8] == b"\x89PNG\r\n\x1a\n"
    assert struct.unpack(">II", png[16:24]) == (2, 2)
    offset = 8
    while offset < len(png):
        length = struct.unpack(">I", png[offset : offset + 4])[0]
        kind = png[offset + 4 : offset + 8]
        content = png[offset + 8 : offset + 8 + length]
        if kind == b"IDAT":
            assert zlib.decompress(content) == b"\0\0\1\0\1\0"
        offset += length + 12
    with pytest.raises(ValueError):
        encode_png(np.array([[2]], dtype=np.uint8))
