# Testes de ponta a ponta — SDD-041

```powershell
npm ci
npx playwright install chromium
npm run test:e2e
```

`playwright.config.ts` cria um build de produção e um servidor isolado em `127.0.0.1:3100`, encerrado pelo runner. Os fluxos são executados em Chromium headless para desktop (1440 × 900) e mobile (390 × 844, toque habilitado). Um worker, sem retries automáticos; movimento reduzido para reduzir instabilidade de animação.

## Cobertura

1. Mapa visível, esconder/reexibir UPA, busca pelo teclado, seleção de uma unidade real e URL com a seleção correta. O controle de abrir camadas só é acionado quando visível no layout móvel.
2. Filtrar Meireles e baixar CSV real, conferindo nome, BOM UTF-8, acentos e exatamente cabeçalho mais uma linha.
3. Selecionar um posto existente pelo mapa e conferir ganho zero; calcular coordenadas públicas de teste, preservar os três totais-base, limpar o cenário e rejeitar um ponto fora do município. Conferir que coordenadas não aparecem na URL, requisições ou localStorage.
4. Interceptar o download do modelo com HTTP 503 e conferir erro explícito, ausência de tabela e botão de cálculo desabilitado. O corpo sintético está marcado DEMO e existe apenas no contexto do teste.
5. Comparar Meireles/Jangurussu, inverter e exportar apenas a dupla, com tabela visível e teclado.
6. Habilitar/desabilitar linha de distância com teclado, conferir origem, destino e aviso de aproximação nos dois viewports.
7. Verificar carga lazy e medir interação em localhost, sem prometer desempenho de campo.
8. Calcular sem gravação automática; salvar proposta explicitamente; recarregar, reabrir e recalcular; excluir os cenários locais preservando a preferência da história. Coordenadas continuam fora de URL e requisições.
9. Setores: carga sob demanda, total 4.408, lista de 25 linhas, ordem, filtro de bairro e paginação; erro HTTP sem números de exemplo e nova tentativa após restabelecer o arquivo.
10. Posição opcional: posição e permissão simuladas no contexto de teste (nenhuma localização real é obtida), marcador separado do candidato, precisão, remoção e recusa preservando busca; sem coordenadas em URL, requisições ou localStorage.
11. Corredores: nenhuma imagem na carga inicial, somente PNG escolhido, troca de 10 para 20/30 minutos, erro HTTP sem área alternativa, desativação/reativação após recuperar o arquivo; GeoJSON bruto nunca solicitado.

Os seletores de erro são limitados ao painel de simulação: o Next.js também mantém seu próprio anunciador de rota com papel `alert`. O teste não deve confundir esse elemento com a mensagem da aplicação.

## Evidências e manutenção

Falhas preservam screenshot e trace em `test-results/`, fora do Git. O fluxo de simulação também salva `scenario-desktop.png` e `scenario-mobile.png` para inspeção visual. As interações são feitas por locators e assertions com espera automática; não há esperas fixas para encobrir erros.

A inspeção visual detectou um contêiner flex que podia encolher a tabela no desktop. A correção mantém a altura natural da tabela e permite rolar o painel; o E2E agora verifica também a altura visível do contêiner. Os oito casos foram repetidos e aprovados após a correção.

O Vitest exclui `tests/e2e.spec.ts`, pois esse arquivo pertence ao runner Playwright. A suíte unitária continua independente (`npm run test -- --maxWorkers=2`). Evitar rodar a suíte JSDOM e o build ao mesmo tempo em máquinas limitadas: essa concorrência já causou timeouts que desapareceram na execução isolada, sem aumentar os limites dos testes.

Estes testes validam o funcionamento da aplicação e sua integração com os arquivos locais. Não validam trajetos de campo, cobertura assistencial ou disponibilidade das unidades.
