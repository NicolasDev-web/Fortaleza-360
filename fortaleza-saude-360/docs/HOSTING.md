# Hospedagem Vercel — revisão de 2026-10-31

Projeto `fortaleza-saude-360` (`prj_pmF9dxkwVhZYEMeh1bEf8T6XALMw`), equipe `nicolas-santos-projects2`. Usuário autorizou explicitamente publicar/configurar a aplicação em 2026-10-31, após receber as ressalvas de licença e campo. A publicação é experimental; não constitui validação presencial ou jurídica.

## Configuração conferida

- API da equipe confirma plano Hobby. Não foram ativados serviços pagos, upgrade, analytics, replay ou integrações externas.
- Next.js, Node 22.x, instalação `npm ci`, build `npm run build`, raiz remota `.` para envio pela CLI. Na SDD-058, envio a partir de snapshot limpo do diretório da aplicação, exportado da revisão validada via Git; inventário conferido antes do upload.
- Projeto sem integração Git; `git.deploymentEnabled=false` preserva revisão manual de futuras publicações. Push de CI não publica automaticamente.
- Proteção existente `all_except_custom_domains`: previews e URLs individuais protegidos; domínio de produção padrão fica público segundo a [documentação de Standard Protection](https://vercel.com/docs/deployment-protection). Verificar os códigos HTTP efetivos após publicar, sem desligar a proteção para testes.
- Web Analytics false; API de drains filtrada por projeto retornou `drains: []`.
- Expiração de deployments configurada em 30 dias nas categorias consultadas, mantendo 10; não confundir expiração de versões com retenção de logs ou dados do provedor.
- Região padrão de Functions `iad1`; Next gera a página estática e o adaptador Vercel também emite wrappers de Functions (incluindo index/erros), inspecionados após deploy. Arquivos são distribuídos por CDN e cálculos feitos no navegador. Não é promessa de residência exclusiva no Brasil. Não foi habilitado backend para coordenadas.
- Dry-run: 264 entradas, 17.857.840 bytes na preparação inicial, 14 arquivos públicos de dados. Zero arquivos com bytes em ambientes, dados offline, credenciais, caches ou traces; diretórios vazios que aparecem no inventário não contêm esses arquivos. O inventário pode crescer com documentos de evidência.

## Logs e privacidade

A [documentação de runtime logs](https://vercel.com/docs/logs/runtime), revisada em 2026-10-31, informa **uma hora** para Hobby. Os logs podem conter caminho, parâmetros de busca, referrer e user-agent; acessíveis a membros autorizados da equipe, não aos visitantes comuns. Não registrar coordenadas propostas/GPS em URL ou payload continua obrigatório. Não há drain configurado para ampliar/exportar os logs deste projeto.

A [política de privacidade do provedor](https://vercel.com/legal/privacy-notice) descreve coleta de IP e informações de tráfego. Uma hora de logs consultáveis no produto não é uma garantia de exclusão de todo IP, backup ou registro de segurança da Vercel. A aplicação não controla esses registros internos e não promete anonimato absoluto.

O checklist HTTPS, revisão publicada, domínio e resultados estão em `DEPLOY_TESTS.md`. Medição em aparelho físico e calibração de trajetos permanecem pendentes. Termos específicos dos dois arquivos IBGE não foram confirmados; atribuições e ressalvas existentes são preservadas, sem inventar CC/SPDX. Declarações de reprodução de outros mapas do IBGE encontradas nesta revisão não foram estendidas a estes arquivos.

## Resultado e manutenção

Versão atual: deployment `dpl_BVyqwEZEsrRcqobKeNY6uC3v2zsR`, revisão `56ea9f5`, READY, target production solicitado explicitamente. Domínio [fortaleza-saude-360.vercel.app](https://fortaleza-saude-360.vercel.app) público (200); URL individual protegida (302). API confirmou `meta.sourceRevision`, Git desconectado e `all_except_custom_domains` preservado. 26 E2E HTTPS e 14 checksums aprovados; consulta pontual de dez minutos filtrada por deployment sem erro de runtime/5xx, sem paginação pendente. Nenhuma nova instrumentação de visitantes foi adicionada ao código.

Primeira publicação: deployment `dpl_hdZp1TEL4Zu6BKsueNBWgqJrmgTz`, revisão `d9e7174`. O comando solicitou preview, mas o primeiro envio foi classificado production pela plataforma. A diferença foi observada, não contornada por alteração de proteção. Aquele registro teve 24 E2E HTTPS aprovados e permanece histórico em `DEPLOY_TESTS.md`.

O build inicial exibiu a telemetria anônima de build do Next.js. Configurado `NEXT_TELEMETRY_DISABLED=1` como Config nos três ambientes para builds futuros, sem expor credenciais. Isso não altera a ausência de analytics de visitantes na aplicação nem apaga eventos já enviados por aquele build.

A auditoria npm completa em 2026-10-31 retornou 16 entradas moderadas e nenhum high/critical, todas na cadeia de desenvolvimento/lint, associadas ao advisory [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) de minimatch. `npm explain minimatch` confirmou dependências dev de ESLint/plugins/TypeScript ESLint. `npm audit --omit=dev` retornou zero. O vetor descrito depende de padrão glob controlado por atacante; nenhum padrão de visitante é passado a essas ferramentas pelo app. Isso não prova ausência universal de risco de build. A remediação automática propõe downgrades incompatíveis de ESLint/config Next; não foi aplicada nem substituída por override de major sem análise. Manutenção dessa cadeia é pendência técnica separada; não mudar o lockfile da versão publicada silenciosamente.

Plano Hobby confirmado na API e [limites oficiais](https://vercel.com/docs/plans/hobby) revisados: uso pessoal/não comercial, franquias compartilhadas, sem upgrade ou recurso pago ativado. Se o projeto mudar de finalidade ou ultrapassar franquias, revisar os limites em vez de prometer disponibilidade/custo ilimitados.
