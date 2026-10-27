# Metodologia de acessibilidade
1. `distância em linha reta`: proxy exploratória, não implica tempo nem acesso efetivo; só pode ser exibida com o rótulo correspondente.
2. `tempo pela malha`: grafo OSM por modal, custos de aresta em minutos fundamentados em velocidade e restrições; documentar barreiras, horários e conectividade; considerar medição/validação de campo.
3. `população coberta`: somar unidades de demanda cuja origem representativa cai dentro da isócrona; divulgar erro de aproximação espacial e sensitivity analysis; nunca inferir áreas desassistidas somente por número de unidades.
4. `simulador`: delta de cobertura modelada ao adicionar candidato, com cenário-base e incerteza; não prometer capacidade assistencial nem demanda atendida.
5. Auditoria: comparar resultados com amostras de rotas reais permitidas, sinalizar setores sem geometria, sem demanda ou desconectados.
