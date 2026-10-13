# Plano de Engenharia Reversa — FluxGK

PWA de treinamento de goleiros (~34,7 mil linhas): páginas HTML autocontidas por módulo, servidas por
nginx, com backend PocketBase atrás do adaptador `fluxdb` (que substituiu o Firebase em 12/10/2026).

## Fase 1 — Reconhecimento
- [x] **Scout** — Mapear estrutura, dependências, entry points e infraestrutura (compose, nginx, PocketBase).

## Fase 2 — Escavação
- [x] **Archaeologist** — Análise do módulo `hub` (index.html — login, clube/temporada, carga dos módulos)
- [x] **Archaeologist** — Análise do módulo `fluxdb` (static/pocketbase-adapter.js + pb_migrations)
- [x] **Archaeologist** — Análise do módulo `planner` (mod_planner.html)
- [x] **Archaeologist** — Análise do módulo `periodization` (mod_periodization.html)
- [x] **Archaeologist** — Análise do módulo `xg` (mod_xg.html)
- [x] **Archaeologist** — Análise do módulo `stats` (mod_stats.html)
- [x] **Archaeologist** — Análise do módulo `minutes` (mod_minutes.html)
- [x] **Archaeologist** — Análise do módulo `data` (mod_data.html)
- [x] **Archaeologist** — Análise do módulo `profile` (mod_profile.html)
- [x] **Archaeologist** — Análise do módulo `scouting` (mod_scouting.html)
- [x] **Archaeologist** — Análise do módulo `video` (mod_video.html)
- [x] **Archaeologist** — Análise do módulo `tatica3d` (tatica3d.html)
- [x] **Archaeologist** — Análise do módulo `i18n` (fluxgk-i18n.js)
- [x] **Archaeologist** — Análise do módulo `infra` (compose, Dockerfiles, nginx, entrypoint)

## Fase 3 — Interpretação
- [x] **Detective** — Regras de negócio e fluxos (sessões, jogos, xG, minutagem, periodização, perfil, vídeo).
- [x] **Architect** — Arquitetura atual (C4) e modelo de dados (árvore `users/<uid>/…` sobre a coleção `nodes`).

## Fase 4 — Geração
- [x] **Writer** — Especificações executáveis (SDD) por componente. ✅

## Fase 5 — Revisão
- [x] **Reviewer** — Exatidão técnica e nível de confiança das specs. ✅
