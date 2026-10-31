# Modelo de custo de trajeto a pé (SDD-036)

Converte os trechos da malha de `docs/WALK_NETWORK.md` em minutos de caminhada. Implementado em `scripts/travel_time.py`, usado nas isócronas offline (SDD-037) e no simulador (SDD-039). A conferência externa dos cinco trajetos abaixo permanece pendente.

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

**Conferência manual: pendente.** Falta comparar esses cinco trajetos com um mapa de rotas a pé (por exemplo, a camada de pedestres do OpenStreetMap). Sem isso o modelo não foi validado contra trajetos reais, só contra casos sintéticos e contra a faixa esperada de sinuosidade (1,05 a 1,51, dentro do esperado). Também não há medição de campo.

## Reprodução

```powershell
python -m scripts.network          # SDD-035
python -m scripts.travel_time      # grava data/processed/walk_network/travel_time_model.json
python -m pytest tests/test_travel_time.py
```
