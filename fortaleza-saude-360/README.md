# Fortaleza Saúde 360°

Plataforma open-source de inteligência territorial para mapear unidades de saúde, analisar acesso geográfico e SIMULAR implantação de serviços em Fortaleza (CE).

> **Estado inicial:** estrutura SDD, protótipo navegável e referências visuais próprias. Indicadores de exemplo são SINTÉTICOS; não representam condições reais de bairros, unidades ou cobertura. Nunca publicar dados fictícios sem etiqueta.

## Comece no VS Code
1. Abra esta pasta no VS Code.
2. Instale Node.js 20+ e rode `npm install` e `npm run dev`.
3. Acesse `http://localhost:3000` para o protótipo (UI demonstrativa; sem mapa territorial real).
4. Leia `AGENTS.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md` e `sdd/README.md`.
5. Peça ao agente executar `sdd/tasks/001.md`, uma tarefa por vez, com testes e atualização de `sdd/STATUS.md`.
6. Para sair do modo demonstrativo, siga as tarefas ETL e integração de GeoJSON; não considere dados reais antes da validação.

## Conteúdo
- `app/`, `components/`, `lib/`: protótipo Next.js com cartões e painéis de exemplo.
- `references/images/`: 3 mockups PNG originais; `references/REAL_REFERENCES.md` com links de aplicações reais.
- `docs/`: PRD, arquitetura, fontes, modelo de dados, design, privacidade, metodologia, testes, implantação.
- `sdd/tasks/`: microtarefas atômicas com critérios de aceite e prompts.
- `scripts/`: modelos de pipeline e validações iniciais.

**Prioridade:** dados públicos geográficos com proveniência, experiência rápida e acessível, deploy sem custo no MVP. Evitar custo imprevisível de rotas/tiles e não coletar informações pessoais de pacientes.
