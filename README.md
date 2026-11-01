# FluxGK

SaaS para equipes de futsal com foco no treinamento de goleiros — fluxgk.com.

Sem dependência de Google/Firebase: todo o backend é self-hosted na própria VPS.

## Arquitetura

- **Frontend**: páginas HTML/JS estáticas (`index.html` + `mod_*.html`), fontes locais em `static/fonts/` (sem gstatic/googleapis).
- **Backend**: [PocketBase](https://pocketbase.io/) (binário oficial, `Dockerfile.pocketbase`), coleções e regras em `pb_migrations/`, lógica de servidor em `pb_hooks/`.
- **Compatibilidade**: `pocketbase-adapter.js` expõe um objeto global `fluxdb` com a MESMA interface do SDK do Firebase (`initializeApp`, `auth()`, `database()`, `ref().on('value', ...)` etc.) para que as páginas não precisassem ser reescritas na migração.
- **Proxy**: nginx (`Dockerfile.nginx`, `nginx/`) expõe `/api/`, `/api/realtime` (SSE sem buffer) e `/_/` (admin do PocketBase).
- **3D**: `tatica3d.html` com Three.js; assets low-poly em `static/assets/3d/` (disco de marcação, base de trave, cone — gerados via pipeline Inkscape headless → svgpathtools → shapely → trimesh).

## Ambientes

| Branch | Stack Portainer | URL |
|---|---|---|
| `develop` | `fluxgk-hml` | https://hml.fluxgk.rstecbr.com.br |
| `main` | `fluxgk` | https://fluxgk.rstecbr.com.br |

## Fluxo de CI/CD (decisão do dono, 13/10/2026)

1. Todo ajuste/feature entra em `develop`. Push em `develop` → `.github/workflows/ci.yml` roda a suíte completa (lint de JS, testes de unidade, build das imagens, smoke test do adaptador contra PocketBase real, testes de planos/assinatura/migração) e, se verde, reimplanta `fluxgk-hml` via webhook do Portainer.
2. Produção (`main`) só muda pelo workflow `implantar.yml`, disparado manualmente (botão em Configurações → Versões do app, ou Actions → Run workflow). Ele numera a versão (`1.<ano>.<seq>`), cria tag + release, avança `main` por fast-forward e reimplanta a stack `fluxgk` em produção.
3. Cada deploy é confirmado de verdade: o workflow espera `/versao.json` mostrar a impressão digital (`BUILD`) do commit implantado antes de considerar concluído.

## Local

```bash
cp .env.example .env   # ajustar PORTA_HTTP e segredos
docker compose up --build
```
