# Hub, Design Técnico

## Interface

### Telas (`.screen`, alternadas por `showScreen(id)`) 🟢
| Id | Conteúdo |
|---|---|
| `scr-loading` | carregando; mostra erro se o adaptador não carregar |
| `scr-login` | e-mail (`inp-email`), senha (`inp-pass`), "lembrar" (`inp-rem`), botão `lbtn`, erro `lerr` |
| `scr-home` | barra com escudo/nome/temporada, saudação, metodologia, 3 contadores, grade de módulos |
| `scr-module` | barra do módulo (`mtbar`, `mtnm`), iframe `mfrm`, botão de tela cheia |

Painéis deslizantes: `sh-switch` (clube + temporada), `sh-club` (editor de clube), `sh-set` (perfil), `sh-list` (listagem de um contador).

### Funções 🟢
| Símbolo | Assinatura | Retorno | Observação |
|---|---|---|---|
| `boot` | `()` | `Promise<void>` | carrega `/static/pocketbase-adapter.js`, `initializeApp(FBC)`, liga `onAuthStateChanged` |
| `doLogin` | `()` | — | lê o formulário; `setPersistence(LOCAL\|SESSION)` → `signInWithEmailAndPassword` |
| `loadAll` | `()` | `Promise<void>` | 3 leituras paralelas (`clubs`, `active`, `profile`) com `withTimeout(…, 20000)`; 2 tentativas |
| `U` | `(p?: string)` | `Ref` | `ref('users/'+uid+'/'+p)` |
| `dataPath` | `()` | `string \| null` | `users/<uid>/data/<clubId>/<seasonId>` ou `null` |
| `slug` | `(s: string)` | `string` | ver RN-09 |
| `raceTimeout` | `(p: Promise, ms: number)` | `'saved' \| 'pending' \| 'error'` | |
| `withTimeout` | `(p, ms, label)` | `Promise` | rejeita com `TIMEOUT: <label>…` |
| `loadStats` | `()` | — | 3 leituras independentes; cada uma pinta seu contador |
| `openStatList` | `(kind: 'sess'\|'match'\|'gk')` | `Promise<void>` | lista detalhada no `sh-list` |
| `ctxPayload` | `()` | `Contexto` | ver `contracts.md` |
| `pushContext` | `(win: Window)` | — | `win.postMessage(ctxPayload(), '*')` |
| `openModule` | `(key: ModKey)` | — | exige `dataPath()`; `fr.src = MOD_FILES[key] + '?v=' + Date.now()` |
| `setLang` | `(l: 'en'\|'pt')` | — | persiste local e em `profile/lang`, reenvia o contexto |

Dados lidos e gravados: ver tabela "Globais do técnico" em `../data-dictionary.md`.

### Versões em Configurações (desde 1.2026.002) 🟢
| Função | Papel |
|---|---|
| `carregarVersoes(forcar)` | ao abrir Configurações, `fluxdb._internal.pb().send('/api/fluxgk/versoes')`; 403 esconde a seção; erro mostra a mensagem |
| `_htmlVersoes(d)` | no ar · nova versão (mudanças, CI, botão ou motivo) · versões publicadas (`Voltar para esta` / `Usar esta versão`) · histórico (✓/✗) |
| `pedirVersao(acao, versao)` | `confirm` → `POST /api/fluxgk/versoes/implantar` → mostra "Atualizando…" |
| `_esperarVersao(n)` | a cada 10 s lê `/versao.json`; quando a versão chega, `location.reload()`; desiste em ~15 min |
Textos `hub.ver.*` (en/pt). O script do fim da página lê `/versao.json`, escreve o rodapé `#app-versao` e, fora de
PRD, põe a faixa e o prefixo no título.

## Fluxo Principal
1. `boot()` carrega o adaptador e inicializa `fluxdb` com `FBC = {backend:'pocketbase', url:''}` (`index.html:337-342`, `:979`).
2. `onAuthStateChanged(u)`: sem `u` → `scr-login`. Com `u` → `APP.uid = u.uid`, `loadAll()`, botões de idioma, `renderMods()`, `refresh()`, `scr-home` (`:983-994`).
3. `loadAll()` aplica perfil (com padrão de metodologia), idioma salvo (se não houver escolha local), clubes e contexto; corrige contexto órfão (RN-03) (`:423-476`).
4. Sem clubes → aviso de boas-vindas e `openSwitch()`.
5. `refresh()` = `applyIdentity()` (cor, escudo ou sigla, nomes, saudação por hora: < 12 manhã, < 18 tarde, senão noite) + `loadStats()` (`:478-544`).
6. Tocar um módulo → `openModule(key)`: sem `dataPath` abre o seletor; com, carrega o iframe e mostra `scr-module` (`:959-974`).
7. O módulo envia `FLUXGK_MODULE_READY` → `pushContext(e.source)`. Rede de segurança: 600 ms após o `load` do iframe, envia de novo (`:955`, `:967`).
8. Fechar o módulo → sai da tela cheia, volta ao `scr-home`, recarrega os contadores.

