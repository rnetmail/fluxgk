# ERD — FluxGK

> Architect, 2026-10-13. Dois níveis: o **físico** (o que o SQLite tem) e o **lógico** (o que as páginas gravam
> dentro de `nodes.data`). O servidor só conhece o físico; todas as relações lógicas são mantidas pelo navegador.

## Físico 🟢

```mermaid
erDiagram
  USERS ||--o{ NODES : "owner (cascade)"
  USERS {
    text id PK
    email email UK
    text password
    text name
    bool verified
  }
  NODES {
    text id PK
    relation owner FK
    text path "≤ 1024; UK com owner"
    json data "≤ 5 MB; {v: valor}"
    autodate created
    autodate updated
  }
```

## Lógico 🟢 (salvo onde marcado)

```mermaid
erDiagram
  TECNICO ||--|| PERFIL_TECNICO : tem
  TECNICO ||--o{ CLUBE : trabalha_em
  TECNICO ||--o{ EXERCICIO : biblioteca
  TECNICO ||--o| CRITERIOS : modelo_de_avaliacao
  TECNICO ||--o{ GOLEIRO_OBSERVADO : scouting
  CLUBE ||--o{ TEMPORADA : tem
  CLUBE ||--o{ ADVERSARIO : enfrenta
  TEMPORADA ||--o{ JOGADOR : elenco_load
  TEMPORADA ||--o{ SESSAO_TREINO : planner
  TEMPORADA ||--o| PERIODIZACAO : periodization
  TEMPORADA ||--o{ JOGO_STATS : stats
  TEMPORADA ||--o{ JOGO_MINUTOS : minutes
  TEMPORADA ||--o| JOGOS_XG : "xg (nó único)"
  TEMPORADA ||--o| DOC_VIDEO : "video (nó único)"
  JOGADOR ||--o{ REGISTRO_CARGA : sessions
  JOGADOR ||--o| PERFIL_GOLEIRO : "profile/gk"
  JOGADOR ||--o{ AVALIACAO : "uma por data"
  JOGADOR ||--o{ DIARIO : log
  REGISTRO_CARGA |o--o| REGISTRO_CARGA : "pre.postId / post.preId"
  SESSAO_TREINO ||--|{ EXERCICIO : "cópia embutida"

  CLUBE {
    text id PK "slug do nome"
    text name
    text abbr
    text color
    text badge "base64"
  }
  TEMPORADA {
    text id PK "slug do rótulo"
    text label
    number createdAt
  }
  ADVERSARIO {
    text id PK "slug"
    text name
    text badge "some quando o minutes grava"
  }
  JOGADOR {
    text id PK
    text name
    text photo "base64"
    text status
    text statusDesde
    text statusNota
  }
  REGISTRO_CARGA {
    text id PK "pre_ts / post_ts"
    text type "pre|post|absence|rest"
    date date
    text time
    text trainingType
    number pse
    number duration
    number ua
    text preId
    text postId
  }
  SESSAO_TREINO {
    number id PK "Date.now()"
    date date
    text type
    text players "texto livre"
    number rating
    text objMet
  }
  EXERCICIO {
    number id PK
    text phase
    text name
    number duration
    number players
    text img "base64"
    json tatica
  }
  JOGO_STATS {
    number id PK
    date date
    text opponent "nome, não id"
    text gk "nome"
    number gf
    number ga
    text outcome "W|D|L"
    json shots
    json offActions
  }
  JOGO_MINUTOS {
    number id PK
    date date
    text opp "nome"
    json gkData "chave = nome do goleiro"
  }
  PERFIL_GOLEIRO {
    text playerId PK
    bool archived
    json scores
  }
  AVALIACAO {
    text playerId PK
    date date PK
    json scores
    text note
  }
```

## Relações que só existem por convenção 🟢
| Relação | Como é mantida | Risco |
|---|---|---|
| Jogo (stats/minutes) → goleiro | **nome** em texto | renomear separa o histórico; não liga ao elenco do Load Control |
| Jogo → adversário | **nome** em texto; o adversário tem id = slug do nome | dois nomes iguais em grafias diferentes viram dois adversários |
| Sessão do planner → goleiros | texto separado por vírgula | sem vínculo com o elenco |
| Sessão do planner → exercícios | **cópia** do exercício | editar o exercício na biblioteca não altera sessões antigas (proposital 🟡) e duplica imagens |
| Pré ↔ pós | `postId` / `preId` | quebra já ocorreu; há reparo automático |
| Perfil, avaliação, diário → jogador | `playerId` do Load Control | jogador apagado deixa perfil órfão 🟡 |
