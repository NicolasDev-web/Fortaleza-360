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
Nenhuma chave em front; endpoints só quando necessários; fallback e cache; política de atualização e rollback; serviço de tiles com termos e atribuição; testes automatizados em CI.
