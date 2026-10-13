# Tradução (i18n), Design Técnico

## Interface

### Organização do arquivo 🟢
| Bloco | Linhas | Papel |
|---|---|---|
| cabeçalho com o modo de uso | 1–16 | |
| `DICT.en` | 23–1091 | 2.117 chaves |
| `DICT.pt` | 1092–2161 | as mesmas 2.117 chaves |
| estado (`STORE`, `_lang`, `_subs`, `_applying`, `_timer`, `SEL`) | 2163–2165 | |
| `detect`, `lookup` | 2167–2183 | |
| objeto `I18N` (API pública) | 2184–2243 | |
| observador do DOM (`watch`) | 2245–2267 | |
| exportação para `window` e aplicação inicial | 2269–2277 | |

Script clássico (IIFE, ES5), sem dependência, carregado com `<script src="fluxgk-i18n.js">` antes do código de cada
página.

### Formato das chaves 🟢
`<prefixo>.<nome>[.<sub>]`, texto puro. Prefixos e tamanho:

| Prefixo | Dono | Chaves |
|---|---|---|
| `common` | todos | 26 |
| `hub` | hub | 145 (123 + 22 `hub.ver.*` da tela de versões, 13/10) |
| `plan` | planejamento | 189 |
| `period` | periodização | 95 |
| `xg` | xG | 192 |
| `st` | estatística | 264 |
| `min` | minutagem | 95 |
| `data` | controle de carga | 311 |
| `scout` | scouting | 1 |
| `vid` | vídeo | 717 |
| `tat` | tática 3D | 82 |

- 57 chaves têm o mesmo texto nos dois idiomas (siglas e marcas: `ACWR`, `Macro`, `Scouting`, `‹ HUB`).
- 7 valores têm marcador a substituir (`{n}`), trocado pela tela com `.replace('{n}', …)`; não há função de plural nem de formatação.
- 3 valores têm `<br>` (`hub.msg.loadFailBoot`, `data.pdf.coverTitle`, `plan.pdf.title`) e entram na tela por `innerHTML`, não por `data-i18n-html`.

### API (`window.FluxGKI18n`, `window.TX`) 🟢
| Chamada | Efeito |
|---|---|
| `getLang()` | idioma atual; na primeira chamada, roda `detect()` |
| `setLang(l, persist)` | ignora `l` fora de `en`/`pt`; troca `_lang`; grava `fluxgk_lang` se `persist !== false`; ajusta `<html lang>`; `apply()`; avisa os assinantes **só se mudou** |
| `t(chave, reserva)` / `TX(chave, reserva)` | `lookup(idioma, chave)` → `reserva` → `chave` |
| `onChange(fn)` | acrescenta assinante; não há como remover |
| `apply(raiz)` | aplica `data-i18n*` dentro de `raiz` (padrão: documento), marcando `_applying` |
| `missing()` | chaves de `en` ausentes em `pt` |
| `_dict` | o dicionário, exposto para diagnóstico |

### Atributos (`_apply`) 🟢
| Atributo | Destino |
|---|---|
| `data-i18n` | `textContent` (ou `innerHTML` com `data-i18n-html`) |
| `data-i18n-placeholder` | `placeholder` |
| `data-i18n-title` | `title` |
| `data-i18n-aria` | `aria-label` |
| `data-i18n-alt` | `alt` |
| `data-i18n-value` | `value` |

Chave sem texto em nenhum idioma deixa o elemento como está (o texto escrito no HTML serve de reserva).

### Contexto vindo do hub 🟢
O hub põe `lang: FluxGKI18n.getLang()` no `FLUXGK_CONTEXT` (`index.html:933`). Cada módulo aplica:

| Módulo | Onde | Observação |
|---|---|---|
| planejamento | `mod_planner.html:506` | também atualiza o botão da quadra tática |
| periodização | `mod_periodization.html:22` | |
| xG | `mod_xg.html:1365` | |
| estatística | `mod_stats.html:24` | |
| minutagem | `mod_minutes.html:24` | |
| controle de carga | `mod_data.html:2611` | |
| scouting | `mod_scouting.html:222` | |
| vídeo | `mod_video.html:9112` | |
| perfil | `mod_profile.html:5842` | dicionário próprio; aceita `pt`/`en`, outro valor vira `pt` |
| tática 3D | — | não recebe contexto; lê `fluxgk_lang` do navegador |

Telas que redesenham por código assinam `onChange`: controle de carga (`:2590`), periodização (`:1230`),
estatística (`:2712`). As demais redesenham quando recebem o contexto de novo.

