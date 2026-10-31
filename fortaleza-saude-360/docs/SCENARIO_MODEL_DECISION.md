# SDD-039 — decisão metodológica antes do simulador

Status: decisão resolvida pelo usuário — **preservar o método atual**. Nenhum método alternativo foi adotado e os dados publicados da SDD-038 foram preservados. Implementação e verificação em `SCENARIO_SIMULATOR.md`.

## Evidência medida em 2026-10-28

Comparação sobre os mesmos 4.408 setores, população de 2.428.708 pessoas, 134 UAPS e velocidades centrais de 4,8 km/h. Dois critérios distintos:

- **Base publicada:** ponto representativo do setor dentro dos corredores de 25 m da SDD-037, conforme SDD-038.
- **Diagnóstico alternativo:** ponto representativo associado ao nó mais próximo da malha até 300 m; menor tempo desse nó até alguma UAPS, sem incluir conectores. Não gera o corredor de 25 m e não é um modelo porta a porta validado.

| Limiar | População na base publicada | População no diagnóstico alternativo | Diferença | Diferença em pontos percentuais |
|---|---:|---:|---:|---:|
| 10 min | 1.114.166 (45,87%) | 1.309.125 (53,90%) | +194.959 | +8,03 |
| 20 min | 1.745.333 (71,86%) | 2.225.466 (91,63%) | +480.133 | +19,77 |
| 30 min | 1.838.800 (75,71%) | 2.376.677 (97,86%) | +537.877 | +22,15 |

No diagnóstico alternativo, 13 setores (1.688 pessoas) não têm nó dentro do limite de 300 m. Eles continuam no denominador e não entram no numerador. Nenhum desses números significa atendimento real ou disponibilidade de serviço.

Resultado agregado do diagnóstico em `data/processed/scenario-baseline-diagnostic.json`, fora do Git. Não foram persistidas coordenadas individuais nem candidatos do usuário.

## Por que precisa de uma decisão

Comparar um candidato calculado por tempo até o nó mais próximo com a base por corredor misturaria definições distintas. Parte do suposto ganho viria da troca do método. Na data deste diagnóstico, a habilitação aguardava decisão. O usuário posteriormente aprovou preservar corredores e o simulador foi entregue na SDD-039, com paridade da base; veja `SCENARIO_SIMULATOR.md`.

A aplicação é estática e gratuita. Processamento no navegador ou um serviço de cálculo são escolhas de arquitetura posteriores à definição da métrica; este diagnóstico não demonstra que um serviço externo seja necessário. Nenhuma infraestrutura foi criada e nenhum ponto foi enviado a terceiros.

## Caminhos concretos

1. **Preservar o método publicado (recomendação de continuidade).** Base e candidato usam os mesmos corredores, pontos representativos, parâmetros e cenários de velocidade. A implementação deve reproduzir os resultados da SDD-038 antes de exibir deltas; exige preparar uma estratégia de cálculo e entrega adequada ao navegador, sem carregar automaticamente o GeoJSON bruto de 65,7 MB.
2. **Revisar o modelo de acessibilidade antes de simular.** Definir como tratar o trecho do ponto à rua e o acesso até a entrada da unidade, recalcular a base, comparar as diferenças e versionar a metodologia. Os números do diagnóstico acima não devem ser publicados como substitutos prontos.

Nos dois caminhos, cenário-base e candidato precisam de estados separados e da mesma definição de cobertura. As verificações com rotas reais continuam pendentes. Não é válido escolher a alternativa apenas porque ela aumenta a população estimada.

## Reprodução do diagnóstico

Carregar `load_cost_graph`, associar as UAPS por `NodeIndex.snap` com limite de 300 m, executar `networkx.multi_source_dijkstra_path_length` com `minutes_central` e limite de 30 min. Projetar os setores para EPSG:31984, obter `representative_point`, reprojetar para WGS84 e associar esses pontos ao mesmo índice. Somar população dos setores cujos nós têm tempo até cada limiar; manter todos os setores no denominador. Comparar com `public/data/population-coverage.json`. Fontes e limitações continuam em `docs/COVERAGE.md` e `docs/WALK_NETWORK.md`.
