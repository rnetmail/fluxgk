# ADR 007 — Stack própria (nginx + PocketBase) atrás do Hestia

- **Status:** Aceita (2026-10-12/13)
- **Fonte:** código, comentários e commit (Detective do Reversa, 2026-10-13)

## Contexto
A VPS já publica outros sites pelo Hestia (TLS, domínios).

## Decisão
Compose com dois serviços; porta só no `127.0.0.1`; o Hestia faz TLS e proxy. Desenho previsto: duas stacks no
Portainer (`fluxgk` ← `main` na 3010, `fluxgk-hml` ← `develop` na 3011). Em 13/10: IP real pelo
`X-Forwarded-For` do Hestia e rate limiting por IP no PocketBase. 🟢

## Consequências
- 🟢 Nada do PocketBase exposto direto à internet, exceto pelo proxy.
- 🟡 Hoje só existe a stack de produção, subida por `docker compose` a partir da árvore de trabalho do repositório,
  não pelo Portainer. HML não existe.
- 🔴 LACUNA: sem rotina de backup do volume `pb_data` registrada.

## Atualização (13/10/2026)
- 🟢 As duas stacks existem e são gerenciadas pelo Portainer a partir do Git (`fluxgk` ← `main`, `fluxgk-hml` ← `develop`),
  com deploy por webhook depois do CI. HML tem base própria (nasceu cópia de PRD).
- 🟢 Versão `1.<ano>.<seq>`; PRD só muda pelo workflow `implantar`, pedido pelo admin na tela do app.
- 🔴 Backup automático do `pb_data` continua sem rotina (só backups manuais em `/root/.fluxgk/backups/`).
