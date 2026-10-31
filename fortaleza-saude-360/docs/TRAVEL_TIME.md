# Modelo de custo de trajeto a pé (SDD-036)

Converte os trechos da malha de `docs/WALK_NETWORK.md` em minutos de caminhada. Implementado em `scripts/travel_time.py`, usado nas isócronas offline (SDD-037) e no simulador (SDD-039). Os cinco pares abaixo foram comparados com os resultados de um roteador pedestre externo em 2026-10-31; medição em campo e calibração continuam pendentes.

## Regra central

Todo tempo é o do **menor caminho pela malha**. Não existe função que converta distância em linha reta em minutos; a linha reta só serve para conferir o modelo (razão de sinuosidade). Se o destino não é alcançável pela malha, o resultado é `None` — nunca zero nem infinito. Um destino perto em linha reta, mas numa ilha desconectada, não conta como "mais próximo".

## Fórmula

```
minutos = comprimento_m ÷ (km/h × 1000 ÷ 60) × fator_da_via
```

### Velocidade (hipótese de planejamento)

| Cenário | km/h | m/min | Leitura |
|---|---|---|---|
| `central` | 4,8 | 80 | Adulto em terreno plano; é o valor usado nos números principais |
| `slow` | 4,0 | 66,7 | Mais lento: idosos, crianças, mobilidade reduzida |
| `fast` | 5,5 | 91,7 | Mais rápido: adulto em bom ritmo |

A faixa `slow`–`fast` acompanha todo resultado derivado (SDD-037 e 038). Não é um intervalo de confiança estatístico: é sensibilidade a uma hipótese.

### Fatores de via (impedâncias)

| `highway` | Fator | Por quê |
|---|---|---|
| `steps` | 2,0 | Escadas reduzem a velocidade |
| `track`, `path` | 1,25 | Em geral sem pavimento no OSM |
| demais tipos | 1,0 | — |

Os valores 2,0 e 1,25 são **hipóteses, sem calibração com medição local**. Mudam o tempo só dos trechos desses tipos. O modelo não olha tag de superfície (a malha não a guarda).

## O que o modelo não considera

Relevo, espera em travessia e semáforo, qualidade do piso, presença real de calçada, iluminação, segurança, calor e chuva (`not_modeled` em `travel_time_model.json`). Por isso o tempo é uma **estimativa de acessibilidade modelada**, não o tempo que uma pessoa leva — e nada aqui diz se a unidade atende, está aberta ou tem vaga.

**Primeiro e último trecho.** Um ponto é ligado ao nó mais próximo da malha (recusado se passar de 300 m). Esse trecho em linha reta **não entra** nos minutos e vem separado como `snap_m`: o tempo calculado subestima até ~3,75 min (300 m a 4,8 km/h) no pior caso permitido, e na prática 0,4 a 0,7 min (mediana de 32 m para as UAPS). A SDD-037 deve decidir se o limite fica ou diminui.

## Casos de teste

`tests/test_travel_time.py` (14 casos): fórmula e velocidades; fatores só para `steps`/`track`/`path`; entradas inválidas; roteamento que escolhe o caminho mais rápido, não o mais curto (escada de 100 m vs. desvio de 140 m); rio com ponte a 1 km (tempo segue a ponte, não a reta); destino inalcançável; vizinho isolado ignorado; ponto longe demais da malha; resultado sem tempo de conector; relatório determinístico.

## Pares reais para conferência (execução de 2026-10-28)

Centro do bairro (ponto representativo) → UAPS mais rápida a pé. Sinuosidade = caminho pela malha ÷ linha reta; em cidades costuma ficar entre 1,1 e 1,5.

