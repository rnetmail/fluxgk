# Fluxo — `minutes`

> Archaeologist, 2026-10-13. Detalhes e referências de linha em `../code-analysis.md`.

```mermaid
flowchart TD
  C[contexto] --> L[listeners: games, gks, comps, opponents]
  F[formulário do jogo] --> CG[collectGameData: soma segundos por intervalo e período]
  CG --> V{data e adversário?} -- não --> ER[alerta]
  V -- sim --> SG[set minutes/games/id]
  AD[editar listas] --> PE[persist: gks, comps + opponents SEM escudo]
```
