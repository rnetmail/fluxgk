# C4 — Containers (nível 2)

> Architect, 2026-10-13.

```mermaid
flowchart TB
  subgraph browser["Navegador do técnico"]
    hub["Hub — index.html<br/>login, clube/temporada, painel"]
    mods["Módulos — mod_*.html em iframe<br/>planner, periodization, xg, stats, minutes,<br/>data, profile, scouting, video"]
    t3d["tatica3d.html<br/>three.js, iframe do planner"]
    adapter["fluxdb — pocketbase-adapter.js<br/>1 instância por página"]
    ls[("localStorage / IndexedDB<br/>cópias, filas, handles de vídeo")]
    hub -- "postMessage FLUXGK_CONTEXT" --> mods
    mods -- "FLUXGK_MODULE_READY / STAT_UPDATE / VIDEO_MAXIMIZE" --> hub
    mods --> t3d
    hub --> adapter
    mods --> adapter
    mods --> ls
  end

  subgraph vps["VPS — Docker"]
    hestia["Hestia (nginx do host)<br/>TLS + proxy"]
    nginx["nginx 1.27 — contêiner<br/>estáticos, gzip, IP real, proxy"]
    pb["PocketBase 0.40.5 — contêiner<br/>REST /api, SSE /api/realtime, painel /_/<br/>rate limit por IP"]
    db[("SQLite — volume pb_data<br/>coleções users e nodes")]
  end

  adapter -- "HTTPS REST + SSE" --> hestia
  hub -- "HTTPS arquivos" --> hestia
  hestia -- "HTTP 127.0.0.1:3010" --> nginx
  nginx -- "/api/, /api/realtime, /_/" --> pb
  pb --> db
```

| Container | Tecnologia | Responsabilidade | Confiança |
|---|---|---|---|
| Hub | HTML + JS inline | autenticação, contexto, painel | 🟢 |
| Módulos | HTML + JS inline, sem build | regras de cada domínio, relatórios, gráficos | 🟢 |
| fluxdb | JS (navegador) | tradução Firebase → PocketBase; tempo real | 🟢 |
| Armazenamento do navegador | localStorage, sessionStorage, IndexedDB | cópias de segurança, filas, preferências, handles | 🟢 |
| Hestia | nginx do host | TLS, domínio | 🟢 |
| nginx da stack | nginx 1.27-alpine | arquivos estáticos e proxy | 🟢 |
| PocketBase | Go, binário oficial | auth, REST, SSE, regras, painel | 🟢 |
| SQLite | arquivo em volume Docker | persistência | 🟢 |

**Observações**
- 🟢 Cada página aberta (hub + módulo) mantém sua própria conexão SSE e seu próprio `authRefresh`.
- 🟢 Não há servidor de aplicação: toda regra de negócio roda no navegador; o servidor só guarda e isola.
