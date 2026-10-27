# Direção visual — "Terra da Luz" (UX-002)

O observatório conta uma história antes de virar instrumento. A filosofia vem de **Storytelling com Dados** (Cole Nussbaumer Knaflic), e a identidade vem de Fortaleza: o sol da Terra da Luz, o mar e as jangadas, a renda de bilro e os folhetos de cordel. É escuro, profissional e local, sem caricatura.

## Storytelling com Dados aplicado

| Princípio | Como aparece |
|---|---|
| Entender o contexto (*Big Idea*) | Frase-tese no painel de leitura: "134 UAPS em 121 bairros: onde estão, não quanto atendem." Os números são calculados do modelo. |
| Escolher a visualização certa | Número grande + frase para valores isolados; mapa só para "onde"; nada de pizza ou 3D. |
| Eliminar a poluição | Bordas discretas, renda de bilro em 13% de opacidade, grade e alinhamento; o Índice fica em uma aba separada do Panorama. |
| Focar a atenção | Cinza como base e **uma** cor (Wisteria) para o foco de cada capítulo. O âmbar é raro e significa atenção: sol, foco de teclado, avisos e dados divergentes. |
| Pensar como designer | Títulos-conclusão em vez de rótulos genéricos; ações explícitas ("Enquadrar no mapa", "Rever a história"). |
| Contar uma história | Modo História em seis capítulos: Terra da Luz → A cidade → As portas de entrada → Onde o contorno não tem ponto → O que os dados não dizem → Sua vez. Lidos em sequência, os títulos resumem a narrativa. |

Os textos dos capítulos ficam em `lib/story.ts`, e testes impedem rótulos como "desassistido" ou "vulnerável". O capítulo dos contornos sempre traz a ressalva de que contagem por bairro não mede acesso.

## Paleta

| Token | Cor | Uso |
|---|---|---|
| `--deep-mocha` | `#322A26` | Canvas (entardecer, falésias) |
| `--twilight-indigo` | `#454B66` | Superfícies, mar e linhas |
| `--glaucous` | `#677DB7` | Seleção e dado secundário (só texto grande ou elemento de UI) |
| `--wisteria-blue` | `#9CA3DB` | Destaque único, UAPS, botões primários |
| `--signal` | `#ECA400` | Só funcional: sol, foco, avisos, divergências |
| Neutros derivados | `#F3EEE9`, `#D2CBC4`, `#B3ABA4`, `#1F1A17` | Texto e fundo profundo |

Contraste conferido em código (WCAG AA): todo texto sobre Mocha ou canvas profundo fica ≥ 5,5:1. Wisteria, âmbar e texto apagado sobre Indigo sólido ficam abaixo de 4,5:1 e **não** são usados em texto pequeno. Os tokens shadcn (`background`, `primary`, `muted`…) são mapeados para essa paleta via `@theme inline`.

## Tipografia e movimento

| Fonte | Uso |
|---|---|
| Bricolage Grotesque 700–800 | Títulos, frase-tese, nomes nas fichas |
| Space Grotesk 500–700 | Interface |
| JetBrains Mono 500–800 | Dados, telemetria, rótulos |
| Alfa Slab One | Só a numeração de folheto ("Nº 3") |

- `AnimatedHeading`: palavras surgem com desfoque e subida, e o título de abertura tem brilho de sol.
- `RollingNumber` (NumberFlow): dígitos rolam até o valor.
- Tudo respeita `prefers-reduced-motion`.

## Toques de Fortaleza

- **Sol e Terra da Luz:** sol nascendo do mar na abertura; gradiente de entardecer no fundo.
- **Farol:** um facho varre só o mar. É decorativo e não marca nenhum ponto geográfico.
- **Jangada e mar:** a marca é a vela de jangada com "F/360"; ondas animadas atrás da terra (o preenchimento opaco do município as cobre).
- **Renda de bilro:** textura de rosetas e fios pontilhados nos painéis e a `LaceDivider` com picôs.
- **Cordel:** selo "Nº" em Alfa Slab com sombra dura, filete duplo irregular e sombra de impressão nos títulos dos capítulos.

## Componentes de catálogo (adaptados, licença MIT)

| Origem | Arquivo | Uso |
|---|---|---|
| Watermelon `continuous-tabs` | `components/vendor/continuous-tabs.tsx` | Modos com pílula deslizante |
| Watermelon `feature-tour` | `components/vendor/feature-tour.tsx` | Modo História |
| Watermelon `labeled-progress-indicator` | `components/vendor/labeled-progress-indicator.tsx` | Progresso dos capítulos |
| Watermelon `list-stack` | `components/vendor/list-stack.tsx` | UAPS de um bairro |
| Watermelon `command-search` | incorporado a `components/CommandPalette.tsx` | Busca |
| useLayouts `discrete-tabs` | `components/vendor/discrete-tabs.tsx` | Panorama / Índice |
| useLayouts `filter-interaction` | `components/vendor/filter-interaction.tsx` | Índice de bairros |

Foram instalados com `npx shadcn add @watermelon/... @uselayouts/...` (registros em `components.json`) e depois reescritos:
- Props tipadas.
- ARIA de abas e de barra de progresso.
- Teclado.
- Ícones `lucide-react`.
- Português.

O Tailwind v4 entra só com `theme` e `utilities`, sem o reset global, para conviver com o CSS próprio.

## Acessibilidade

- Contraste AA, foco âmbar visível e skip link.
- O mapa é `role="img"`; o acesso por teclado passa pela busca (Ctrl+K) e pelo Índice.
- A história é uma região rotulada pelo título do capítulo: setas navegam, Esc fecha e o foco volta ao modo Explorar.
- Seleções são anunciadas em região `aria-live`.
- A história abre sozinha só na primeira visita (`localStorage`, com falha silenciosa) e nunca quando o link já traz uma seleção.
