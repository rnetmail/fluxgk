# Video Lab, Design Técnico

## Interface

### Organização do arquivo 🟢
| Bloco | Linhas | Papel |
|---|---|---|
| mp4box 0.5.2 (jsDelivr, com reserva no cdnjs) | 9–15 | corte sem recodificar |
| CSS | 16–808 | estilo, painéis encaixáveis |
| `fluxgk-i18n.js` + marcação | 809–1365 | abas, modais, rodapé com selo |
| modais `askText`/`askConfirm`, `state`, etiquetas e especificações | 1366–1537 | núcleo de dados em memória |
| projetos, goleiros, playlists de projeto | 1538–1720 | modelo multi-vídeo |
| vínculo de pasta (File System Access API + IndexedDB) | 1721–1818 | reabrir vídeos sem escolher de novo |
| exportar tudo e relatório para a direção | 1819–2248 | HTML para imprimir, capítulos |
| análises (pastas de jogos no projeto) e aba Projeto | 2249–3031 | |
| carga do vídeo, player (controles, velocidade, zoom, tela cheia, teclado) | 3032–3425 | |
| corte aberto no player, aparar | 3426–3721 | |
| etiquetas, modal de nome, playlists, pastas, modo cinema, menus | 3722–5770 | |
| reprodução em sequência, abas, lançador, painéis | 5771–5970 | |
| desenho e congelamento de quadro | 5971–7075 | |
| editor de dashboards | 7076–7416 | |
| exportação (recodificada, combinada com cartela) | 7417–8141 | |
| biblioteca, guarda do salvamento, mescla, backup | 8142–8675 | |
| motor de exportação mp4box, salvar arquivo | 8676–9084 | |
| integração com o hub e nuvem | 9085–9332 | |
| init | 9334–9349 | |

### Abas 🟢
`analise` (player + etiquetas + lances) · `dash` (editor de painéis) · `export` · `library` (sessões por vídeo) ·
`project`. O módulo abre no **lançador** (`showVlHome`, "estilo LongoMatch").

### Estado em memória (`state`, `:1438`) 🟢
| Campo | Conteúdo |
|---|---|
| `file`, `url`, `duration` | vídeo aberto (`File` + ObjectURL) |
| `events`, `nextEventId` | lances da sessão (RN-03) |
| `drawings` | `{id, t, freeze, shapes}` desenhos ancorados no tempo |
| `namedPlaylists` | `{id, name, evIds[]}` playlists manuais da sessão |
| `measureScale` | metros por unidade normalizada (medição) |
| `clip` | lance aberto cortado no player |
| `dashboards`, `currentDashId` | painéis: `{id, name, tags: [{id, name, color, pre?, post?, specs[]}]}` |
| `projects`, `currentProjectId`, `projectMode` | projetos multi-vídeo com análises e playlists |
| `gks` | goleiros do Video Lab |
| `zoom`, `panX`, `panY` | vista do player |

Item de playlist de projeto (`projAddClipToPlaylist`, `:1658-1664`): `{id, srcKey, srcName, tagId, tagName, color,
name, note, spec, t, start, end, gk, outcome}`. O item **copia** os dados do lance, não aponta para ele. 🟢

### Onde os dados moram 🟢
| Lugar | Chave | Conteúdo |
|---|---|---|
| `localStorage` | `fluxgk_videolab_library_v1` | biblioteca: `{"<nome>|<bytes>": {name, size, savedAt, events, nextEventId, drawings, measureScale, namedPlaylists}}` |
| `localStorage` | `fluxgk_videolab_library_bk` | cópia antes de mesclar (7 dias) |
| `localStorage` | `fluxgk_videolab_dashboards_v1`, `_projects_v1`, `_gks_v1`, `_leftw_v1` | painéis, projetos, goleiros, largura do painel |
| `localStorage` | `fluxgk_video_badge_handoff` | escudo passado para a aba própria |
| IndexedDB | `fluxgk_video_fs` | handles das pastas de projeto |
| nuvem | `<dataPath>/video` | `{library: [{__key, …sessão}], dashboards: {dashboards, currentId}, projects: {list, currentId}, gks, updatedAt}` |

