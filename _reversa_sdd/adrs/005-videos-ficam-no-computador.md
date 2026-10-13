# ADR 005 — Vídeos ficam no computador do técnico; só metadados na nuvem

- **Status:** Herdada
- **Fonte:** código, comentários e commit (Detective do Reversa, 2026-10-13)

## Contexto
Vídeos de jogo têm gigabytes; armazenar e servir isso custa caro.

## Decisão
O Video Lab abre os arquivos locais (File System Access API + handles no IndexedDB) e exporta cortes no próprio
navegador (mp4box ou MediaRecorder). Na nuvem vão só lances, playlists, dashboards e projetos. 🟢

## Consequências
- 🟢 Custo de armazenamento zero no servidor.
- 🟢 Só funciona por completo no Chrome/Edge de desktop; em outro aparelho os lances aparecem, mas o vídeo precisa ser religado.
- 🟡 O `client_max_body_size 512M` do nginx sugere que já se pensou em subir vídeo; hoje nada usa isso.
