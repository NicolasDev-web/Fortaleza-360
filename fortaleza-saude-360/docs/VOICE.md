# Voz e linguagem (UX-004)

O mantra da aplicação é o livro *Storytelling com Dados* (Cole Nussbaumer Knaflic). Quem abre o mapa pode ser um morador do Bom Jardim, uma estudante de saúde coletiva ou alguém da gestão. Todos precisam entender a tela em poucos segundos, sem perder a profundidade.

## Princípios

1. **Contexto primeiro.** Antes de mostrar o dado, diga para quem é e o que dá para fazer com ele.
2. **Uma grande ideia.** A tela inteira sustenta uma frase: *Fortaleza tem {n} postos de saúde para {n} bairros. Este mapa mostra onde cada um fica — e o que esses dados ainda não contam.*
3. **Título que já diz a conclusão.** "39 bairros não têm posto dentro do próprio limite" diz mais que "Distribuição por bairro".
4. **Menos ruído.** Uma ideia por frase. Nada de sigla solta. Não repita em texto o que o mapa já mostra.
5. **Foco.** Um número em destaque por bloco, sempre acompanhado do que ele significa.
6. **Começo, meio e fim.** Contexto, achado (com a tensão) e o convite: veja o seu bairro.

## Tom

Fale com "você", em frases curtas, com palavras do dia a dia. Seja direto sem ser frio: o tema é a porta de entrada do SUS na cidade.

## Honestidade não é opcional

- Toda ressalva continua visível, em palavras simples. Exemplo: "O mapa mostra onde fica o posto, não se ele está aberto ou lotado."
- Distância em linha reta é sempre chamada assim, com o selo **aproximação**. Nunca vira tempo, minutos ou percurso.
- Nenhum número é escrito à mão: todos vêm dos dados carregados.
- Detalhe técnico (código CNES, coordenada, número da camada, método, licença) fica em **Como sabemos disso**, aberto só por quem quiser.

## Glossário

| Evite | Use |
|---|---|
| UAPS, atenção primária | posto de saúde (UAPS) na primeira menção; depois, posto. "A porta de entrada do SUS." |
| Exploração territorial | Explore o mapa |
| Contornos oficiais, camada | limites dos bairros; o que mostrar no mapa |
| Associação ponto-no-polígono | o posto fica dentro do limite do bairro |
| Cadastro, cadastradas | lista oficial da Prefeitura |
| ref. 2019, referência | dados de 2019 |
| Proxy | aproximação (em linha reta, não é o caminho pelas ruas) |
| Não informado | a Prefeitura não informa |
| CNES, WGS 84, EPSG, catálogo | só em "Como sabemos disso" |

`tests/voice.test.tsx` falha se jargão da lista "Evite" aparecer no texto principal da tela.
