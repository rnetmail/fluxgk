# Fluxo — `planner`

> Archaeologist, 2026-10-13. Detalhes e referências de linha em `../code-analysis.md`.

```mermaid
flowchart TD
  C[FLUXGK_CONTEXT de window.parent] --> P[define caminhos de sessões e biblioteca]
  P --> L[carrega SDK + adaptador] --> A{autenticado?}
  A -- sim --> LI[liga on value: sessões e biblioteca] --> F[flushPending]
  S[Salvar sessão] --> PS[_persistSessionToLibrary]
  PS --> E[espelho no localStorage]
  PS --> CR{nuvem pronta?}
  CR -- sim --> SET[set sessions/id] -- erro --> Q[fila _pendingSess]
  CR -- não --> Q
  Q --> T[a cada 15 s / online / login: flushPending]
  DEL[Excluir] --> MA[_marcarApagado] --> RM[remove] 
  LI --> TE{item apagado voltou?} -- sim --> RM
```
