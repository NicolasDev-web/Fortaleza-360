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

## Exportação pública

```powershell
python scripts/export_public.py
```

Interrompe sem gravar nada se houver id, nome, código ou ano nulo; id de UAPS duplicado com conteúdo diferente ou código de bairro repetido; geometria vazia, inválida ou fora do município; ou ano de referência ausente, misturado ou diferente do registrado em `fetch_data.SOURCES`. Os casos ficam em `tests/test_etl.py`.

## Proveniência

```powershell
python scripts/generate_manifest.py
```

Depois de `export_public.py`, gera `public/data/manifest.json` com fonte, órgão, datas de referência/catálogo/coleta, checksums do bruto e do público, licença, termos, dicionário de campos, método e limitações de cada camada. Propriedade publicada sem entrada no dicionário interrompe a geração.

## Conferência com o CNES

```powershell
python scripts/fetch_data.py --source cnes-ce
python -m scripts.check_cnes_divergence
```

Compara por código CNES as UAPS publicadas com o arquivo de estabelecimentos do DATASUS e regera `docs/DATA_QUALITY_REPORT.md`. Lê só códigos e datas do CNES; nenhum dado do CNES vai para `public/data/`.

## População (Censo 2022)

```powershell
python scripts/fetch_data.py --source ibge-setores-ce
python scripts/fetch_data.py --source ibge-agregados-basico
python -m scripts.transform_population
```

Gera em `data/processed/` os setores com população (`demand_units.geojson`), o crosswalk setor → bairro e uma auditoria do join. Método em `docs/POPULATION.md`.

## Basemap (OpenStreetMap)

```powershell
python -m scripts.build_basemap --build 20261025
python scripts/generate_manifest.py
```

Recorta, por requisições de intervalo, o build diário do Protomaps na caixa do limite municipal (+~3 km) até o zoom 14 e grava `public/basemap/fortaleza.pmtiles` com um relatório `.json` (fonte, SHA-256, licença, coleta). Escolha um build listado em `https://build-metadata.protomaps.dev/builds.json`; depois regenere o manifesto.
