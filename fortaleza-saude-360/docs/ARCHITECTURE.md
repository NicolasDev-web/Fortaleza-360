# Arquitetura proposta
## MVP estático e gratuito
Next.js App Router + TypeScript + CSS; MapLibre GL JS (mapa), GeoJSON simplificado de equipamentos e bairros pré-processado; processamento Python (pandas, geopandas, shapely) em scripts offline; Vercel/hosting estático com limites de uso e licença de tiles respeitados.
## Caminho de dados
Fonte pública → download manual/reprodutível e checksum → `data/raw` (gitignored) → script valida esquema/CRS/nulos/duplicatas → padronização EPSG:4326 → `data/processed` → `public/data/*.geojson` + `public/data/manifest.json` → app renderiza e documenta. Evitar sobrecarregar cliente: simplificar polígonos sob controle de erro.
## Caminho P2
Malha OSM → grafo pedonal/sistema viário por modalidade → pontos de demanda (centroides ponderados ou setor) → origens de saúde → tempo por algoritmo de menor caminho → agregação por população → isócronas; **não** usar haversine como tempo real. Comparar cenários, verificar barreiras e restrições de mobilidade.
## Stack
Web: Next 15+ (verificar compatibilidade no momento de implementar), TypeScript, MapLibre GL JS, Zustand opcional, Vitest e Playwright. ETL: Python 3.11+, uv ou pip, pandas, geopandas, shapely, pandera opcional. Futuro: PostGIS somente se volume/consultas justificarem.
## Operação

O modo Comparar (SDD-046) usa apenas o MapModel já carregado e as funções existentes de população, distância em linha reta e CSV. A dupla é estado local; contornos A/B são renderizados em SVG e os indicadores ficam em tabela sem ranking. Detalhes em `COMPARISON.md`.

O simulador (SDD-039) preserva o método dos corredores. Um pré-processamento transforma acesso às ruas curvas em custos por ponto representativo, verifica a paridade da base e publica um arquivo estático carregado sob demanda. Um Web Worker calcula o candidato localmente; coordenadas propostas não são transmitidas. A SDD-049 permite persistir propostas apenas por ação explícita, em armazenamento local versionado com exclusão. Reabrir recalcula no modelo atual. Detalhes em `SCENARIO_SIMULATOR.md`.
Nenhuma chave em front; endpoints só quando necessários; fallback e cache; política de atualização e rollback; serviço de tiles com termos e atribuição; testes automatizados em CI.