As chaves locais **não** têm clube nem temporada no nome: são as mesmas para qualquer contexto. 🟢

### Mensagens com o hub 🟢
| Direção | Mensagem |
|---|---|
| módulo → hub | `FLUXGK_MODULE_READY` (`module: 'video'`), `FLUXGK_VIDEO_MAXIMIZE` (`on`) |
| hub → módulo | `FLUXGK_CONTEXT` com `uid`, `dataPath`, `cloudConfig`, `lang`, `club`, `season`, `coach` ou `profile` (formato antigo) |

## Fluxo Principal
1. Init (`:9334-9349`): carrega painéis, projetos e goleiros do navegador, desenha a tela, chama `initCloud` e abre o lançador.
2. O hub manda `FLUXGK_CONTEXT`; `applyContext` (`:9089`) aplica cor, nome, escudo, técnico, idioma e define `_videoDataPath = <dataPath>/video`; com `uid`, inicia a nuvem ou relê.
3. `initCloud` (`:9201`) carrega o adaptador, `fluxdb.initializeApp(cloudConfig)` e, no login, `pullFromCloud`.
4. `pullFromCloud` (`:9282`): `once('value')`; biblioteca mesclada sessão a sessão (`libMesclar`, `:8344`) após cópia de segurança; painéis, projetos e goleiros **substituídos** pelos da nuvem quando presentes; `_cloudLoaded = true`; `pushToCloud` semeia a nuvem.
5. O técnico abre um vídeo (`loadFile`, `:3053`, ou `projOpenVideo`, `:1804`); `restoreSession` devolve a sessão `nome|tamanho`.
6. Toca numa etiqueta → `addEvent` (`:3786`): pausa, cria o lance, `saveSession`, abre o modal; confirmar grava nome, especificação, goleiro e resultado e retoma o vídeo.
7. `saveSession` (250 ms) → `libWrite` (grava, relê, confere) → `pushToCloud` (600 ms) → `set` do documento inteiro.
8. Exportar (`renderExportTab`, `:7440`): sem sobreposição → mp4box (`exportEvents`, `buildClips`, `:8782-9088`); com sobreposição → canvas + `MediaRecorder` (`exportReencoded`, `:7649`; `recordGroup`, `:7711`; `exportCombined` com cartela, `:7925`). Destino por `showSaveFilePicker` ou download.

## Fluxos Alternativos
- **Sem File System Access API:** o projeto não lembra a pasta; cada vídeo é escolhido à mão. 🟢
- **Permissão da pasta expirada:** `ensurePerm` (`:1740`) pede de novo. 🟢
- **Armazenamento local cheio:** `svLiberarEspaco` (`:8191`) apaga `glc_users/*` e `fluxgk_sess_mirror::*` de outros módulos e tenta de novo; falhando, alerta e backup de emergência baixado (`svBackupEmergencia`, `:8298`). 🟢
- **Passou de 80% do armazenamento:** aviso antes de estourar (`svChecarEspaco`, `:8286`). 🟢
- **Nuvem recusa a gravação:** `_svFalhouNuvem` (`:9253`): selo "não salvo", alerta com "tentar de novo" e "baixar cópia". 🟢
- **Fechar a aba com corte não salvo:** o navegador pergunta (`beforeunload`, `:8321`). 🟢
- **Botão "Salvar dashboard":** `pushToCloudNow` (`:9265`) grava sem atraso e devolve se chegou. 🟢
- **Abrir em nova aba:** parâmetros `club`, `color`, `coach` na URL; escudo pelo `localStorage`; nessa aba não há contexto do hub, logo não há nuvem. 🟢
- **Leitura da nuvem falha:** `.catch` marca `_cloudLoaded = true` mesmo assim (`:9329`). Ver Riscos. 🟢

