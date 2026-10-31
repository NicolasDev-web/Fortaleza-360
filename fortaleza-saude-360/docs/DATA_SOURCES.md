# Registro de fontes oficiais

Verificação realizada em **2026-10-27**. As três camadas iniciais serão obtidas pela API oficial **Fortaleza em Mapas**, mantida pela Prefeitura de Fortaleza e pelo Ipplan Fortaleza. A API não exige chave e documenta GeoJSON RFC 7946.

## Manifesto aprovado para ingestão

| Camada | ID | Página e metadados oficiais | Download GeoJSON | Órgão / referência | Licença e atribuição |
|---|---:|---|---|---|---|
| UAPS | 824 | [Unidades de Atenção Primária à Saúde](https://mapas.fortaleza.ce.gov.br/mapa/824/unidades-de-atencao-primaria-a-saude-uaps) | [`api/v1/geojson?id=824&download=true`](https://mapas.fortaleza.ce.gov.br/api/v1/geojson?id=824&download=true) | SMS; ano 2026; atualização do catálogo em 2026-06-08 | Termos da API: reutilização livre com atribuição obrigatória |
| Bairros | 21 | [Bairros de Fortaleza](https://mapas.fortaleza.ce.gov.br/mapa/21/bairros-de-fortaleza) | [`api/v1/geojson?id=21&download=true`](https://mapas.fortaleza.ce.gov.br/api/v1/geojson?id=21&download=true) | IPLANFOR; catálogo 2023; geometria `ano_ref=2019`; atualização em 2023-09-22 | Termos da API: reutilização livre com atribuição obrigatória |
| Limite municipal | 12 | [Limite Administrativo da Cidade de Fortaleza](https://mapas.fortaleza.ce.gov.br/mapa/12/limite-administrativo-da-cidade-de-fortaleza) | [`api/v1/geojson?id=12&download=true`](https://mapas.fortaleza.ce.gov.br/api/v1/geojson?id=12&download=true) | IPECE; referência 2019; atualização do catálogo em 2023-07-25 | Termos da API: reutilização livre com atribuição obrigatória |

Metadados devem ser consultados em `https://mapas.fortaleza.ce.gov.br/api/v1/maps?id={ID}` antes de cada coleta. A [documentação oficial da API](https://mapas.fortaleza.ce.gov.br/dados-abertos/api) autoriza utilização, cópia, extração e reprodução para soluções civis e pesquisas, exigindo a citação:

> Fonte: Prefeitura Municipal de Fortaleza - Fortaleza em Mapas (Ipplan Fortaleza). Acesso via API de Dados Abertos.

O portal não informa uma licença padronizada como CC BY nem identificador SPDX. Portanto, registrar no manifesto: `licenca="Termos de Uso da API Fortaleza em Mapas — reutilização livre com atribuição obrigatória"` e manter o link dos termos.

### Camadas adicionadas na SDD-029

| Camada | ID | Página | Download GeoJSON | Órgão / referência | Licença e atribuição |
|---|---:|---|---|---|---|
| UPA | 825 | [Unidades de Pronto Atendimento (UPA)](https://mapas.fortaleza.ce.gov.br/mapa/825/unidades-de-pronto-atendimento-upa) | [`api/v1/geojson?id=825&download=true`](https://mapas.fortaleza.ce.gov.br/api/v1/geojson?id=825&download=true) | SMS; ano 2026; data de atualização do catálogo não informada pela API | Termos da API: reutilização livre com atribuição obrigatória |
| Hospitais municipais | 823 | [Hospitais Municipais](https://mapas.fortaleza.ce.gov.br/mapa/823/hospitais-municipais) | [`api/v1/geojson?id=823&download=true`](https://mapas.fortaleza.ce.gov.br/api/v1/geojson?id=823&download=true) | SMS; ano 2026; data de atualização do catálogo não informada pela API | Termos da API: reutilização livre com atribuição obrigatória |

Verificação de 2026-10-27: 6 UPAs e 10 hospitais, cada feição como `MultiPoint` com um único ponto, campos `name`, `natureza` (`UPA`/`HOSP`), `cnes_n`, `nm_bairro`, `distrito`, `ano`. A transformação (`scripts/transform_units.py`) converte em `Point` sem mover a coordenada e rejeita natureza inesperada, mais de um ponto, ponto fora do município ou ano diferente de 2026. A fonte não publica gestão nem vínculo SUS: esses campos ficam nulos e aparecem como "Não informado". "Hospitais municipais" exclui hospitais estaduais, federais e privados. A camada "Equipamentos de Saúde" (ID 658, que também traz CAPS e policlínicas) não foi adotada.

Essas unidades ficam em camadas próprias e fora das contagens de UAPS, do Modo História e dos KPIs de atenção primária.

## Como cada camada funcionará

### UAPS — pontos de serviço

O instantâneo verificado retornou 134 feições `Point`, com `nome`, `natureza`, `gestão`, `atende_sus`, `cnes`, `bairro`, `fonte` e `ano`. A camada alimentará marcadores, agrupamento visual, filtro por tipo e a ficha de uma unidade. Não representa horário, capacidade, estoque, equipe ou disponibilidade de atendimento.

Na transformação, converter coordenadas para o contrato `[longitude, latitude]`, usar o `id` da feição como `source_id` e preservar o CNES em campo próprio. O CNES `4644042` apareceu em duas unidades distintas no instantâneo; por isso ele não pode ser usado isoladamente para deduplicação. Validar coordenadas dentro do limite municipal e exibir campos ausentes explicitamente.

### Bairros — recorte investigativo

O download retornou 121 feições `MultiPolygon`, com nomes e códigos únicos. A camada desenhará contornos, permitirá hover/clique, preencherá o filtro de bairro e fará a associação espacial de UAPS ao bairro. O nome textual informado no ponto será apenas conferência; o vínculo analítico deve vir de `point-in-polygon`.

Normalizar os nomes de propriedades, especialmente os campos com espaços duplicados. Usar `Código do Bairro` como chave municipal; não assumir que `Código do IBGE` é uma chave oficial de bairro sem validação adicional. O ano do catálogo (2023) não substitui a referência administrativa de 2019, baseada no Decreto Municipal nº 14.498/2019.

### Limite municipal — controle de qualidade

O download retornou uma feição `MultiPolygon`, fonte IPECE, referência 2019, associada à Lei Estadual nº 16.821/2019. Ela servirá para enquadrar o mapa, criar máscara territorial, recortar camadas e sinalizar pontos fora de Fortaleza. Não será tratada como indicador nem como divisão de bairros.

O arquivo informa área de 312,441 km² e código municipal `2304400`. A geometria deverá ser validada e comparada com a união dos bairros; diferenças não devem ser corrigidas automaticamente.

## Regras de coleta e proveniência

- Gravar arquivos brutos fora do Git e nunca editar o original.
- Como os endpoints não forneceram `ETag` ou `Last-Modified` na verificação, registrar `coletado_em` e SHA-256 a cada download.
- Validar `FeatureCollection`, tipo geométrico, coordenadas finitas, CRS de saída WGS84, contagem e campos obrigatórios.
- Registrar em `public/data/manifest.json`: ID, órgão, URL da página, URL do download, ano de referência, atualização do catálogo, coleta, arquivo, checksum, licença, método e limitações.
- Não misturar anos silenciosamente e não apresentar UAPS como capacidade real de atendimento.

## CNES — conferência cadastral (SDD-024)

| Fonte | Arquivo | Órgão / referência | Licença e atribuição |
|---|---|---|---|
| [FTP de disseminação do DATASUS, CNES › Estabelecimentos (ST)](ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/) | `STCE2609.dbc` (Ceará, competência 2026-09, publicado em 2026-10-15) | DATASUS/Ministério da Saúde; layout no informe técnico `Doc/IT_CNES_1706.pdf`; rótulos de códigos em `Auxiliar/TAB_CNES.zip` | Dados públicos de disseminação; o FTP não declara licença padronizada (CC/SPDX). Atribuição: "Fonte: Ministério da Saúde — DATASUS, Cadastro Nacional de Estabelecimentos de Saúde (CNES)". |

Verificação de 2026-10-27: a [API de Dados Abertos do Ministério da Saúde](https://apidadosabertos.saude.gov.br/) recusou todas as conexões (TCP reset, inclusive na raiz), e o pacote CSV do OpenDataSUS estava com data de 2025-06-11. Por isso a conferência usa o arquivo mensal do FTP, mais recente. O DBC é convertido localmente por `scripts/dbc.py` (porte do `blast.c` do zlib) e só os campos `CNES`, `CODUFMUN`, `TP_UNID`, `TPGESTAO`, `VINC_SUS`, `NAT_JUR`, `DT_ATUAL` e `COMPETEN` são lidos; `CPF_CNPJ`, CEP, dados bancários e contratos são descartados. O CNES serve só para conferência (`docs/DATA_QUALITY_REPORT.md`) e não é publicado em `public/data/`.

## Censo 2022 — denominadores (SDD-025)

| Papel | Download | Órgão / referência | Licença e atribuição |
|---|---|---|---|
| População por setor | [`Agregados_por_setores_basico_BR_20260520.zip`](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/Agregados_por_Setor_csv/Agregados_por_setores_basico_BR_20260520.zip) | IBGE; Censo 2022, revisão de 2026-05-20 | "Fonte: IBGE, Censo Demográfico 2022." Licença padronizada não confirmada (página de termos respondeu 403 na verificação) |
| Malha de setores | [`CE_setores_CD2022.gpkg`](https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2022/setores/gpkg/UF/CE/CE_setores_CD2022.gpkg) | IBGE; malha 2022 publicada em 2024-11-12 | Idem |

Revisão de atualização em 2026-10-31: o [índice oficial de agregados CSV](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/Agregados_por_Setor_csv/) mantém o básico `Agregados_por_setores_basico_BR_20260520.zip`. O arquivo de outubro é `Agregados_por_setores_caracteristicas_domicilio1_BR_20261021.zip`, outro conjunto de variáveis; não foi encontrado nesse índice um básico de outubro que justificasse substituir a fonte de população. Não houve nova coleta nem recálculo nesta revisão. Termos específicos de reutilização dos dois arquivos seguem sem confirmação; o plano institucional de dados abertos 2020–2022 encontrado na busca respondeu HTTP 403 e não foi tratado como licença desses arquivos.

Método, resultados e limitações do crosswalk setor → bairro estão em `docs/POPULATION.md`.

Revisão de reutilização para a publicação de 2026-10-31: além da consulta de fontes oficiais, o GPKG bruto foi aberto em SQLite somente leitura e não contém tabela de metadados; o ZIP básico coletado contém uma entrada, sem README/termo/licença anexado. Foram encontradas declarações de reprodução com atribuição em outros mapas IBGE, mas o escopo não confirma automaticamente estes dois arquivos. Mantida a atribuição "Fonte: IBGE, Censo Demográfico 2022" e o estado de termos específicos não confirmados. Nenhuma licença CC/SPDX foi inventada, fonte ou número recalculado. Publicação experimental foi autorizada pelo usuário após conhecer essa pendência; autorização do usuário não substitui esclarecimento do IBGE.

Na SDD-038, esses mesmos setores e totais de 2022 são cruzados com os corredores de caminhada da SDD-037. `public/data/population-coverage.json` publica contagens e percentuais modelados, alternativas de alocação, limites espaciais e sensibilidade à velocidade. O bloco `population_coverage` no manifesto registra checksum, fontes e ressalvas. Método em `docs/COVERAGE.md`.

## Basemap OSM (SDD-027)

| Papel | Download | Referência | Licença e atribuição |
|---|---|---|---|
| Ruas e uso do solo (mapa de fundo) | Recorte do build diário [`build.protomaps.com/20261025.pmtiles`](https://build.protomaps.com/20261025.pmtiles) (schema 4.15.2), z0–14, caixa do limite municipal + ~3 km | OpenStreetMap via Protomaps; coleta em 2026-10-28 | ODbL 1.0 — "© colaboradores do OpenStreetMap", com link para [openstreetmap.org/copyright](https://www.openstreetmap.org/copyright), exibido sobre o mapa |
| Fonte dos rótulos | Glyphs `Noto Sans Regular` (faixas 0-255, 256-511, 8192-8447) de [protomaps/basemaps-assets](https://github.com/protomaps/basemaps-assets) | — | SIL Open Font License 1.1 (`public/basemap/fonts/OFL.txt`) |

O recorte (`public/basemap/fortaleza.pmtiles`, ~6,4 MB) e as fontes são servidos pelo próprio app: o navegador do visitante não faz requisição a terceiros, então nenhum provedor de tiles recebe IP ou área consultada. `tests/basemap.test.ts` falha se o estilo apontar para outra origem. O basemap é só referência visual: não entra em contagens, distâncias ou tempos de trajeto. A extração é reproduzível (`scripts/build_basemap.py`; mesmo build gera o mesmo SHA-256) e fica registrada no bloco `basemap` de `public/data/manifest.json`.

## Malha viária a pé (SDD-035)

| Papel | Download | Referência | Licença e atribuição |
|---|---|---|---|
| Grafo de pedestres (cruzamentos e trechos) | Extrato [`nordeste-261027.osm.pbf`](https://download.geofabrik.de/south-america/brazil/nordeste-261027.osm.pbf) da Geofabrik (423 MB), SHA-256 `e99014cf0d798654aa77060172ed2aea75213a547d1f5a718e4decaa51952bc3` | Dados OSM até 2026-10-27T21:23:59Z (cabeçalho do arquivo); coleta em 2026-10-28 | ODbL 1.0 — "© OpenStreetMap contributors"; extrato: Geofabrik GmbH |

O arquivo bruto fica em `data/raw/` (fora do Git) e é pedido pelo nome (`fetch_data.py --source osm-nordeste`); `--all` não o baixa. Regras, custos e resultados de conectividade estão em `docs/WALK_NETWORK.md`. A malha alimenta os corredores, o resumo de cobertura e o simulador; o grafo bruto não é desenhado na interface.

As isócronas da SDD-037 usam esse mesmo extrato, as UAPS de 2026 e o limite municipal de 2019. Seu manifesto offline (`data/processed/isochrones/manifest.json`) reúne os registros de fonte, checksums, datas, licenças, parâmetros e dicionário. Método e limitações em `docs/ISOCHRONES.md`.

## Fontes complementares futuras

A lista de setores da SDD-050 reutiliza essas fontes de Censo 2022, UAPS 2026 e bairros 2019. Não acrescenta fonte externa: método, insumos, checksums e dicionário em `public/data/sector-ranking.json` e no bloco `sector_ranking` do manifesto. Ver `SECTOR_RANKING.md`.

| Tema | Fonte oficial | Uso previsto | Restrição principal |
|---|---|---|---|
| Rede viária | [OpenStreetMap](https://www.openstreetmap.org/copyright) | Coletada na SDD-035; tempos e cobertura nas SDD-036 a 038 | ODbL, atribuição e regras para derivados |
