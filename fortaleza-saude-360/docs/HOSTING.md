# Hospedagem Vercel — revisão de 2026-10-31

Projeto `fortaleza-saude-360` (`prj_pmF9dxkwVhZYEMeh1bEf8T6XALMw`), equipe `nicolas-santos-projects2`. Usuário autorizou explicitamente publicar/configurar a aplicação em 2026-10-31, após receber as ressalvas de licença e campo. A publicação é experimental; não constitui validação presencial ou jurídica.

## Configuração conferida

- API da equipe confirma plano Hobby. Não foram ativados serviços pagos, upgrade, analytics, replay ou integrações externas.
- Next.js, Node 22.x, instalação `npm ci`, build `npm run build`, raiz remota `.` para envio pela CLI executada na pasta da aplicação.
- Projeto sem integração Git; `git.deploymentEnabled=false` preserva revisão manual de futuras publicações. Push de CI não publica automaticamente.
- Proteção existente `all_except_custom_domains`: previews e URLs individuais protegidos; domínio de produção padrão fica público segundo a [documentação de Standard Protection](https://vercel.com/docs/deployment-protection). Verificar os códigos HTTP efetivos após publicar, sem desligar a proteção para testes.
- Web Analytics false; API de drains filtrada por projeto retornou `drains: []`.
- Expiração de deployments configurada em 30 dias nas categorias consultadas, mantendo 10; não confundir expiração de versões com retenção de logs ou dados do provedor.
- Região padrão de Functions `iad1`; a aplicação usa arquivos estáticos/CDN e cálculo no navegador. Não é promessa de residência exclusiva no Brasil. Não foi habilitado backend para coordenadas.
- Dry-run: 264 entradas, 17.857.840 bytes na preparação inicial, 14 arquivos públicos de dados. Zero arquivos com bytes em ambientes, dados offline, credenciais, caches ou traces; diretórios vazios que aparecem no inventário não contêm esses arquivos. O inventário pode crescer com documentos de evidência.

## Logs e privacidade

A [documentação de runtime logs](https://vercel.com/docs/logs/runtime), revisada em 2026-10-31, informa **uma hora** para Hobby. Os logs podem conter caminho, parâmetros de busca, referrer e user-agent; acessíveis a membros autorizados da equipe, não aos visitantes comuns. Não registrar coordenadas propostas/GPS em URL ou payload continua obrigatório. Não há drain configurado para ampliar/exportar os logs deste projeto.

A [política de privacidade do provedor](https://vercel.com/legal/privacy-notice) descreve coleta de IP e informações de tráfego. Uma hora de logs consultáveis no produto não é uma garantia de exclusão de todo IP, backup ou registro de segurança da Vercel. A aplicação não controla esses registros internos e não promete anonimato absoluto.

O checklist HTTPS, revisão publicada, domínio e resultados estão em `DEPLOY_TESTS.md`. Medição em aparelho físico e calibração de trajetos permanecem pendentes. Termos específicos dos dois arquivos IBGE não foram confirmados; atribuições e ressalvas existentes são preservadas, sem inventar CC/SPDX. Declarações de reprodução de outros mapas do IBGE encontradas nesta revisão não foram estendidas a estes arquivos.
