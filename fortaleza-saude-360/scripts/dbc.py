"""Converte arquivos DBC do DATASUS em DBF.

O DBC é um DBF cujo cabeçalho fica intacto, seguido de 4 bytes de CRC e do
corpo comprimido no formato PKWare DCL "implode". `explode` é um porte em
Python, alterado deste original, de `contrib/blast/blast.c` (versão 1.3), do zlib:

    Copyright (C) 2003, 2012, 2013 Mark Adler

    This software is provided 'as-is', without any express or implied
    warranty.  In no event will the author be held liable for any damages
    arising from the use of this software.

    Permission is granted to anyone to use this software for any purpose,
    including commercial applications, and to alter it and redistribute it
    freely, subject to the following restrictions:

    1. The origin of this software must not be misrepresented; you must not
       claim that you wrote the original software. If you use this software
       in a product, an acknowledgment in the product documentation would be
       appreciated but is not required.
    2. Altered source versions must be plainly marked as such, and must not be
       misrepresented as being the original software.
    3. This notice may not be removed or altered from any source distribution.
"""

from __future__ import annotations

import struct

MAXBITS = 13

LITLEN = (
    11, 124, 8, 7, 28, 7, 188, 13, 76, 4, 10, 8, 12, 10, 12, 10, 8, 23, 8,
    9, 7, 6, 7, 8, 7, 6, 55, 8, 23, 24, 12, 11, 7, 9, 11, 12, 6, 7, 22, 5,
    7, 24, 6, 11, 9, 6, 7, 22, 7, 11, 38, 7, 9, 8, 25, 11, 8, 11, 9, 12,
    8, 12, 5, 38, 5, 38, 5, 11, 7, 5, 6, 21, 6, 10, 53, 8, 7, 24, 10, 27,
    44, 253, 253, 253, 252, 252, 252, 13, 12, 45, 12, 45, 12, 61, 12, 45,
    44, 173,
)  # fmt: skip
LENLEN = (2, 35, 36, 53, 38, 23)
DISTLEN = (2, 20, 53, 230, 247, 151, 248)
BASE = (3, 2, 4, 5, 6, 7, 8, 9, 10, 12, 16, 24, 40, 72, 136, 264)
EXTRA = (0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8)


class _Huffman:
    def __init__(self, rep: tuple[int, ...]) -> None:
        lengths: list[int] = []
        for value in rep:
            lengths.extend([value & 15] * ((value >> 4) + 1))
        self.count = [0] * (MAXBITS + 1)
        for length in lengths:
            self.count[length] += 1
        offsets = [0] * (MAXBITS + 1)
        for length in range(1, MAXBITS):
            offsets[length + 1] = offsets[length] + self.count[length]
        self.symbol = [0] * len(lengths)
        for symbol, length in enumerate(lengths):
            if length:
                self.symbol[offsets[length]] = symbol
                offsets[length] += 1


LITCODE = _Huffman(LITLEN)
LENCODE = _Huffman(LENLEN)
DISTCODE = _Huffman(DISTLEN)


class _Bits:
    def __init__(self, data: bytes) -> None:
        self.data = data
        self.position = 0
        self.buffer = 0
        self.count = 0

    def _byte(self) -> int:
        if self.position >= len(self.data):
            raise ValueError("fluxo PKWare truncado")
        value = self.data[self.position]
        self.position += 1
        return value

    def bits(self, need: int) -> int:
        value = self.buffer
        while self.count < need:
            value |= self._byte() << self.count
            self.count += 8
        self.buffer = value >> need
        self.count -= need
        return value & ((1 << need) - 1)

    def decode(self, huffman: _Huffman) -> int:
        # Códigos PKWare são gravados invertidos; ver decode() em blast.c.
        code = first = index = 0
        for length in range(1, MAXBITS + 1):
            code |= (self.bits(1) ^ 1)
            count = huffman.count[length]
            if code < first + count:
                return huffman.symbol[index + code - first]
            index += count
            first = (first + count) << 1
            code <<= 1
        raise ValueError("código Huffman inválido no fluxo PKWare")


def explode(data: bytes) -> bytes:
    """Descomprime um fluxo PKWare DCL "implode" completo."""
    stream = _Bits(data)
    literal_coded = stream.bits(8)
    if literal_coded > 1:
        raise ValueError("cabeçalho PKWare inválido: tipo de literal")
    dictionary = stream.bits(8)
    if not 4 <= dictionary <= 6:
        raise ValueError("cabeçalho PKWare inválido: dicionário")

    output = bytearray()
    while True:
        if stream.bits(1):
            symbol = stream.decode(LENCODE)
            length = BASE[symbol] + stream.bits(EXTRA[symbol])
            if length == 519:
                return bytes(output)
            shift = 2 if length == 2 else dictionary
            distance = (stream.decode(DISTCODE) << shift) + stream.bits(shift) + 1
            if distance > len(output):
                raise ValueError("distância PKWare além do início dos dados")
            start = len(output) - distance
            for offset in range(length):
                output.append(output[start + offset])
        else:
            output.append(stream.decode(LITCODE) if literal_coded else stream.bits(8))


def dbc_to_dbf(content: bytes) -> bytes:
    """Reconstrói o DBF: cabeçalho original + corpo descomprimido (sem o CRC)."""
    if len(content) < 12:
        raise ValueError("arquivo DBC curto demais")
    header_length = struct.unpack_from("<H", content, 8)[0]
    if header_length < 32 or header_length + 4 > len(content):
        raise ValueError("cabeçalho DBC inválido")
    return content[:header_length] + explode(content[header_length + 4 :])


def read_dbf(content: bytes, encoding: str = "latin-1") -> list[dict[str, str]]:
    """Lê registros não excluídos de um DBF como texto, sem converter tipos."""
    record_count, header_length, record_length = struct.unpack_from("<IHH", content, 4)
    fields: list[tuple[str, int]] = []
    position = 32
    # O DBC do DATASUS nem sempre preserva o terminador 0x0D; o tamanho do
    # cabeçalho é o limite confiável dos descritores de campo.
    while position + 32 <= header_length and content[position] != 0x0D:
        name = content[position : position + 11].split(b"\x00", 1)[0].decode("ascii")
        fields.append((name, content[position + 16]))
        position += 32

    records: list[dict[str, str]] = []
    for index in range(record_count):
        start = header_length + index * record_length
        record = content[start : start + record_length]
        if len(record) < record_length:
            raise ValueError("DBF truncado")
        if record[:1] == b"*":
            continue
        offset = 1
        values: dict[str, str] = {}
        for name, size in fields:
            values[name] = record[offset : offset + size].decode(encoding).strip()
            offset += size
        records.append(values)
    return records
