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

## Malha viária a pé

```powershell
python scripts/fetch_data.py --source osm-nordeste --timeout 120
python -m scripts.network
```

Baixa o extrato OSM da Geofabrik (423 MB, só quando pedido pelo nome) e gera em `data/processed/walk_network/` os nós (`nodes.csv`), os trechos com comprimento em metros (`edges.csv`) e `audit.json` (versão OSM, regras, conectividade e ligação das UAPS à malha). Não calcula tempo. Método e resultados em `docs/WALK_NETWORK.md`.

## Tempo de caminhada pela malha

```powershell
python -m scripts.travel_time
```

Lê a malha gerada por `scripts.network`, aplica velocidade (4,8 km/h central; 4,0 e 5,5 km/h como faixa) e fatores para escadas e vias não pavimentadas, e grava `travel_time_model.json` com os parâmetros e cinco pares de conferência. Tempos vêm só de caminhos na malha. Método em `docs/TRAVEL_TIME.md`.

## Isócronas a pé (10/20/30 minutos)

```powershell
python -m scripts.network
python -m scripts.isochrones
```

Regenera a malha com curvas preservadas e produz nove áreas cumulativas até alguma UAPS (três tempos × três velocidades), com trechos parcialmente alcançados e corredores de 25 m. Grava GeoJSON e manifesto auditável em `data/processed/isochrones/`. Bloqueia geometrias inválidas, áreas fora do município e falhas de encaixe entre tempos ou velocidades. Parâmetros opcionais: `--buffer-m`, `--max-snap-m`, `--network-dir`, `--source-manifest` e `--osm-metadata`. Método e limites em `docs/ISOCHRONES.md`.

## População nos corredores de acessibilidade

Para a visualização leve, depois de gerar os polígonos:

```powershell
python -m scripts.corridor_preview
python scripts/generate_manifest.py
```

Gera PNGs transparentes centrais de 10/20/30 min e `corridor-preview.json`. Somente a imagem escolhida é carregada sob demanda. Pixels não entram em contagens; o GeoJSON analítico continua offline. Ver `docs/CORRIDOR_PREVIEW.md`.

```powershell
python -m scripts.coverage
python scripts/generate_manifest.py
```

Cruza setores do Censo 2022 com os nove corredores da SDD-037. Publica `public/data/population-coverage.json` com contagem por ponto representativo, alternativa ponderada por área, limites espaciais e sensibilidade à velocidade. A auditoria por setor fica em `data/processed/coverage/sector_coverage.csv`. Método, denominador e limites de interpretação em `docs/COVERAGE.md`.

## Lista descritiva de setores por distância

```powershell
python -m scripts.sector_ranking
python scripts/generate_manifest.py
npm run check:data
```

Gera `public/data/sector-ranking.json` a partir dos setores, crosswalk e UAPS já validados. Usa ponto representativo e haversine, sem converter para minutos ou inferir prioridade. Método e limites em `docs/SECTOR_RANKING.md`.

## Dados do simulador candidato (reprodução)

```powershell
python -m scripts.build_scenario
python scripts/generate_manifest.py
```

Prepara grafo e acesso aos mesmos corredores da base para o cálculo no navegador. Bloqueia a geração se alguma das 39.672 inclusões dos setores divergir da SDD-038. Método, entrega e limites em `docs/SCENARIO_SIMULATOR.md`.

## Agregar população por bairro

```powershell
python -m scripts.transform_population
python -m scripts.aggregate_population
python scripts/generate_manifest.py
```

Soma a população do Censo 2022 por bairro em `public/data/neighborhood-population.json`, com valor central (setor inteiro no bairro principal) e faixa (comparando com a ponderação por área). Falha se algum bairro ficar sem setor ou algum setor sem população.

