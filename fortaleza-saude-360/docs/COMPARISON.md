# Comparação de bairros (SDD-046)

O modo Comparar reutiliza a população da SDD-033, a aproximação de distância da SDD-032 e o CSV da SDD-034. Não calcula novas métricas de cobertura por bairro.

Dois seletores nativos A/B começam vazios e impedem selecionar o mesmo código. A tabela apresenta população do Censo 2022 e faixa de alocação, UAPS dentro do limite de 2019 no cadastro de 2026, moradores por posto com faixa, distância em linha reta do centro geométrico à UAPS mais próxima de toda a cidade e nome da unidade. Zero permanece zero; ausência de população ou rede aparece como indisponível. Sem posto no limite, a razão não é calculada; ainda pode existir uma UAPS próxima em outro bairro.

A usa contorno contínuo e B tracejado, acompanhados de letras, evitando depender apenas de cor. A camada de bairros controla a visibilidade dos contornos. Mostrar no mapa enquadra a união das extensões; Inverter troca a ordem sem mudar os números. O CSV contém exatamente duas linhas na ordem A/B, com o mesmo método, fontes, anos e licenças do exportador existente.

A dupla permanece apenas na memória da sessão do componente Observatory e não altera a seleção do Explorar. Não entra na URL, localStorage nem em requisições. Recarregar descarta a dupla. O download ocorre localmente.

Os números não classificam qualidade de serviço, vulnerabilidade nem capacidade. A distância do centro geométrico não representa a distância de todos os moradores nem minutos pelas ruas. Faixas de população expressam diferenças de alocação dos setores, não intervalos de confiança. As referências temporais e a licença IBGE ainda não confirmada permanecem acessíveis em Como sabemos disso e no CSV.

Validação: componentes cobrem seleção, duplicação, inversão, contornos, zero, ausência de população/rede e axe sem violações sérias/críticas (contraste exige inspeção visual). O E2E desktop/mobile usa Meireles e Jangurussu para conferir tabela, inversão, CSV de duas linhas, navegação por Tab e ausência de rolagem horizontal da página. Capturas locais em `test-results/comparison-*.png`.
