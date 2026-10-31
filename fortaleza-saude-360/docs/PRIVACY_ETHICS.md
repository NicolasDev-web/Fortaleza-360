# Privacidade, ética e limites
Usar apenas dados de equipamentos, geografia e populações agregadas. Não coletar endereços pessoais nem dados de pacientes. Pedir permissão explícita para geolocalização e não persistir coordenadas individuais; oferecer funcionamento sem localização. Se futuras análises tiverem dados de eventos de saúde agregados, adotar supressão de células pequenas e avaliação LGPD/risco de reidentificação. Não apresentar índice de prioridade como decisão automática sobre alocação de serviços. Fonte, período, cobertura e limites sempre visíveis; excluir análises clínicas do MVP.

## Auditoria técnica — SDD-042 (2026-10-29)

Escopo: código e dados locais atuais, incluindo o simulador da SDD-039. Esta seção registra práticas observadas e pendências de hospedagem; não certifica conformidade jurídica de um serviço ainda não publicado.

| Dado / operação | Comportamento observado | Evidência |
|---|---|---|
| Ponto proposto | Estado React e Worker da mesma origem, em memória; ativo removido ao limpar/sair. Somente Salvar neste navegador grava uma cópia local da proposta, conforme autorização do usuário na SDD-049 | `Observatory.tsx`, `ScenarioSimulator.tsx`, `SavedScenarios.tsx`, testes unitários e E2E |
| URL | Guarda apenas filtros permitidos e IDs públicos de bairro/unidade; não guarda coordenadas do candidato nem texto livre de busca | `lib/filters.ts`, E2E do simulador e busca |
| localStorage | Preferência `f360:story-seen = 1` e, só por escolha explícita, `f360:saved-scenarios:v1` com até 20 propostas, nome, coordenadas, contagens históricas, data e hash do modelo; exclusão individual/total | `lib/saved-scenarios.ts`, `SavedScenarios.tsx`, E2E de ausência de gravação automática e persistência/exclusão escolhidas |
| Cookies, sessionStorage, IndexedDB | Nenhuma gravação implementada pela aplicação | Inspeção de `app/`, `components/`, `lib/` |
| Geolocalização do usuário | Desde a SDD-051, somente após abrir explicação e clicar Solicitar minha posição. getCurrentPosition único, sem watchPosition. Marcador e precisão em memória, separados do candidato; Remover descarta e invalida callbacks antigos | `LocationControl.tsx`, `CityMap.tsx`, testes com posição/recusa simuladas |
| Telemetria / analytics | Sem SDK de analytics, beacon, replay ou envio de eventos implementado | Inspeção de dependências e chamadas de rede |
| Download do simulador | GET para `/data/manifest.json` e `/data/scenario-model.json`, `credentials: omit`; candidato não vai na URL ou corpo HTTP | `scenario.worker.ts` e E2E registrando requisições |
| Mapa de fundo | PMTiles, glyphs e Worker servidos pela própria origem; sem provedor remoto de tiles recebendo a área consultada | `basemap.ts`, `Basemap.tsx`, teste de estilo de origem local |
| Tipografia | `next/font/google` faz a obtenção no build e serve os arquivos pelo app; não exige fetch de fontes Google pelo visitante | `app/layout.tsx` e arquitetura Next/font |
| Links de fonte | Links externos são acionados por escolha do visitante; créditos abrem com `rel=noreferrer` | Componentes de proveniência e basemap |
| Exportação CSV | Dados agregados de bairro com método e fonte; não inclui candidato ou posição individual | `lib/export.ts` e E2E de download real |

## Dados publicados e fronteiras

As coordenadas públicas são de estabelecimentos, nós de vias OSM e geografia territorial, não de pacientes ou de localização pessoal obtida do navegador. CNES identifica estabelecimento. O simulador publica população agregada por setor, sem cadastro de moradores, CPF, CNS, telefone, prontuário, diagnóstico ou evento individual de saúde.

Os arquivos brutos em `data/raw/` ficam fora do Git. Na conferência CNES, os campos descartados, inclusive CPF/CNPJ, não devem reaparecer nos produtos públicos. O diretório bruto não faz parte da pasta `public/`.

Capturas e traces E2E usam coordenadas públicas escolhidas para teste e são ignorados pelo Git (`test-results/`, `playwright-report/`). Não devem ser usados para registrar sessões de pessoas reais sem nova avaliação. O ponto hipotético não é uma indicação de residência do usuário e não deve ser rotulado ou guardado como tal.

## Consentimento e funcionamento

O fluxo não precisa de localização do dispositivo. A SDD-051 adiciona uma opção precedida de explicação e da permissão do navegador. Recusar, timeout ou indisponibilidade mantêm mapa, busca e simulação manual. O aplicativo não persiste a coordenada individual, não envia payload com ela e não a transforma automaticamente em proposta. A localização usa os serviços do navegador/sistema, sujeitos às regras do dispositivo; o aplicativo não controla esses fornecedores. A vista do mapa determina quais tiles locais são pedidos à própria origem, portanto logs de hospedagem podem refletir a área visualizada. Nenhuma promessa de anonimato dos serviços do navegador é feita. Não foi adicionado banner de rastreio para funcionalidades que não existem.

## Pendências de publicação

O provedor de hospedagem poderá registrar IP, user-agent e URLs nos logs de acesso, mesmo sem analytics no app. Retenção, acesso a logs, região, suboperadores e eventuais métricas automáticas do provedor precisam ser conferidos na configuração de publicação (SDD-045); não se promete anonimato absoluto apenas pela ausência de rastreadores no frontend.

Antes de ativar analytics, monitoramento de erro com payload, replay, geolocalização persistente, formulário de contato ou backend de simulação, revisar esta auditoria e o fluxo de dados. Não ativar por padrão captura de candidato, termos de busca ou dados de saúde.

Os modelos mostram acesso geográfico estimado e incerteza, sem recomendar triagem clínica, classificar pessoas ou decidir automaticamente onde implantar equipamentos. As pendências metodológicas e a licença do IBGE permanecem descritas em `METHODOLOGY.md` e `DATA_SOURCES.md`.

## Resultado

Critério da SDD-042 na entrega original: nenhuma coordenada era persistida ou enviada. A SDD-049 revisa a persistência de propostas de equipamento, com autorização explícita do usuário em 2026-10-29: salvar nome/ponto/resultados somente neste navegador, sem envio remoto. Localização pessoal obtida por geolocalização continua ausente e não deve ser persistida. As propostas salvas são legíveis por quem usa o mesmo perfil do navegador e por código da mesma origem; usar nomes sem dados pessoais e Excluir todos em computadores compartilhados. Limpar cenário remove o ativo, não as cópias salvas. A verificação de hospedagem continua pendente.