## Fluxo Principal
1. A página carrega o script; no `DOMContentLoaded` (ou na hora, se já carregou) roda `apply()` e liga o observador (`:2269-2277`).
2. `apply()` chama `getLang()`, que roda `detect()`: `fluxgk_lang` válido → ele; senão `navigator.language` começando com `pt` → `pt`; senão `en`.
3. No hub, depois de ler os dados da conta: se há `profile.lang` e o navegador não tem `fluxgk_lang`, `setLang(profile.lang)` (que grava no navegador) (`index.html:445`).
4. O técnico toca EN ou PT: `setLang(l)` grava no navegador; o hub redesenha cartões, saudação e painel de clubes, grava `profile/lang` na nuvem e reenvia o contexto ao módulo aberto (`index.html:674-686`).
5. O módulo recebe `FLUXGK_CONTEXT` e chama `setLang(lang, false)`: aplica sem gravar e avisa os assinantes, que redesenham.
6. A tela insere HTML com `data-i18n` depois: o observador vê o elemento novo e agenda um `apply(document)` no próximo passo (`setTimeout 0`), ignorando as mudanças que ele mesmo causa.

## Fluxos Alternativos
- **`localStorage` bloqueado:** `detect` usa só o navegador; `setLang` troca sem gravar. 🟢
- **Idioma desconhecido (`fr`, `ru`…):** `setLang` sai sem fazer nada nem avisar; a tela fica no idioma anterior. 🟢
- **Chave inexistente nos dois idiomas:** `TX` devolve a reserva ou a própria chave; `data-i18n` mantém o texto do HTML. 🟢
- **Erro num assinante:** engolido; os outros são avisados. 🟢
- **Gravar `profile/lang` falhou:** engolido (`.catch(function(){})`); vale só no aparelho. 🟢

## Dependências
- `localStorage` e `navigator.language`. 🟢
- `MutationObserver` (sem ele, nada de reaplicação automática). 🟢
- `hub`, que escolhe o idioma e o grava em `profile/lang` pelo `adaptador-fluxdb`. 🟢
- Consumidores: todos os módulos, exceto o Perfil. 🟢

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---|---|---|
| Dicionário único para o app, com prefixo por módulo | cabeçalho, `:1-16` | 🟢 |
| Inglês como idioma de reserva | `lookup`, `:2178` | 🟢 |
| O hub é a fonte do idioma; o módulo não grava | cabeçalho, `:14-15`; `setLang(…, false)` nos módulos | 🟢 |
| Escolha local vence o perfil | comentário em `index.html:444` | 🟢 |
| Observador do DOM em vez de exigir `apply()` em cada tela | comentário em `watch` | 🟢 |
| Texto do HTML como reserva visível | `_apply` só escreve quando acha valor | 🟢 |

## Estado Interno 🟢
`DICT` (`en`, `pt`), `_lang` (idioma atual, `null` até a primeira consulta), `_subs` (assinantes), `_applying`
(trava contra realimentação do observador), `_timer` (reaplicação agendada), `STORE = 'fluxgk_lang'`.

## Observabilidade
- Nenhum registro. Idioma recusado, chave faltando e falha de assinante são silenciosos. 🟢
- `missing()` no console é a única ferramenta de diagnóstico, e só compara `pt` com `en`. 🟢

## Riscos e Lacunas
- 🟢 **Idioma fixo em dois valores, em três lugares:** `detect`, `setLang` e os botões do hub (`['en','pt']`, `index.html:669`) aceitam só `en`/`pt`. Os 9 idiomas de D-10 exigem mudar os três e o Perfil.
- 🟢 **Perfil fora do dicionário:** textos, idioma (`semey.gk.prefs`) e formato de data (`LOC`) próprios, com `ru` que o resto do app não tem.
- 🟢 **Scouting sem tradução:** 1 chave e nenhum `TX`; a tela está em português no HTML e a data sai sempre em `pt-BR` (`mod_scouting.html:333`).
- 🟢 **Datas e números fora do idioma:** várias telas fixam `pt-BR` (ex.: `mod_video.html:8638`) em vez de usar o idioma atual.
- 🟢 **Escolha local vence o perfil para sempre:** depois da primeira escolha num aparelho, a troca feita em outro não chega a ele.
- 🟢 **Plural e marcadores à mão:** `{n}` trocado por `.replace` em cada tela; não há regra de plural, que muda por idioma (o russo tem três formas).
- 🟢 **Tática 3D não segue o contexto:** se o navegador não guarda `fluxgk_lang`, a quadra embutida pode abrir num idioma diferente do Planner.
- 🟢 Arquivo de 2.275 linhas baixado inteiro por todas as páginas, com os dois idiomas; com 9 idiomas, passa de 9.000 linhas.
- 🟡 O observador reaplica no documento inteiro a cada inserção marcada; em telas grandes (vídeo, 717 chaves) o custo não foi medido.
