# ADR 003 — Módulos como páginas HTML autocontidas, abertas pelo hub num iframe

- **Status:** Herdada (anterior ao Git)
- **Fonte:** código, comentários e commit (Detective do Reversa, 2026-10-13)

## Contexto
Os módulos foram construídos separadamente (vários com histórico próprio, como o Perfil vindo do "SemeyDB"). 🟡

## Decisão
Cada módulo é um arquivo HTML com CSS e JS embutidos, sem build. O hub os abre num `<iframe>` e entrega o
contexto por `postMessage` (`FLUXGK_CONTEXT`). 🟢

## Consequências
- 🟢 Módulos independentes, publicáveis copiando um arquivo.
- 🟢 Cada iframe carrega de novo o adaptador, o SDK, a tradução e abre sua própria assinatura de tempo real.
- 🟢 Código repetido entre módulos (ex.: o ACWR aparece três vezes no `mod_data`; cada módulo tem seu `persist`).
- 🟢 `?v=<timestamp>` em cada abertura impede cache: o HTML inteiro é baixado de novo toda vez.
- 🟢 Contexto por `postMessage` sem verificar a origem.

## Alternativas
- SPA com build: não adotada.
