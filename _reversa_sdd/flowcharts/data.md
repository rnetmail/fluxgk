# Fluxo — `data`

> Archaeologist, 2026-10-13. Detalhes e referências de linha em `../code-analysis.md`.

```mermaid
flowchart TD
  C[FLUXGK_CONTEXT, sem checar a fonte] --> I[fbInit fachada modular]
  I --> A{autenticado?}
  A -- sim --> LS[loadUserState do localStorage]
  LS --> PA[rtPushAll: update na raiz com<br/>TODOS jogadores, sessões e config]
  PA --> RL[rtListen: onValue no nó load inteiro]
  RL --> M[funde remoto no local + localStorage]
  F[formulário pré/pós/falta] --> UA[ua = pse × duração] --> SV[rtSaveSession] --> SET[set sessions/player/id]
```
