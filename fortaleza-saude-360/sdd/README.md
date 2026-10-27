# SDD — Spec-Driven Development
Cada arquivo em `tasks/` é uma unidade atômica de trabalho com objetivo, entradas, alteração permitida, regras, aceite, teste e prompt de agente. Executar IDs em ordem de dependências; **não** marcar concluída sem evidência de testes. A tarefa 001 prepara ambiente, 002-014 constroem interface, 015-026 dados, 027-035 análise, 036-045 produção.

Ritual por tarefa: ler contexto → definir plano restrito → implementar → testar → verificar aceite → atualizar STATUS → commit. Em cada rodada, copie ao agente o `prompts/AGENT_TASK.md` e especifique um ID.
