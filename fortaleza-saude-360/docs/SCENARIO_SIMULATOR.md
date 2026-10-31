# Simulador candidato — SDD-039

O modo **Simular** aceita um ponto no mapa (clique, toque ou Enter no centro da vista) e por formulário de latitude/longitude. Apresenta base, população com proposta e diferença para 10, 20 e 30 minutos. A tabela principal usa 4,8 km/h; a faixa varia a caminhada entre 4,0 e 5,5 km/h.

## Mesmo método da base

A decisão do usuário foi preservar os corredores da SDD-038. Não se adotou o diagnóstico alternativo de tempo entre nós descrito em `SCENARIO_MODEL_DECISION.md`.

O pré-processamento `scripts/build_scenario.py` encontra as ruas curvas cujo buffer de 25 m pode alcançar cada ponto representativo de setor, respeitando o limite municipal. Para cada direção da rua, obtém a primeira fração alcançável por busca binária (42 iterações) sobre o buffer do prefixo da curva, com quatro segmentos por quadrante, como na SDD-037. O custo dessa fração é guardado como entrada no corredor. Não é tempo de caminhada em linha reta entre o setor e um nó.

O navegador calcula caminhos na malha até o candidato e usa essas entradas para identificar pontos de setores nos corredores. O candidato é associado ao nó mais próximo pelo mesmo critério local da base, com limite de 300 m. Conectores continuam fora do tempo, como no modelo aprovado. Um setor já incluído na base não é contado de novo.

A máscara da base é preservada separadamente. O pré-processamento bloqueia a publicação se qualquer uma das 39.672 inclusões da base divergir do cálculo otimizado. Na execução de 2026-10-29, houve **zero divergências**. Além disso, três candidatos em diferentes nós foram comparados com polígonos gerados pelo cálculo original nos três limiares centrais: mais 39.672 comparações, também sem divergências. Esses testes verificam a implementação; não substituem validação com trajetos reais.

O simulador usa o método principal por ponto representativo. Não calcula o delta da alternativa ponderada por área; a faixa da tabela representa apenas a variação de velocidade.

## Entrega e privacidade

- `public/data/scenario-model.json`: grafo, custos de acesso aos corredores, população agregada e máscaras da base; cerca de 7,7 MB, com checksum, fontes e dicionário na entrada `scenario` do manifesto público.
- O download só acontece ao abrir Simular. O Worker verifica SHA-256 e a paridade da base antes de aceitar candidatos.
- Dijkstra e contagens são executados em Web Worker. Não há endpoint de simulação, provedor externo ou chave paga.
- Por padrão o candidato permanece em memória, sem URL, cookies, telemetria ou requisição com coordenadas. Limpar remove o candidato ativo; sair do modo encerra o Worker e limpa o ponto ativo. Desde a SDD-049, salvar é uma ação explícita que guarda uma cópia local da proposta; não é removida por Limpar cenário. Use Excluir no painel de cenários salvos.
- Requisições antigas não sobrescrevem o resultado do candidato mais recente. Falhas de carga, divergência de checksum, ponto fora do município e ausência de nó até 300 m geram mensagem, sem números fictícios.

## Reprodução

```powershell
python -m scripts.build_scenario
python scripts/generate_manifest.py
python -m pytest
npm run test -- --maxWorkers=2
npm run lint
npm run typecheck
npm run build
```

Requer os produtos das SDD-035 a 038. Os testes verificam curvas, inversão da direção, falta de acesso, ausência de dupla contagem, base imutável, erro de carregamento, descarte de resultado antigo e encerramento do Worker. A aplicação foi conferida em navegador real, incluindo formulário, seleção por teclado, ponto inválido e viewport de 390 px.

## Cenários salvos — SDD-049

O usuário aprovou em 2026-10-29 guardar nome, ponto e resultados neste navegador, com exclusão explícita. `f360:saved-scenarios:v1` contém schema, até 20 propostas, UUID, nome (até 60 caracteres), coordenadas, resultado histórico, data e SHA-256 do modelo verificado pelo Worker. Nenhuma escrita ocorre apenas ao calcular. Só Salvar neste navegador grava. São propostas de equipamento, não localização de pacientes ou residência.

Ao reabrir, somente o ponto é enviado ao Worker atual e o resultado é recalculado; o histórico nunca substitui a base ou aparece como cálculo atual. Ler valida versão, coordenadas, unicidade, limites e coerência das contagens. Dados corrompidos oferecem exclusão; storage bloqueado ou sem espaço informa falha sem perder o cálculo em memória. Excluir remove uma proposta, Excluir todos remove só a chave dos cenários, preservando a preferência da história. Dados não são sincronizados com servidor; outra aba da mesma origem pode observar mudanças por storage events. Perfis compartilhados do navegador podem acessar as propostas salvas. O usuário deve usar nomes sem dados pessoais.

## Limites do modelo

Os ganhos são estimativas geográficas sobre a população de 2022, não pessoas efetivamente atendidas, vagas, capacidade ou recomendação de implantação. Escadas/caminhos, velocidades e conectores herdam as hipóteses anteriores. A largura de 25 m e a representação de setores por pontos afetam os resultados. Rotas locais e entradas reais não foram verificadas em campo; licença padronizada do IBGE continua não confirmada.
