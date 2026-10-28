import struct

import pytest

from scripts.dbc import dbc_to_dbf, explode


def test_explode_reference_vector() -> None:
    # Exemplo corrigido publicado por Mark Adler no cabeçalho de blast.c.
    assert explode(bytes.fromhex("00048224258f807f")) == b"AIAIAIAIAIAIA"


def test_explode_rejects_truncated_stream() -> None:
    with pytest.raises(ValueError):
        explode(bytes.fromhex("00048224"))


def test_dbc_to_dbf_keeps_header_and_skips_crc() -> None:
    header = bytearray(34)
    header[0] = 0x03
    struct.pack_into("<H", header, 8, len(header))
    header[32] = 0x0D  # terminador DEMO do cabeçalho
    header[33] = 0x1A
    payload = bytes(header) + b"\x00\x00\x00\x00" + bytes.fromhex("00048224258f807f")

    assert dbc_to_dbf(payload) == bytes(header) + b"AIAIAIAIAIAIA"


def _demo_dbf(rows: list[tuple[bytes, bytes, bytes]]) -> bytes:
    fields = [(b"CNES", 7), (b"CODUFMUN", 6)]
    header_length = 32 + 32 * len(fields) + 1
    record_length = 1 + sum(size for _, size in fields)
    header = bytearray(32)
    header[0] = 0x03
    struct.pack_into("<IHH", header, 4, len(rows), header_length, record_length)
    for name, size in fields:
        descriptor = bytearray(32)
        descriptor[: len(name)] = name
        descriptor[11] = ord("C")
        descriptor[16] = size
        header += descriptor
    header += b"\r"
    body = b"".join(flag + cnes + municipality for flag, cnes, municipality in rows)
    return bytes(header) + body + b"\x1a"


def test_read_dbf_skips_deleted_records_and_strips_values() -> None:
    from scripts.dbc import read_dbf

    content = _demo_dbf(
        [(b" ", b"0000001", b"230440"), (b"*", b"0000002", b"230440"),
         (b" ", b"000003 ", b"230010")]
    )

    assert read_dbf(content) == [
        {"CNES": "0000001", "CODUFMUN": "230440"},
        {"CNES": "000003", "CODUFMUN": "230010"},
    ]
