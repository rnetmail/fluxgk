# Inventário — FluxGK

> Gerado pelo Scout do Reversa em 2026-10-13. Raiz: `/home/rstecbr/web/fluxgk.rstecbr.com.br/private/fluxgk`.
> Repositório `github.com/rnetmail/fluxgk`, branch `develop`; 210 commits desde 2026-05-24.

## O que é

PWA de treinamento de goleiros de futsal ("Data-Driven GK — plataforma do treinador de goleiros").
Não há build: cada tela é um arquivo HTML autocontido (HTML + CSS + JS inline), servido estático pelo
nginx. Os dados do usuário vão para o PocketBase através do adaptador `fluxdb`, que imita a API do
Firebase Realtime Database (compat 9.x). O Firebase foi substituído em 12/10/2026 (commit `9164d04`).

## Linguagens

| Linguagem | Arquivos | Linhas aprox. | Observação |
|---|---|---|---|
| HTML com JS e CSS inline | 12 | ~31.900 | o grosso da lógica está aqui |
| JavaScript | 7 | ~2.900 próprias | `fluxgk-i18n.js` (2.275), adaptador (560), migration (80), teste (1 `.mjs`); `static/vendor/` são bibliotecas de terceiros |
| Shell | 1 | 29 | entrada do contêiner do PocketBase |
| Python | 1 | — | `tools/gerar-glb.py`, gera os modelos 3D |
| nginx conf | 1 | — | `nginx/conf.d/default.conf` |

## Estrutura

```
index.html                 hub: login, clube/temporada, painel, abre os módulos num iframe
mod_planner.html           GK Planner — sessões de treino e biblioteca de exercícios (2.197 l.)
mod_periodization.html     periodização: macro, meso e microciclo (1.236 l.)
mod_xg.html                xG System — gols esperados e mapa de chutes (2.052 l.)
mod_stats.html             estatísticas de goleiro por jogo (2.753 l.)
mod_minutes.html           GK Minutes — minutagem por jogo (1.354 l.)
mod_data.html              dados / carga (2.648 l.)
mod_profile.html           perfil do goleiro (5.946 l.)
mod_scouting.html          scouting de adversários (927 l.)
mod_video.html             Video Lab — análise e exportação de vídeo (9.352 l.)
tatica3d.html              Tactics 3D — three.js + modelos .glb, sem dados no banco (2.156 l.)
diagnostico.html           ferramenta de diagnóstico de dados locais → /ferramentas/diagnostico.html
fluxgk-i18n.js             traduções (TX/TXf), usado por 10 páginas
static/pocketbase-adapter.js  adaptador `fluxdb` (Firebase compat → PocketBase)
static/vendor/             pocketbase.umd.js, three.min.js, GLTFLoader.js, SkeletonUtils.js
static/fonts/              21 .woff2 + fonts.css (substituem o Google Fonts)
assets/                    goleiro.glb, jogador.glb, adversario.glb
icons/, *.png, manifest.*  PWA
pb_migrations/             1760270000_init_fluxgk.js — coleção `nodes` e regras de `users`
docker/                    pocketbase-entrypoint.sh
nginx/conf.d/default.conf  site estático + proxy de /api/, /api/realtime e /_/
Dockerfile.nginx, Dockerfile.pocketbase, docker-compose.yml, .env.example
tools/                     smoke-adapter.mjs (teste de fumaça), gerar-glb.py
CNAME                      fluxgk.com (herança do GitHub Pages)
```

## Pontos de entrada

| Caminho | Tipo | Papel |
|---|---|---|
| `index.html` | app_entry | Hub. `MOD_FILES` (linha 342) mapeia `xg, planner, data, stats, minutes, video, period, profile, scouting` para os arquivos; `openModule()` (linha 940) carrega o módulo no `<iframe id="mfrm">` com `?v=<timestamp>` |
| `mod_*.html` | module_entry | Cada módulo carrega `/static/pocketbase-adapter.js` sozinho e recebe do hub `uid`/`dataPath` por `postMessage` (ex.: `mod_planner.html:494-511`) |
| `tatica3d.html` | module_entry | 3D isolado, sem banco |
| `docker-compose.yml` | infra | serviços `pocketbase` e `nginx`; porta `127.0.0.1:${PORTA_HTTP}` |
| `docker/pocketbase-entrypoint.sh` | server_entry | upsert do superusuário, `migrate up`, `pocketbase serve` |

## Configuração e ambientes

- `.env.example`: `PORTA_HTTP` (3010 PRD / 3011 HML), `PB_VERSION`, `PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD`, `PB_ENCRYPTION_KEY`, `TZ`.
- Desenho de duas stacks no Portainer (`fluxgk` ← `main`, `fluxgk-hml` ← `develop`). 🟡 INFERIDO: hoje só a de
  produção existe, subida por `docker compose -p fluxgk` a partir deste diretório, e não pelo Portainer.
- Proxy público: Hestia (`fluxgk.rstecbr.com.br` → `127.0.0.1:3010`).
- Ajustes do PocketBase feitos em 13/10 por API, fora do repositório: `appURL`, `trustedProxy: X-Real-IP` e rate limiting.

## CI/CD

Nenhum. Não há `.github/workflows/`, Jenkinsfile nem script de deploy.

## Banco de dados (superficial)

- PocketBase 0.40.5 (SQLite), volume `pb_data`.
- `pb_migrations/1760270000_init_fluxgk.js`: coleção genérica `nodes {owner, path, data}` com índice único
  `(owner, path)` e índice em `path`; regras `owner = @request.auth.id`; `users` com cadastro aberto.
- O modelo lógico é a árvore do antigo Realtime Database: `users/<uid>/…` (ex.: `…/planner/sessions`,
  `users/<uid>/library/exercises`, `users/<uid>/data/<clube>/<temporada>`).

## Testes

- `tools/smoke-adapter.mjs`: teste de fumaça do adaptador contra um PocketBase real, em Node 22, com DOM e
  EventSource simulados. É o único teste.
- Nenhum framework de teste, nenhum `*.test.*` / `*.spec.*`. Cobertura das páginas: zero.

## Dependências externas em tempo de execução (CDN)

Chart.js, mp4box, pdf-lib, fontkit, jszip, Tabler Icons e fontes `@fontsource`. Detalhes em `dependencies.md`.
