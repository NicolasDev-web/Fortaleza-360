# Isócronas a pé — SDD-037

Áreas cumulativas de acessibilidade modelada até **alguma das UAPS** aceitas na malha. Cada área é a união de corredores das ruas alcançáveis em 10, 20 ou 30 minutos. Não indica capacidade, vaga, funcionamento ou área de responsabilidade assistencial.

## Método

1. Lê o grafo OSM da SDD-035 com custos da SDD-036. A coluna `coordinates` preserva os nós intermediários de cada trecho comprimido, orientados do menor para o maior identificador. Arquivos antigos sem essa coluna precisam ser regenerados; não se desenha uma reta entre cruzamentos para substituir uma curva.
2. Liga cada UAPS ao nó mais próximo, com limite de 300 m herdado da SDD-036. Unidades recusadas ficam listadas no manifesto. O conector até a entrada da unidade continua fora do tempo calculado; esse erro pode chegar a 3,75 min a 4,8 km/h no limite de 300 m. Não há medição de entrada real.
3. Usa Dijkstra com múltiplas origens (UAPS), com limite de 30 minutos. Nas ruas bidirecionais, o tempo até a unidade é igual ao tempo a partir dela. Componentes sem UAPS não são religadas.
4. Para cada trecho, calcula a fração alcançada a partir de cada ponta pelo orçamento restante. Interpola essa fração pelo comprimento da **curva** em UTM. Se as duas frações não se encontram, mantém o intervalo inacessível no meio do trecho. A proporção usa comprimento projetado; o custo original usa haversine (pequena diferença de projeção).
5. Faz buffer de **25 m de raio** nos trechos alcançados em SIRGAS 2000 / UTM 24S (EPSG:31984), com quatro segmentos por quadrante. Une os corredores, preserva buracos e recorta no limite municipal. Não usa casco convexo. Publica a geometria do arquivo offline em WGS84 e calcula área em km² na projeção métrica.

O raio de 25 m é uma escolha de representação espacial, ajustável por `--buffer-m`. Não acrescenta caminhada nem prova que um ponto lateral à via tenha passagem. Corredores podem atravessar muros, canais ou outras barreiras em até esse raio. A área depende da densidade de vias mapeadas e da largura escolhida. Na SDD-038, população não deve ser tratada como uniformemente atendida por estar no corredor sem explicitar essa aproximação.

O polígono parte dos nós associados às UAPS. Como o conector não é desenhado, a própria coordenada de uma UAPS pode ficar fora do corredor se estiver a mais de 25 m da malha. Essa limitação também impede interpretar o contorno como uma fronteira precisa de acesso a uma entrada real.

## Cenários e verificações

Nove feições: três limiares × três velocidades (`slow`: 4,0; `central`: 4,8; `fast`: 5,5 km/h). Penalidades de escadas e caminhos são herdadas da SDD-036. A faixa representa sensibilidade às hipóteses, sem interpretação estatística de confiança.

O pipeline bloqueia áreas vazias, inválidas, com área não positiva ou fora do município. Verifica também o encaixe espacial de 10 ⊆ 20 ⊆ 30 minutos e lento ⊆ central ⊆ rápido, com tolerância numérica de 0,0001 m². Verifica validade novamente após a transformação para WGS84.

Os arcos do buffer são aproximados por polígonos. Quando a ponta do trecho muda de posição, essa discretização pode deixar uma pequena saliência do corredor anterior fora do novo. O gerador preserva os envelopes de tempos menores e velocidades mais lentas por união geométrica e registra a área reincluída em `nesting_added_m2`. Bloqueia o ajuste se ele ultrapassar o maior entre 1 m² e 0,01% da área corrente. Assim o arquivo mantém o encaixe espacial, e a magnitude da correção fica auditável.

Testes sintéticos `DEMO` verificam curvas, trechos parciais por ambas as pontas, ilhas próximas sem ligação, recorte municipal, sensibilidade à velocidade, entradas inválidas, orientação geométrica, proveniência e reprodução byte a byte.

## Reprodução e proveniência

```powershell
python -m scripts.network
python -m scripts.isochrones
python -m pytest tests/test_isochrones.py
```

Saídas em `data/processed/isochrones/` (fora do Git):

- `isochrones.geojson`: nove polígonos/multipolígonos cumulativos até alguma UAPS.
- `manifest.json`: checksum de entradas e saída, fontes e respectivas licenças/coletas, modelo de custo, parâmetros, ligações UAPS → malha, exclusões, áreas, limitações e dicionário de campos.

Fontes: OSM/Geofabrik de 2026-10-27 (ODbL 1.0, © OpenStreetMap contributors); UAPS SMS de 2026 e limite municipal IPECE de 2019 via Fortaleza em Mapas (atribuição obrigatória). Detalhes em `DATA_SOURCES.md`. O pipeline confere os checksums de UAPS e limite com o manifesto público e a identidade do extrato OSM com a auditoria da malha.

A conferência manual de rotas da SDD-036 segue pendente. Calçadas, travessias, terreno e condições locais não foram validados em campo. A SDD-037 gera arquivos offline; análise populacional na SDD-038, candidato na SDD-039 e visualização leve da base central na SDD-052. O GeoJSON completo permanece offline; PNGs transparentes permitem ver 10/20/30 min, sem mudar métricas. Ver `CORRIDOR_PREVIEW.md`.

## Resultado real em 2026-10-28

134 de 134 UAPS aceitas no limite de ligação à malha. As áreas abaixo são dos corredores recortados no município, em km²; não são percentuais de população atendida.

| Cenário | 10 minutos | 20 minutos | 30 minutos |
|---|---:|---:|---:|
| Lento (4,0 km/h) | 70,183 | 151,757 | 179,200 |
| Central (4,8 km/h) | 91,495 | 166,794 | 184,160 |
| Rápido (5,5 km/h) | 108,433 | 175,258 | 185,885 |

Maior área reincluída para manter encaixe dos buffers discretizados: 10,926 m². As diferenças estão registradas individualmente no manifesto; nenhuma excedeu o limite de correção.

GeoJSON gerado: 65.654.623 bytes, SHA-256 `123bd2bae1f4cfed1764ff6210f0e4e97e4dc8d29c52ae8d127405a45fe60fe0`. É um artefato de processamento offline; carregá-lo integralmente no navegador exigiria uma estratégia de simplificação e entrega posterior.
