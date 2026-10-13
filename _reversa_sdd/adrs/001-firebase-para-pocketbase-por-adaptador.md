# ADR 001 — Trocar o Firebase pelo PocketBase com um adaptador de mesma interface

- **Status:** Aceita (2026-10-12, commit `9164d04`)
- **Fonte:** código, comentários e commit (Detective do Reversa, 2026-10-13)

## Contexto
O app nasceu sobre o Firebase Realtime Database (SDK compat 9.x nas páginas, SDK modular v10 no `mod_data`). A
migração para hospedagem própria precisava acontecer sem reescrever ~32 mil linhas de páginas.

## Decisão
Criar `static/pocketbase-adapter.js`, o global `fluxdb`, com a mesma superfície do Firebase (app, auth, database e a
fachada modular). As páginas só trocaram o prefixo `firebase.` → `fluxdb.`. 🟢

## Consequências
- 🟢 Migração em um dia, com teste de fumaça do adaptador (`tools/smoke-adapter.mjs`).
- 🟢 O padrão de acesso das páginas foi preservado, inclusive o que só era barato no Firebase: o SDK do Firebase
  guardava uma cópia local e respondia leituras e escritas de memória; o adaptador vai à rede em cada uma. Daí
  as 4 viagens por gravação (ver `code-analysis.md`).
- 🔴 LACUNA: não há no repositório ferramenta de importação dos dados do Firebase. Não está registrado se os
  dados antigos dos técnicos foram migrados ou se a produção começou vazia.

## Alternativas
- Reescrever as páginas sobre a API nativa do PocketBase: mais rápido em tempo de execução, inviável no prazo.
- Manter o Firebase: contrariava a hospedagem própria.
