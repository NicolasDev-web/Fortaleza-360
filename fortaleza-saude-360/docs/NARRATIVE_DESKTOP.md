# Jornada narrativa no computador — SDD-058

Pedido: facilitar a leitura por pessoas não técnicas, começando pelo contexto e permitindo aprofundar a partir de uma pergunta. Foco em desktop; telas menores receberam proteção contra regressão, sem uma nova direção mobile.

## Sequência de uso

1. **Conhecer a cidade.** Na primeira visita sem seleção compartilhada, a História ocupa uma área própria ao lado do mapa. Os seis capítulos apresentam contexto, bairros, postos, uma escolha participativa, limites das estimativas e próximos caminhos. Cada capítulo tem um foco; a pessoa pode avançar, voltar ou pular.
2. **Escolher um lugar conhecido.** No capítulo “Seu bairro”, a escolha aproxima o mapa e produz uma frase com a contagem real da lista de postos. A seleção acompanha a pessoa até a exploração ou entra como A na comparação. Não há um número de exemplo gravado na narrativa.
3. **Ler uma resposta.** Explorar começa com “Comece pelo seu bairro”. Depois de uma seleção, um resumo aparece junto ao mapa e “Ver detalhes” leva o foco à ficha. Números da cidade, camadas/fontes e explicações completas abrem sob demanda.
4. **Fazer outra pergunta.** “Comparar este bairro” preenche A, impede repetir o mesmo bairro em B e enquadra os dois quando a dupla é escolhida. Uma síntese descreve diferenças; tabela, faixas e CSV permanecem disponíveis. Não há vencedor, nota de qualidade ou prioridade de implantação.
5. **Experimentar uma hipótese.** Simular prioriza escolher o ponto no mapa e interpretar o ganho estimado. Coordenadas, tabela de 10/20/30 minutos e cenários salvos têm aberturas próprias. O resumo ao lado do mapa indica o cálculo atual; “Ver resultado” leva à explicação. Mudança de ponto, limpeza ou erro invalida o resumo anterior.

A preferência de História já vista continua a mesma; quem retorna pode reabri-la pela aba ou pelo convite em Explorar. Um link de seleção continua abrindo o lugar correspondente. A busca durante a História leva à exploração, para que a seleção tenha uma ficha visível.

## Forma visual e linguagem

Preservados Mocha/Indigo/Wisteria, Bricolage/Space Grotesk e a identidade de Fortaleza. O desktop tem duas áreas: História + mapa; depois mapa + leitura. O painel permanente de configurações saiu da primeira leitura e pode ser aberto no cabeçalho do mapa. Abas de leitura mantêm rótulos visuais; números gerais têm espaço suficiente para todos os dígitos. O enquadramento em 1280×720 também recebe tratamento de altura para a abertura da História.

As ações dizem o que acontece: escolher bairro, conhecer este bairro, comparar, ver detalhes, ver resultado. Foco se move por ação explícita e a posição de leitura é recuperada; não há rolagem automática de resultado apenas porque uma tarefa terminou. Teclado e movimento reduzido preservados; as setas de um select não trocam os capítulos.

## Precisão preservada

- Contagem no limite de bairro não mede acesso, lotação ou atendimento. Ano da lista e fonte permanecem na ficha e no contexto correspondente.
- População por bairro continua derivada do Censo 2022, com as mesmas faixas e denominadores. Contas auxiliares podem ser abertas na ficha.
- A História distingue cobertura agregada em corredores da população atribuída/atendida por cada unidade. O simulador não mede vagas nem trajetos cronometrados.
- Distância em linha reta continua identificada como aproximação, sem virar tempo de caminhada. Velocidades, conectores, buffer, paridade e os 14 arquivos públicos permanecem inalterados.
- Guardados somente os estados já autorizados: preferência da História e cenários salvos por ação explícita. Não foram adicionados analytics, APIs externas, login ou transmissão de coordenadas.

## Verificação

Testes de integração cobrem seleção participativa, passagem para A, leitura descritiva, busca e detalhamento sob demanda. Teste do Worker verifica que resultado antigo não reaparece no resumo ao mudar de ponto. E2E verifica caminho completo da História à comparação, enquadramento dos dois bairros, foco de “Ver detalhes/resultado”, leitura progressiva e dígitos em 1280 px. Fluxos anteriores de mapa, exportação, simulação, persistência local, falhas HTTP e privacidade fazem parte da regressão.

Resultados finais, comandos e limitações são registrados em `sdd/STATUS.md` e na tarefa 058. Capturas e métricas são de laboratório; não substituem uma rodada com moradores ou pesquisa moderada de compreensão. A melhoria da estrutura não comprova, sozinha, uma taxa de sucesso ou entendimento da população.
