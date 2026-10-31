# Malha viária a pé (SDD-035)

Grafo de pedestres de Fortaleza gerado de um extrato do OpenStreetMap por `scripts/network.py`. É insumo das SDD-036 a 038 (tempo, isócronas e cobertura); **não é publicado** na interface e **não calcula tempo**.

## Versão dos dados

| Item | Valor |
|---|---|
| Arquivo | `osm-nordeste-261027.osm.pbf` (Geofabrik, região Nordeste) |
| Dados OSM até | 2026-10-27T21:23:59Z (cabeçalho do arquivo) |
| SHA-256 | `e99014cf0d798654aa77060172ed2aea75213a547d1f5a718e4decaa51952bc3` |
| Recorte | Limite municipal (IPECE, camada 12) + 0,03° (~3 km): `-38.6679, -3.9246, -38.3713, -3.6617` |
| Licença | ODbL 1.0, "© OpenStreetMap contributors" |

Trocar o extrato exige atualizar de propósito `fetch_data.SOURCES["osm-nordeste"]`: o nome do arquivo leva a data. O mesmo extrato gera os mesmos bytes (teste em `tests/test_network.py`).

## Custo

Cada trecho guarda **só o comprimento em metros** (`length_m`, geodésico por haversine, soma dos segmentos entre cruzamentos). Não há velocidade, minutos nem impedâncias: isso é da SDD-036. Mão única (`oneway`) é ignorada, porque pedestres andam nos dois sentidos.

## Quais vias entram (regra conservadora)

- **Entram** (`highway`): primary, secondary, tertiary (e `_link`), unclassified, residential, living_street, service, pedestrian, track, road, footway, path, steps; `cycleway` só com `foot=yes/designated/permissive`.
- **Ficam de fora**: motorway e trunk (e `_link`), construction, proposed e demais valores; `area=yes`; `foot=no/private`; sem `foot`, `access` em no, private, customers, delivery, military, agricultural, forestry.
- `foot=yes/designated/permissive` vence o acesso geral (`access=private`, por exemplo).
- `foot=use_sidewalk` não bloqueia a via: no OSM de Fortaleza a calçada nem sempre é mapeada à parte, e bloquear desconectaria a cidade.
- Vias cortadas pela caixa do recorte são partidas nela; nós fora da caixa são descartados.

## Como o grafo é montado

Nós são pontas e cruzamentos (ponto usado por duas vias ou duas vezes pela mesma). Nós intermediários de grau 2 somam comprimento ao trecho. Laços que voltam ao mesmo nó são descartados (199); entre duas vias paralelas entre os mesmos nós fica o trecho mais curto (874 colapsos).

Na SDD-037, `edges.csv` ganhou `coordinates`: sequência dos pontos da curva em WGS84, orientada do menor para o maior id de nó. Isso preserva a forma dos trechos para os polígonos sem mudar a topologia ou o custo. É necessário regenerar saídas antigas antes de gerar isócronas.

## Resultado da execução real (2026-10-28)

| Medida | Valor |
|---|---|
| Nós / trechos | 117.819 / 166.555 |
| Comprimento total | 10.117,0 km (66.595 vias OSM) |
| Componentes conexas | 675 |
| Maior componente | 111.972 nós (95,0%), 9.721,2 km (96,1% do comprimento) |
| UAPS ligadas à malha | 134 de 134 na maior componente; distância ao nó mais próximo: mediana 31,8 m, máxima 87,1 m (limite de triagem: 300 m) |

## Limitações

- O OSM é colaborativo: calçadas, travessias, escadarias e becos podem estar ausentes ou desatualizados, e a cobertura varia por bairro. Isso é viés territorial a ser medido na SDD-040.
- 3,9% do comprimento está em 674 componentes menores (ilhas, em geral vias recortadas na borda ou trechos mal conectados). Não foram religadas: religar inventaria caminho.
- Barreiras (rios, canais, linha férrea, muros) só aparecem se mapeadas como ausência de via. Subidas, iluminação, segurança e travessias de avenidas não são modeladas.
- A ligação UAPS → nó é por proximidade em linha reta (distância máxima 87,1 m aqui); não representa a entrada real do posto.
- Que a UAPS esteja na malha não diz nada sobre capacidade de atendimento.

## Reprodução

```powershell
python scripts/fetch_data.py --source osm-nordeste --timeout 120
python -m scripts.network
python -m pytest tests/test_network.py
```

Leva cerca de 3 minutos. Saídas em `data/processed/walk_network/` (`nodes.csv`, `edges.csv`, `audit.json`), fora do Git.
