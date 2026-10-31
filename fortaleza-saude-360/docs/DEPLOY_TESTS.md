# Qualidade e deploy
## Estado em 2026-10-31

**Publicado:** [fortaleza-saude-360.vercel.app](https://fortaleza-saude-360.vercel.app), versão experimental, deployment `dpl_hdZp1TEL4Zu6BKsueNBWgqJrmgTz`, revisão de origem `d9e71749612d94c86ebcef7845fc97a8a6aab8af`. Build remoto READY, Next.js/Node22. Publicação autorizada expressamente pelo usuário em 2026-10-31: “já pode subir e configurar tudo no vercel”.

A publicação antes adiada foi retomada após a nova autorização. O primeiro comando pediu `--environment preview`, mas a plataforma classificou esse primeiro envio como **production** e atribuiu o domínio padrão. Isso foi observado no inspect/API e comunicado, sem apresentar o resultado como preview. O domínio padrão responde 200 sem login; a URL individual do deployment redireciona para autenticação Vercel (302). Proteção existente preservada, sem integração Git automática ou alteração de domínio próprio/DNS. Inventário e ressalvas em `READINESS.md` e revisão do provedor em `HOSTING.md`.

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
- [x] Primeiro workflow executado e aprovado no GitHub após push autorizado: [41213816425](https://github.com/NicolasDev-web/Fortaleza-360/actions/runs/41213816425), revisão `3e1dcf5`; 117 JS, 109 Python, 24 E2E, lint/tipos/Ruff, guard e build.

## Decisões do responsável antes de publicar

- [x] Publicação experimental autorizada expressamente em 2026-10-31, após comunicação das pendências de licença, campo e aparelho físico.
- [x] Conta/projeto do setup identificados e build alinhado na SDD-056: `nicolas-santos-projects2/fortaleza-saude-360`, Next.js, Node 22.x, `npm ci`, `npm run build`. Envio futuro pela CLI executada em `fortaleza-saude-360/`, com raiz remota `.`; não exige Python/ETL no deploy. Integração Git continua desligada; se escolhida futuramente, requer raiz de repositório `fortaleza-saude-360` e revisão própria.
- [x] Visibilidade conferida: domínio padrão de produção público (200); URL individual protegida (302 para autenticação). Proteção não foi desativada.
- [x] Plano Hobby, limites documentados, runtime logs consultáveis por uma hora; analytics false e drains vazios. Revisão em `HOSTING.md`; não é promessa de exclusão de todos os registros internos do provedor.
- [x] Nova busca de licença/atribuições realizada e ressalva preservada. **Termos específicos dos dois arquivos IBGE continuam sem confirmação**; não foi atribuída licença CC/SPDX por analogia com outros produtos.
- [x] Escopo experimental comunicado e autorizado. Comparação externa dos cinco pares documentada; **campo e calibração continuam pendentes**.
- [x] Usado apenas domínio padrão gratuito `fortaleza-saude-360.vercel.app`, sem domínio próprio ou compra.

## Conferência após um preview autorizado

1. Abrir a URL HTTPS e verificar se o aviso de protótipo e as fontes estão visíveis.
2. Conferir `/data/manifest.json` e checksums dos arquivos publicados, inclusive `population-coverage.json` e `scenario-model.json`; downloads não devem servir HTML de fallback nem bytes antigos de cache.
3. Confirmar que mapa, PMTiles, glyphs, fontes e Worker são servidos pela própria origem; não carregar o GeoJSON offline de isócronas de 65,7 MB.
4. Repetir os fluxos desktop/mobile da SDD-041 no domínio do preview, incluindo CSV com acentos e erro do modelo; verificar que o Worker usa HTTPS e não envia candidatos a terceiros.
5. Confirmar ausência de diretórios brutos, ambientes virtuais, secrets e traces no conteúdo publicado.
6. Medir novamente desempenho no domínio real antes de anunciar qualquer meta de usuário. As medições atuais são de localhost, sem throttling.
7. Registrar URL, revisão publicada, data, resultados, limitações e aprovação do responsável. Só então marcar a SDD-045 concluída.

## Assinatura da publicação

Aceite de publicação: **autorização expressa do usuário no chat em 2026-10-31**. Execução técnica registrada abaixo. Conta/projeto: `nicolas-santos-projects2/fortaleza-saude-360` (Hobby), com Git automático desconectado. Domínio público: [fortaleza-saude-360.vercel.app](https://fortaleza-saude-360.vercel.app). Origem: `d9e7174`; publicado em 2026-10-31. As ressalvas de licença e validação presencial não foram assinadas como resolvidas.

## Evidência da publicação autorizada — 2026-10-31

- Aceite de publicação: usuário no chat, “já pode subir e configurar tudo no vercel”. Execução e aceite técnico limitados aos checks abaixo; nenhuma certificação jurídica/científica ou aprovação clínica.
- Revisão `d9e7174`, [CI 41214979987](https://github.com/NicolasDev-web/Fortaleza-360/actions/runs/41214979987) aprovada: 117 JS, 109 Python, 24 E2E locais, guard, Ruff, lint, tipos e build. Lint/tipos/build locais passaram antes do envio.
- CLI enviou à equipe/projeto existente; build remoto aprovado em 1 min 22 s; target production, READY. [Inspect](https://vercel.com/nicolas-santos-projects2/fortaleza-saude-360/hdZp1TEL4Zu6BKsueNBWgqJrmgTz). Domínio público HTTPS respondeu 200 e título esperado, sem bypass ou login.
- **24/24 E2E no domínio HTTPS**, desktop 1440×900 e viewport móvel 390×844: busca/teclado, camadas, CSV, comparação, simulação/Worker, erros HTTP, salvar/reabrir/excluir cenários, localização simulada e corredores. Nenhum dado pessoal real de localização foi usado. Capturas desktop/móvel inspecionadas; traces remotos desativados.
- Manifesto remoto idêntico byte a byte e **14 arquivos com SHA-256 iguais** aos locais. PMTiles respondeu 206 a `Range: bytes=0-126`, conteúdo igual aos 127 bytes iniciais locais, total 6.366.970 bytes.
- `/.env`, `/.env.local`, `/.vercel/project.json`, `/data/raw`, `/data/processed` e `/test-results`: 404. A tentativa inicial de sondar diretórios com barra final recebeu redirecionamento canônico do Next; foi refeita nos caminhos canônicos e não contada como exposição.
- Consulta de logs filtrada por deployment, janela de dez minutos após os testes: zero erros de runtime e zero requisições 5xx, sem paginação pendente. É observação pontual, não monitoramento contínuo.
- Métricas HTTPS sem throttling: mapa 745/1.053 ms, abertura do Simular 1.620/3.012 ms e cálculo 210/311 ms (desktop/viewport móvel). Modelo não solicitado na carga inicial. Não são Web Vitals, p95, aparelho físico ou rede móvel medida.
- `npm audit --omit=dev`: zero alertas. Auditoria completa: 16 entradas moderadas na cadeia de lint, ligadas a [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), sem high/critical. Não foi aplicado `audit fix --force` que propõe downgrades incompatíveis. Dívida de ferramentas registrada em `HOSTING.md`; não equivale a ausência universal de vulnerabilidades.
- Relatórios locais ignorados: `test-results/https-checks.json`, `performance-{desktop,mobile}.json` e capturas. Coordenadas de proposta/GPS permanecem fora de URLs/requisições; propostas salvas somente no navegador por ação explícita.

Validação presencial de rotas, calibração, celular físico e confirmação específica de licença IBGE continuam abertas. Não há promessa de que essas pendências foram resolvidas pela hospedagem.