## Dependências
- `adaptador-fluxdb`: `once('value')` e `set` em `<dataPath>/video`. Não usa `on('value')`. 🟢
- Hub: contexto e maximização. 🟢
- mp4box 0.5.2 (CDN, carregado no início). 🟢
- APIs do navegador: File System Access, IndexedDB, `MediaRecorder`, canvas, `showSaveFilePicker`. 🟢
- `fluxgk-i18n.js` (chaves `vid.*`). 🟢

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---|---|---|
| Vídeo fica no computador; nuvem só com metadados | ADR 005; comentário `:9186` | 🟢 |
| Sessão identificada por `nome|tamanho` do arquivo | `sessionKey`, `:8459` | 🟢 |
| Especificação guardada na etiqueta, para viajar com o painel | comentário `:1482-1485` | 🟢 |
| Biblioteca vai para a nuvem como lista com `__key` | comentário `:8442-8445` | 🟢 |
| Na mescla, mais lances vence; menos lances nunca substitui (o comentário de `:8333` diz "a mais nova vence", mas o código compara lances primeiro) | `_melhorSessao`, `:8335-8342` | 🟢 |
| Nada sobe antes da primeira leitura da nuvem | `_cloudLoaded`, `:9191` | 🟢 |
| Guarda do salvamento em 4 camadas (selo, aviso a 80%, alerta + backup, pergunta ao fechar) | comentário `:8209-8220` | 🟢 |
| Item de playlist copia o lance em vez de referenciá-lo | `projAddClipToPlaylist`, `:1658` | 🟢 |
| Duas vias de exportação: corte em keyframe ou recodificação | comentário `:7417-7423` | 🟢 |

## Estado Interno 🟢
Além de `state`: `_libMem` (biblioteca em memória), `_cloudLoaded`, `_fbReady`, `fbDB`, `fbUser`,
`_videoDataPath`, `FB_CONFIG_HUB`, `_lastContext`; guarda do salvamento `_svLocalRuim`, `_svNuvemRuim`,
`_svPendente`, `_svUltimoOk`, `_svBaixouBk`; temporizadores `saveTimer` (250 ms) e `_pushTimer` (600 ms).

## Observabilidade
- Selo no rodapé: `ok` / `indo` / `ruim` com horário e % do armazenamento (`svSelo`, `:8239`). 🟢
- Faixa de alerta com ações (`svAlerta`, `:8164`). 🟢
- Registro na tela (`log`, `:3039`) e `console.error('[FluxGK] video: gravacao na nuvem falhou')`. 🟢
- Barra de progresso da exportação (`setProgress`, `:8686`). 🟢

## Riscos e Lacunas
- 🟢 **Leitura falha, gravação sobrescreve:** se o `once('value')` falhar, `_cloudLoaded` vira `true` e a próxima edição grava o documento inteiro com o que há no navegador, apagando na nuvem as sessões de outro aparelho.
- 🟢 **Painéis, projetos e goleiros não são mesclados:** a nuvem substitui o navegador. Um painel criado sem conexão some na próxima leitura.
- 🟢 **Sem escuta em tempo real:** a leitura é única; mudança feita em outro aparelho só aparece ao recarregar, e a próxima gravação daqui a sobrescreve.
- 🟡 **Chaves locais globais:** a biblioteca do navegador não tem clube nem temporada; trocar de temporada mescla as sessões da anterior no documento da nova.
- 🟡 **Liberar espaço apaga o espelho do Planner** (`fluxgk_sess_mirror::*`), que é o resgate de sessões que podem não ter chegado à nuvem.
- 🟡 **Teto de 5 MB do documento** (DT-05): a biblioteca inteira, com desenhos, vai num `set` só.
- 🟢 **Documento inteiro a cada edição:** cada lance reenvia todas as sessões; no adaptador 1.1 o eco não provoca releitura, mas o servidor ainda devolve o registro por SSE a cada página da conta.
- 🟢 **Contexto sem conferir a origem** (`:9125`), e erro de contexto engolido (`catch` vazio).
- 🟢 Sessão por `nome|tamanho`: renomear o arquivo perde o vínculo; dois arquivos iguais com o mesmo nome se confundem.
- 🟢 mp4box por CDN externo: sem rede para o jsDelivr e o cdnjs, a exportação rápida não existe.
