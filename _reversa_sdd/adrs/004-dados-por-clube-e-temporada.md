# ADR 004 — Dados de módulo particionados por clube e temporada

- **Status:** Herdada
- **Fonte:** código, comentários e commit (Detective do Reversa, 2026-10-13)

## Contexto
O técnico trabalha em mais de um clube ao longo do tempo, e os dados de uma temporada não devem se misturar
com os da seguinte.

## Decisão
`dataPath = users/<uid>/data/<clubId>/<seasonId>`, enviado pelo hub. Ficam **fora** da temporada: a biblioteca de
exercícios e os critérios de avaliação (do técnico), o scouting (do técnico) e os adversários (do clube). 🟢

## Consequências
- 🟢 Trocar de temporada esvazia os módulos; daí o resgate "buscar em outras temporadas" no planner.
- 🟢 Apagar um clube apaga todas as temporadas dele.
- 🟡 Os ids de clube e temporada são `slug` do nome; renomear não muda o id (bom), mas dois nomes que viram o mesmo slug colidem.
