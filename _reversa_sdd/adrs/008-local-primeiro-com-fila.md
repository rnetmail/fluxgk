# ADR 008 — Cópia no navegador e fila de reenvio contra perda de dados

- **Status:** Herdada, reforçada aos poucos
- **Fonte:** código, comentários e commit (Detective do Reversa, 2026-10-13)

## Contexto
Os comentários registram perdas reais: exercício "salvo" que sumia, treino apagado que voltava, pré-treino que
reabria sozinho, app que abria "zerado".

## Decisão
Cada módulo mantém sua cópia no `localStorage` (planner: espelho sem imagens e fila de 15 s; data: estado
inteiro; scouting e xg: cópia) e só sobe para a nuvem quando a conexão e o login estão prontos. 🟢

## Consequências
- 🟢 Resiliência a rede ruim e a falhas de gravação.
- 🟢 Cada módulo resolve à sua maneira, sem regra comum de quem vence no conflito: o `data` deixa o navegador vencer
  (sobe tudo antes de ler); o `video` deixa vencer quem tem mais lances; o `scouting` deixa a nuvem vencer.
- 🟢 O teto de ~5 MB do `localStorage` já estourou e motivou versões "enxutas" das cópias.
