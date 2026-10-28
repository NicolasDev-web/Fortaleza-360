# Relatório de qualidade de dados — UAPS do portal × CNES

> Gerado por `scripts/check_cnes_divergence.py`. Não editar à mão: rode o script após cada coleta.

## Fontes comparadas

- **Portal municipal:** Fortaleza em Mapas, camada 824 (SMS), catálogo atualizado em 2026-06-08, coletado em 2026-10-27; arquivo `/data/facilities.geojson` (SHA-256 `c5142138b8e6…`).
- **CNES:** DATASUS/MS, arquivo `ftp://ftp.datasus.gov.br/dissemin/publicos/CNES/200508_/Dados/ST/STCE2609.dbc`, competência 202609, coletado em 2026-10-28 (SHA-256 `73cec2bb0f41…`). Dados públicos de disseminação do DATASUS/Ministério da Saúde; sem licença padronizada (CC/SPDX) declarada no repositório FTP.

As duas bases **não são equivalentes**. O portal é um catálogo municipal de localização de UAPS; o CNES é o cadastro nacional, declarado por gestores e estabelecimentos, com competência mensal e todos os tipos de estabelecimento. Coincidência de código não prova funcionamento, capacidade ou oferta, e ausência em uma base não prova inexistência na outra.

## Método

- Chave: código CNES exato de 7 dígitos; sem casamento por nome ou endereço (o arquivo ST não traz nome do estabelecimento).
- Recorte CNES: município `230440` (Fortaleza); tipos de atenção primária `01`, `02` e `45` (tabela `TP_ESTAB` do DATASUS).
- Campos lidos do CNES: `CNES`, `CODUFMUN`, `TP_UNID`, `TPGESTAO`, `VINC_SUS`, `NAT_JUR`, `DT_ATUAL`, `COMPETEN`. CPF/CNPJ, CEP, dados bancários e contratos são descartados na leitura.
- Atributos conferidos: SUS (`sus` × `VINC_SUS`) e gestão (`management` × `TPGESTAO`).

## Resultado

| Medida | Valor |
|---|---:|
| Feições UAPS no portal | 134 |
| Feições com CNES | 134 |
| Códigos CNES distintos no portal | 133 |
| Códigos do portal encontrados no CNES de Fortaleza | 133 |
| Códigos do portal encontrados em outro município | 0 |
| Códigos do portal ausentes do CNES | 0 |
| Estabelecimentos CNES em Fortaleza (todos os tipos) | 7286 |
| Atenção primária no CNES sem correspondente no portal | 14 |
| Divergências de atributo | 0 |

Tipo CNES dos códigos casados: 02 — Centro de saúde/unidade básica: 133.

Atenção primária no CNES de Fortaleza por tipo e gestão: 01 — Posto de saúde, gestão estadual: 11; 02 — Centro de saúde/unidade básica, gestão municipal: 136.

## Diferenças encontradas

### CNES repetido no portal

- `4644042` em 2 feições (source_id 38, 65).

### Atenção primária no CNES sem correspondente no portal

| CNES | Tipo | Gestão | Natureza jurídica | Última atualização |
|---|---|---|---|---|
| `2934493` | 01 — Posto de saúde | estadual | 1023 — Órgão público do Poder Executivo estadual ou do DF | 2022-06 |
| `2934515` | 01 — Posto de saúde | estadual | 1023 — Órgão público do Poder Executivo estadual ou do DF | 2023-09 |
| `2934523` | 01 — Posto de saúde | estadual | 1023 — Órgão público do Poder Executivo estadual ou do DF | 2022-06 |
| `2934531` | 01 — Posto de saúde | estadual | 1023 — Órgão público do Poder Executivo estadual ou do DF | 2022-06 |
| `2934558` | 01 — Posto de saúde | estadual | 1023 — Órgão público do Poder Executivo estadual ou do DF | 2022-06 |
| `2934566` | 01 — Posto de saúde | estadual | 1023 — Órgão público do Poder Executivo estadual ou do DF | 2022-06 |
| `2934574` | 01 — Posto de saúde | estadual | 1023 — Órgão público do Poder Executivo estadual ou do DF | 2022-06 |
| `2934582` | 01 — Posto de saúde | estadual | 1023 — Órgão público do Poder Executivo estadual ou do DF | 2022-06 |
| `2934590` | 01 — Posto de saúde | estadual | 1023 — Órgão público do Poder Executivo estadual ou do DF | 2022-06 |
| `2934604` | 01 — Posto de saúde | estadual | 1023 — Órgão público do Poder Executivo estadual ou do DF | 2022-06 |
| `2934612` | 01 — Posto de saúde | estadual | 1023 — Órgão público do Poder Executivo estadual ou do DF | 2022-06 |
| `4713524` | 02 — Centro de saúde/unidade básica | municipal | 1031 — Órgão público do Poder Executivo municipal | 2026-08 |
| `8203261` | 02 — Centro de saúde/unidade básica | municipal | 1031 — Órgão público do Poder Executivo municipal | 2026-04 |
| `8236054` | 02 — Centro de saúde/unidade básica | municipal | 1031 — Órgão público do Poder Executivo municipal | 2026-05 |

## Causas possíveis (não verificadas)

Hipóteses para orientar conferência com a SMS; nenhuma foi confirmada e nenhuma correção automática é aplicada.

- **Datas de corte diferentes:** o catálogo do portal e a competência do CNES não são do mesmo mês; unidades cadastradas ou alteradas no intervalo aparecem em só uma base.
- **Escopo distinto:** o portal lista UAPS municipais; o CNES inclui postos sob gestão estadual e outros tipos que o catálogo municipal não pretende cobrir.
- **Cadastro em transição:** códigos CNES-only atualizados recentemente podem ser unidades novas, reabertas ou em reforma ainda não incorporadas ao mapa — ou unidades que a SMS não classifica como UAPS.
- **CNES repetido:** duas feições com o mesmo código podem indicar erro de digitação, unidade com anexo em outro endereço ou código copiado; por isso o CNES não é usado como chave de deduplicação (SDD-020).

## Limitações

- O CNES é cadastro: não comprova funcionamento, horário, equipe ou capacidade de atendimento.
- Sem nome no arquivo ST, a conferência depende apenas do código; erros de código que coincidam com outro estabelecimento válido não são detectáveis aqui.
- Rótulos de códigos vêm das tabelas `TAB_CNES` do DATASUS; códigos sem rótulo conferido são exibidos como publicados.

## Reprodução

```powershell
python scripts/fetch_data.py --source cnes-ce
python -m scripts.check_cnes_divergence
```
