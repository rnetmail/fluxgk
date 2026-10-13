# Planejamento, Design Técnico

## Interface

### Abas (`PAGES`, renderizadas por `showPage(name)` em `#app`) 🟢
| Aba | Conteúdo |
|---|---|
| `session` | cabeçalho com clube/temporada; formulário `sDate, sTime, sDur, sType, sPlayers, sObj, sMeth`; lista de exercícios; botões "Exportar" e "Salvar na biblioteca" |
| `post` | cabeçalho da sessão, KPIs (exercícios, minutos, goleiros, estrelas), objetivo atingido, 6 campos (`postPos, postImp, postAff, postCon, postEme, postNxt`), anotação por goleiro e por exercício (não gravadas) |
| `library` | sessões da temporada, ordem, seleção, exportação, caixa de resgate (`libScanOut`) |
| `exlib` | biblioteca de exercícios do técnico |
| `settings` | herdada; identidade agora vem do hub |

Modais: assistente de exercício (`openWizard(idx, 'session' \| 'lib')`), seletor da biblioteca (`exPickerModal`),
copiar de sessão (`sessCopyModal`), tática 3D (`tacticaModal` com iframe `tacticaFrame`).

### Funções principais 🟢
| Símbolo | Assinatura | Retorno | Observação |
|---|---|---|---|
| `showPage` | `(name, btn?)` | — | salva o formulário se saía de `session`; re-renderiza o HTML da aba |
| `_saveSessionForm` / `_restoreSessionForm` | `()` | — | campos e cabeçalho ↔ `_sessionFormState` |
| `openWizard` | `(idx = -1, mode = 'session')` | — | `idx ≥ 0` edita |
| `confirmEx` | `()` | — | monta o `Exercício`; em `lib` grava na biblioteca, senão na sessão aberta |
| `setExImg` | `(dataUrl)` | — | reduz se não-JPEG ou > 400 000 caracteres |
| `_shrinkDataUrl` | `(dataUrl, maxW, q)` | `Promise<string\|null>` | canvas com fundo branco → `toDataURL('image/jpeg', q)` |
| `_semUndefined` | `(v)` | `v` sem `undefined` | o PocketBase rejeitava a gravação inteira por um `undefined` |
| `_persistExercise` | `(ex)` | — | nuvem primeiro; falha ou sem conexão → fila; sempre atualiza o índice local |
| `_persistSessionToLibrary` | `()` | `Sessão` | núcleo único de gravação de sessão |
| `flushPending` | `()` | — | reenvia a fila; reenfileira o que falhar |
| `_ligarListeners` | `()` | — | `on('value')` em sessões e em exercícios |
| `sessionsByDate` | `(list, asc)` | lista | ordena por `date + 'T' + time` (vazios: `0000-00-00`/`00:00`), desempate por `id` |
| `buildReportHTML` | `(sessions)` | `string` HTML | capa + uma seção por sessão, na cor do clube |
| `buscarOutrasTemporadas` | `()` | `Promise` | varre `users/<uid>/data` até 4 níveis procurando `planner.sessions` |

### Dados
Entidades `Sessão` e `Exercício`: ver `../data-dictionary.md`. Caminhos: `<dataPath>/planner/sessions/<id>` e
`users/<uid>/library/exercises/<id>`. Mensagens com o `tatica-3d`: ver `../hub/contracts.md`, seção 3. 🟢

## Fluxo Principal
1. Ao carregar: renderiza `session` com data e hora atuais; **não** conecta sozinho, espera o contexto (`mod_planner.html:568-589`).
2. Avisa `FLUXGK_MODULE_READY`. Ao receber `FLUXGK_CONTEXT` válido da janela pai: define `_PATH.sessions` e `_PATH.exercises`, aplica idioma, cor, escudo e cabeçalhos, agenda `flushPending` e, na primeira vez, `_loadCloud` (`:497-531`).
3. `_loadCloud` injeta `/static/vendor/pocketbase.umd.js` e `/static/pocketbase-adapter.js` (se ainda não estão na página); `_initCloud` inicializa e observa o login (`:1805-1853`).
4. Com usuário: `_fbReady = true`, `flushPending`, `_ligarListeners` (`:1830-1836`).
5. Listener de sessões: descarta e reapaga os itens marcados como apagados; ordena por `id` decrescente; marca `_sessLidas`; regrava o espelho; re-renderiza a biblioteca se aberta (`:1860-1883`).
6. Listener de exercícios: idem; atualiza o índice local; chama `recompressLibrary()` (`:1885-1896`).
7. Montar a sessão → `confirmEx` adiciona exercícios → "Salvar na biblioteca" (`saveCurrentSession`) → `_persistSessionToLibrary` → espelho + nuvem (ou fila) → `_newSession` → aba `library` (`:2070-2128`).
8. Pós-treino: `editSessionFromLibrary(id)` carrega a sessão no estado ativo → aba `post` → `closeSession` regrava a mesma sessão (`:1228-1272`).

