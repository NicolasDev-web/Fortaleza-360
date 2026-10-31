# Demandas antes de publicar — revisão de 2026-10-29

Este inventário confronta o PRD, tarefas e evidências de STATUS. Uma tarefa de implementação concluída não equivale a validação científica, CI remota ou publicação. No fechamento da SDD-052 passaram build, lint, tipos, Ruff, guard de 14 arquivos, 117 testes JS, 109 Python e 24 E2E desktop/mobile.

A revisão visual seguinte encontrou desfoque residual em títulos com movimento reduzido. Corrigido na SDD-053 e verificado com 10 testes JS afetados, novo lint/tipos/build e 4 E2E desktop/mobile, com assertion de estilos e capturas atualizadas.

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

- Conferir cinco trajetos reais da SDD-036 contra mapa de rotas a pé e registrar evidências. Medição de campo é outra validação, ainda não realizada. Paridade de código e sinuosidade não a substituem.
- Confirmar termos de reutilização aplicáveis aos dois arquivos IBGE; não atribuir CC/SPDX por suposição. Nova consulta de 2026-10-29 não obteve declaração específica suficiente; ressalvas preservadas.
- Condições de calçada, travessia, relevo e conectores não estão calibradas. Mudanças de método exigem novo versionamento e não fazem parte de uma correção silenciosa.

Tentativas desta revisão não foram contadas como validação: fonte externa de roteamento retornou falha TLS no acesso por terminal; a interface Valhalla/FOSSGIS aberta em perfil pedestrian não retornou resultado para a coordenada pública pesquisada, sem rota confirmada. Nenhuma das cinco rotas foi marcada como aprovada. A consulta de licença encontrou termos da Agência de Notícias IBGE, cujo escopo é conteúdo multimídia, insuficientes para licenciar os arquivos censitários usados; por isso a ressalva específica dos dados permanece.

## Pendências operacionais

- Primeiro workflow no GitHub sobre a revisão atual. Alterações locais ainda não publicadas; não houve push nesta preparação.
- Definir revisão a publicar e revisar logs/retenção/visibilidade do provedor.
- Validação HTTPS, arquivos/checksums, Worker, mapa, CSV, privacidade e desempenho na URL hospedada. Só é possível depois do primeiro deploy de teste.
- Teste em celular físico e medição de desempenho com rede limitada; viewport headless não substitui aparelho.

## Vercel: configuração não é publicação

CLI 65.7.0 instalada, autenticada. MCP oficial configurado em `https://mcp.vercel.com`, com login concluído e acesso à equipe ainda dependente de consentimento. Projeto `fortaleza-saude-360`, na equipe `nicolas-santos-projects2`, criado e vinculado à pasta da aplicação. Configuração local `vercel.json`: Next.js, `npm ci`, `npm run build`; dados offline, ambientes e traces excluídos do upload. A CLI gerou `.env.local`, ignorado no Git e no upload; seu conteúdo não deve ser registrado nos relatórios.

Consulta `vercel ls fortaleza-saude-360 --scope nicolas-santos-projects2 --non-interactive`: nenhum deployment encontrado. Publicação suspensa conforme pedido do usuário para terminar demandas primeiro. A criação do projeto não permite marcar SDD-045 como concluída.

Na revisão SDD-054, a API mostrou que o setup havia conectado também o repositório GitHub. Para impedir que um futuro push de CI criasse preview automaticamente, a integração criada neste setup foi desconectada. Conferência posterior: projeto `prj_pmF9dxkwVhZYEMeh1bEf8T6XALMw`, `gitConnected=false`, zero deployments. `vercel.json` também contém `git.deploymentEnabled=false`, conforme a [configuração oficial](https://vercel.com/docs/project-configuration/git-configuration#gitdeploymentenabled). Dry-run reconheceu Next.js e não enviou arquivos. Nenhum projeto anterior da conta foi alterado.

A configuração remota ainda está no padrão inicial (Node 24.x, framework Other e raiz não definida), enquanto a configuração local identifica Next.js. Ao retomar hospedagem, alinhar Node 22 testado localmente e raiz ao método escolhido: CLI com pasta da aplicação como raiz, ou Git com `fortaleza-saude-360`. Não apresentar o setup remoto como pronto para produção antes disso.
