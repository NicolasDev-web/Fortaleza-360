# Direção visual

Estilo: estação de investigação geoespacial premium, legível e orientada ao mapa. A interface usa uma barra de contexto, filtros compactos à esquerda, superfície territorial central e leituras metodológicas à direita. Arredondamento diferencia instrumentos, agrupamentos e estados; não deve transformar todo conteúdo em cards equivalentes.

## Tokens principais

- Canvas: Prussian Blue `#001D4A`, com derivação profunda `#001331`.
- Superfícies: Yale Blue `#27476E` e transparências sobre o canvas.
- Seleção e profundidade: Cerulean `#006992`.
- Texto e realce: Cream `#EAF8BF`, combinado com branco suave para leitura longa.
- Avisos DEMO e atenção: Amber Honey `#ECA400`.
- Raios: `12px`, `18px`, `26px` e `34px`, conforme a hierarquia do componente.
- Tipografia: `Segoe UI Variable`, `Segoe UI` e fallback `system-ui`; números usam alinhamento tabular.

## Princípios

O mapa é o instrumento visual dominante. Estados vazios explicam o próximo passo e nunca simulam geografia real. Controles ainda indisponíveis devem aparecer como somente leitura ou em preparação, sem sugerir interação funcional. No mobile, a leitura vira fluxo vertical e preserva primeiro o contexto, depois o mapa e as evidências.

Acessibilidade: contraste mínimo de 4.5:1 para texto, foco visível quando houver controles, navegação por teclado, legenda textual, informação nunca codificada apenas por cor e respeito a movimento reduzido. Imagens em `references/images` são **mockups originais**, não medições reais.
