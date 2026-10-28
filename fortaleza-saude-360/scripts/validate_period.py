"""Impede que camadas com anos ausentes, misturados ou inesperados sigam no pipeline."""

from __future__ import annotations

from collections import Counter

import pandas as pd


class PeriodValidationError(ValueError):
    pass


def validate_period(
    data: pd.DataFrame, column: str, expected: int | str, *, layer: str
) -> None:
    """Exige que toda linha declare exatamente o ano de referência registrado."""
    if column not in data.columns:
        raise PeriodValidationError(f"{layer}: coluna de período ausente: {column}")
    found = Counter(None if pd.isna(value) else str(value) for value in data[column])
    if found.get(None):
        raise PeriodValidationError(
            f"{layer}: {found[None]} registros sem ano de referência em {column}"
        )
    if set(found) != {str(expected)}:
        summary = ", ".join(
            f"{year} ({count})" for year, count in sorted(found.items())
        )
        raise PeriodValidationError(
            f"{layer}: esperado {expected} em {column}, encontrado {summary}"
        )
