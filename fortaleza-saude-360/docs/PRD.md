# PRD v0.1 — Fortaleza Saúde 360°
## Problema
Dados fragmentados dificultam identificar onde se localizam equipamentos e como varia a acessibilidade geográfica aos serviços.
## Públicos
Pesquisadores, estudantes, cidadãos, gestores de planejamento. Não é ferramenta de emergência, triagem nem orientação clínica.
## Questões essenciais
Onde ficam UAPS/UPA/hospitais? Quantas pessoas estão a X minutos de uma UAPS? Como muda cobertura estimada se incluirmos ponto candidato?
## MVP P0
Mapa de Fortaleza com bairros e pontos UAPS; filtros por tipo; clique abre ficha com origem/atualização; painel com contagens e metodologia; geolocalização apenas com consentimento; estados de erro, carregando e sem dados; indicação dados reais vs demo.
## P1
População por setor ou bairro com denominador adequado; análise distância em linha reta EXPLICITAMENTE rotulada como proxy; ranking de setores por proxy de acessibilidade; export CSV.
## P2
Tempo pela malha viária (OSMnx), isócronas e cobertura populacional ponderada; simulador de novos equipamentos com cenários salvos localmente; auditoria de sensibilidade.
## Fora do escopo MVP
Diagnóstico, previsão individual de doença, prontuários, classificação de pessoas, recomendações clínicas, dashboards com dados pessoais, roteamento em tempo real, alegações causais ou fila real de atendimento.
## Métricas
Qualidade de dados: % registros com coords válidas, geometria válida, atualização e fonte; desempenho LCP/INP, taxa de sucesso import; produto: conclusão de tarefas de exploração e compreensão da legenda; metodologia: diferença tempo vs proxy e cobertura com faixa de sensibilidade.
## Critério geral
Fonte e temporalidade visíveis; nenhuma agregação mistura anos/geografias sem nota; demo nunca parece dado oficial.
