# Fluxo — `hub`

> Archaeologist, 2026-10-13. Detalhes e referências de linha em `../code-analysis.md`.

```mermaid
flowchart TD
  A[boot] --> B[carrega pocketbase-adapter.js]
  B --> C{onAuthStateChanged}
  C -- sem usuário --> L[tela de login] --> D[doLogin: setPersistence + signIn] --> C
  C -- com usuário --> E[loadAll: clubs, active, profile<br/>timeout 20 s, 1 nova tentativa]
  E -- falhou --> X[_loadFailed = true + aviso] --> H
  E -- ok --> F[corrige clube/temporada ativos sumidos]
  F --> H[painel: applyIdentity + loadStats]
  H --> G{tem clube?}
  G -- não --> S[abre seletor de clube]
  H --> M[openModule]
  M --> N{dataPath?}
  N -- não --> S
  N -- sim --> I[iframe mod_*.html?v=ts]
  I --> R[módulo envia FLUXGK_MODULE_READY] --> P[pushContext FLUXGK_CONTEXT]
```
