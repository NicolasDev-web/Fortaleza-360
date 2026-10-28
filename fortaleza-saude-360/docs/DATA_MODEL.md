# Contratos de dados
## facility (GeoJSON Feature, Point, WGS84)
`id:string`, `name:string`, `type:'UAPS'|'UPA'|'HOSPITAL'|'OTHER'`, `nature:string|null` (natureza publicada pela fonte), `management?:string`, `sus:boolean|null`, `neighborhood?:string`, `source_id:string`, `reference_date:string|null`, coordinates `[longitude,latitude]`.
## neighborhood (Polygon/MultiPolygon)
`code:string`, `name:string`, `source_id:string`, `reference_date:string|null`. Geometrias devem ser válidas.
## demand_unit (Polygon/Point)
`geo_id:string`, `population:number|null`, `year:number`, `population_source_id:string`, `geometry_source_id:string`, `aggregation_method:string`.
## access_metric (derivado)
`geo_id`, `method:'straight_line_proxy'|'road_network_time'`, `mode:'walk'|'drive'|null`, `threshold_minutes:number|null`, `max_distance_m:number|null`, `population_covered:number|null`, `total_population:number|null`, `uncertainty_notes:string`, `data_version:string`.
**Não** calcular taxa com denominador zero/ausente; adotar null e motivo; manter CRSs e período documentados.
