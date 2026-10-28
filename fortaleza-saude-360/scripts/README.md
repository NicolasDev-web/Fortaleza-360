# Pipelines

Dados brutos e processados ficam fora do Git.

## Ambiente Python

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install --upgrade pip
.\.venv\Scripts\python -m pip install ".[dev]"
.\.venv\Scripts\python -m pytest
.\.venv\Scripts\python -m ruff check scripts tests
```

O projeto suporta Python 3.11 a 3.13; as versões diretas estão fixadas em `pyproject.toml`.

## Coleta

```powershell
python scripts/fetch_data.py --all
python scripts/fetch_data.py --source uaps --timeout 30
```

`fetch_data.py` aceita somente as fontes aprovadas em `docs/DATA_SOURCES.md` e grava, em `data/raw/`, o GeoJSON original, um arquivo `.sha256` e metadados de coleta. Não faz scraping nem altera o conteúdo baixado.

## Proveniência

```powershell
python scripts/generate_manifest.py
```

Depois de `export_public.py`, gera `public/data/manifest.json` com fonte, órgão, datas de referência/catálogo/coleta, checksums do bruto e do público, licença, termos, dicionário de campos, método e limitações de cada camada. Propriedade publicada sem entrada no dicionário interrompe a geração.
