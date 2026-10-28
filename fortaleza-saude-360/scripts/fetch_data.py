"""Baixa as fontes oficiais aprovadas e registra proveniência auditável."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.request import Request, urlopen

LICENSE = (
    "Termos de Uso da API Fortaleza em Mapas — reutilização livre com "
    "atribuição obrigatória"
)
ATTRIBUTION = (
    "Fonte: Prefeitura Municipal de Fortaleza - Fortaleza em Mapas "
    "(Ipplan Fortaleza). Acesso via API de Dados Abertos."
)


CNES_LICENSE = (
    "Dados públicos de disseminação do DATASUS/Ministério da Saúde; sem "
    "licença padronizada (CC/SPDX) declarada no repositório FTP"
)
CNES_ATTRIBUTION = (
    "Fonte: Ministério da Saúde — DATASUS, Cadastro Nacional de "
    "Estabelecimentos de Saúde (CNES), arquivo de estabelecimentos (ST)."
)

IBGE_LICENSE = (
    "Dados públicos do IBGE; licença padronizada não verificada (página de "
    "termos indisponível na coleta), citação da fonte obrigatória"
)
IBGE_ATTRIBUTION = "Fonte: IBGE, Censo Demográfico 2022."
IBGE_CENSUS = "https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/"
IBGE_SECTORS = (
    "https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/"
    "malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2022/setores/"
)


@dataclass(frozen=True)
class Source:
    source_id: int | str
    filename: str
    page_url: str
    download_url: str
    organization: str
    reference_year: int
    license: str = LICENSE
    attribution: str = ATTRIBUTION


@dataclass(frozen=True)
class DownloadResult:
    raw_path: Path
    checksum_path: Path
    metadata_path: Path
    sha256: str


SOURCES: dict[str, Source] = {
    "uaps": Source(
        source_id=824,
        filename="uaps.geojson",
        page_url=(
            "https://mapas.fortaleza.ce.gov.br/mapa/824/"
            "unidades-de-atencao-primaria-a-saude-uaps"
        ),
        download_url=(
            "https://mapas.fortaleza.ce.gov.br/api/v1/"
            "geojson?id=824&download=true"
        ),
        organization="SMS",
        reference_year=2026,
    ),
    "neighborhoods": Source(
        source_id=21,
        filename="neighborhoods.geojson",
        page_url=(
            "https://mapas.fortaleza.ce.gov.br/mapa/21/bairros-de-fortaleza"
        ),
        download_url=(
            "https://mapas.fortaleza.ce.gov.br/api/v1/"
            "geojson?id=21&download=true"
        ),
        organization="IPLANFOR",
        reference_year=2019,
    ),
    "municipal-boundary": Source(
        source_id=12,
        filename="municipal-boundary.geojson",
        page_url=(
            "https://mapas.fortaleza.ce.gov.br/mapa/12/"
            "limite-administrativo-da-cidade-de-fortaleza"
        ),
        download_url=(
            "https://mapas.fortaleza.ce.gov.br/api/v1/"
            "geojson?id=12&download=true"
        ),
        organization="IPECE",
        reference_year=2019,
    ),
    "upas": Source(
        source_id=825,
        filename="upas.geojson",
        page_url=(
            "https://mapas.fortaleza.ce.gov.br/mapa/825/"
            "unidades-de-pronto-atendimento-upa"
        ),
        download_url=(
            "https://mapas.fortaleza.ce.gov.br/api/v1/"
            "geojson?id=825&download=true"
        ),
        organization="SMS",
        reference_year=2026,
    ),
    "hospitals": Source(
        source_id=823,
        filename="hospitals.geojson",
        page_url="https://mapas.fortaleza.ce.gov.br/mapa/823/hospitais-municipais",
        download_url=(
            "https://mapas.fortaleza.ce.gov.br/api/v1/"
            "geojson?id=823&download=true"
        ),
        organization="SMS",
        reference_year=2026,
    ),
    "cnes-ce": Source(
        source_id="CNES-ST-CE-202609",
        filename="cnes-st-ce-202609.dbc",
        page_url=(
            "ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/"
        ),
        download_url=(
            "ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/"
            "Dados/ST/STCE2609.dbc"
        ),
        organization="DATASUS/MS",
        reference_year=2026,
        license=CNES_LICENSE,
        attribution=CNES_ATTRIBUTION,
    ),
    "ibge-setores-ce": Source(
        source_id="IBGE-MALHA-SETORES-CD2022-CE",
        filename="ibge-setores-ce-2022.gpkg",
        page_url=f"{IBGE_SECTORS}gpkg/UF/CE/",
        download_url=f"{IBGE_SECTORS}gpkg/UF/CE/CE_setores_CD2022.gpkg",
        organization="IBGE",
        reference_year=2022,
        license=IBGE_LICENSE,
        attribution=IBGE_ATTRIBUTION,
    ),
    "ibge-agregados-basico": Source(
        source_id="IBGE-AGREGADOS-SETORES-BASICO-CD2022-20260520",
        filename="ibge-agregados-basico-br-20260520.zip",
        page_url=(
            f"{IBGE_CENSUS}Agregados_por_Setores_Censitarios/Agregados_por_Setor_csv/"
        ),
        download_url=(
            f"{IBGE_CENSUS}Agregados_por_Setores_Censitarios/Agregados_por_Setor_csv/"
            "Agregados_por_setores_basico_BR_20260520.zip"
        ),
        organization="IBGE",
        reference_year=2022,
        license=IBGE_LICENSE,
        attribution=IBGE_ATTRIBUTION,
    ),
}


def _utc_now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds").replace(
        "+00:00", "Z"
    )


def _atomic_text(path: Path, content: str) -> None:
    descriptor, temporary_name = tempfile.mkstemp(
        dir=path.parent,
        prefix=f".{path.name}.",
    )
    temporary_path = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as file:
            file.write(content)
        temporary_path.replace(path)
    except BaseException:
        temporary_path.unlink(missing_ok=True)
        raise


def download_source(
    source_key: str,
    output_dir: Path,
    *,
    timeout: float = 30,
    opener: Callable[..., Any] = urlopen,
    collected_at: str | None = None,
) -> DownloadResult:
    """Baixa uma fonte aprovada e grava conteúdo, checksum e metadados."""

    if source_key not in SOURCES:
        raise ValueError(f"Fonte não aprovada: {source_key}")
    if timeout <= 0:
        raise ValueError("O timeout deve ser maior que zero")

    source = SOURCES[source_key]
    output_dir.mkdir(parents=True, exist_ok=True)
    raw_path = output_dir / source.filename
    checksum_path = output_dir / f"{source.filename}.sha256"
    metadata_path = output_dir / f"{source.filename}.metadata.json"

    descriptor, temporary_name = tempfile.mkstemp(
        dir=output_dir,
        prefix=f".{source.filename}.",
    )
    temporary_path = Path(temporary_name)
    digest = hashlib.sha256()
    byte_count = 0

    request = Request(
        source.download_url,
        headers={
            "Accept": "application/json",
            "User-Agent": "Fortaleza-Saude-360/0.1 (+dados-publicos)",
        },
    )

    try:
        with os.fdopen(descriptor, "wb") as target:
            with opener(request, timeout=timeout) as response:
                headers = getattr(response, "headers", None) or {}
                content_type = headers.get("Content-Type")
                while chunk := response.read(64 * 1024):
                    target.write(chunk)
                    digest.update(chunk)
                    byte_count += len(chunk)
        temporary_path.replace(raw_path)
    except BaseException:
        temporary_path.unlink(missing_ok=True)
        raise

    sha256 = digest.hexdigest()
    collected_at = collected_at or _utc_now()
    metadata = {
        "source_key": source_key,
        "source_id": source.source_id,
        "organization": source.organization,
        "reference_year": source.reference_year,
        "page_url": source.page_url,
        "download_url": source.download_url,
        "collected_at": collected_at,
        "content_type": content_type,
        "bytes": byte_count,
        "sha256": sha256,
        "license": source.license,
        "attribution": source.attribution,
    }

    _atomic_text(checksum_path, f"{sha256}  {source.filename}\n")
    _atomic_text(
        metadata_path,
        json.dumps(metadata, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
    )

    return DownloadResult(raw_path, checksum_path, metadata_path, sha256)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    selection = parser.add_mutually_exclusive_group(required=True)
    selection.add_argument("--source", choices=sorted(SOURCES))
    selection.add_argument("--all", action="store_true")
    parser.add_argument("--output-dir", type=Path, default=Path("data/raw"))
    parser.add_argument("--timeout", type=float, default=30)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source_keys = sorted(SOURCES) if args.all else [args.source]

    for source_key in source_keys:
        result = download_source(
            source_key,
            args.output_dir,
            timeout=args.timeout,
        )
        print(f"{source_key}: {result.raw_path} sha256={result.sha256}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