## Fluxos Alternativos
- **Credencial errada:** `mapAuthError` → `auth/invalid-credential` → mensagem `hub.msg.invalidCred`; botão reativado (`:411`).
- **Leitura inicial falha:** `APP._loadFailed = true`; aviso específico para `TIMEOUT`, `permission` ou genérico; o app abre (`:459-475`).
- **Salvar clube:** nome obrigatório; `meta` gravado com `raceTimeout(4000)`; o escudo é gravado em seguida (sem timeout); primeiro clube vira ativo e chama `addSeason()` (`:852-884`).
- **Excluir temporada:** `get()` do ramo inteiro da temporada (timeout 5 s) só para saber se há dados; confirma; remove `seasons/<sid>` e `data/<cid>/<sid>`; se era a ativa, ativa a última restante (`:779-804`).
- **Excluir clube:** remove `clubs/<id>` e `data/<id>`; se era o ativo, ativa o primeiro clube e sua primeira temporada (`:885-905`).
- **Trocar idioma com módulo aberto:** reenvia o contexto com o novo `lang` (`:674-688`).
- **`FLUXGK_VIDEO_MAXIMIZE`:** alterna a classe `vidmax` no iframe (`:957`).

### Listagens do painel (`openStatList`) 🟢
- `sess`: agrupa `load/sessions/<gk>/<id>` por `data|hora|tipo`; conta presentes (`post`) e faltas (`absence` ou `present === false`); média de UA dos `post`. Um `rest` cria o grupo com zero presentes e zero faltas.
- `match`: `minutes/games` com data, ordem decrescente; mostra adversário, competição, goleiros selecionados e minutos totais.
- `gk`: `load/players` ordenados por ativo primeiro e nome; lê também `load/sessions` para o resumo de cada goleiro.

## Dependências
- `fluxdb` (`/static/pocketbase-adapter.js`): auth e banco. 🟢
- `fluxgk-i18n.js` (`FluxGKI18n`, `TX`): textos e idioma. 🟢
- `/static/fonts/fonts.css`. 🟢
- Os 9 módulos, pelo contrato de contexto (`contracts.md`). 🟢
- Dados escritos pelo Load Control (`load/players`, `load/sessions`) e pela Minutagem (`minutes/games`), só leitura. 🟢

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---|---|---|
| Ler só os nós leves no boot (antes lia `users/<uid>` inteiro e estourava o tempo) | `index.html:424-427` (comentário) | 🟢 |
| Falha de carga ≠ conta vazia | `index.html:459-462` | 🟢 |
| Contexto mantém o formato antigo `profile{…}` para módulos não migrados | `index.html:937-945` | 🟢 |
| `?v=<timestamp>` no iframe para furar o cache | `index.html:970-972` | 🟢 |
| Sessão = evento de treino, não registro por goleiro | `index.html:510-515` | 🟢 |
| Elenco do painel vem de `load/players` (antes lia `/roster`, que ninguém gravava) | `index.html:532-534` | 🟢 |
| Tela cheia por classe CSS para o vídeo (evita "tela fantasma" no macOS) | `index.html:956-957` | 🟢 |

## Estado Interno
`APP` (memória da página): `uid`, `profile`, `clubs` (com escudos e adversários, porque lê `clubs` inteiro), `active`,
`editingClub`, `_loadFailed`. Persistido na nuvem em `profile`, `active` e `clubs`. O idioma também em
`localStorage['fluxgk_lang']`. 🟢

## Observabilidade
- `console.error('[FluxGK] loadAll failed:', e)`, `'[FluxGK] boot failed:'`, `'[FluxGK] pushContext failed:'`. 🟢
- Avisos ao usuário por `showToast` (2,5 s padrão; 7–8 s para falhas de carga). 🟢
- Sem métricas nem envio de erros ao servidor. 🟢

## Riscos e Lacunas
- 🟢 `loadAll` lê `clubs` inteiro: escudos (até ~670 KB em base64 cada) e a lista de adversários com escudos chegam em todo boot.
- 🟢 O contexto carrega o escudo do clube a cada envio ao módulo.
- 🟢 Excluir temporada lê o ramo inteiro da temporada (inclusive o documento do vídeo) só para testar se existe.
- 🟢 "Salvo offline" (`pending`) não tem fila por trás desde a saída do Firebase.
- 🟢 Contador de sessões conta descanso e falta; contraria D-01/D-08.
- 🟢 `postMessage` com destino `'*'` e sem verificar `event.origin` na escuta (`:953`).
- 🟢 Dois clubes cujos nomes geram o mesmo `slug` colidem: o segundo sobrescreve a `meta` do primeiro (`saveClub`: `id = APP.editingClub || slug(name)`; `APP.clubs[id] = APP.clubs[id] || {}`; `.meta = meta`). [Reviewer: confirmado no código]
- 🟢 O seletor de idioma só conhece `en` e `pt` (`markLangButtons`, `:667`); D-10 pede 9.
