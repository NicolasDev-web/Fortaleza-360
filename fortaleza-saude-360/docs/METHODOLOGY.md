# Metodologia de acessibilidade
1. `distância em linha reta`: proxy exploratória, não implica tempo nem acesso efetivo; só pode ser exibida com o rótulo correspondente.
2. `tempo pela malha`: grafo OSM por modal, custos de aresta em minutos fundamentados em velocidade e restrições; documentar barreiras, horários e conectividade; considerar medição/validação de campo.
3. `população coberta`: somar unidades de demanda cuja origem representativa cai dentro da isócrona; divulgar erro de aproximação espacial e sensitivity analysis; nunca inferir áreas desassistidas somente por número de unidades.
4. `simulador`: delta de cobertura modelada ao adicionar candidato, com cenário-base e incerteza; não prometer capacidade assistencial nem demanda atendida.
5. Auditoria: comparar resultados com amostras de rotas reais permitidas, sinalizar setores sem geometria, sem demanda ou desconectados.

A implementação de população nos corredores (SDD-038) está descrita em `docs/COVERAGE.md`: ponto representativo como método principal, ponderação por área como alternativa, limites espaciais e três cenários de velocidade. O denominador é comum a todos os resultados; o resumo publicado mantém as hipóteses e não representa população efetivamente atendida.

## Auditoria de incerteza — SDD-040 (2026-10-29)

Esta auditoria compara produtos do modelo; **não é validação com rotas observadas ou medições de campo**. A implementação preservou a métrica aprovada pelo usuário. Não ajustamos velocidades ou impedâncias para fazer os resultados parecerem melhores.

### Linha reta e caminho pela malha

Cinco pares já gerados na SDD-036, do ponto representativo do bairro à UAPS escolhida pelo menor tempo na malha. A linha reta abaixo é até **o mesmo destino**, para permitir uma comparação interpretável; não necessariamente a UAPS mais próxima em linha reta. Minutos vêm exclusivamente da malha.

| Bairro da origem | Linha reta (m) | Caminho na malha (m) | Razão caminho/reta | Minutos centrais |
|---|---:|---:|---:|---:|
| Parque Araxá | 529,4 | 801,6 | 1,51 | 10,0 |
| Jangurussu | 524,9 | 756,3 | 1,44 | 9,5 |
| Meireles | 2.377,7 | 2.657,7 | 1,12 | 33,2 |
| Messejana | 677,5 | 713,3 | 1,05 | 8,9 |
| Pirambu | 1.112,0 | 1.170,8 | 1,05 | 14,6 |

Na amostra, os desvios variam aproximadamente de 5% a 51%. Isso mostra por que a distância em linha reta não deve ser apresentada como percurso ou convertida em tempo real. Cinco pares escolhidos por conveniência não estimam o erro para Fortaleza inteira. A associação a um nó também omite os conectores até a rua e a entrada da unidade.

### Densidade e viés territorial

Dividimos os 121 bairros em quatro grupos por densidade populacional: população do Censo atribuída ao bairro principal de cada setor, dividida pela área municipal em UTM. O percentual de cada grupo é a soma da população incluída nos corredores centrais de 20 minutos dividida pela soma da população do grupo, não a média dos percentuais dos bairros.

| Grupo por densidade | Bairros | Pessoas/km² (aprox.) | População do grupo | Nos corredores centrais de 20 min |
|---|---:|---:|---:|---:|
| Q1, menor densidade | 31 | 343 a 6.921 | 468.038 | 63,82% |
| Q2 | 30 | 7.033 a 9.999 | 760.386 | 72,25% |
| Q3 | 30 | 10.122 a 13.024 | 567.406 | 74,41% |
| Q4, maior densidade | 30 | 13.027 a 25.042 | 632.878 | 75,06% |

Os grupos conservam o total de 2.428.708 pessoas e o numerador de 1.745.333 do cenário central de 20 minutos. A diferença Q4–Q1 é de 11,24 pontos percentuais. É uma associação descritiva entre densidade e resultado do modelo, **não evidência de qualidade assistencial, vulnerabilidade ou efeito causal da densidade**.

O corredor de 25 m tende a ocupar mais território onde há mais ruas mapeadas. Setores grandes com áreas vazias podem ter ponto representativo longe das ruas, embora moradores estejam perto delas; a ponderação por área assume densidade uniforme e tem outro erro. Portanto, o padrão observado pode refletir tanto implantação de unidades como geometria dos setores, desenho urbano e completude do OSM. Esta auditoria não mediu a qualidade do OSM contra uma fonte independente; não atribui a diferença a dados faltantes sem evidência adicional.

### Sensibilidades e incertezas concretas

- Para 10 minutos, a faixa entre três velocidades e dois métodos de alocação vai de **35,53% a 55,23%** do denominador; para 20 minutos, **67,53% a 77,74%**; para 30 minutos, **74,69% a 80,18%**. São hipóteses alternativas, não intervalos de confiança.
- No cenário central de 30 minutos, ponto representativo dá 75,71% e ponderação por área 79,74%. Os limites espaciais são muito amplos (7,16% a 99,39%), mostrando que não se conhece a localização dos domicílios dentro de cada setor.
- Trocar os corredores por associação direta dos setores ao nó mais próximo, sem conectores, mudaria a base central de 30 minutos para 97,86%. Esse diagnóstico **não foi adotado**: misturar esse critério com a base do simulador produziria um ganho artificial. Decisão em `SCENARIO_MODEL_DECISION.md`.
- Os 675 componentes da malha não foram religados artificialmente; a maior contém 96,1% do comprimento. Há 674 ilhas menores. Estar fora de uma componente alcançável não prova ausência de acesso físico real.
- Velocidades 4,0/4,8/5,5 km/h e fatores 2,0 para escadas e 1,25 para caminhos/trilhas são hipóteses sem calibração local. Não há modelagem de relevo, semáforos, espera em travessias, iluminação, segurança, calor, chuva ou qualidade do piso.
- O recorte OSM tem margem de cerca de 3 km; trajetos que precisem sair dela podem ser cortados. O conector do candidato à malha pode chegar a 300 m e não soma tempo; no limite, são 3,75 min omitidos a 4,8 km/h para esse trecho.
- A população é de 2022; cadastro e malha são de 2026. Não há atualização demográfica estimada, dado de equipe, horário, capacidade ou vagas.

### Pendências e reprodução

Antes de apresentar o modelo como validado, conferir os cinco trajetos com percursos reais e ampliar a amostra por densidade, borda municipal, rios/canais, travessias e bairros com OSM menos detalhado. Registrar trajeto, data, modal e divergências sem guardar coordenadas pessoais. A verificação de código e a paridade do simulador não substituem essa etapa.

O cálculo desta seção foi registrado em `data/processed/uncertainty_audit.json` (fora do Git), com checksums dos arquivos de entrada. Usa `walk_network/travel_time_model.json`, `coverage/sector_coverage.csv`, `sector_neighborhood_crosswalk.csv` (somente linhas `is_primary`) e `public/data/neighborhoods.geojson`. Densidade = população agregada / área em EPSG:31984; quartis por `pandas.qcut`; somas por grupo devem reconciliar com a base da SDD-038. Fontes, anos, licenças e ressalvas são os mesmos de `DATA_SOURCES.md`, `COVERAGE.md` e `WALK_NETWORK.md`.
