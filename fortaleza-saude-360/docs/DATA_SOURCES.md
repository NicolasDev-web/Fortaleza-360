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

## Fontes complementares futuras

| Tema | Fonte oficial | Uso previsto | Restrição principal |
|---|---|---|---|
| CNES | [API de Dados Abertos do Ministério da Saúde](https://apidadosabertos.saude.gov.br/) | Conferência cadastral | Cadastro não comprova disponibilidade real |
| População | [Censo Demográfico 2022 — IBGE](https://www.ibge.gov.br/estatisticas/sociais/populacao/22827-censo-demografico-2022.html) | Denominadores | Compatibilizar a geografia e explicitar defasagem |
| Setores censitários | [Malhas territoriais — IBGE](https://www.ibge.gov.br/geociencias/organizacao-do-territorio/estrutura-territorial/26565-malhas-de-setores-censitarios-divisoes-intramunicipais.html) | Análises intramunicipais | Validar CRS, topologia e granularidade |
| Rede viária | [OpenStreetMap](https://www.openstreetmap.org/copyright) | Acessibilidade em fase posterior | ODbL, atribuição e regras para derivados |
