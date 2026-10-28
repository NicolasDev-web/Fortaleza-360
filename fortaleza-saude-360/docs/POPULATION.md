# Denominadores populacionais e crosswalk setor → bairro

Gerado na SDD-025 por `python -m scripts.transform_population` (coleta de 2026-10-27). As saídas ficam em `data/processed/` (fora do Git) e são reproduzíveis a partir das fontes abaixo.

## Fontes

| Papel | Arquivo | Referência | Observação |
|---|---|---|---|
| População por setor | `Agregados_por_setores_basico_BR_20260520.zip` (FTP IBGE, Censo 2022, agregados por setor) | Censo 2022; revisão publicada em 2026-05-20 | `V0001` = total de pessoas (dicionário `dicionario_de_dados_agregados_por_setores_censitarios_20260520.xlsx`) |
| Geometria dos setores | `CE_setores_CD2022.gpkg` (geoftp IBGE, malha de setores 2022) | Malha publicada em 2024-11-12, SIRGAS 2000 (EPSG:4674) | Reprojetada para EPSG:4326; nenhuma geometria inválida, nenhum reparo |
| Bairros | `public/data/neighborhoods.geojson` | Decreto Municipal nº 14.498/2019 | Mesma camada exibida no mapa (SDD-021/022) |

Atribuição: "Fonte: IBGE, Censo Demográfico 2022." O site `www.ibge.gov.br` respondeu 403 à página de termos na verificação, então a licença padronizada não foi confirmada; o manifesto público registrará essa ressalva quando houver camada derivada publicada.

## Denominador por setor (`demand_unit`)

- Unidade: setor censitário 2022, sem agregação; chave `geo_id` = `CD_SETOR` (15 dígitos).
- `population` = `V0001`. Setor da malha sem linha no agregado recebe `population = null` e `population_missing_reason = "setor sem registro no agregado"`; nunca zero.
- O join falha se houver linha de população sem geometria (pessoas seriam perdidas), linha duplicada ou valor não numérico (sigilo ou erro).

Resultado em Fortaleza (`CD_MUN = 2304400`):

| Medida | Valor |
|---|---:|
| Setores na malha | 4.408 |
| Setores no agregado | 4.408 |
| Setores sem população | 0 |
| Setores com população zero | 102 |
| População total | 2.428.708 |

## Crosswalk setor → bairro

Método: interseção geométrica em SIRGAS 2000 / UTM 24S (EPSG:31984). Para cada setor, `area_share` é a fração da área do setor dentro de cada bairro. Uma sobra acima de 0,1% sem bairro vira linha com `neighborhood_code = null`. `is_primary` marca o bairro com maior fração.

Arquivo: `data/processed/sector_neighborhood_crosswalk.csv` (`geo_id`, `neighborhood_code`, `area_share`, `is_primary`).

| Medida | Valor |
|---|---:|
| Linhas do crosswalk | 6.787 |
| Setores divididos (bairro principal < 95% da área) | 33 |
| Setores sem bairro principal | 0 |
| Setores com soma de frações > 100,1% (bairros sobrepostos) | 0 |
| Bairros sem nenhum setor | 0 |
| População ponderada fora de bairros | ≈ 114 pessoas |

A maior parte das 6.787 linhas são lascas de borda: setores e bairros vêm de produtores diferentes e os limites não coincidem exatamente.

### Duas formas de agregar e a diferença entre elas

- **Bairro principal:** cada setor entra inteiro no bairro com maior fração.
- **Ponderação por área:** população × `area_share`, supondo densidade uniforme dentro do setor, o que não é verdade em setores com áreas vazias.

Entre os 121 bairros, a diferença máxima entre os dois métodos é de 382 pessoas (2,13%). Só 4 bairros diferem mais de 1%. A SDD-033 deve declarar qual método usa e expor essa faixa como incerteza.

### Conferência com o bairro declarado pelo IBGE

Cada setor 2022 traz `CD_BAIRRO`/`NM_BAIRRO` do cadastro do IBGE. Comparado o nome (sem acentos e caixa) com o bairro municipal principal, 4.340 de 4.408 setores coincidem. As divergências são:

- 51 setores: municipal "Tauape" × IBGE "São João do Tauape" (diferença de nome);
- 16 setores: municipal "Rachel de Queiroz" × IBGE "Dendê" (bairro municipal sem correspondente no cadastro do IBGE);
- 1 setor: municipal "Maraponga" × IBGE "Parangaba" (limite).

O vínculo analítico continua sendo o geométrico; o campo do IBGE fica guardado só para conferência.

## Limitações

- O Censo 2022 é anterior à coleta das UAPS (2026): a população tem defasagem de quatro anos e não é projetada.
- Setores com população zero (102) continuam no denominador, com valor 0, para não sumirem de somas e taxas.
- A ponderação por área supõe distribuição uniforme da população no setor.
- Os bairros são uma divisão administrativa, não territórios de adscrição das UAPS.
