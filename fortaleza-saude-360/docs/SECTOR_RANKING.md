# Setores por distância em linha reta — SDD-050

Lista descritiva aprovada pelo usuário em 2026-10-29, acessível no Explorar → Distância por setor, ao lado de Resumo e Lista de bairros. Não muda o modo Comparar nem define prioridades de implantação.

`scripts/sector_ranking.py` lê os 4.408 setores de `data/processed/demand_units.geojson`, obtém um ponto interno representativo de cada geometria projetada para EPSG:31984 e reprojeta o ponto para WGS84. Calcula haversine com raio terrestre médio 6.371.008,8 m até cada uma das 134 UAPS; escolhe a menor distância, com ID da unidade para desempate. Arredonda a distância a 0,1 m, ordena do maior para o menor e desempata setores pelo código. Não pondera o ponto pela distribuição dos moradores.

O bairro mostrado é o principal no crosswalk já validado (maior fração de área do setor). População não entra na ordenação: os 102 setores com zero moradores permanecem visíveis por padrão; o filtro Somente setores com moradores é explícito. O total reconcilia 2.428.708 moradores. Geometrias inválidas, população ausente/fracionária/negativa, código duplicado, bairro principal ausente ou rede UAPS vazia interrompem a geração.

Produto: `public/data/sector-ranking.json`, 510.130 bytes na geração inicial. Contém linhas, método, limitações, dicionário, fontes completas de setores/população/UAPS/bairros e SHA-256 dos três insumos. A entrada `sector_ranking` do manifesto registra bytes e hash. O guard do build passou a verificar 10 produtos públicos. Nenhuma geometria bruta de setor é enviada por essa funcionalidade.

A interface carrega apenas ao abrir a aba, confere SHA-256 e valida referências de bairro/UAPS, total, ordem e unicidade dos setores. Exibe até 25 linhas por página, filtro de bairro, filtro de presença de moradores e JSON com método/proveniência. Download corrompido ou indisponível mostra erro e opção de repetir. As linhas não atribuem qualidade de atendimento, gravidade ou vulnerabilidade. Setores extensos podem ter moradores perto da rua e um ponto representativo distante; a ordem descreve essa hipótese geométrica e não o trajeto ou tempo de cada pessoa. UAPS são de 2026 e população de 2022. Licença padronizada IBGE e conferência de rotas continuam pendentes.

Reprodução na pasta da aplicação:

```powershell
.venv/Scripts/python -m scripts.sector_ranking
.venv/Scripts/python scripts/generate_manifest.py
npm run check:data
```

Testes Python cobrem ordenação, desempate, zero e falhas de população/rede. Testes JS conferem produto real, população, referências e rejeição de ordem/total incorretos; E2E desktop/mobile cobre carga sob demanda, filtros, paginação, falha HTTP e recuperação. Evidências finais em `sdd/STATUS.md`.
