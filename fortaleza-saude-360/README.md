# Fortaleza Saúde 360°

Plataforma open-source de inteligência territorial para mapear unidades de saúde, analisar acesso geográfico e SIMULAR implantação de serviços em Fortaleza (CE).

> **Estado atual:** protótipo com camadas oficiais, população do Censo, comparação de bairros e simulador de acesso geográfico. Estimativas não medem capacidade ou atendimento. As fixtures sintéticas de testes permanecem rotuladas DEMO e não entram nos dados públicos. Demandas abertas: `docs/READINESS.md`.

## Comece no VS Code
1. Abra esta pasta no VS Code.
2. Instale Node.js 20+ e rode `npm install` e `npm run dev`.
3. Acesse `http://localhost:3000`: mapa com bairros e UAPS oficiais; Simular calcula o ganho geográfico de um ponto proposto com o método dos corredores. Comparar mostra dois bairros lado a lado, com população, postos, aproximação de distância e CSV da dupla.
4. Leia `AGENTS.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md` e `sdd/README.md`.
5. Consulte `sdd/STATUS.md` para evidências das tarefas entregues e `docs/READINESS.md` para trabalho restante.
6. Antes de publicar, conclua a revisão de demandas e o checklist `docs/DEPLOY_TESTS.md`.

## Conteúdo
- `app/`, `components/`, `lib/`: aplicação Next.js com mapa, indicadores, comparação e simulação.
- `references/images/`: 3 mockups PNG originais; `references/REAL_REFERENCES.md` com links de aplicações reais.
- `docs/`: PRD, arquitetura, fontes, modelo de dados, design, privacidade, metodologia, testes, implantação.
- `sdd/tasks/`: microtarefas atômicas com critérios de aceite e prompts.
- `scripts/`: modelos de pipeline e validações iniciais.

**Prioridade:** dados públicos geográficos com proveniência, experiência rápida e acessível, deploy sem custo no MVP. Evitar custo imprevisível de rotas/tiles e não coletar informações pessoais de pacientes.
