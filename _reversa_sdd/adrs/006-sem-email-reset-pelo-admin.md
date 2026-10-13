# ADR 006 — Sem SMTP: senha redefinida pelo administrador

- **Status:** Aceita (decisão do dono, registrada no compose e no adaptador)
- **Fonte:** código, comentários e commit (Detective do Reversa, 2026-10-13)

## Contexto
Configurar e manter envio de e-mail tem custo e risco de cair em spam.

## Decisão
Nenhum SMTP. `sendPasswordResetEmail` rejeita de propósito; o administrador redefine no painel `/_/`. 🟢

## Consequências
- 🟢 Dependência do administrador para cada senha esquecida.
- 🟢 Contas nunca ficam "verificadas".
- 🟡 Combinado com o cadastro aberto pela API, qualquer um pode criar conta sem confirmar e-mail.
