"""Compara as UAPS do portal municipal com o CNES sem assumir equivalência."""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from scripts.dbc import dbc_to_dbf, read_dbf

FORTALEZA = "230440"

# Somente códigos e datas; CPF/CNPJ, CEP, contas e contratos nunca saem da leitura.
SAFE_FIELDS = (
    "CNES",
    "CODUFMUN",
    "TP_UNID",
    "TPGESTAO",
    "VINC_SUS",
    "NAT_JUR",
    "DT_ATUAL",
    "COMPETEN",
)

# Rótulos conferidos em TAB_CNES.zip (CNV/TP_ESTAB, TPGESTAO e NATJUR), DATASUS.
PRIMARY_CARE_TYPES = {
    "01": "Posto de saúde",
    "02": "Centro de saúde/unidade básica",
    "45": "Unidade de saúde da família",
}
MANAGEMENT = {"M": "municipal", "E": "estadual", "D": "dupla", "S": "sem gestão"}
LEGAL_NATURE = {
    "1023": "Órgão público do Poder Executivo estadual ou do DF",
    "1031": "Órgão público do Poder Executivo municipal",
}


def project_safe_fields(record: dict[str, str]) -> dict[str, str]:
    return {field: record.get(field, "") for field in SAFE_FIELDS}


def load_cnes(path: Path) -> list[dict[str, str]]:
    return [project_safe_fields(row) for row in read_dbf(dbc_to_dbf(path.read_bytes()))]


def compare(
    facilities: list[dict[str, Any]],
    cnes_records: list[dict[str, str]],
    municipality: str = FORTALEZA,
) -> dict[str, Any]:
    by_code = {record["CNES"]: record for record in cnes_records}
    portal_by_code: dict[str, list[str]] = defaultdict(list)
    without_cnes: list[str] = []
    for feature in facilities:
        properties = feature.get("properties") or {}
        code = properties.get("cnes")
        if code:
            portal_by_code[str(code)].append(str(properties.get("source_id")))
        else:
            without_cnes.append(str(properties.get("source_id")))

    matched: list[str] = []
    other_municipality: dict[str, str] = {}
    not_found: list[str] = []
    for code in sorted(portal_by_code):
        record = by_code.get(code)
        if record is None:
            not_found.append(code)
        elif record["CODUFMUN"] != municipality:
            other_municipality[code] = record["CODUFMUN"]
        else:
            matched.append(code)

    local_primary_care = sorted(
        (
            record
            for record in cnes_records
            if record["CODUFMUN"] == municipality
            and record["TP_UNID"] in PRIMARY_CARE_TYPES
        ),
        key=lambda record: record["CNES"],
    )
    cnes_only = [
        record for record in local_primary_care if record["CNES"] not in portal_by_code
    ]

    divergences: list[dict[str, Any]] = []
    for feature in facilities:
        properties = feature.get("properties") or {}
        code = properties.get("cnes")
        record = by_code.get(str(code)) if code else None
        if record is None:
            continue
        sus = properties.get("sus")
        if sus is not None and sus != (record["VINC_SUS"] == "1"):
            divergences.append(
                {
                    "cnes": code,
                    "field": "sus",
                    "portal": sus,
                    "cnes_value": record["VINC_SUS"],
                }
            )
        management = properties.get("management")
        if management and management != record["TPGESTAO"]:
            divergences.append(
                {
                    "cnes": code,
                    "field": "management",
                    "portal": management,
                    "cnes_value": record["TPGESTAO"],
                }
            )

    return {
        "portal": {
            "features": len(facilities),
            "with_cnes": sum(len(ids) for ids in portal_by_code.values()),
            "distinct_cnes": len(portal_by_code),
        },
        "portal_repeated_cnes": {
            code: ids for code, ids in sorted(portal_by_code.items()) if len(ids) > 1
        },
        "portal_without_cnes": without_cnes,
        "matched": matched,
        "matched_types": dict(Counter(by_code[code]["TP_UNID"] for code in matched)),
        "portal_in_other_municipality": other_municipality,
        "portal_not_in_cnes": not_found,
        "cnes_municipality_total": sum(
            1 for record in cnes_records if record["CODUFMUN"] == municipality
        ),
        "cnes_primary_care": dict(
            Counter(
                (record["TP_UNID"], record["TPGESTAO"]) for record in local_primary_care
            )
        ),
        "cnes_only_primary_care": cnes_only,
        "attribute_divergences": divergences,
        "competences": sorted({record["COMPETEN"] for record in cnes_records}),
    }


def _type_label(code: str) -> str:
    return f"{code} — {PRIMARY_CARE_TYPES.get(code, 'código sem rótulo conferido')}"


