# Qualidade e deploy
## Estado em 2026-10-29

Preparação local concluída para revisão. **Nenhum preview foi publicado; checklist de publicação ainda não assinado.** A SDD-045 foi adiada por decisão explícita do usuário em 2026-10-29. Retomar a escolha de hospedagem e a publicação somente quando solicitado.

O usuário solicitou setup da Vercel e depois condicionou a publicação à conclusão das demandas. O projeto remoto `fortaleza-saude-360` foi criado e vinculado, mas nenhum deployment foi enviado; não houve push ou alterações de DNS. A integração Git criada pelo setup foi desconectada na SDD-054 e deploy automático bloqueado no arquivo local para não publicar em um futuro push de CI. Inventário atual e pendências em `READINESS.md`.

## Verificação local

- [x] Fontes, anos, licenças e limites no manifesto público.
- [x] Modelo atual preservado no simulador; 39.672 inclusões-base reconciliadas e candidatos comparados com os polígonos originais.
- [x] Build com prebuild bloqueando mocks identificados, checksums divergentes e dados não registrados.
- [x] Testes unitários, pipeline Python, lint e tipos executados.
- [x] E2E headless desktop/mobile: mapa, filtros, busca, CSV, simulação, limpeza, falha de rede, privacidade e carga sob demanda.
- [x] Aviso de protótipo, ressalvas de acesso estimado e atribuições OSM/fontes mantidos.
- [x] Auditoria técnica de privacidade e medições locais em `PRIVACY_ETHICS.md` e `PERFORMANCE.md`.
- [x] `.vercelignore` exclui a pasta offline `/data/`, ambientes locais, traces e `.env*` do upload pelo CLI. O padrão é ancorado: **`public/data/` permanece incluído**.
- [x] Nenhuma chave privada obrigatória. O modo dos dados vem do manifesto; a antiga variável de exemplo não era lida pelo runtime e foi removida do exemplo.
- [ ] Primeiro workflow executado e aprovado no GitHub após push autorizado. A CI está preparada, mas não foi executada remotamente.

## Decisões do responsável antes de publicar

- [ ] Autorizar explicitamente a publicação de um **preview experimental**, com os arquivos agregados de população, malha pública e cenários de teste da aplicação.
- [ ] Definir conta, projeto e plataforma. Se Vercel, configurar a raiz como `fortaleza-saude-360`, framework Next.js, Node 22 e build `npm run build`; não é necessário rodar ETL ou instalar Python no deploy.
- [ ] Escolher preview público ou acesso protegido e revisar quem poderá abrir o link.
- [ ] Conferir custos/limites da conta, métricas automáticas, acesso e retenção de logs de IP/URLs. Não ativar analytics, replay ou envio de coordenadas por padrão.
- [ ] Revisar a licença padronizada do IBGE ainda não confirmada na coleta e as atribuições das fontes. A aprovação de um preview não elimina essa pendência.
- [ ] Aceitar o escopo experimental e manter a pendência de conferência de rotas reais visível. Testes de código não equivalem a validação de campo.
- [ ] Definir o domínio do preview. Não alterar DNS ou domínio próprio sem autorização específica.

## Conferência após um preview autorizado

1. Abrir a URL HTTPS e verificar se o aviso de protótipo e as fontes estão visíveis.
2. Conferir `/data/manifest.json` e checksums dos arquivos publicados, inclusive `population-coverage.json` e `scenario-model.json`; downloads não devem servir HTML de fallback nem bytes antigos de cache.
3. Confirmar que mapa, PMTiles, glyphs, fontes e Worker são servidos pela própria origem; não carregar o GeoJSON offline de isócronas de 65,7 MB.
4. Repetir os fluxos desktop/mobile da SDD-041 no domínio do preview, incluindo CSV com acentos e erro do modelo; verificar que o Worker usa HTTPS e não envia candidatos a terceiros.
5. Confirmar ausência de diretórios brutos, ambientes virtuais, secrets e traces no conteúdo publicado.
6. Medir novamente desempenho no domínio real antes de anunciar qualquer meta de usuário. As medições atuais são de localhost, sem throttling.
7. Registrar URL, revisão publicada, data, resultados, limitações e aprovação do responsável. Só então marcar a SDD-045 concluída.

## Assinatura da publicação

Responsável/aceite de publicação: **pendente**. Conta/projeto identificados: `nicolas-santos-projects2/fortaleza-saude-360` (Hobby); somente setup, sem deploy e com Git desconectado. Visibilidade/domínio: **a revisar ao retomar**. Revisão/URL/data de publicação: **pendentes**.
