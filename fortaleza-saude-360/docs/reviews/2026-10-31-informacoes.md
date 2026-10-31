# Revisão de informações e dados — Fortaleza Saúde 360

Data de verificação: **31/10/2026**. Responsável: agente 2, pesquisa de informações. Escopo: oportunidades de dados; UX e síntese geral pertencem aos outros agentes.

## Resultado e prioridades

As três inclusões recomendadas são **transporte público próximo das unidades**, **policlínicas municipais em camada própria** e **perfil etário agregado do Censo 2022**. As duas primeiras têm recursos oficiais abertos e inspecionados nesta revisão; a terceira tem arquivo identificado e dicionário efetivamente aberto, mas ainda exige ingestão e validação. Nenhuma está implementada por este relatório.

| Ordem | Inclusão | Valor / esforço estimados | Dependências e bloqueios concretos |
|---|---|---|---|
| 1 | Estações de metrô/VLT e terminais próximos | Alto / baixo a médio | GeoJSON 340 e 577 disponíveis; recortar Fortaleza, validar coordenadas e IDs, registrar manifesto. Distância inicial deve ser explicitamente em linha reta. Tempo a pé exige conectores e novo cálculo; transporte coletivo completo exige outra fonte de itinerários/horários. Paradas 548, de 2022, ficam como complemento histórico, não como rede atual. |
| 2 | Quatro policlínicas municipais | Alto / baixo | Filtrar `tipo_equipamento=POLICLÍNICA` na camada 658, revisar os quatro pontos, criar categoria e contagem separadas. Endereços são apenas logradouros, sem número; cadastro não informa carteira de serviços ou acesso por encaminhamento. Não incorporar CAPS junto sem resolver divergências. |
| 3 | Composição etária por bairro, referência 2022 | Alto / médio | Novo ETL do agregado demográfico, conferência do universo e do código setorial, tratamento de sigilo/nulos, validação de totais e agregação territorial com incerteza. Termos específicos de reutilização **NÃO CONFIRMADOS**; essa pendência permanece com o agente principal. Não há cálculo local de indicadores novos nesta revisão. |

As estimativas de esforço são qualitativas de planejamento; não são prazo contratado. “Pronta para protótipo” abaixo significa que o recurso e os campos necessários foram conferidos, com tratamento leve ainda necessário. Não significa atualização em tempo real, publicação autorizada ou mudança entregue.

## Base da análise e alcance da conferência

Foram lidos `AGENTS.md` da raiz e da aplicação, `README.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATA_SOURCES.md`, `docs/READINESS.md`, `docs/DATA_MODEL.md`, `docs/POPULATION.md`, `docs/PRIVACY_ETHICS.md` e tarefas SDD-025/029/050. Foram consultados os contratos e arquivos públicos existentes, inclusive propriedades de unidades e manifesto. As funcionalidades já presentes informadas pelo usuário foram consideradas entregues, e não entram como sugestões novas.

O domínio publicado respondeu HTTP 200 em leitura direta. Não houve navegação interativa nem auditoria visual. O inventário funcional parte do repositório e dos documentos; não certifica paridade completa de cada arquivo com o deployment. A skill graphify foi lida; não há `graphify-out/graph.json` na raiz nem na aplicação, e não foi gerado grafo ou artefato adicional.

As consultas HTTP usaram somente recursos públicos institucionais, sem autenticação, API paga ou contato com terceiros. Os downloads de conferência ficaram em memória. Não foram acessados registros de pacientes, microdados de pessoas nem endereços residenciais individuais.

### O que foi efetivamente aberto

