# Fluxo — `profile`

> Archaeologist, 2026-10-13. Detalhes e referências de linha em `../code-analysis.md`.

```mermaid
flowchart TD
  C[contexto de window.parent] --> I[FDB.init] --> A{autenticado?} -- sim --> FL[flush da fila]
  A --> L[5 listeners: elenco, perfis, avaliações, diário, critérios]
  L --> MG[merged: elenco do Load Control + perfil]
  SP[salvar perfil] --> UP[update profile/gk/playerId]
  SA[salvar avaliação] --> SA2[set assessments/playerId/data]
```
