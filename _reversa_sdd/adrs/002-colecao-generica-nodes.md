# ADR 002 — Guardar a árvore do Realtime Database numa coleção genérica `nodes`

- **Status:** Aceita (2026-10-12)
- **Fonte:** código, comentários e commit (Detective do Reversa, 2026-10-13)

## Contexto
As páginas leem e gravam caminhos arbitrários (`users/<uid>/data/<clube>/<temporada>/…`), às vezes objetos
inteiros, às vezes folhas.

## Decisão
Uma coleção `nodes {owner, path, data}` com índice único `(owner, path)`. Cada escrita grava um nó no caminho
escrito e apaga os descendentes; a leitura monta o valor a partir de ancestral, nó exato e descendentes. 🟢

## Consequências
- 🟢 "1 escrita = 1 nó", sem explodir em milhares de linhas.
- 🟢 O banco não conhece entidades: não há esquema, validação nem consulta por campo no servidor. Toda regra mora no navegador.
- 🟢 Teto de 5 MB por nó (`maxSize` do campo `data`): módulos que gravam a temporada num nó só (`xg/games`,
  `video`) têm limite de volume.
- 🟢 Isolamento simples e forte: regra única `owner = @request.auth.id`.

## Alternativas
- Uma coleção por entidade (sessões, jogos, jogadores…): exigiria reescrever as páginas.
- Um nó por folha: milhares de linhas por técnico e leituras caras.