| Bairro | UAPS | Pela malha | Linha reta | Sinuosidade | Minutos (rápido / central / lento) |
|---|---|---|---|---|---|
| Parque Araxá | Santa Liduína | 802 m | 529 m | 1,51 | 8,7 / 10,0 / 12,0 |
| Jangurussu | Marcus Aurélio | 756 m | 525 m | 1,44 | 8,3 / 9,5 / 11,3 |
| Meireles | Flávio Marcílio | 2.658 m | 2.378 m | 1,12 | 29,0 / 33,2 / 39,9 |
| Messejana | Josafá Gomes da Silva | 713 m | 678 m | 1,05 | 7,8 / 8,9 / 10,7 |
| Pirambu | Guiomar Arruda | 1.171 m | 1.112 m | 1,05 | 12,8 / 14,6 / 17,6 |

## Conferência externa em 2026-10-31

Consultados os mesmos pontos públicos de origem/destino na interface [Valhalla/FOSSGIS](https://valhalla.openstreetmap.de/), com perfil **Pedestrian** selecionado. Registrada a opção **Main Route**, sem escolher a alternativa mais parecida com o modelo. Interface informou versão `3.9.1-f221535` e grafo com cerca de nove horas. Os links preservam coordenadas em ordem longitude, latitude; não foi usada a localização do visitante. Formato do link e perfil conferidos no [adaptador oficial do OpenStreetMap](https://github.com/openstreetmap/openstreetmap-website/blob/master/app/assets/javascripts/index_modules/directions/engines/fossgis_valhalla.js).

| Par (link reproduzível) | Modelo central | Main Route externa | Tempo externo | Externo − modelo central |
|---|---|---|---|---|
| [Parque Araxá → Santa Liduína](https://valhalla.openstreetmap.de/directions?profile=pedestrian&wps=-38.547695%2C-3.735325%2C-38.54566937%2C-3.73963531) | 801,6 m; 10,0 min | 0,8 km | 9 min 38 s | aproximadamente −0,4 min |
| [Jangurussu → Marcus Aurélio](https://valhalla.openstreetmap.de/directions?profile=pedestrian&wps=-38.510954%2C-3.846285%2C-38.50678077%2C-3.84406047) | 756,3 m; 9,5 min | 0,7 km | 8 min 29 s | aproximadamente −1,0 min |
| [Meireles → Flávio Marcílio](https://valhalla.openstreetmap.de/directions?profile=pedestrian&wps=-38.501418%2C-3.727597%2C-38.48041515%2C-3.72335437) | 2.657,7 m; 33,2 min | 2,7 km | 36 min 5 s | aproximadamente +2,9 min |
| [Messejana → Josafá Gomes da Silva](https://valhalla.openstreetmap.de/directions?profile=pedestrian&wps=-38.493132%2C-3.826929%2C-38.4913663%2C-3.8210967) | 713,3 m; 8,9 min | 0,8 km | 10 min 6 s | aproximadamente +1,2 min |
| [Pirambu → Guiomar Arruda](https://valhalla.openstreetmap.de/directions?profile=pedestrian&wps=-38.554796%2C-3.70939%2C-38.54556367%2C-3.71328008) | 1.170,8 m; 14,6 min | 1,2 km | 14 min 43 s | aproximadamente +0,1 min |

A distância externa é a exibida pela interface, arredondada a 0,1 km; não permite afirmar erro percentual preciso em metros. As diferenças de tempo usam o central local arredondado a uma casa. O tempo externo ficou dentro da faixa local rápido–lento nos cinco pares, o que é uma verificação de plausibilidade desta pequena amostra, não uma calibração nem um intervalo de confiança.

Os dois motores usam OSM: não são fontes cartográficas independentes. Perfil de custo, atualização do grafo, encaixe dos pontos e tratamento dos conectores podem diferir. Não houve comparação vértice a vértice das geometrias nem verificação da existência/condição de calçadas e travessias. O tempo externo também é calculado, não cronometrado. **Nenhuma medição em campo foi feita** e os parâmetros/corredores aprovados permanecem preservados. As tentativas sem resultado em 2026-10-29 não foram usadas como evidência; os cinco resultados acima foram efetivamente observados na interface em 2026-10-31.

## Reprodução

```powershell
python -m scripts.network          # SDD-035
python -m scripts.travel_time      # grava data/processed/walk_network/travel_time_model.json
python -m pytest tests/test_travel_time.py
```
