# Fluxo — `stats`

> Archaeologist, 2026-10-13. Detalhes e referências de linha em `../code-analysis.md`.

```mermaid
flowchart TD
  C[contexto] --> L[10 listeners on value]
  AD[adicionar/remover item de lista] --> PE[persist: set das 9 listas + adversários]
  PE --> OP[set clubs/clubId/opponents com escudo]
  G[salvar jogo] --> PG[set stats/games/id]
  X[excluir jogo] --> RG[remove stats/games/id]
```
