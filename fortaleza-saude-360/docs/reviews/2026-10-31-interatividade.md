# Revisão de interatividade — Fortaleza Saúde 360°

Data: 2026-10-31. Responsável: agente 1, exclusivamente experiência, interação e compreensão. Site: [versão pública experimental](https://fortaleza-saude-360.vercel.app/).

## Os três maiores achados

1. **Simular existe, mas fica escondido no mobile.** Ao vivo, em 390 × 844 CSS px, a faixa de navegação mostrou História, Explorar e Comparar; Simular ficou além da área visível, em uma faixa com rolagem horizontal. A busca também passou a ser representada visualmente apenas pela lupa. Prioridade: tornar os caminhos e suas finalidades visíveis — M1.
2. **A História precisa explicar melhor o escopo das estimativas existentes.** O capítulo 5 fala da ausência de população próxima **de cada posto** e tempo até ele; na mesma sessão, Simular calculou cobertura **agregada** nos corredores de 10/20/30 minutos e sensibilidade. Essas medidas não são equivalentes: o teste não comprova que já existe população atribuída a cada unidade ou tempo individual observado. A melhoria é apresentar o que o modelo agregado permite explorar e manter explícito o que falta — M3.
3. **Ações funcionam, mas seus resultados ficam distantes no mobile.** Ao vivo, buscar Bom Jardim aproximou o mapa e atualizou a seleção, mas a ficha continuou abaixo dele. Com Simular ativo em 390 × 844, a posição inicial do painel foi aproximadamente `y = 937 px`, medida no DOM renderizado, além da primeira tela. Prioridade: oferecer retorno junto à ação e acesso explícito ao resultado — M2.

Esses achados não demonstram taxas de abandono: não houve pesquisa com usuários. São barreiras observadas que justificam hipóteses e testes de compreensão.

## Escopo, método e limites

Foram lidos `AGENTS.md` da raiz e da aplicação, `README.md`, `docs/PRD.md`, `docs/READINESS.md` e a [skill design-critique](C:/Users/Nicolas/.codex/plugins/cache/claude-cowork/design/1.2.0/skills/design-critique/SKILL.md). A análise seguiu suas dimensões de primeira impressão, usabilidade, hierarquia, consistência e acessibilidade. A orientação de Graphify foi consultada; não foi gerado grafo, preservando o escopo de escrever somente este relatório.

A inspeção ao vivo usou CUA em **uma única aba própria temporária**, oculta, do navegador integrado. Foram inspecionados desktop de 1280 × 720 e 1440 × 900 e mobile de 390 × 844. Houve também uma passagem por 320 × 740, sem cobertura suficiente para concluir conformidade nessa largura. Chrome/Edge não estavam disponíveis como superfícies controláveis; a tentativa de mostrar o navegador integrado foi bloqueada neste chat de agente, e a aba oculta funcionou. Uma tentativa posterior de localizar a camada por papel de checkbox falhou; o DOM a identificou como botão pressionável. Não se interpreta essa diferença de ferramentas como defeito do site. A via de UI está encerrada, sem novas tentativas; viewport restaurado e aba própria fechada.

Foram utilizados screenshots da sessão, árvore de acessibilidade, DOM renderizado e leitura pontual de código. As capturas anteriores do projeto fornecidas no contexto também foram abertas e inspecionadas. Não foram criados arquivos de captura adicionais: o único artefato novo é este Markdown. As observações da sessão abaixo são registros textuais reproduzíveis, não uma coleção de novas imagens persistidas.

Não foram usados GPS real, contas, login, Vercel, configurações ou mensagens. O ponto da simulação foi uma coordenada hipotética digitada manualmente. Não foram salvos cenários nem efetuados downloads. Este trabalho não valida estatísticas, licenças ou a qualidade científica do modelo, temas reservados à revisão de dados e à síntese. O código local ajuda a explicar o observado; não houve confirmação independente do SHA publicado.

**Limitações:** viewport em navegador não substitui celular físico ou gesto de toque. Não houve leitor de tela, medição de contraste, auditoria WCAG completa, rede limitada, injeção de falhas de rede, teste de persistência após recarregar ou teste moderado com participantes. Aceites abaixo são propostas futuras, não verificações já aprovadas. Não foram executados lint, typecheck ou build, pois esta entrega é somente documental e não deve gerar alterações fora do relatório. Nenhuma aplicação, dado, configuração, SDD, commit ou deploy foi alterado por esta revisão.

## Evidências: o que foi efetivamente visto

Legenda: **V** = observado ao vivo; **I** = captura real fornecida; **C** = leitura de código, sem equivalência automática com execução publicada.

| ID | Evidência e reprodução | Resultado observado / alcance |
|---|---|---|
| V1 | Abrir o domínio na aba própria, desktop 1280 × 720 | História abriu com seis capítulos, progresso, próximo/anterior e opção de pular. O mapa já fazia parte da narrativa; não falta um modo História. |
| V2 | História → capítulo “O que os dados não contam” | Texto visível afirmou ausência de população próxima de cada posto, tempo para chegar e atendimentos. Foi capturado na tela e na árvore. O qualificativo “cada posto” importa: cobertura agregada por corredores não substitui essa informação individual por unidade. |
| V3 | Comparar → A: Aldeota; B: Bom Jardim | Contornos A/B distintos, tabela preenchida e controles Inverter A e B, Mostrar no mapa e Baixar comparação (CSV). Os valores exibidos foram 42.580 e 33.720 moradores; ambos com 1 posto; distâncias de 1,3 km e 296 m em linha reta. São transcrição da UI, não nova validação das fontes. |
| V4 | Simular → latitude `-3.78`, longitude `-38.55` → Calcular este ponto | Resultado “Cenário calculado”, ponto a 42 m do nó da malha; ganho central de +1.103 em 10 min, faixa 164–1.103; +0 em 20 min, faixa 0–779; +0 em 30 min, faixa 0–0. Base/com proposta e salvar neste navegador estavam presentes. |
| V5 | Redimensionar para 390 × 844 com Simular ativo | Faixa de modos com rolagem horizontal e Simular inicialmente fora da porção visível. Painel do cenário começando em `y ≈ 937 px` na posição inicial. Resultado exigiu rolagem para ser lido. |
| V6 | No mesmo mobile, rolar sobre o mapa e depois fora dele | A rolagem sobre o mapa alterou seu enquadramento/zoom; fora dele moveu a página até os resultados. Isso foi observado com entrada de rolagem do navegador, não com dedo em aparelho. |
| V7 | Explorar → lupa → “Bom Jardim” → Enter | Busca funcionou por teclado, aproximou e destacou o bairro, URL passou a `?neighborhood=72`; ficha e anúncio de seleção foram adicionados. Ficha ficou abaixo do mapa na leitura móvel. O foco retornou à busca. |
| V8 | Retornar a Comparar no mobile | Dupla Aldeota/Bom Jardim permaneceu selecionada. Tabela se apresentou com três colunas; números, faixas e nomes longos exigiram leitura densa. Não foi observado desaparecimento da comparação. |
| V9 | Sair de Simular após o cálculo, visitar outros modos e retornar | Coordenadas e resultado do cenário não salvo desapareceram; painel voltou a pedir um ponto. A UI de cenários salvos continuou presente, com aviso de armazenamento neste navegador. Não se testou salvar/reabrir. |
| V10 | Explorar → Resumo em 1280 × 720 | Número de moradores apareceu cortado na borda direita. DOM do painel: `clientWidth = 309`, `scrollWidth = 331`; havia rolagem horizontal. Em 1440 × 900 o número completo ficou visível. |
| V11 | Explorar → Corredores a pé → Até 30 minutos, desktop 1440 × 900 | Controle ativo, opções 10/20/30 min, aviso de base a 4,8 km/h e camada lilás desenhada após carregar. A própria UI explica que a proposta de Simular não modifica essa camada. Não falta visualização de corredores. |
| V12 | Resumo e painel lateral | Lista de bairros e Distância por setor tinham nomes acessíveis, mas apareciam visualmente como ícones quando inativas. “Pessoas perto de um posto” mostrou traço com indicação de ver estimativas em Simular. O convite “Simule um posto novo no mapa” apareceu como texto, sem controle na árvore. |
| I1 | [Captura desktop fornecida](C:/Users/Nicolas/.codex/visualizations/2026/10/28/01a183e4-9c96-7d93-967c-af341358a429/fortaleza-publicado-desktop.png) | Corrobora existência dos corredores, fontes, legendas, controles e convite à simulação. É um estado capturado, não teste de cada ação. |
| I2 | [Captura mobile fornecida](C:/Users/Nicolas/.codex/visualizations/2026/10/28/01a183e4-9c96-7d93-967c-af341358a429/fortaleza-publicado-mobile.png) | Com “O que mostrar e de onde vem” expandido, camadas, legenda e fontes formam uma sequência longa antes do mapa. A posição peculiar do cabeçalho em captura longa não é usada, isoladamente, para afirmar defeito. |

## Corroboração e inferências do código

| ID | Local consultado | O que permite afirmar |
|---|---|---|
| C1 | [lib/story.ts](../../lib/story.ts), especialmente linhas 117 e 125 | Confirma textos sobre falta de medição pelas ruas e ausência de população próxima de cada posto/tempo. Permite propor uma explicação mais completa das estimativas agregadas existentes; não comprova que resultados por unidade ou medição real estejam disponíveis. |
| C2 | [components/Insights.tsx](../../components/Insights.tsx), `InsightsFooter` | O convite “Simule” é conteúdo em `div`/`strong`, sem botão ou callback. V12 não é somente dificuldade de localizar um link. |
| C3 | [components/Observatory.tsx](../../components/Observatory.tsx), `switchMode` e seleção | Sair de Simular limpa `candidate`; seleção de busca atualiza filtros e enquadramento. A comparação usa estado próprio. Isso explica V7–V9; não se afirma que a busca preenche automaticamente A ou B. |
| C4 | [components/ScenarioSimulator.tsx](../../components/ScenarioSimulator.tsx) | Já há carregamento, cálculo, status ao vivo, erros, tabela central, sensibilidade e metodologia expansível. A faixa varia velocidade de 4,0 a 5,5 km/h e não é intervalo de confiança. Não se propõe criar novamente esses recursos. |
| C5 | [components/NeighborhoodComparison.tsx](../../components/NeighborhoodComparison.tsx) | Já há CSV, cabeçalhos de tabela, faixas, restrição de bairros iguais e metodologia; faltam uma síntese das diferenças e atalhos para aproveitar a seleção de Explorar. Não houve validação do conteúdo do CSV nesta revisão. |
| C6 | [components/vendor/discrete-tabs.tsx](../../components/vendor/discrete-tabs.tsx) e [components/ReadingPanel.tsx](../../components/ReadingPanel.tsx) | Abas inativas preservam nome acessível, mas só mostram ícone. Recomendação de rótulos visuais não é alegação de ausência de nome para leitor de tela. |
| C7 | [components/CommandPalette.tsx](../../components/CommandPalette.tsx) | Busca tem combobox, setas, Enter, Escape e retorno de foco. Não há botão explícito de fechar; `Esc` é indicação visual. A dificuldade de fechamento por toque é hipótese a testar, não falha comprovada em celular. |
| C8 | [lib/filters.ts](../../lib/filters.ts) e [components/Observatory.tsx](../../components/Observatory.tsx) | URL já serializa seleção de bairro/unidade. Não representa modo, dupla A/B ou cenário. Persistência de cenários já existe separadamente em armazenamento local. |

## O que funciona bem

A identidade territorial e a hierarquia de títulos dão caráter ao produto. Busca por nome e Enter funcionaram; comparação manteve A/B e os destacou no mapa. História tem capítulos controlados pelo usuário e saída explícita. Corredores são opt-in e distinguem acesso geográfico de área de atendimento. Simular apresentou resultados, sensibilidade e limites; comparação expõe fontes, anos e limitações. Os avisos de protótipo e de que contagem não representa capacidade estão presentes. A evolução deve conectar e explicar essa base existente.

## Ordem recomendada

| Ordem | Melhoria inicial | Impacto / esforço qualitativo | Justificativa |
|---|---|---|---|
| 1 | M1 — descoberta dos modos e entradas por tarefa | Alto / médio | Permite encontrar Simular no mobile e transforma convites em caminhos executáveis. |
| 2 | M3 — História coerente e demonstração guiada | Alto / baixo a médio | Esclarece o escopo agregado das estimativas e apresenta as ferramentas, preservando ausências por unidade e medição de campo. |
| 3 | M2 — ligação entre ação e resultado | Alto / médio | Ajuda a perceber o sucesso da busca e do cálculo e reduz idas e voltas no mobile. |

As estimativas indicam complexidade relativa, não prazo. Os aceites combinam inspeção funcional e avaliação moderada sugerida com cinco participantes, sem necessidade de telemetria ou dados de saúde. Metas de 4/5 são critérios propostos para uma primeira rodada, não resultado estatístico nem taxa atual do produto.

## Oito melhorias específicas

### M1 — Mostrar os modos e oferecer entradas por pergunta

- **Observação/problema:** V5 mostra Simular fora da navegação visível no mobile; V12/C2 mostram um convite textual que não executa a ação. A pessoa precisa descobrir a barra horizontal e relacionar a ferramenta à pergunta que tem.
- **Experiência proposta:** no mobile, mostrar os quatro modos em grade compacta de duas linhas, com rótulos estáveis. Oferecer “Encontrar um bairro”, “Comparar dois bairros” e “Testar um ponto proposto” na entrada e no final da História. Converter o convite existente em botão real que abre Simular e revela sua instrução inicial. Exibir “Buscar” junto à lupa onde houver espaço, mantendo o nome acessível existente.
- **Benefício:** descoberta de recursos e início de tarefas com menos interpretação. Interatividade com propósito, sem acrescentar nova funcionalidade analítica.
- **Impacto/esforço:** alto / médio.
- **Dependência:** CommandBar, layout responsivo, InsightsFooter e callbacks de mudança de modo; coordenar com M2 o destino do foco.
- **Risco/limitação:** a navegação pode consumir altura; evitar empilhar uma segunda barra fixa e medir o espaço com teclado virtual aberto. Não abrir geolocalização automaticamente.
- **Aceite mensurável:** em 320, 390 e 768 px, os quatro modos são localizáveis sem rolagem horizontal; todos os convites funcionam por toque, Enter e Espaço; 4/5 participantes encontram Simular e explicam sua finalidade sem orientação. Registrar sucesso e primeira escolha, sem exigir criação de conta.
- **Base:** V5, V12, C2; a ONS recomenda dar contexto e ajudar a navegar, em vez de esconder a mensagem atrás de seleções [F1]. A proposta concreta é inferência de design.

### M2 — Dar retorno junto ao mapa e acesso imediato à ficha ou resultado

- **Observação/problema:** V4–V7 confirmam atualização de dados, mas os painéis ficam abaixo do mapa no mobile. Já existe status ao vivo no simulador e anúncio de bairro selecionado; acrescentar apenas outro toast não resolve a distância visual. V6 sugere conflito de intenção ao rolar sobre o mapa no ambiente de teste.
- **Experiência proposta:** após selecionar um bairro, apresentar resumo compacto “Bom Jardim · 1 posto dentro do bairro” e botão “Ver detalhes” junto ao mapa. Após calcular, mostrar “Cenário calculado · ver resultado” no mesmo contexto. Esse botão revela/posiciona o painel e seu título com foco previsível; “Voltar ao mapa” preserva o enquadramento. No mobile, prototipar alternância Mapa/Detalhes/Resultado com estado retido. Diferenciar explicitamente o modo de interação com o mapa da rolagem da página, validando o gesto em aparelho.
- **Benefício:** a pessoa entende que a ação funcionou e consegue seguir do lugar escolhido ao dado correspondente.
- **Impacto/esforço:** alto / médio.
- **Dependência:** seleção compartilhada, posição dos painéis, foco e mensagens existentes; validar com teclado e leitor de tela antes de substituir o layout.
- **Risco/limitação:** rolagem automática e foco roubado podem desorientar. Preferir ação explícita “Ver resultado”; não criar drawer que cubra controles ou prenda a página. V6 não prova problema de gesto de toque.
- **Aceite mensurável:** selecionar bairro ou propor ponto produz identificação visível junto ao mapa; o resultado fica acessível com uma ativação explícita e retorno preservado; leitor de tela anuncia sucesso uma vez, sem anunciar toda a tabela; 4/5 participantes abrem e descrevem a ficha/resultado sem ajuda. Erro e carregamento devem manter a mesma localização de retorno.
- **Base:** V4–V7, C3–C4; mensagens de status devem ser percebidas sem deslocamento obrigatório de foco [F3].

### M3 — Atualizar a História e ensinar com uma exploração curta

- **Observação/problema:** V2/C1 tratam de informações por unidade ainda ausentes, enquanto V4 mostra estimativas agregadas por corredores. A leitura pode sugerir ausência de toda estimativa, mas isso é uma hipótese de compreensão, não contradição comprovada entre medidas equivalentes. A História já coordena capítulos e destaque no mapa; falta ligar os escopos à exploração disponível.
- **Experiência proposta:** apresentar distinção explícita: “No Simular há estimativas agregadas de acesso pela rede de caminhada. Elas não são população atendida por cada posto, medição de campo ou capacidade”. Manter as ausências reais de atendimento e resultados individuais por unidade. Em um capítulo opcional, deixar escolher um bairro e observar sua ficha; no encerramento, oferecer buscar outro bairro, comparar e simular. A demonstração deve usar o modelo carregado e ser reversível, sem exemplo numérico fixado no texto.
- **Benefício:** narrativa ensina a interpretar e agir; o produto fica mais interessante pela descoberta de uma pergunta respondida, preservando rigor.
- **Impacto/esforço:** alto / baixo a médio; correção textual é menor que a demonstração interativa.
- **Dependência:** revisão editorial de story.ts, confirmação das capacidades atuais com o responsável pelo método e handlers de seleção/modo. Não depende de novos dados nem de calibração para declarar honestamente o que já é estimado.
- **Risco/limitação:** tornar a estimativa aparentemente oficial ou obrigar o tutorial. Manter “Pular”, reabrir História e não exigir participação para liberar o mapa.
- **Aceite mensurável:** nenhum capítulo declara ausente uma estimativa já ofertada; todos distinguem modelagem de medição quando pertinente; cada convite final abre seu modo; 4/5 participantes explicam uma capacidade e duas limitações após a História; navegação funciona com movimento reduzido e sem depender de animação.
- **Base:** V1–V4, C1; contexto e orientação são apoiados por F1. O texto final deve ser validado editorialmente, não tratado como validação científica.

### M4 — Transformar a comparação existente em uma leitura das diferenças

- **Observação/problema:** V3/V8 mostram A/B e tabela funcionais, porém o usuário precisa percorrer valores, faixas e nomes para formular uma conclusão. A busca/seleção de Explorar não oferece, na ficha observada, “Usar como A/B”; C3/C5 mostram estados distintos.
- **Experiência proposta:** da ficha, oferecer “Comparar este bairro”, preenchendo A. Para escolher B, reutilizar busca por nome, mantendo o select acessível. Acima da tabela, sintetizar diferenças calculadas, por exemplo “Ambos têm o mesmo número de postos dentro do limite; população e distância aproximada diferem”. No mobile, apresentar cada indicador com A e B juntos em blocos verticais, preservando tabela/CSV para aprofundar. Mostrar A/B, unidade e ano junto a cada valor; diferenças podem usar marcas neutras, sem declarar bairro vencedor.
- **Benefício:** comparação facilita interpretação e mantém ligação com o território escolhido.
- **Impacto/esforço:** alto / médio.
- **Dependência:** integração entre ficha e estado A/B; reutilização dos cálculos e do exportador existentes; revisão das frases condicionais para dados ausentes.
- **Risco/limitação:** razão moradores/posto pode ser confundida com lotação. Evitar semáforo “melhor/pior”, classificação de qualidade de saúde e conclusão causal. Mesmo número de postos não implica mesmo acesso.
- **Aceite mensurável:** bairro da ficha entra em A sem redigitar; B igual a A continua impedido; resumo e tabela concordam nos valores/unidades; no mobile ambos os valores de cada indicador são legíveis sem rolagem lateral do texto; 4/5 participantes identificam duas diferenças e explicam por que a razão não mede atendimento. Manter CSV e ausência de ranking competitivo.
- **Base:** V3, V8, C3, C5; priorizar interpretação e testar as necessidades é coerente com a orientação de dashboards da ONS [F6].

### M5 — Explicar o ganho do simulador e tornar a sensibilidade explorável

- **Observação/problema:** V4 mostrou +1.103 em 10 min e +0 central em 20 min, mas faixa até 779 nesse horizonte. A UI já expõe faixas; velocidade variável e significado de “nó” ficam mais técnicos ou em metodologia expansível. Há risco de interpretar +0 como inutilidade ou o ganho como novas vagas. A camada de corredores existente representa a base, conforme V11.
- **Experiência proposta:** organizar o fluxo em escolher ponto → escolher horizonte → ler ganho. Mostrar base, proposta e ganho com rótulo “moradores adicionais estimados no alcance modelado”, seguido da faixa e da hipótese de velocidade. Oferecer alternância entre os cenários de velocidade já calculados e visual simples do ganho, mantendo os números em tabela. Explicar +0 como “sem ampliação do alcance neste horizonte e hipótese”, não como avaliação da utilidade de um posto. Trocar “nó” por “ponto da rede de caminhada usado no cálculo”, com explicação técnica opcional. Identificar sempre a camada atual como base; desenho de corredores da proposta é evolução separada, dependente de geometria consistente.
- **Benefício:** exploração ajuda a entender por que o resultado muda e a confiar na estimativa na medida correta.
- **Impacto/esforço:** alto / médio para leitura e alternância das saídas existentes; alto esforço se houver futura geometria da proposta.
- **Dependência:** resultados por velocidade/horizonte já disponíveis no Worker, revisão de método e associação inequívoca entre controles e hipótese exibida. Não requer mudar o modelo para melhorar os rótulos.
- **Risco/limitação:** sensibilidade à velocidade não cobre todas as incertezas; não desenhar faixa como probabilidade nem importar o exemplo de 95% da fonte ONS. Não representar os corredores da base como resultado da proposta.
- **Aceite mensurável:** todos os resultados identificam horizonte, velocidade, base/proposta e natureza modelada; a faixa continua explicitamente sem interpretação probabilística; alternar hipótese reproduz as saídas existentes, incluindo casos de ganho zero; 4/5 participantes distinguem ganho geográfico de capacidade e reconhecem que a faixa não é garantia. Desligar uma camada não pode alterar silenciosamente o significado da tabela.
- **Base:** V4, V11, C4; F2 orienta tornar incerteza relevante compreensível. Sua apresentação é adaptada aqui à sensibilidade do modelo, que não é intervalo de confiança.

### M6 — Explicar os números no contexto e distinguir indisponibilidade de escolha pendente

- **Observação/problema:** V12 mostrou “Pessoas perto de um posto” com traço e orientação para outro modo; na árvore apareceu “Sem dados”. Isso pode sugerir falha ou inexistência de estimativas. Fontes e metodologia já existem, mas a lista completa fica distante ou, expandida no mobile de I2, ocupa uma sequência longa antes do mapa.
- **Experiência proposta:** usar estado específico “Escolha um tempo no Simular para ver a estimativa”, com atalho funcional. Reservar “Dados indisponíveis” para falha real. Ao lado de valores derivados, mostrar descrição curta: origem, ano e natureza da medida (“Censo”, “contagem no limite”, “linha reta”, “caminhada modelada”). Oferecer glossário contextual para centro geométrico, faixa de alocação e corredor, abrindo os detalhes já existentes. Manter fontes completas e limitações, sem repetir toda a documentação em cada cartão.
- **Benefício:** reduz interpretação equivocada de lacunas e permite verificar o significado antes de concluir.
- **Impacto/esforço:** médio a alto / baixo a médio.
- **Dependência:** taxonomia de estados da UI e metadados existentes; validar rótulos com agente de dados. Questões IBGE, licenças e temporalidade devem ser encaminhadas àquela revisão, sem resolvê-las por redação.
- **Risco/limitação:** selos podem aparentar certificação. Rotular origem/tipo, sem “dado aprovado” ou “validado”; agrupar ajuda sem ocultar ressalva essencial. Não converter silenciosamente faixas em outra medida.
- **Aceite mensurável:** estado sem seleção difere de carregamento, erro e ausência de dado em texto e semântica; cada número derivado apresenta tipo/unidade/ano perto do valor ou em ajuda acionável; fonte completa é alcançável em até duas ativações; 4/5 participantes distinguem dado cadastral, aproximação em linha reta e tempo modelado.
- **Base:** V12, I2, C4–C5; F1 sustenta contexto e anotações. Os estados propostos são decisões de design, não constatação de erro de dados.

### M7 — Tornar controles autoexplicativos e eliminar cortes fora do mapa

- **Observação/problema:** V10 comprova transbordamento e corte do KPI em 1280 px. V12/C6 mostram Lista de bairros e Distância por setor só com ícones quando inativas. C7 aponta fechamento da busca por Escape ou fundo, sem botão explícito; não houve teste com teclado virtual ou leitor de tela.
- **Experiência proposta:** manter rótulos visuais curtos nas abas de leitura; oferecer botão “Fechar busca” e testar sua posição com teclado virtual. Ajustar grid/tipografia dos KPIs à largura real da coluna, sem abreviar o único número exato disponível. Auditar alvos, foco visível, contraste e movimento reduzido nos fluxos alterados. Preservar busca/lista e coordenadas como alternativas já existentes à interação espacial; avaliar controles de deslocamento por toques caso arrastar seja necessário a uma tarefa.
- **Benefício:** melhora reconhecimento por pessoas sem familiaridade com os ícones e leitura com ampliação ou telas estreitas.
- **Impacto/esforço:** alto / médio.
- **Dependência:** componentes de abas e busca, CSS dos painéis e validação em aparelho/leitor de tela. Não implica substituir o mapa nem atribuir falha WCAG sem teste.
- **Risco/limitação:** rótulos e alvos maiores disputam largura; evitar resolver cortando texto. Exceções normativas para mapas e tabelas não justificam cortar KPIs ou navegação.
- **Aceite mensurável:** em 1280 × 720 e 1440 × 900 nenhum KPI corta dígitos; em 320 e 390 px texto de navegação, fichas e ajuda reflui sem rolagem em duas direções, preservadas as exceções justificadas de mapa/tabela; controles comuns atendem 24 × 24 CSS px ou exceção documentada, com meta de conforto de 44 × 44 para ações móveis frequentes; busca fecha por botão e Escape e devolve foco; tarefas essenciais passam por teclado e leitor de tela, com foco não oculto pelo cabeçalho. Registrar resultados de contraste em vez de presumir aprovação.
- **Base:** V10, V12, C6–C7; W3C sobre reflow [F4], tamanho mínimo e exceções [F5], mensagens [F3] e alternativa a arrastar [F7]. A meta de 44 px é de projeto, não o mínimo de 24 px do critério citado.

### M8 — Preservar o raciocínio ao alternar ferramentas

- **Observação/problema:** V9 confirmou perda do cenário não salvo ao sair de Simular; C3 explica o reset explícito. Em contraste, A/B persistiram entre modos em V8. Cenários salvos e URL de bairro/unidade já existem; C8 indica que a URL não representa modo ou dupla.
- **Experiência proposta:** manter o rascunho de simulação em memória durante a sessão ao visitar outros modos, com “Retomar ponto proposto”. Reservar limpeza para “Limpar cenário”. Deixar explícitos “rascunho desta sessão” e “salvo neste navegador”; destacar o salvamento existente após resultado. Em etapa separada, permitir copiar link de comparação com modo e códigos A/B, reutilizando o tratamento de URL já existente. Não colocar GPS real, ponto de simulação ou nome livre na URL.
- **Benefício:** incentiva investigar e voltar sem refazer trabalho, além de comunicar corretamente o alcance do salvamento.
- **Impacto/esforço:** médio a alto / médio.
- **Dependência:** ciclo de vida do candidato/Worker e identificação da versão do modelo; extensões de filtros para modo/A/B. Recalcular se a versão mudar, aproveitando comportamento existente de reabertura de salvos.
- **Risco/limitação:** mostrar resultado antigo como atual, criar persistência inesperada ou expor coordenadas. Manter rascunho em memória, sem persistir automaticamente; não enviar mensagens nem ativar compartilhamento externo.
- **Aceite mensurável:** calcular → Comparar → voltar restaura o mesmo ponto e identifica resultado válido ou recálculo; “Limpar” remove o rascunho; cenários salvos continuam opt-in e separados; copiar/reabrir link de comparação mantém modo e bairros válidos, rejeita parâmetros inválidos e não contém coordenadas ou nome de cenário; 4/5 participantes distinguem rascunho de salvo local.
- **Base:** V8–V9, C3, C8. Trata-se de melhoria de continuidade; não de criar o salvamento que já foi entregue.

## Fontes primárias verificadas na web

Consultadas em 2026-10-31. As fontes fundamentam princípios; não comprovam as hipóteses de comportamento dos visitantes deste site. As recomendações e aceites acima são propostas desta revisão.

- **F1 — Office for National Statistics:** [Interactive charts and animations](https://service-manual.ons.gov.uk/data-visualisation/guidance/interactive-charts-and-animations). Recomenda orientar a leitura e não depender da interação para comunicar tudo. Aplicação aqui: entradas por pergunta, contexto e narrativa; nenhuma demanda de animação adicional.
- **F2 — Office for National Statistics:** [Showing uncertainty in charts](https://service-manual.ons.gov.uk/data-visualisation/guidance/showing-uncertainty-in-charts). Apoia explicar a incerteza quando ela muda a interpretação. As faixas do Fortaleza 360 são de sensibilidade/alocação, não devem receber significado probabilístico por analogia.
- **F3 — W3C/WAI:** [Understanding SC 4.1.3 — Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html). Fundamenta retorno programaticamente perceptível sem exigir foco no aviso. O simulador já possui status; a melhoria proposta integra contexto visual e acesso ao resultado.
- **F4 — W3C/WAI:** [Understanding SC 1.4.10 — Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). Fundamenta verificar texto e controles em largura equivalente a 320 CSS px, considerando exceções para conteúdo bidimensional.
- **F5 — W3C/WAI:** [Understanding SC 2.5.8 — Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum). Define mínimo de 24 × 24 CSS px e exceções, inclusive para localização essencial em mapas; não autoriza concluir que todos os marcadores pequenos falham automaticamente.
- **F6 — Office for National Statistics:** [Dashboards](https://service-manual.ons.gov.uk/data-visualisation/guidance/dashboards). Fundamenta destaque de conclusões úteis e testes com usuários, reconhecendo o esforço de interpretação imposto por painéis.
- **F7 — W3C/WAI:** [Understanding SC 2.5.7 — Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html). Distingue alternativa por clique/toque de equivalência apenas por teclado. Não foi concluída conformidade do mapa nesta revisão.

## Encaminhamento e verificação desta entrega

Nota de consolidação do agente principal: o texto foi refinado para preservar a distinção entre a frase “de cada posto” da História e os resultados agregados do simulador. A melhoria M3 não deve ser implementada afirmando que esses resultados por unidade já existem. Isso mantém a proposta editorial e a demonstração guiada sem criar uma capacidade analítica inexistente.

Começar por M1, M3 e M2, reutilizando os componentes e métodos existentes. Em seguida validar comparação e interpretação do simulador (M4–M6), legibilidade/controles (M7) e continuidade (M8). Acessibilidade acompanha cada implementação, mesmo quando M7 é tratada como tarefa própria.

Não se recomenda animação gratuita, pontuação de saúde, competição entre bairros ou novos indicadores sem validação. Novas geometrias, calibração e dados dependem da trilha de método/dados; este relatório não antecipa sua conclusão.

O único arquivo criado por este agente é `docs/reviews/2026-10-31-interatividade.md`, via `apply_patch`. Foram conferidos conteúdo, caminhos de evidência e presença dos campos observação, proposta, benefício, impacto/esforço, dependência, risco e aceite nas oito melhorias. Alterações concorrentes no repositório foram preservadas; não houve atualização de STATUS, testes da aplicação, commit ou deploy.
