# Registro das fontes — verificar licença e versão no momento da coleta
| Tema | Fonte pública | Conteúdo | Uso | Observações |
|---|---|---|---|---|
| Localização UAPS | https://mapas.fortaleza.ce.gov.br/mapa/824/unidades-de-atencao-primaria-a-saude-uaps | Pontos UAPS, campos nome/natureza/gestão/atende_sus/bairro; fonte SMS, ano 2026, atualização exibida 2026-06-08 | pontos principais | Verificar download real, licença, qualidade e coordenadas |
| Equipamentos, UPA, hospitais e setores | https://mapas.fortaleza.ce.gov.br/catalogo | GeoJSON, Shape, CSV, KMZ | camadas e limites | Incluir fonte e data por camada; geometria e licença variam |
| Dados SMS | https://dados.fortaleza.ce.gov.br/organization/sms | Bases complementares | conferência | Verificar data e chave de junção |
| Estabelecimentos SUS | https://apidadosabertos.saude.gov.br/ | CNES, profissionais, equipamentos | complementar | Cadastro não é disponibilidade real; conferir contratos e atualização |
| População | https://www.ibge.gov.br/estatisticas/sociais/populacao/22827-censo-demografico-2022.html | Censo 2022 | denominadores | Cruzamento por geografia compatível; considerar defasagem |
| Malhas | https://www.ibge.gov.br/geociencias/organizacao-do-territorio/estrutura-territorial/26565-malhas-de-setores-censitarios-divisoes-intramunicipais.html | Setores e áreas | polígonos | conferência topológica, CRS |
| Vias | https://www.openstreetmap.org/copyright | ruas e caminhos | rotas / acessibilidade P2 | atribuição e licença ODbL, checar implicações para derivados |

**Regras:** jamais misturar edição 2026 UAPS com população 2022 sem explicitar; não imputar setor sem interseção apropriada; dados de saúde por paciente NÃO entram no MVP; gravar em `public/data/manifest.json`: origem, URL, data_ref, coletado_em, arquivo, checksum, licença, metodologia e limitações.
