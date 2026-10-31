# População nos corredores de acessibilidade modelada — SDD-038

Cruza os setores do Censo 2022 com os nove corredores da SDD-037: 10, 20 e 30 minutos, em três velocidades de caminhada. A saída é uma estimativa de população localizada nos corredores do modelo, sem informação de atendimento, capacidade assistencial, vagas ou adscrição.

## Denominador e unidade de análise

Cada setor censitário tem um `geo_id` único e entra uma única vez em cada cenário. O denominador é a soma de **todos** os setores de Fortaleza com população no Censo 2022, inclusive os de população zero. Ele permanece igual entre tempos, velocidades e métodos. O percentual é `100 × população estimada / população total`.

População ausente, negativa, fracionária, não finita ou setor com geometria inválida bloqueiam a geração; não são substituídos por zero nem retirados silenciosamente do denominador. Denominador zero produz percentual `null`. A contagem e o total são conferidos com a auditoria da transformação do Censo.

Os setores são mantidos inteiros no denominador, mesmo onde seus limites diferem do limite municipal que recorta os corredores. Não se distribui população em unidades menores com informação domiciliar.

## Métodos e limites espaciais

| Campo | Regra | Hipótese / interpretação |
|---|---|---|
| `representative_population` | Soma inteira dos setores cujo ponto representativo está coberto pelo corredor | Método principal da metodologia do projeto. O ponto é interno à geometria, calculado em UTM; não é um centro ponderado pela população. Pontos na borda entram. |
| `area_weighted_population` | Soma de população × área de interseção / área total do setor | Alternativa de sensibilidade. Supõe população uniformemente distribuída dentro do setor. A estimativa pode ter fração de pessoa. |
| `full_sector_population` | Soma dos setores completamente contidos no corredor | Limite inferior espacial, condicionado às geometrias do modelo. |
| `any_overlap_population` | Soma dos setores com interseção de área positiva com o corredor | Limite superior espacial; simples contato na borda com área zero não entra. Pode ser muito amplo. |

Áreas são calculadas em SIRGAS 2000 / UTM 24S (EPSG:31984). Os corredores já são uniões até alguma UAPS: sobreposição entre unidades não duplica população. O CSV de auditoria mantém, por setor e cenário, população, inclusão do ponto, fração de área, população ponderada e os dois indicadores de limite.

O modelo exige, para cada cenário, `limite inferior ≤ ambas as estimativas ≤ limite superior ≤ denominador`. Também verifica contagens não decrescentes de 10 para 20 para 30 minutos e de velocidade lenta para central para rápida.

## Sensibilidade

O arquivo publica os resultados de **três velocidades × dois métodos de alocação**, além dos limites espaciais em cada uma das nove combinações tempo/velocidade. O bloco `sensitivity` traz o menor e o maior valor entre os seis resultados de cada limiar. É sensibilidade a hipóteses, sem interpretação como intervalo de confiança.

A largura dos corredores é herdada da SDD-037 (25 m de raio na execução atual). Não foi variada nesta tarefa. Mudar essa largura ou a cobertura OSM pode alterar bastante os resultados, mesmo sem mudança no tempo pela malha. Esses números não devem ser apresentados como uma classificação de áreas assistidas ou desassistidas.

## Fontes e limitações

- IBGE, Censo 2022, agregados por setor (revisão de 2026-05-20) e geometria dos setores 2022. A licença padronizada segue não confirmada na coleta; atribuição preservada.
- SMS Fortaleza, UAPS de 2026, e limite municipal IPECE de 2019 via Fortaleza em Mapas, com atribuição obrigatória.
- OpenStreetMap via Geofabrik, dados até 2026-10-27, ODbL 1.0 e atribuição a OpenStreetMap contributors.

A população tem defasagem de quatro anos em relação à lista de postos e à malha, sem projeção demográfica. Pontos representativos podem cair fora dos corredores em setores com moradores perto das ruas. A ponderação por área pode incluir áreas não habitadas. Calçadas, travessias e barreiras locais não foram verificadas; o conector entre posto e nó da malha fica fora do tempo. A conferência manual de rotas da SDD-036 segue pendente.

Os limites espaciais se referem ao corredor geométrico. Não limitam o erro total de acesso efetivo nem o número de pessoas atendidas por uma unidade.

## Reprodução e publicação

```powershell
python -m scripts.coverage
python scripts/generate_manifest.py
python -m pytest tests/test_coverage.py
```

Requer as saídas das SDD-025 e SDD-037. Não baixa novas fontes. Opções: `--sectors`, `--iso-dir`, `--raw-dir`, `--population-audit`, `--output` e `--audit-dir`.

- `public/data/population-coverage.json`: resumo agregado, percentuais, métodos, sensibilidade, limitações, fontes completas, parâmetros, dicionário e checksums das entradas. A entrada `population_coverage` no manifesto público registra o checksum do resumo.
- `data/processed/coverage/sector_coverage.csv`: auditoria por setor, fora do Git, com checksum no resumo. Permite refazer as somas sem repetir operações geométricas.

O JSON é disponibilizado como dado estático; a interface não ganhou cartões ou camada nesta microtarefa.

## Execução de 2026-10-28

Denominador auditado: **2.428.708 pessoas**, 4.408 setores, incluindo 102 com população zero e nenhum com população ausente. No cenário central (4,8 km/h), o método do ponto representativo produz:

| Limiar modelado | População estimada no corredor | Percentual do denominador |
|---|---:|---:|
| 10 minutos | 1.114.166 | 45,87% |
| 20 minutos | 1.745.333 | 71,86% |
| 30 minutos | 1.838.800 | 75,71% |

Esses totais dependem das hipóteses de caminhada, da largura dos corredores e da representação de cada setor por um ponto. Não medem atendimento nem acesso efetivo de cada morador.

### Comparação dos métodos e limites

| Minutos | Ponderação por área, velocidade central | Sensibilidade: três velocidades × dois métodos | Limites espaciais, velocidade central |
|---|---:|---:|---:|
| 10 | 47,91% | 35,53% a 55,23% | 4,17% a 77,07% |
| 20 | 75,55% | 67,53% a 77,74% | 6,89% a 96,98% |
| 30 | 79,74% | 74,69% a 80,18% | 7,16% a 99,39% |

Os limites espaciais são deliberadamente amplos: sem localizar os domicílios dentro de cada setor, a interseção parcial não permite afirmar onde os moradores estão. Nem eles nem a faixa de sensibilidade são intervalos de confiança.

Resumo público após normalização LF da SDD-044: 13.217 bytes; SHA-256 `c9774dcb85c2a7b7fb63a56e10087fbc7bd2d4b4348538bd08a9525f38eee006`. A serialização foi normalizada para manter os checksums em Windows/Linux; os dados e resultados numéricos foram preservados.
Auditoria: 39.672 linhas, SHA-256 `cde22dadc6010c6c94e40902b8f916b866644dd9a023c7ae82639fd63061f3fc`.