def render_report(
    result: dict[str, Any], *, portal_source: str, cnes_source: str
) -> str:
    portal = result["portal"]
    repeated = result["portal_repeated_cnes"]
    cnes_only = result["cnes_only_primary_care"]
    lines = [
        "# Relatório de qualidade de dados — UAPS do portal × CNES",
        "",
        "> Gerado por `scripts/check_cnes_divergence.py`. Não editar à mão: "
        "rode o script após cada coleta.",
        "",
        "## Fontes comparadas",
        "",
        f"- **Portal municipal:** {portal_source}",
        f"- **CNES:** {cnes_source}",
        "",
        "As duas bases **não são equivalentes**. O portal é um catálogo "
        "municipal de localização de UAPS; o CNES é o cadastro nacional, "
        "declarado por gestores e estabelecimentos, com competência mensal e "
        "todos os tipos de estabelecimento. Coincidência de código não prova "
        "funcionamento, capacidade ou oferta, e ausência em uma base não prova "
        "inexistência na outra.",
        "",
        "## Método",
        "",
        "- Chave: código CNES exato de 7 dígitos; sem casamento por nome ou "
        "endereço (o arquivo ST não traz nome do estabelecimento).",
        f"- Recorte CNES: município `{FORTALEZA}` (Fortaleza); tipos de atenção "
        "primária `01`, `02` e `45` (tabela `TP_ESTAB` do DATASUS).",
        "- Campos lidos do CNES: " + ", ".join(f"`{field}`" for field in SAFE_FIELDS)
        + ". CPF/CNPJ, CEP, dados bancários e contratos são descartados na leitura.",
        "- Atributos conferidos: SUS (`sus` × `VINC_SUS`) e gestão "
        "(`management` × `TPGESTAO`).",
        "",
        "## Resultado",
        "",
        "| Medida | Valor |",
        "|---|---:|",
        f"| Feições UAPS no portal | {portal['features']} |",
        f"| Feições com CNES | {portal['with_cnes']} |",
        f"| Códigos CNES distintos no portal | {portal['distinct_cnes']} |",
        "| Códigos do portal encontrados no CNES de Fortaleza | "
        f"{len(result['matched'])} |",
        "| Códigos do portal encontrados em outro município | "
        f"{len(result['portal_in_other_municipality'])} |",
        f"| Códigos do portal ausentes do CNES | {len(result['portal_not_in_cnes'])} |",
        "| Estabelecimentos CNES em Fortaleza (todos os tipos) | "
        f"{result['cnes_municipality_total']} |",
        "| Atenção primária no CNES sem correspondente no portal | "
        f"{len(cnes_only)} |",
        f"| Divergências de atributo | {len(result['attribute_divergences'])} |",
        "",
        "Tipo CNES dos códigos casados: "
        + (
            "; ".join(
                f"{_type_label(code)}: {count}"
                for code, count in sorted(result["matched_types"].items())
            )
            or "nenhum"
        )
        + ".",
        "",
        "Atenção primária no CNES de Fortaleza por tipo e gestão: "
        + (
            "; ".join(
                f"{_type_label(unit)}, gestão "
                f"{MANAGEMENT.get(management, management)}: {count}"
                for (unit, management), count in sorted(
                    result["cnes_primary_care"].items()
                )
            )
            or "nenhum"
        )
        + ".",
        "",
        "## Diferenças encontradas",
        "",
    ]

    if repeated:
        lines += ["### CNES repetido no portal", ""]
        lines += [
            f"- `{code}` em {len(ids)} feições (source_id {', '.join(ids)})."
            for code, ids in repeated.items()
        ]
        lines.append("")
    if result["portal_without_cnes"]:
        lines += [
            "### Feições do portal sem CNES",
            "",
            "- source_id " + ", ".join(result["portal_without_cnes"]) + ".",
            "",
        ]
    if result["portal_in_other_municipality"]:
        lines += ["### CNES do portal registrado em outro município", ""]
        lines += [
            f"- `{code}` → município `{municipality}`."
            for code, municipality in result["portal_in_other_municipality"].items()
        ]
        lines.append("")
    if result["portal_not_in_cnes"]:
        lines += [
            "### CNES do portal ausente do arquivo CNES",
            "",
            "- "
            + ", ".join(f"`{code}`" for code in result["portal_not_in_cnes"])
            + ".",
            "",
        ]
    if cnes_only:
        lines += [
            "### Atenção primária no CNES sem correspondente no portal",
            "",
            "| CNES | Tipo | Gestão | Natureza jurídica | Última atualização |",
            "|---|---|---|---|---|",
        ]
        lines += [
            f"| `{row['CNES']}` | {_type_label(row['TP_UNID'])} | "
            f"{MANAGEMENT.get(row['TPGESTAO'], row['TPGESTAO'])} | "
            f"{row['NAT_JUR']} — "
            f"{LEGAL_NATURE.get(row['NAT_JUR'], 'sem rótulo conferido')}"
            f" | {row['DT_ATUAL'][:4]}-{row['DT_ATUAL'][4:]} |"
            for row in cnes_only
        ]
        lines.append("")
    if result["attribute_divergences"]:
        lines += ["### Divergências de atributo", ""]
        lines += [
            f"- `{item['cnes']}`: `{item['field']}` no portal = `{item['portal']}`, "
            f"no CNES = `{item['cnes_value']}`."
            for item in result["attribute_divergences"]
        ]
        lines.append("")
    if not any(
        [
            repeated,
            result["portal_without_cnes"],
            result["portal_in_other_municipality"],
            result["portal_not_in_cnes"],
            cnes_only,
            result["attribute_divergences"],
        ]
    ):
        lines += ["Nenhuma diferença no recorte comparado.", ""]

    lines += [
        "## Causas possíveis (não verificadas)",
        "",
        "Hipóteses para orientar conferência com a SMS; nenhuma foi confirmada "
        "e nenhuma correção automática é aplicada.",
        "",
        "- **Datas de corte diferentes:** o catálogo do portal e a competência do "
        "CNES não são do mesmo mês; unidades cadastradas ou alteradas no "
        "intervalo aparecem em só uma base.",
        "- **Escopo distinto:** o portal lista UAPS municipais; o CNES inclui "
        "postos sob gestão estadual e outros tipos que o catálogo municipal não "
        "pretende cobrir.",
        "- **Cadastro em transição:** códigos CNES-only atualizados recentemente "
        "podem ser unidades novas, reabertas ou em reforma ainda não "
        "incorporadas ao mapa — ou unidades que a SMS não classifica como UAPS.",
        "- **CNES repetido:** duas feições com o mesmo código podem indicar erro "
        "de digitação, unidade com anexo em outro endereço ou código copiado; "
        "por isso o CNES não é usado como chave de deduplicação (SDD-020).",
        "",
        "## Limitações",
        "",
        "- O CNES é cadastro: não comprova funcionamento, horário, equipe ou "
        "capacidade de atendimento.",
        "- Sem nome no arquivo ST, a conferência depende apenas do código; erros "
        "de código que coincidam com outro estabelecimento válido não são "
        "detectáveis aqui.",
        "- Rótulos de códigos vêm das tabelas `TAB_CNES` do DATASUS; códigos sem "
        "rótulo conferido são exibidos como publicados.",
        "",
        "## Reprodução",
        "",
        "```powershell",
        "python scripts/fetch_data.py --source cnes-ce",
        "python -m scripts.check_cnes_divergence",
        "```",
        "",
    ]
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--facilities", type=Path, default=Path("public/data/facilities.geojson")
    )
    parser.add_argument(
        "--manifest", type=Path, default=Path("public/data/manifest.json")
    )
    parser.add_argument(
        "--cnes", type=Path, default=Path("data/raw/cnes-st-ce-202609.dbc")
    )
    parser.add_argument(
        "--output", type=Path, default=Path("docs/DATA_QUALITY_REPORT.md")
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    facilities = json.loads(args.facilities.read_text(encoding="utf-8"))["features"]
    cnes_metadata = json.loads(
        args.cnes.with_name(f"{args.cnes.name}.metadata.json").read_text(encoding="utf-8")
    )
    layer = next(
        entry
        for entry in json.loads(args.manifest.read_text(encoding="utf-8"))["layers"]
        if entry["id"] == "facilities"
    )
    result = compare(facilities, load_cnes(args.cnes))

    portal_source = (
        f"Fortaleza em Mapas, camada {layer['source']['id']} "
        f"({layer['source']['organization']}), catálogo atualizado em "
        f"{layer['source']['catalog_updated_at']}, coletado em "
        f"{layer['source']['collected_at'][:10]}; arquivo `{layer['file']}` "
        f"(SHA-256 `{layer['sha256'][:12]}…`)."
    )
    cnes_source = (
        f"{cnes_metadata['organization']}, arquivo `{cnes_metadata['download_url']}`, "
        f"competência {', '.join(result['competences'])}, coletado em "
        f"{cnes_metadata['collected_at'][:10]} (SHA-256 "
        f"`{cnes_metadata['sha256'][:12]}…`). {cnes_metadata['license']}."
    )
    report = render_report(result, portal_source=portal_source, cnes_source=cnes_source)
    args.output.write_text(report, encoding="utf-8", newline="\n")
    print(
        f"Relatório gerado: {args.output} — {len(result['matched'])} casados, "
        f"{len(result['cnes_only_primary_care'])} só no CNES"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
