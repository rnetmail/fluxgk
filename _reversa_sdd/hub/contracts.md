# Hub, Contratos

> Contrato de mensagens entre o hub (`index.html`, janela pai) e os módulos (`mod_*.html`, iframe `mfrm`), e entre
> o `planejamento` e o `tatica-3d`. Transporte: `window.postMessage`. Mesma origem em produção.

## 1. Hub → módulo: `FLUXGK_CONTEXT` 🟢

Enviado por `pushContext(win)` (`index.html:948`):
- quando o módulo avisa `FLUXGK_MODULE_READY`;
- 600 ms depois do evento `load` do iframe (rede de segurança);
- quando o perfil do técnico é salvo;
- quando o idioma muda.

Destino atual: `'*'`.

```jsonc
{
  "type": "FLUXGK_CONTEXT",
  "uid": "string",                 // id do técnico (users.id)
  "cloudConfig": { "backend": "pocketbase", "url": "" },   // "" = mesma origem
  "dataPath": "users/<uid>/data/<clubId>/<seasonId>",       // onde o módulo grava os dados da temporada
  "lang": "en | pt",
  "club":   { "id": "string", "name": "string", "abbr": "string", "color": "#rrggbb", "badge": "data URL | ''" },
  "season": { "id": "string", "label": "string" },
  "coach":  { "name": "string", "methodology": "string" },
  // formato ANTIGO, mantido para módulos ainda não migrados (lido por `data` e `xg`)
  "profile": {
    "coachName": "string", "clubName": "string", "clubColor": "#rrggbb",
    "clubBadge": "data URL | ''", "methodology": "string", "seasonLabel": "string"
  }
}
```

Obrigações do módulo ao receber 🟢:
| Regra | Quem cumpre hoje |
|---|---|
| Recusar se faltar `uid`, `dataPath` ou `cloudConfig` | planner, stats, minutes, xg, periodization, profile, data, scouting |
| Aceitar só de `window.parent` (`e.source === window.parent`) | todos, **exceto** `data` e `video` |
| Aplicar `lang` com `setLang(lang, false)` (não persistir) | todos os que usam `fluxgk-i18n.js` |
| Não reinicializar a conexão se o contexto chegar de novo (troca de idioma) | `data` (`_fbStarted`), `planner` (`_fbReady`), demais por flag própria |
| Trocar de temporada zera a lista e espera a resposta nova | `planner` |

Uso dos campos por módulo 🟢:
| Campo | Usado para |
|---|---|
| `dataPath` | raiz dos dados da temporada (`/planner`, `/stats`, `/minutes`, `/xg`, `/load`, `/profile`, `/periodization`, `/video`) |
| `uid` | caminhos globais do técnico: `library/exercises`, `library/gkCriteria`, `scouting`, `xg-misc`, `clubs/<clubId>/opponents` |
| `club.id` | caminho de adversários (`stats`, `minutes`, `xg`) |
| `club.color`, `club.badge`, `club.name` | identidade visual e cabeçalho de relatórios |
| `profile.*` | identidade no `data` e no `xg` (formato antigo) |

## 2. Módulo → hub 🟢

| `type` | Campos | Efeito no hub | Quem envia |
|---|---|---|---|
| `FLUXGK_MODULE_READY` | `module: string` | `pushContext(e.source)` | os 9 módulos (`planner`, `stats`, `minutes`, `xg`, `periodization`, `profile`, `data`, `scouting`, `video`) |
| `FLUXGK_VIDEO_MAXIMIZE` | `on: boolean` | alterna a classe `vidmax` do iframe | `video` (`mod_video.html:3255`) |
| `FLUXGK_STAT_UPDATE` | — | `loadStats()` | **nenhum módulo envia** 🟢 — o painel só se atualiza ao fechar o módulo |

Destino atual: `'*'`.

## 3. Planejamento ↔ Tática 3D 🟢

O `planejamento` abre `tatica3d.html?embed=1` num iframe próprio (`mod_planner.html:993`).

| Sentido | `type` | Campos | Efeito |
|---|---|---|---|
| tática → planner | `fluxgk-tatica-ready` | — | o planner envia a cena atual (`mod_planner.html:1009`) |
| planner → tática | `fluxgk-tatica-load` | `cena: object \| null` | a tática carrega a cena do exercício em edição (`:1008`) |
| tática → planner | `fluxgk-tatica-image` | `dataUrl: string`, `cena: object` | vira a imagem e o campo `tatica` do exercício (`:1013`; `tatica3d.html:1985`) |
| tática → planner | `fluxgk-tatica-close` | — | fecha o modal (`:1020`; `tatica3d.html:1991`) |

Destino: `'*'` nos dois sentidos.

## 4. Invariantes e evolução

- 🟢 O contrato é a fronteira entre o hub e os módulos: mudar nomes de campos quebra até 9 módulos (ver `../traceability/spec-impact-matrix.md`).
- 🟢 O campo `profile` (formato antigo) só pode sair depois que `data` e `xg` passarem a ler `club`/`coach`.
- 🟢 **Correção recomendada:** enviar para `location.origin` e conferir `event.origin === location.origin` em toda escuta (hub, módulos e tática).
- 🟡 **Correção recomendada:** remover `badge` do contexto e deixar o módulo buscar o escudo sob demanda; hoje cada envio carrega até ~670 KB.
- 🟡 **Lacuna de comportamento:** decidir se os módulos devem enviar `FLUXGK_STAT_UPDATE` ao salvar (o hub já escuta) ou se a escuta deve sair.
- **Evolução (D-10):** `lang` passa a aceitar os 9 códigos `pt-PT, pt-BR, en, fr, de, ru, es, it, nl`; módulos devem aceitar códigos novos sem quebrar (fallback para `en`).