## Fluxos Alternativos
- **Contexto de outra temporada:** se `_PATH.sessions` muda, zera `savedSessions` e `_sessLidas` até a nova resposta (`:504-507`).
- **Gravação falha ou sem conexão:** item na fila (`_queueEx`/`_queueSess`), indicador vermelho, aviso "mantenha a aba aberta" (`:799-860`).
- **Excluir sessão/exercício:** `_marcarApagado(id)` tira da fila e lembra o id; remove da nuvem; sem conexão, avisa que é preciso apagar de novo depois (`:816-821`, `:1583-1595`, `:940-951`).
- **Imagem grande:** redução antes de mostrar e gravar (`:675-689`).
- **Tática 3D:** primeira abertura carrega `tatica3d.html?embed=1`; o iframe fica montado; `fluxgk-tatica-ready` dispara o envio da cena; `fluxgk-tatica-image` vira imagem + `tatica` (`:986-1023`).
- **Biblioteca vazia logo após trocar de temporada:** enquanto `_sessLidas = false`, não mostra a caixa de resgate (evita "sumiu tudo").
- **Leitura negada:** o código prevê `_libErro`, mas o adaptador nunca chama o callback de erro do `on` (ver `../adaptador-fluxdb/contracts.md`). 🟢

## Dependências
- `adaptador-fluxdb` (carregado pelo próprio módulo) e o SDK do PocketBase. 🟢
- `tatica-3d` para cenas. 🟢
- `fluxgk-i18n.js` (chaves `plan.*`, `data.pdf.locale`). 🟢
- Hub, pelo contexto. 🟢
- APIs do navegador: `localStorage`, `FileReader`, `canvas`, `window.open`, `Blob`/`URL.createObjectURL`, eventos `online` e `beforeunload`. 🟢

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---|---|---|
| Nuvem é a fonte de verdade; o navegador guarda só apoio sem imagens | `mod_planner.html:769-774`, `:1352-1360` | 🟢 |
| Nada é gravado sem conexão pronta: fila com reenvio | `:788-796` | 🟢 |
| Ids apagados lembrados para não ressuscitar | `:807-815` | 🟢 |
| Espelho nunca entra sozinho na lista; só aparece como resgate | `:1333-1340` | 🟢 |
| Identidade (cor, escudo, clube) só do hub; o `localStorage` antigo foi abandonado | `:584-586` | 🟢 |
| Sessão guarda cópia dos exercícios (o histórico não muda se a biblioteca mudar) | `:2109` | 🟡 intenção inferida |
| Recompressão única de diagramas antigos | `:880-900` | 🟢 |
| Fase e tipo guardados como chave estável; rótulo traduzido só na tela | `:1029-1053` | 🟢 |

## Estado Interno 🟢
| Variável | Conteúdo |
|---|---|
| `_HUB`, `_PATH` | contexto e caminhos |
| `exercises`, `rating`, `_sessionOpen`, `_editingSessionId`, `_editPostState`, `_sessionFormState` | sessão em edição |
| `savedSessions`, `savedExercises`, `selectedSessions` | listas vindas da nuvem |
| `_pendingEx`, `_pendingSess`, `_apagados`, `_sessLidas`, `_listenersOn`, `_fbReady` | sincronização |
| `_currentImgData`, `_currentTatica`, `_taticaPronta`, `_clubColor`, `_clubBadge` | edição de exercício e identidade |

## Observabilidade
- Indicador `syncDot`: amarelo gravando, verde gravado, vermelho falha/fila (`dotY`, `dotG`, `dotR`). 🟢
- `console.log('[FluxGK] planner: sessoes em', …)`, `'sessoes carregadas:'`, `'biblioteca recomprimida: n diagrama(s), A KB -> B KB'`. 🟢
- `console.warn` para item apagado que voltou e para espaço local esgotado. 🟢

## Riscos e Lacunas
- 🟢 ~~Anotações por goleiro e por exercício do pós-treino não eram gravadas~~ — corrigido em 13/10 (D-02): `_postNotas`, `postGkNotes`, `postNote`.
- 🟢 Cada sessão leva os exercícios com imagem; a biblioteca da temporada pesa MB e é relida inteira a cada mudança.
- 🟢 `buscarOutrasTemporadas` lê `users/<uid>/data` inteiro (todos os módulos, inclusive vídeo).
- 🟢 Restaurar e importar gravam uma sessão por vez em laço `await`.
- 🟢 A escuta do `tatica-3d` não confere a origem da mensagem (`:1007`).
- 🟡 Nomes de exercício e textos são inseridos com `innerHTML` sem escapar (`openExPicker`, `refreshPost`); o dado é do próprio técnico, risco baixo.
- 🟢 `buildReportHTML` referencia `_ss.clubName`, variável inexistente (`:1602`; a linha `:1600` declara `_ssCached`, não `_ss`): se `_sessionFormState._clubName` vier vazio, o relatório lança `ReferenceError`. [Reviewer: confirmado no código]
- 🟡 Id `Date.now()`: duas criações no mesmo milissegundo colidem (`addLibToSession` em sequência rápida).
- 🟢 `_libErro` nunca é preenchido (callback de erro do `on` não é chamado pelo adaptador).
