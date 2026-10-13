# Spec Impact Matrix — FluxGK

> Architect, 2026-10-13. Linha = o que muda; coluna = quem sente. **D** dependência direta (quebra se mudar),
> **L** lê os dados, **E** escreve no mesmo caminho (conflito possível), **·** sem relação.

| Muda → / Sente ↓ | hub | fluxdb | planner | period. | xg | stats | minutes | data | profile | scouting | video | tatica3d | i18n | infra |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **hub** (contexto, `clubs`) | — | · | D | D | D | D | D | D | D | D | D | · | · | · |
| **fluxdb** (API, semântica de escrita) | D | — | D | D | D | D | D | D | D | D | D | · | · | · |
| **coleção `nodes` / migrations** | D | D | D | D | D | D | D | D | D | D | D | · | · | D |
| **`load/players`** (elenco) | L | · | · | · | · | · | · | — | L | · | · | · | · | · |
| **`load/sessions`** | L | · | · | · | · | · | · | — | · | · | · | · | · | · |
| **`minutes/games`** | L | · | · | · | · | · | — | · | · | · | · | · | · | · |
| **`clubs/<id>/opponents`** | L | · | · | · | E | E | E | · | · | · | · | · | · | · |
| **`library/exercises`** | · | · | — | · | · | · | · | · | · | · | · | · | · | · |
| **cena do tatica3d** | · | · | D | · | · | · | · | · | · | · | · | — | · | · |
| **chaves de tradução** | D | · | D | D | D | D | D | D | · | · | D | D | — | · |
| **nginx / compose / PocketBase** | D | D | D | D | D | D | D | D | D | D | D | D | D | — |

## Leituras rápidas
- 🟢 O **contrato do contexto** (`FLUXGK_CONTEXT`) e a **API do `fluxdb`** tocam 10 módulos: mudanças ali exigem
  testar todos. A reescrita do adaptador precisa preservar exatamente a superfície usada (`ref`, `get`, `set`,
  `update`, `remove`, `push`, `on`/`off`, `once`, `.info/connected`, a fachada modular e o `auth`).
- 🟢 **Adversários** são o único caminho com três escritores; qualquer correção precisa mudar os três juntos.
- 🟢 O **painel do hub** depende da forma de dados de `data` e `minutes`; mudar `type` ou a estrutura de
  `load/sessions` muda os números do painel.
- 🟢 O `profile` depende do `data` para o elenco; o `planner`, do `tatica3d` para a cena.
