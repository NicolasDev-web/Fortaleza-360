# Visualização dos corredores — SDD-052

A camada Corredores a pé, no Explorar, mostra a base das 134 UAPS no cenário central (4,8 km/h), com seletor de 10, 20 ou 30 minutos. Não mostra a proposta do Simular, não é território de atendimento e não informa vagas/capacidade. A faixa de velocidades continua nos resultados numéricos e nos arquivos analíticos; esta camada visual mostra somente o cenário central, identificado.

O GeoJSON original de 65,7 MB permanece offline e inalterado. `scripts/corridor_preview.py` rasteriza seus três polígonos centrais em uma grade comum sobre a caixa municipal WGS84, com norte no topo e lado de pixel de aproximadamente 12 m na latitude média. Um pixel é incluído se seu centro intercepta a geometria original. Não há simplificação da geometria analítica, recálculo de população ou alteração do ganho/base. Contagens numéricas nunca são obtidas da imagem.

Os PNGs têm 2.188 × 1.880 pixels, paleta transparente e pixels lilás semitransparentes. Tamanhos iniciais: 10 min = 92.692 bytes; 20 min = 140.220 bytes; 30 min = 150.961 bytes; total **383.873 bytes**. Apenas a imagem do tempo selecionado é baixada, depois de habilitar a camada. O manifesto e SHA-256 são verificados antes de criar URL Blob; ela é revogada ao trocar/desativar/sair. Falhas mostram erro e orientam repetir pela camada, sem substituir por área inventada.

A grade é a mesma nos três tempos. Na geração real, o encaixe pixel a pixel foi verificado: 638.883 → 1.164.617 → 1.285.869 pixels, sem perda entre tempos. Esses totais auditam renderização; não representam área ou população. Testes pequenos verificam orientação norte/sul, buracos e bytes PNG. Testes dos arquivos conferem caixa comum, dimensões e hashes.

Proveniência: `public/data/corridor-preview.json` e bloco `corridor_preview` do manifesto guardam hash do GeoJSON original, fontes de OSM/UAPS/bairros/limite/malha, método, resolução, caixa, arquivos e dicionário. Os três PNGs são individualmente registrados e conferidos pelo guard do build (14 arquivos no total).

Limites visuais: fronteiras ficam pixelizadas e podem se deslocar visualmente cerca de meia diagonal de pixel; detalhes menores que a grade podem desaparecer. Isso não altera os corredores usados na análise. Condições locais e rotas de campo continuam sem validação; conectores permanecem fora do tempo.

Reprodução:

```powershell
python -m scripts.corridor_preview
python scripts/generate_manifest.py
npm run check:data
```

O encoder usa NumPy/Shapely já disponíveis e módulos Python padrão, sem dependência nova de imagem. O processamento é offline, não executado no deploy.
