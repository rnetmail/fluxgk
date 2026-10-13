# C4 — Componentes (nível 3)

> Architect, 2026-10-13. Os dois containers que concentram o comportamento: o adaptador e um módulo típico.

## fluxdb (pocketbase-adapter.js)

```mermaid
flowchart LR
  subgraph fluxdb
    app["app<br/>initializeApp, apps"]
    auth["auth<br/>signIn, signOut, onAuthStateChanged,<br/>setPersistence, createUser"]
    ref["ref / makeRef<br/>get, once, set, update, remove, push, on, off"]
    read["readPath<br/>busca ancestral+exato+descendentes"]
    write["writePath<br/>lê, apaga descendentes, grava"]
    resolve["resolve<br/>monta o valor em 3 camadas"]
    rt["tempo real<br/>subscribe('*') + notify + emit"]
    conn[".info/connected<br/>ping /api/health 20 s"]
    modular["fachada modular v10<br/>usada pelo mod_data"]
  end
  sdk["PocketBase JS SDK"]
  ref --> read --> resolve
  ref --> write --> rt
  rt --> read
  modular --> ref
  auth --> sdk
  read --> sdk
  write --> sdk
  rt --> sdk
  conn -->|fetch| health["/api/health"]
```

## Módulo típico (padrão repetido em planner, stats, minutes, xg, periodization, profile, scouting)

```mermaid
flowchart LR
  ctx["receptor de contexto<br/>message FLUXGK_CONTEXT"]
  paths["caminhos<br/>_PATH / _SPATH / _MPATH / _XPATH"]
  loader["carregador<br/>SDK + adaptador"]
  listeners["listeners on('value')<br/>ligados após o login"]
  state["estado em memória<br/>ST / PZ / DB / state"]
  ui["telas e formulários"]
  persist["persist / save<br/>grava na nuvem"]
  local["cópia local / fila"]
  reports["relatórios<br/>Chart.js, pdf-lib, jszip"]
  ctx --> paths --> loader --> listeners --> state --> ui
  ui --> persist --> local
  persist -->|fluxdb| cloud["PocketBase"]
  ui --> reports
```

| Componente | Variações relevantes | Confiança |
|---|---|---|
| Receptor de contexto | 8 módulos conferem `e.source`; `data` e `video` não | 🟢 |
| Persistência | por item (`planner`, `stats/games`, `minutes/games`, `data`, `profile`), documento único (`periodization`, `video`, `xg/games`) ou diferença (`scouting`) | 🟢 |
| Cópia local | fila com reenvio (`planner`), estado inteiro que sobe ao abrir (`data`), cópia simples (`scouting`, `xg`), mescla por lances (`video`) | 🟢 |
