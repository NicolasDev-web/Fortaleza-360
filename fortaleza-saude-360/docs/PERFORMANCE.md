# Desempenho — SDD-043

## Metas definidas antes da medição

Laboratório local, build de produção, Chromium headless, sem simulação de CPU/rede lenta:

- Mapa SVG visível: até 5 s no desktop e 8 s no viewport móvel.
- Abrir Simular e verificar seus dados: até 5 s em localhost.
- Cálculo de um candidato após carregar os dados: até 2 s.
- Soma dos JS emitidos pelo build, incluindo chunks sob demanda: até 2 MiB em gzip nível 6 (limite conservador, maior que apenas a carga inicial).
- Modelo do simulador: até 3 MiB em gzip nível 6 e **nenhum download antes de entrar no modo Simular**.

Tempos são metas locais de engenharia, não percentis de produção, Core Web Vitals ou promessa de desempenho para celulares reais. O viewport móvel muda layout/toque, sem emular um aparelho lento. Os testes registram tempos e verificam a carga sob demanda; latências não são gates rígidos de CI para evitar confundir contenção do runner com regressão funcional.

## Estratégia preservada

O mapa mantém os SVGs e a quantização já existentes. Não foram aplicadas novas simplificações de fronteira, porque mudariam o erro geométrico; não foram adicionados clusters, preservando a decisão anterior do usuário. Os 134 postos, 6 UPAs e 10 hospitais continuam separados.

MapLibre e PMTiles já são carregados por importação dinâmica. Os 7,7 MB do simulador não entram no bundle React nem na carga inicial: são baixados apenas no modo Simular e verificados em Worker. O arquivo bruto de isócronas de 65,7 MB continua offline. O custo do cálculo do candidato fica fora da thread da interface.

## Reprodução

```powershell
npm run test:e2e
```

O teste `mede abertura e cálculo mantendo o modelo fora da carga inicial` registra `test-results/performance-desktop.json` e `performance-mobile.json`, com anexos no relatório. Mede tempo até o SVG visível, abertura/verificação do simulador, cálculo e tamanhos codificados vistos pela página. Recursos carregados exclusivamente em Worker não são contabilizados como JavaScript da thread principal; a medição estática de todos os chunks complementa essa visão.

Não há coleta de performance de visitantes, analytics ou envio de métricas. Os arquivos de medição são locais e ignorados pelo Git.

## Medição de 2026-10-29

| Medida | Desktop | Viewport móvel |
|---|---:|---:|
| Mapa SVG visível | 948 ms | 754 ms |
| Simulador pronto, incluindo download/verificação | 3.590 ms | 3.340 ms |
| Cálculo com dados já carregados | 334 ms | 414 ms |
| HTML codificado observado | 102.743 bytes | 102.743 bytes |
| JS observado na thread principal antes de Simular | 246.194 bytes | 230.689 bytes |
| Download inicial do modelo | Não | Não |

Inventário estático do mesmo build: 17 arquivos JS, 1.985.770 bytes sem compressão e **575.080 bytes em gzip 6**, incluindo chunks sob demanda. Modelo: 7.688.002 bytes sem compressão e **2.385.774 bytes em gzip 6**. Os dois orçamentos de tamanho foram conferidos por assertions no diagnóstico local `data/processed/performance_assets.json`.

Todas as metas locais desta execução foram atendidas. São observações pontuais, não média, p95, LCP ou INP de usuários reais. Diferenças de cache, sistema, CPU e política de compressão mudam os números; devem ser medidas de novo no preview antes de divulgar qualquer promessa de desempenho. O E2E completo, incluindo as duas medições e a carga sob demanda, passou em **10/10 casos**.

Sem evidência de extrapolação desses orçamentos locais, não se alteraram as geometrias nem a representação das unidades. Rede móvel lenta e aparelhos físicos continuam fora desta medição.

### Repetição final após a SDD-044

Na última execução completa: mapa visível em 1.320/848 ms, Simular pronto em 4.200/5.783 ms e cálculo em 652/739 ms (desktop/viewport móvel). O alvo de 5 s para abertura foi ultrapassado no ensaio móvel; a meta não foi relaxada e o teste não transforma uma observação local em garantia de produção. É necessário medir mais amostras no preview e em aparelho real. Os demais alvos de tempo e os limites de tamanho permaneceram atendidos.

Após normalização LF dos dados: JS total emitido de 1.985.774 bytes (575.084 gzip 6) e modelo de 7.688.001 bytes (2.385.768 gzip 6). A mudança de serialização/checksums preservou todos os valores da base; o arquivo do modelo continuou fora da carga inicial.

## URL hospedada — 2026-10-31 (SDD-045)

[fortaleza-saude-360.vercel.app](https://fortaleza-saude-360.vercel.app), origem `d9e7174`, deployment READY. E2E remoto completo **24/24**, Chromium headless, sem throttling, desktop 1440×900 e viewport móvel 390×844. Movimento reduzido, um worker, sem retries. Contextos de teste novos; CDN pode estar aquecida.

| Medida | Desktop | Viewport móvel |
|---|---:|---:|
| Mapa visível | 745 ms | 1.053 ms |
| Simulador pronto | 1.620 ms | 3.012 ms |
| Cálculo | 210 ms | 311 ms |
| Modelo na carga inicial | Não | Não |

Relatórios `test-results/performance-{desktop,mobile}.json`, ignorados. Metas locais de interação atendidas nesta observação HTTPS; não é amostra de usuários, LCP/INP, p95, rede móvel limitada ou aparelho físico. Essas validações continuam pendentes e não devem ser declaradas resolvidas pelo deploy.
