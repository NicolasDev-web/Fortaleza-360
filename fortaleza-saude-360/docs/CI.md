# Integração contínua — SDD-044

Workflow em **`/.github/workflows/ci.yml` na raiz do repositório**, com comandos executados em `fortaleza-saude-360/`. Dispara para push/pull request que afetem a aplicação ou o próprio workflow, e manualmente. Não faz deploy, comentários ou push.

Ambiente definido: Ubuntu 24.04, Node 22 e Python 3.13. Permissão de repositório somente `contents: read`, checkout sem persistir credenciais, sem secrets adicionais. Execuções antigas da mesma referência são canceladas para evitar trabalho duplicado.

## Etapas

1. Checkout e instalação por `npm ci` e `pip install '.[dev]'`.
2. `npm run check:data`: verifica modo official, checksums, registro de arquivos e ausência de marcadores DEMO/mock em dados publicados.
3. Ruff e pytest, lint, typecheck e Vitest com dois workers.
4. Chromium headless e `npm run test:e2e`, que faz build de produção e executa os fluxos desktop/mobile e medições locais.
5. Upload de `test-results/` por sete dias, mesmo se testes falharem. Esses artefatos usam apenas dados públicos e candidatos constantes de teste, nunca sessões de visitantes.

## Bloqueio no build

`prebuild` executa `scripts/check-public-data.mjs` antes do `next build`, usando somente Node. Assim o build da hospedagem também bloqueia dados mock, sem exigir Python no ambiente de deploy.

O guard valida os arquivos apontados pelas camadas e metadados opcionais, incluindo PMTiles, contra seus SHA-256. Todos os arquivos em `public/data/` precisam estar registrados; referências fora da pasta pública e links simbólicos em dados são rejeitados. JSONs são percorridos procurando DEMO, mock, synthetic/sintético e `example.invalid`. Isso bloqueia marcadores e inconsistências conhecidas, não é um detector universal de dados inventados sem identificação.

Os testes incluem camada oficial real, checksum divergente, DEMO com checksum atualizado, arquivo não registrado, saída da pasta pública, modo incorreto e código de saída 1 no CLI usado pelo prebuild. Não alteram os dados públicos reais para simular falhas; usam diretórios temporários com destino de limpeza verificado.

## Checkouts reproduzíveis

`.gitattributes` fixa LF para JSON/GeoJSON públicos e os scripts de cobertura e cenário gravam LF explicitamente. Na SDD-044, dois arquivos gerados com CRLF foram normalizados, atualizando somente serialização e vínculo de checksum, com conteúdo numérico preservado. O manifesto foi regenerado. Isso evita que um checkout Windows/Linux invalide arquivos aprovados.

## Actions e estado da validação

Actions oficiais foram fixadas por SHA após consultar suas releases e referências de tags em 2026-10-29: [checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1), [setup-node v7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0), [setup-python v7.1.0](https://github.com/actions/setup-python/releases/tag/v7.1.0) e [upload-artifact v7.0.2](https://github.com/actions/upload-artifact/releases/tag/v7.0.2).

A primeira execução real, [41213402166](https://github.com/NicolasDev-web/Fortaleza-360/actions/runs/41213402166), detectou uma fixture que misturava travessia de diretório com o marcador DEMO. No Linux, o bloqueio de mocks disparava antes do bloqueio de caminho esperado pelo teste. A fixture foi isolada, sem alterar nem enfraquecer o guard; seus sete testes passaram novamente no Windows.

**CI remota aprovada em 2026-10-31:** [41213816425](https://github.com/NicolasDev-web/Fortaleza-360/actions/runs/41213816425), revisão `3e1dcf530def532674ec8fa5203f392092583520`, branch `codex/pre-deploy-completion`. Ubuntu 24.04 / Node 22 / Python 3.13: guard de 14 arquivos, Ruff, 109 testes Python, lint, tipos, 117 testes JavaScript, build de produção e 24 E2E desktop/mobile aprovados. Artefato `f360-test-results` publicado pelo workflow, com retenção de sete dias. Esse resultado valida a revisão citada, não mudanças posteriores ainda não executadas. Não houve merge ou deploy.
