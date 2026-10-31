# Demandas antes de publicar — revisão de 2026-10-31

Este inventário confronta o PRD, tarefas e evidências de STATUS. Uma tarefa de implementação concluída não equivale a validação científica, CI remota ou publicação. No fechamento da SDD-052 passaram build, lint, tipos, Ruff, guard de 14 arquivos, 117 testes JS, 109 Python e 24 E2E desktop/mobile.

A revisão visual seguinte encontrou desfoque residual em títulos com movimento reduzido. Corrigido na SDD-053 e verificado com 10 testes JS afetados, novo lint/tipos/build e 4 E2E desktop/mobile, com assertion de estilos e capturas atualizadas.

Na SDD-055, a entrega foi enviada à branch `codex/pre-deploy-completion`. A [CI real 41213816425](https://github.com/NicolasDev-web/Fortaleza-360/actions/runs/41213816425), revisão `3e1dcf5`, passou novamente o conjunto integrado: 117 JS, 109 Python, 24 E2E, build, lint, tipos, Ruff e guard de 14 arquivos. A primeira tentativa revelou uma fixture com duas causas de rejeição; corrigida sem mudar as proteções. Sem merge ou deploy.

## Entregas locais

Mapa oficial (bairros, UAPS, UPA, hospitais municipais), seleção/fichas, busca por teclado, camadas, narrativa, indicadores e população por bairro, distância em linha reta nas fichas, comparação A/B e CSV, malha pedonal, tempos e corredores offline, população nos corredores e simulador local. Pipeline com proveniência/checksums e CI configurada.

## Fechamento das demandas funcionais

| Demanda | Estado real |
|---|---|
| Linha de distância no mapa | Concluída na SDD-048: interruptor, linha, origem/destino e aviso; 108 testes JS e 14 E2E aprovados |
| Desenhar corredores 10/20/30 min no mapa | Concluída na SDD-052: base central em PNGs transparentes opt-in, 383.873 bytes no total, checksum e troca de tempo; GeoJSON de 65,7 MB permanece offline |
| Salvar cenários localmente (PRD P2) | Concluída na SDD-049 com autorização explícita: nome, ponto/resultados, reabertura com recálculo e exclusão; 112 testes JS e 16 E2E aprovados |
| Geolocalização opcional (PRD P0) | Concluída na SDD-051: explicação, botão/permissão, marcador/precisão em memória, remoção e recusa; 116 testes JS e 22 E2E aprovados |
| Ranking de setores por aproximação (PRD P1) | Concluída na SDD-050: 4.408 setores, filtros, paginação e carga sob demanda. Comparar continua sem ranking; 107 testes Python, 114 JS e 20 E2E aprovados |

Esses itens não estavam integralmente cobertos pelas tarefas SDD já entregues; não devem ser apresentados como prontos apenas porque as 001–044 estão marcadas.

## Pendências de dados e método

- Comparação dos cinco pares da SDD-036 com o perfil pedestre Valhalla/FOSSGIS concluída em 2026-10-31; links, versão e resultados em `TRAVEL_TIME.md`. Os tempos externos ficaram dentro da faixa de velocidades nos cinco pares. Ainda faltam medição de campo e calibração de condições locais; dois motores OSM não são fontes cartográficas independentes.
- Confirmar termos de reutilização aplicáveis aos dois arquivos IBGE; não atribuir CC/SPDX por suposição. Consultas de 2026-10-29 e 2026-10-31 não obtiveram declaração específica suficiente; ressalvas preservadas.
- Condições de calçada, travessia, relevo e conectores não estão calibradas. Mudanças de método exigem novo versionamento e não fazem parte de uma correção silenciosa.

As tentativas de roteamento sem resultado em 2026-10-29 foram superadas pela consulta direta dos cinco pares na interface em 2026-10-31. Essa comparação é de resultados calculados; não houve inspeção vértice a vértice nem caminhada cronometrada. A consulta de licença encontrou termos da Agência de Notícias IBGE, cujo escopo é conteúdo multimídia, insuficientes para licenciar os arquivos censitários usados; por isso a ressalva específica dos dados permanece.

Atualização das fontes conferida no índice oficial do IBGE: o básico populacional permanece `20260520`; a atualização `20261021` refere-se a características dos domicílios. Não foi encontrada nesse índice uma nova versão do básico que exigisse recálculo. Evidência e link em `DATA_SOURCES.md`.

## Pendências operacionais

- CI real concluída na revisão `3e1dcf5`; exigir resultado aprovado também para qualquer revisão de código escolhida futuramente para hospedagem.
- Definir revisão a publicar e revisar logs/retenção/visibilidade do provedor.
- Validação HTTPS, arquivos/checksums, Worker, mapa, CSV, privacidade e desempenho na URL hospedada. Só é possível depois do primeiro deploy de teste.
- Teste em celular físico e medição de desempenho com rede limitada; viewport headless não substitui aparelho.

## Vercel: configuração não é publicação

CLI 65.7.0 instalada, autenticada. MCP oficial configurado em `https://mcp.vercel.com`, com login concluído e acesso à equipe ainda dependente de consentimento. Projeto `fortaleza-saude-360`, na equipe `nicolas-santos-projects2`, criado e vinculado à pasta da aplicação. Configuração local `vercel.json`: Next.js, `npm ci`, `npm run build`; dados offline, ambientes e traces excluídos do upload. A CLI gerou `.env.local`, ignorado no Git e no upload; seu conteúdo não deve ser registrado nos relatórios.

Consulta `vercel ls fortaleza-saude-360 --scope nicolas-santos-projects2 --non-interactive`: nenhum deployment encontrado. Publicação suspensa conforme pedido do usuário para terminar demandas primeiro. A criação do projeto não permite marcar SDD-045 como concluída.

Conferência após o push de revisão em 2026-10-31: API sem vínculo Git, `latestDeployments=[]`, Web Analytics desativado; CLI continua sem deployments. A branch foi publicada somente no GitHub para revisão e CI.

Na revisão SDD-054, a API mostrou que o setup havia conectado também o repositório GitHub. Para impedir que um futuro push de CI criasse preview automaticamente, a integração criada neste setup foi desconectada. Conferência posterior: projeto `prj_pmF9dxkwVhZYEMeh1bEf8T6XALMw`, `gitConnected=false`, zero deployments. `vercel.json` também contém `git.deploymentEnabled=false`, conforme a [configuração oficial](https://vercel.com/docs/project-configuration/git-configuration#gitdeploymentenabled). Dry-run reconheceu Next.js e não enviou arquivos. Nenhum projeto anterior da conta foi alterado.

A SDD-056 alinhou a configuração remota ao código validado: Next.js, Node 22.x, `npm ci` e `npm run build`. Caminho preparado é o envio pela CLI a partir da pasta `fortaleza-saude-360/`, com raiz remota `.` (`null` na API); não definir a subpasta duas vezes. Se futuramente for escolhida integração Git, será necessário definir a raiz de repositório `fortaleza-saude-360` e revisar o bloqueio automático. Inspect e API confirmaram os quatro campos, proteção existente preservada, sem vínculo Git, analytics ou deployments. Configuração de build concluída não equivale a validação hospedada ou publicação.
