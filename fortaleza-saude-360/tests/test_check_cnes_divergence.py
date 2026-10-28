from scripts.check_cnes_divergence import compare, project_safe_fields, render_report


def _facility(source_id: str, cnes: str | None, *, sus: bool | None = True) -> dict:
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [-38.5, -3.8]},
        "properties": {
            "id": f"uaps-{source_id}",
            "name": f"UAPS DEMO {source_id}",
            "source_id": source_id,
            "management": "M",
            "sus": sus,
            "cnes": cnes,
        },
    }


def _cnes(code: str, *, municipality: str = "230440", unit_type: str = "02",
          management: str = "M", sus: str = "1") -> dict[str, str]:
    return {
        "CNES": code,
        "CODUFMUN": municipality,
        "TP_UNID": unit_type,
        "TPGESTAO": management,
        "VINC_SUS": sus,
        "NAT_JUR": "1031",
        "DT_ATUAL": "202609",
        "COMPETEN": "202609",
    }


def test_projection_discards_identifying_fields() -> None:
    record = {**_cnes("0000001"), "CPF_CNPJ": "00000000000DEMO", "COD_CEP": "60000000"}

    assert "CPF_CNPJ" not in project_safe_fields(record)
    assert "COD_CEP" not in project_safe_fields(record)


def test_compare_classifies_without_assuming_equivalence() -> None:
    facilities = [
        _facility("1", "0000001"),
        _facility("2", "0000002"),
        _facility("3", "0000002"),
        _facility("4", "0000003"),
        _facility("5", "0000004", sus=False),
        _facility("6", None),
        _facility("7", "0000009"),
    ]
    records = [
        _cnes("0000001"),
        _cnes("0000002"),
        _cnes("0000003", municipality="230010"),
        _cnes("0000004"),
        _cnes("0000005"),
        _cnes("0000006", unit_type="01", management="E"),
        _cnes("0000007", unit_type="22"),
    ]

    result = compare(facilities, records)

    assert result["portal"] == {"features": 7, "with_cnes": 6, "distinct_cnes": 5}
    assert result["portal_repeated_cnes"] == {"0000002": ["2", "3"]}
    assert result["portal_without_cnes"] == ["6"]
    assert result["matched"] == ["0000001", "0000002", "0000004"]
    assert result["portal_in_other_municipality"] == {"0000003": "230010"}
    assert result["portal_not_in_cnes"] == ["0000009"]
    assert [row["CNES"] for row in result["cnes_only_primary_care"]] == [
        "0000005",
        "0000006",
    ]
    assert result["attribute_divergences"] == [
        {"cnes": "0000004", "field": "sus", "portal": False, "cnes_value": "1"}
    ]


def test_report_states_limits_and_has_no_identifiers() -> None:
    result = compare([_facility("1", "0000001")], [_cnes("0000001"), _cnes("0000005")])
    report = render_report(
        result,
        portal_source="Fortaleza em Mapas DEMO",
        cnes_source="CNES DEMO 202609",
    )

    assert "# Relatório de qualidade de dados" in report
    assert "não são equivalentes" in report
    assert "Causas possíveis" in report
    assert "0000005" in report
    assert "CPF" not in report.replace("CPF/CNPJ", "")
