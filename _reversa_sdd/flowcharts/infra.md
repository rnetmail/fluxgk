# Fluxo — `infra`

> Archaeologist, 2026-10-13. Detalhes e referências de linha em `../code-analysis.md`.

```mermaid
flowchart LR
  U[navegador] -->|HTTPS| H[Hestia nginx: TLS + proxy]
  H -->|127.0.0.1:3010| N[nginx da stack]
  N -->|arquivos| ST[HTML/JS/fontes/glb]
  N -->|/api/, /api/realtime SSE, /_/| PB[PocketBase 0.40.5]
  PB --> V[(volume pb_data SQLite)]
```