| Recurso oficial | Conferência efetiva em 31/10/2026 | O que continua sem validação |
|---|---|---|
| [Documentação e termos da API Fortaleza em Mapas](https://mapas.fortaleza.ce.gov.br/dados-abertos/api) | Página aberta; API sem token; reutilização com atribuição expressamente prevista | Não há identificador CC/SPDX; estabilidade futura não é garantida |
| [Catálogo JSON da API](https://mapas.fortaleza.ce.gov.br/api/v1/maps) | JSON integral aberto por HTTP, com IDs, fonte e ano | Não equivale a abrir todos os recursos listados |
| [Equipamentos de saúde, GeoJSON 658](https://mapas.fortaleza.ce.gov.br/api/v1/geojson?id=658&download=true) | 179 pontos: 134 UAPS, 25 CAPS, 4 policlínicas, 6 UPA e 10 hospitais. Campos `nome`, `endereco`, `cep`, `regional`, `bairro`, `fonte`, `tipo_equipamento` | Endereço só preenchido em quatro policlínicas e sem número. Os quatro CEP preenchidos contêm “Sem informação”. Nenhum campo de telefone, horário ou serviços |
| [CAPS, GeoJSON 11](https://mapas.fortaleza.ce.gov.br/api/v1/geojson?id=11&download=true) | 25 pontos; campos de identificação, tipo e ano. `caps`: 5 AD, 6 geral, 1 infantil e 13 com texto literal `null` | Página descritiva ainda menciona 15 centros. Não foi resolvida a divergência nem validado funcionamento 24h a partir de nomes |
| [Paradas, GeoJSON 548](https://mapas.fortaleza.ce.gov.br/api/v1/geojson?id=548&download=true) | 4.672 pontos; `stop_id`, `nome_parad`, `lat`, `long`, `ano_ref=2022` | Continuidade das paradas, itinerários, frequências, abrigo e acessibilidade não confirmados |
| [Terminais, GeoJSON 577](https://mapas.fortaleza.ce.gov.br/api/v1/geojson?id=577&download=true) | 11 pontos; `id_parada`, `nome_parad`, `tipologia`, `Ano=2024` | Mudanças posteriores e condições operacionais não confirmadas |
| [Estações, GeoJSON 340](https://mapas.fortaleza.ce.gov.br/api/v1/geojson?id=340&download=true) | 42 pontos: atributo municipal indica 33 em Fortaleza, 5 em Maracanaú, 1 em Pacatuba e 3 em Caucaia. `estao`, `linha`, `tipo`, `status`, `municipio`, `sistema`, `ano=2026`; todos com status cadastral “EM OPERAÇÃO” | Recorte espacial contra limite municipal e operação efetiva no momento da visita não verificados |
| [Ciclovias, GeoJSON 578](https://mapas.fortaleza.ce.gov.br/api/v1/geojson?id=578&download=true) | 176 LineStrings; `id_ciclo`, `name`, `tipologia`, `trecho`, `pavimento`, `protegida`, separação física e implantação | Estado de conservação, conectividade, segurança e adequação clínica não medidos; `id` nulo na primeira feição |
| [Faixas elevadas, GeoJSON 832](https://mapas.fortaleza.ce.gov.br/api/v1/geojson?id=832&download=true) | 141 MultiPoints; `id`, `name`, `local`, `data`, `fonte`, `ano=2026`; página de metadados também aberta por HTTP | Não é inventário completo de calçadas, rampas ou travessias; significado exato de `data` exige checagem |
| [Índice de agregados censitários](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/Agregados_por_Setor_csv/) e [dicionário XLSX de 20/05/2026](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/dicionario_de_dados_agregados_por_setores_censitarios_20260520.xlsx) | Índice e planilha abertos; lidas definições de demografia e saneamento | ZIPs demográfico e domiciliar não foram baixados nem apurados para Fortaleza |
| [Índice do entorno](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios_Caracteristicas_urbanisticas_do_entorno_dos_domicilios/Agregados_por_Setor_csv/) e [dicionários ZIP](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios_Caracteristicas_urbanisticas_do_entorno_dos_domicilios/dicionarios_de_dados_entorno.zip) | Índice aberto; ZIP aberto em memória e três XLSX lidos: domicílios, faces, pessoas | CSVs nacionais e cobertura local não apurados; não há métrica calculada nesta revisão |
| [Comunicado municipal de 28/10/2026](https://fortaleza.ce.gov.br/noticias/prefeitura-informa-funcionamento-dos-servicos-publicos-durante-ponto-facultativo-do-dia-do-servidor-30-10-e-feriado-de-finados-2-11) | Texto aberto, com vigência 30/10–02/11, serviços e horários excepcionais | A identificação nominal dos onze postos não aparece no texto extraído; banner não foi transcrito |

As páginas de resultados do IBGE alternaram resultados indexados com HTTP 403 na abertura direta. A confirmação de arquivos e variáveis acima veio dos índices FTP e dos dicionários abertos, não de uma inferência sobre notícias. O PDF municipal de endereços de 2025 foi localizado na busca oficial, mas não foi baixado nem reconciliado. Ciclofaixas 819 e ciclorrotas 576 foram vistas no catálogo; seus GeoJSON **não** foram inspecionados. Não foi procurado exaustivamente um GTFS ou API operacional alternativa.

## Regras transversais de fonte e uso

Para recursos obtidos pela API municipal, os [termos conferidos](https://mapas.fortaleza.ce.gov.br/dados-abertos/api) permitem utilização, cópia, extração e reprodução com citação da fonte. Registrar os termos próprios, sem convertê-los em CC BY. Atribuição indicada pela API: “Fonte: Prefeitura Municipal de Fortaleza - Fortaleza em Mapas (Ipplan Fortaleza). Acesso via API de Dados Abertos.”

Para publicações HTML/PDF da Prefeitura, os termos dessa API não foram estendidos por analogia: licença de reprodução **NÃO CONFIRMADA**. Preferir um link à página oficial e resumo factual curto enquanto isso. Para os novos arquivos IBGE, os termos específicos permanecem **NÃO CONFIRMADOS**. A condição de download público não foi tratada como licença, e este relatório não tenta resolver a pendência existente do projeto.

Toda futura ingestão deverá registrar órgão, URL de página e recurso, referência, atualização de catálogo, data de coleta, checksum, licença e dicionário. Ano de catálogo, data de implantação, competência e data de observação são coisas distintas. Nos pontos municipais, textos antigos sobre EPSG:31984 coexistem com coordenadas GeoJSON aparentes em longitude/latitude: validar a saída contra o contrato RFC 7946, sem reprojetar números indiscriminadamente.

## Nove oportunidades concretas

### 1. Endereço institucional e canal oficial de cada unidade

- **Pergunta:** “Qual é o endereço textual desta unidade e onde confirmo informações antes de ir?”
- **Informação / produto:** ficha com endereço, complemento, contato institucional e link oficial, cada campo com fonte e data próprias; “não informado” onde faltar. Não criar telefone a partir de busca geral ou extrapolar horário padrão.
- **Fonte / órgão:** SMS/Prefeitura, [camada 658 e metadados](https://mapas.fortaleza.ce.gov.br/mapa/658/equipamentos-de-saude), referência 2026, catálogo atualizado em 23/06/2026. O [PDF oficial localizado de endereços de 2025](https://www.fortaleza.ce.gov.br/images/07/09_05_2025_Lista_postosdesaude-2025.pdf) é somente candidato histórico; arquivo e data interna não conferidos. A [lista institucional de postos](https://saude.fortaleza.ce.gov.br/index.php/home/15-postos-de-saude/86-lista-de-postos) retornou mensagem de solicitação negada.
- **O que existe:** na 658, só quatro policlínicas têm logradouro; UAPS não têm endereço preenchido. Não existem campos de contato, horário ou carteira de serviços nesse recurso. Portanto, “o catálogo lista endereço” não significa preenchimento disponível.
- **Granularidade / chave:** estabelecimento. A 658 não oferece CNES; vincular a unidades existentes exigiria correspondência revisada por nome, coordenada e bairro. CNES de outra fonte também não deve ser chave exclusiva, pois o projeto já documenta duplicidade. Bairro administrativo não é território de atendimento.
- **Acesso / licença:** API gratuita, sem chave, termos municipais verificados; PDF/HTML gratuitos, licença **NÃO CONFIRMADA**. Sem consulta a cadastro pessoal.
- **Limites / esforço / valor:** endereço sem número não é destino completo; lista de 2025 não confirma endereço vigente. Apenas contato institucional, nunca celular pessoal de trabalhador. **Valor alto; esforço médio; exige nova fonte/checagem para UAPS.** Protótipo imediato pode oferecer o link oficial, mas não prometer uma ficha completa.

### 2. Avisos oficiais de funcionamento e serviços com validade explícita

- **Pergunta:** “Existe uma alteração oficial de funcionamento neste feriado?”
- **Informação / produto:** cartão “Comunicado oficial”, publicação, intervalo de validade, escopo e link. Expirar automaticamente ao terminar a vigência; o horário divulgado não assegura atendimento, estoque, vaga nem execução de todo serviço.
- **Fonte / órgão / tempo:** [Prefeitura/SMS, comunicado publicado em 28/10/2026](https://fortaleza.ce.gov.br/noticias/prefeitura-informa-funcionamento-dos-servicos-publicos-durante-ponto-facultativo-do-dia-do-servidor-30-10-e-feriado-de-finados-2-11). Texto conferido: vigência 30/10–02/11; nove postos com serviços e horário de 8h–17h e dois exclusivamente para vacinação, 8h30–16h30. Há diferença de funcionamento das policlínicas entre sexta e segunda. Esta informação não permite identificar nominalmente os onze postos pelo texto extraído.
- **Granularidade / chave:** comunicado municipal + período; associar a unidade somente quando ela estiver identificada inequivocamente. Sem essa identificação, mostrar aviso geral, nunca marcar todas as UAPS como abertas.
- **Acesso / licença:** HTML público gratuito, sem chave; API estruturada de avisos não identificada; licença de reprodução **NÃO CONFIRMADA**. Um link com metadados mínimos é o protótipo mais viável.
- **Limites / esforço / valor:** exige manutenção editorial e expiração; campanhas e serviços têm horários diferentes. Não guardar solicitação clínica, usuário ou histórico de consultas. **Valor alto para uso cotidiano; esforço inicial baixo e manutenção recorrente média. Pronta para protótipo como link datado; ingestão por unidade pendente.** Desaconselhado “Aberto agora” obtido apenas de horário genérico.

### 3. Rede complementar: policlínicas e, depois de revisão, CAPS

- **Pergunta:** “Que outros equipamentos municipais existem na região, além dos já mapeados?”
- **Informação / produto:** camada optativa com nomes e tipos; policlínicas e CAPS separados. Ficha explicita que cadastro não demonstra atendimento disponível ou acesso sem encaminhamento. Manter essas camadas fora dos indicadores e cenários de UAPS.
- **Fonte / órgão / tempo:** SMS, [equipamentos 658](https://mapas.fortaleza.ce.gov.br/mapa/658/equipamentos-de-saude), 2026, atualização de catálogo 23/06/2026; [CAPS 11](https://mapas.fortaleza.ce.gov.br/mapa/11/caps-centros-de-assistencia-psicossocial), 2026, atualização 08/06/2026. Recursos efetivamente abertos na tabela de evidência.
- **Campos / granularidade / chave:** pontos de equipamento, `nome`/`tipo_equipamento` na 658, e `id`, `equipament`, `caps`, `ano` na 11. Criar ID com namespace da fonte e chave estável verificada; na 658, não depender do identificador transitório de feição do servidor. Associar bairro por posição após verificar limites.
- **Acesso / licença:** GeoJSON gratuito sem chave; termos da API verificados. A camada geral contém outros tipos já existentes no app; filtrar apenas o acréscimo evita duplicação.
- **Limites / esforço / valor:** **policlínicas: valor alto, esforço baixo, pronta para protótipo dos quatro pontos** com revisão geográfica. **CAPS: exige checagem, esforço médio**: 25 feições contra descrição de 15, e 13 tipos com texto `null`. Não inferir subtipos ou 24h pelo nome. Publicar somente equipamentos de acesso público; eventual serviço residencial protegido não deve ganhar localização detalhada sem avaliação. Não coletar dados de usuários de saúde mental.

### 4. Transporte público próximo: estações, terminais e paradas históricas

- **Pergunta:** “Há estação ou terminal próximo deste equipamento?”
- **Informação / produto:** camada optativa e ficha com estação/terminal mais próximo e distância em linha reta rotulada. Depois, caminhada pela rede com validação de entrada e conectores. Link para orientação institucional sobre transporte, sem anunciar tempo de viagem coletivo.
- **Fonte / órgão / tempo:** METROFOR, [estações 340](https://mapas.fortaleza.ce.gov.br/mapa/340/estacoes-de-metro-e-vlt), 2026, catálogo 09/06/2026; ETUFOR, [terminais 577](https://mapas.fortaleza.ce.gov.br/mapa/577/terminais-de-onibus), 2024, catálogo 27/06/2024; ETUFOR, [paradas 548](https://mapas.fortaleza.ce.gov.br/mapa/548/pontos-de-onibus), **2022**, catálogo 26/06/2023. Os três GeoJSON foram abertos.
- **Campos / chave / território:** estação, linha, status e município; terminal por `id_parada`, nome e tipologia; parada por `stop_id` e nome. Validar unicidade. A camada de estações inclui municípios vizinhos: filtrar atributo e conferir posição; opção metropolitana deve ser expressa. Usar pontos, não join por nome de bairro.
- **Acesso / licença:** arquivos gratuitos sem chave, termos municipais verificados. A API não fornece GTFS, partidas ou frequência nesses recursos. A recomendação municipal atual de consultar o aplicativo Meu Ônibus foi confirmada no comunicado de 28/10, sem abrir app ou ativar integração.
- **Limites / esforço / valor:** proximidade não garante linha útil, integração, acessibilidade, abrigo ou serviço naquele momento. Não transmitir posição do visitante a terceiro. **Valor alto, esforço baixo a médio; pronta para protótipo de estações/terminais.** Paradas de 2022 exigem nova checagem para serem apresentadas como rede vigente. Roteador coletivo e previsão de chegada desaconselhados com esses arquivos.

### 5. Infraestrutura cicloviária nas proximidades

- **Pergunta:** “Que infraestrutura cicloviária está mapeada perto da unidade?”
- **Informação / produto:** linhas de ciclovias por tipo, trecho e material; eventualmente distância do equipamento à linha. Preservar separação entre infraestrutura existente e projetada; não oferecer “melhor rota segura” ou tempo de bicicleta com o grafo pedonal.
- **Fonte / órgão / tempo:** SCSP, [ciclovias 578](https://mapas.fortaleza.ce.gov.br/mapa/578/ciclovias), referência 2026 e catálogo 03/06/2026. O GeoJSON foi aberto e tem 176 trechos. Ciclofaixas 819 e ciclorrotas 576 são apenas oportunidades de catálogo nesta revisão; não compõem esse total.
- **Campos / chave / território:** `id_ciclo`, `name`, `trecho`, `tipologia`, `pavimento`, `protegida`, separação e implantação. `id_ciclo` pode identificar infraestrutura multipartida; validar composição de chave em vez de supor unicidade. Recortar linhas contra município e calcular comprimentos em projeção métrica, sem somar texto decimal com vírgula como se fosse número padronizado.
- **Acesso / licença:** GeoJSON gratuito sem chave; termos da API verificados.
- **Limites / esforço / valor:** datas de implantação diferem do ano do catálogo. Separação física cadastrada não comprova conservação, continuidade ou segurança do trajeto. Não associar escolha modal a aptidão ou condição clínica individual; sem novas informações pessoais. **Valor médio, esforço baixo a médio; pronta para protótipo descritivo de ciclovias, exige outro modelo para rotas.**

### 6. Travessias elevadas próximas das unidades

- **Pergunta:** “Que intervenções para travessia estão cadastradas no entorno?”
- **Informação / produto:** camada de pontos de travessia elevada, com local e fonte, eventualmente contagem dentro de um raio explicitado. Serve como inventário visível, não certificação de acessibilidade nem componente automático de tempo.
- **Fonte / órgão / tempo:** AMC, [faixas elevadas 832](https://mapas.fortaleza.ce.gov.br/mapa/832/faixas-elevadas), 2026, catálogo 12/06/2026. Página acessível por HTTP direto apesar da falha no leitor web; GeoJSON aberto: 141 MultiPoints.
- **Campos / chave / território:** `id`, `name`, `local`, `data`, `fonte`, `ano`. Validar número de coordenadas por MultiPoint antes de converter; chave com namespace 832. Conferir posição no limite municipal, proximidade à unidade e se o ponto representa projeto ou intervenção individual.
- **Acesso / licença:** GeoJSON gratuito, sem chave; termos da API verificados. Camada antiga 528 existe no catálogo, mas não foi aberta; não somar as duas por risco de duplicidade.
- **Limites / esforço / valor:** interpretação de `data` e eventual duplicação de projetos pendentes. Ausência de ponto não significa ausência de travessia; presença não demonstra rampas e percurso contínuo para cadeira de rodas. Sem coleta de deslocamentos pessoais. **Valor médio, esforço médio; exige checagem de semântica e duplicatas antes de publicar contagens.**

### 7. Perfil etário agregado, com referência histórica explícita

- **Pergunta:** “Como se distribuem as faixas etárias no bairro no Censo 2022?”
- **Informação / produto:** composição por 0–14, 15–59 e 60 anos ou mais em ficha/Comparar, com contagem, percentual, denominador e ano. Usar barras comparáveis; não transformar composição demográfica em prioridade assistencial ou demanda prevista.
- **Fonte / órgão / tempo:** IBGE, [arquivo demográfico identificado no índice oficial](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/Agregados_por_Setor_csv/Agregados_por_setores_demografia_BR.zip), modificação do índice em 12/11/2024, **referência Censo 2022**. O ZIP não foi baixado. O [dicionário de 20/05/2026](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/dicionario_de_dados_agregados_por_setores_censitarios_20260520.xlsx) foi aberto: `V01006` quantidade de moradores; `V01031–V01033` 0–14; `V01034–V01039` 15–59; `V01040` 60–69 e `V01041` 70+. Universo e totais ainda devem ser confrontados com a nota metodológica e o CSV.
- **Granularidade / chave / território:** setor censitário definitivo 2022; confirmar nome/formato da coluna de código no CSV e unir ao `CD_SETOR` de 15 dígitos, filtrando Fortaleza `2304400`. Agregar aos bairros municipais com o crosswalk já documentado e incerteza; não substituir por bairros IBGE diretamente nem assumir mesma distribuição por idade dentro de setores cortados.
- **Acesso / licença:** HTTPS gratuito, sem chave; processamento nacional offline. Termos específicos **NÃO CONFIRMADOS**.
- **Limites / esforço / valor:** não é população atual de 2026; não projetar faixas por regra simples nem inferir necessidade clínica. Publicar agregados amplos por bairro, respeitando supressão e células ausentes, sem reidentificação. **Valor alto, esforço médio; exige novo ETL/checagem e encaminhamento da pendência de termos.**

### 8. Barreiras urbanas agregadas: calçada, obstáculos, rampas e iluminação

- **Pergunta:** “Que condições do entorno residencial ajudam a contextualizar a acessibilidade geográfica calculada?”
- **Informação / produto:** painel separado com percentuais de domicílios em faces sem calçada, com obstáculo ou sem rampa, sempre com universo observado e não declarado. Mostrar ao lado da cobertura, sem alterar os tempos já publicados ou atribuir o indicador à porta da unidade.
- **Fonte / órgão / tempo:** IBGE, Censo 2022, divulgação dos agregados do entorno em 17/04/2025. [Índice CSV](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios_Caracteristicas_urbanisticas_do_entorno_dos_domicilios/Agregados_por_Setor_csv/) e [ZIP de dicionários](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios_Caracteristicas_urbanisticas_do_entorno_dos_domicilios/dicionarios_de_dados_entorno.zip) abertos. Recurso identificado: [domicílios](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios_Caracteristicas_urbanisticas_do_entorno_dos_domicilios/Agregados_por_Setor_csv/Agregados_por_setores_entorno_domic%C3%ADlios_BR.zip), não baixado. Há arquivos distintos de moradores e faces; não misturar denominadores.
- **Campos confirmados no dicionário:** `V05021/22/23` = domicílios em face com calçada sim/não/não declarado; `V05024/25` = obstáculo sim/não; `V05012/13/14` = iluminação sim/não/não declarado. Existência das famílias de rampa foi conferida na leitura dos dicionários, mas seus códigos não foram registrados aqui; selecionar e validar no ETL.
- **Granularidade / chave / território:** agregados por setor nos setores escolhidos para a pesquisa urbanística. Verificar chave efetiva no CSV, cobertura de Fortaleza e equivalência à malha 2022; ausência fora do universo não é zero. Para bairros, somar numeradores e denominadores antes de dividir, explicando aproximação nos setores cortados.
- **Acesso / licença / limites:** download público gratuito; termos **NÃO CONFIRMADOS**. Condição residencial observada em 2022 não certifica trajeto contínuo acessível em 2026. Exibir agregados; não inferir deficiência ou mobilidade de pessoas. **Valor alto para pesquisa; esforço médio a alto; exige ETL, universo e termos.** Desaconselhado rotular trajetos “acessíveis para cadeirante” com esse material.

### 9. Contexto domiciliar de água e esgotamento

- **Pergunta:** “Como as condições domiciliares de infraestrutura se distribuem entre os bairros no Censo 2022?”
- **Informação / produto:** bloco de contexto territorial no Comparar com contagem e proporção de domicílios sem água encanada e categorias de destino do esgoto. Rótulos devem seguir definições da fonte; não produzir índice clínico ou “risco de doença” por bairro.
- **Fonte / órgão / tempo:** IBGE, [Características do domicílio — parte 2](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/Agregados_por_Setor_csv/Agregados_por_setores_caracteristicas_domicilio2_BR_20250417.zip), referência 2022, versão nomeada 17/04/2025. Recurso identificado no índice, não baixado. Definições abertas no [dicionário de 20/05/2026](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/dicionario_de_dados_agregados_por_setores_censitarios_20260520.xlsx): `V00201` água não chega encanada ao domicílio; `V00309` esgoto em rede geral ou pluvial; `V00312` fossa rudimentar/buraco; `V00313` vala; `V00314` rio/lago/córrego/mar. Denominador de domicílios particulares permanentes ocupados precisa ser selecionado e reconciliado no ETL.
- **Granularidade / chave / território:** setor 2022, chave do CSV a confirmar e compatibilizar com `CD_SETOR`; agregação municipal por crosswalk, sem join nominal de bairros. Comparar proporções com o mesmo universo, sem usar população total como denominador de domicílios.
- **Acesso / licença:** ZIP/HTTPS gratuito sem chave; termos específicos **NÃO CONFIRMADOS**. Não confundir a revisão de 21/10/2026 da parte 1 com atualização desta parte 2 ou da população básica.
- **Limites / esforço / valor:** “rede geral ou pluvial” não significa esgoto tratado; não chamar toda categoria distinta de rede de “inadequada” sem definição metodológica. Foto histórica, sem evidência causal ou informação individual. Evitar cruzamentos finos de categorias sensíveis. **Valor médio a alto, esforço médio; exige ETL, denominadores e termos.**

## Propostas desaconselhadas com as evidências disponíveis

- Fila, vagas, leitos utilizáveis, equipes disponíveis, estoque e “capacidade de atendimento” inferidos de cadastro, contagem de unidades, população ou comunicados de inauguração.
- Horário permanente, serviço por unidade ou “aberto agora” extrapolados de campanha, nome de CAPS ou uma notícia geral. Endereço e cadastro tampouco asseguram atendimento.
- Tempo de ônibus, frequência ou previsão de chegada inferidos da distância a paradas de 2022; GTFS aberto vigente não foi confirmado nesta revisão.
- Rota acessível ou segura certificada por indicador setorial de 2022, faixa elevada cadastrada ou atributo `protegida` de ciclovia.
- Ranking de prioridade assistencial baseado em idade, raça, renda ou infraestrutura; cruzamento de pontos pessoais com diagnósticos; publicação de localidades de acolhimento protegido sem avaliação específica.

## Próximos passos propostos para o agente principal

Abrir microtarefas independentes para transporte, policlínicas e demografia, nessa ordem. Para transporte e policlínicas, a aprovação da proposta pode se apoiar nos recursos efetivamente abertos; ainda são necessários manifesto, contratos, validação territorial, estados ausentes e testes quando houver implementação. Para demografia, primeiro validar uma extração de Fortaleza e a semântica do denominador; não inserir novos números na aplicação antes disso.

Campos futuros devem conservar proveniência individual quando vierem de fontes diferentes. Falhas no portal devem manter último instantâneo identificado e estado de indisponibilidade; nunca consultar serviços externos automaticamente a partir da localização pessoal do visitante. A busca desta revisão foi encerrada após confirmação razoável dos recursos verificáveis e registro das pendências, sem tentar contornar bloqueios institucionais.

## Entrega e verificação

Único arquivo produzido por este agente: `docs/reviews/2026-10-31-informacoes.md`, por `apply_patch`. Nenhuma aplicação, base pública, configuração, SDD/STATUS, commit ou deployment foi alterado. Não foram executados lint/typecheck/build, pois a entrega é somente uma revisão documental e não conclui tarefa de implementação. As evidências são as leituras locais, consultas web oficiais e inspeções HTTP de recursos descritas acima; não são homologação dos dados para uso operacional.
