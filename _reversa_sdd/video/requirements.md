# Video Lab (Análise de Vídeo)

## Visão Geral
`mod_video.html` (o maior arquivo do app, 9.352 linhas). Análise de vídeo de jogos e treinos: o técnico abre o
arquivo do próprio computador, marca lances com etiquetas de um painel, desenha sobre a imagem, organiza os lances
em playlists e projetos, gera relatório e exporta cortes de vídeo, tudo no navegador. **O vídeo nunca sai do
computador**; só os metadados vão para a nuvem (ADR 005, RN-42). 🟢

## Responsabilidades
- Abrir vídeos locais e lembrar a pasta de cada projeto (File System Access API, Chrome/Edge desktop). 🟢
- Marcar lances com etiqueta, especificação, goleiro, resultado, nome e observação. 🟢
- Painéis de etiquetas (dashboards) reaproveitáveis entre jogos. 🟢
- Playlists (com pastas), projetos com vários vídeos e análises, modo cinema para revisar e aparar lances. 🟢
- Desenhos sobre o vídeo (formas, texto, medição, congelamento de quadro). 🟢
- Exportar cortes: sem recodificar (rápido) ou recodificando com título, desenhos, enquadramento e cartela. 🟢
- Relatório de vídeo por projeto (HTML para imprimir) com capítulos prontos para o YouTube. 🟢
- Guardar o trabalho no navegador e na nuvem, com mescla e cópias de segurança. 🟢

## Regras de Negócio
- RN-01 Vídeo é aberto por `URL.createObjectURL`; o vínculo com a pasta do projeto fica no IndexedDB `fluxgk_video_fs`; sem File System Access API, o vídeo é escolhido arquivo a arquivo. 🟢
- RN-02 O trabalho de cada vídeo é uma **sessão** identificada por `nome do arquivo|tamanho em bytes`. Abrir o mesmo arquivo restaura lances e desenhos. 🟢
- RN-03 Lance = `{id, tagId, t, name, note, start, end, spec, gk, outcome}`; o corte vai de `t − pré` a `t + pós` (segundos da etiqueta ou, sem eles, os globais), limitado à duração do vídeo. 🟢
- RN-04 Marcar um lance **pausa o vídeo** e abre o modal de nome; o vídeo só volta a tocar ao confirmar. Nome padrão: `<etiqueta> NN`, numerado por etiqueta. 🟢
- RN-05 Resultado do lance: `ok` (correto), `bad` (errado) ou vazio (não avaliado). 🟢
- RN-06 Especificação é a 2ª etiqueta, guardada **na própria etiqueta** (até 40 caracteres, sem repetir ignorando maiúsculas), por isso acompanha o painel para o próximo jogo. 🟢
- RN-07 Etiqueta apagada continua legível nos lances antigos como "etiqueta removida". 🟢
- RN-08 Goleiros do Video Lab são uma lista própria do módulo (por clube e temporada), não o elenco do Load Control. 🟢
- RN-09 Gravação local 250 ms após a edição; só conta como salvo o que o navegador devolve íntegro ao reler. Sem espaço: libera caches de outros módulos que têm cópia na nuvem, tenta de novo e, falhando, avisa e **baixa sozinho** uma cópia de emergência. 🟢
- RN-10 Nuvem: um documento só em `<dataPath>/video`, regravado inteiro 600 ms após cada alteração, e **só depois** da primeira leitura da nuvem, para não sobrescrevê-la com estado vazio. 🟢
- RN-11 Na leitura da nuvem, sessão a sessão: vence a com **mais lances** (peso = lances × 1000 + desenhos); empate, a mais recente. Uma cópia com menos lances nunca substitui uma com mais. Antes de mesclar, cópia de segurança local por 7 dias (RN-43 do domínio). 🟢
- RN-12 Na nuvem a biblioteca vai como **lista** com `__key`, porque a chave `nome.mp4|tamanho` tem ponto. 🟢
- RN-13 Exportação "original" corta no keyframe sem recodificar (mp4box); com desenho, enquadramento, título ou outra resolução, recodifica por canvas + `MediaRecorder` (MP4/AVC1 quando suportado, senão WebM/VP9). 🟢
- RN-14 Backup em arquivo `.json` com sessões, painéis, projetos e goleiros (sem vídeos); importar **nunca apaga**: mescla e só substitui um item pela cópia mais recente. 🟢
- RN-15 Relatório: só com ao menos uma análise marcada; cada playlist vira um bloco, cada análise um capítulo; o início de cada capítulo soma cartela + duração dos lances na ordem exportada. 🟢
- 🟡 RN-16 Fora do hub, o módulo funciona com `club`, `color` e `coach` na URL, sem nuvem.

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | Abrir vídeo local, tocar com velocidades, zoom e deslocamento, tela cheia (pede ao hub para maximizar) | Must | Vídeo de 2 GB abre sem upload |
| RF-02 | Marcar lance por etiqueta do painel, com modal de nome, especificação, goleiro, resultado e observação | Must | Critério de Aceitação 1 |
| RF-03 | Painéis de etiquetas: criar, renomear, cores, pré/pós por etiqueta, especificações | Must | Painel criado num jogo aparece no próximo |
| RF-04 | Sessão por arquivo, restaurada ao reabrir | Must | Critério de Aceitação 2 |
| RF-05 | Lista de lances com seleção, edição, ajuste de início/fim, abrir o corte | Must | Ajustar o fim altera o corte exportado |
| RF-06 | Playlists com pastas, reordenação, mover e copiar itens; tocar a playlist em sequência | Should | Playlist toca os lances na ordem |
| RF-07 | Projetos: vários vídeos de uma pasta, análises, playlists do projeto, vínculo da pasta lembrado | Should | Reabrir o projeto acha os vídeos sem escolher de novo |
| RF-08 | Modo cinema: revisar lances, aparar entrada e saída, enquadramento (zoom) por lance | Should | Enquadramento aparece no corte exportado |
| RF-09 | Desenhos: formas, texto, medição calibrada, congelamento de quadro, lista de desenhos | Should | Desenho aparece no corte recodificado |
| RF-10 | Exportar lances (original ou recodificado), exportar tudo, exportar combinado com cartela | Must | Critério de Aceitação 3 |
| RF-11 | Relatório de vídeo do projeto com capítulos copiáveis para o YouTube | Should | Capítulos com o tempo certo de cada playlist |
| RF-12 | Selo de gravação no rodapé (salvo, salvando, falhou) e alertas com "tentar de novo" e "baixar cópia" | Must | Critério de Aceitação 4 |
| RF-13 | Backup e restauração em `.json` | Should | Critério de Aceitação 5 |
| RF-14 | Sincronização com a nuvem e mescla sem perda | Must | Critério de Aceitação 6 |
| RF-15 | **Evolução (D-02):** ditado por voz no nome e na observação do lance, inclusive com o jogo rodando | Should | Falar preenche a observação |
| RF-16 | **Evolução (D-10):** 9 idiomas pelo dicionário único | Should | Video Lab em alemão |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Custo | vídeo nunca é enviado ao servidor | `loadFile`, `projOpenVideo` (`mod_video.html:3053`, `:1804`); ADR 005 | 🟢 |
| Compatibilidade | pasta de projeto só em Chrome/Edge desktop (File System Access API) | `fsSupported`, `:1727` | 🟢 |
| Disponibilidade | gravação local conferida por releitura; liberação de espaço e cópia de emergência | `libWrite`, `:8400-8445` | 🟢 |
| Disponibilidade | cópia de segurança antes de mesclar com a nuvem, guardada 7 dias | `libGuardarCopia`, `LIB_BK`, `:8356-8373` | 🟢 |
| Capacidade | o navegador dá cerca de 5 MB ao site inteiro; o módulo mede o uso e avisa antes de encher | `svUsoLocal`, `svChecarEspaco`, `:8227`, `:8286` | 🟢 |
| Capacidade | documento da nuvem limitado pelo `maxSize` do campo `data` (5 MB) | `pb_migrations/1760270000_init_fluxgk.js` (`maxSize: 5242880`), DT-05 | 🟢 |
| Performance | gravação local com atraso de 250 ms e na nuvem com 600 ms | `saveSession`, `:8578`; `pushToCloud`, `:9227` | 🟢 |
| Performance | exportação sem recodificar quando não há sobreposição | `expNeedsReencode`, `:7435`; mp4box | 🟢 |
| Segurança | textos do relatório escapados | `relGerar`, `:2017` | 🟢 |
| Segurança | **contexto aceito sem conferir a origem** da mensagem | `applyContext`, `:9125`; `../permissions.md` | 🟢 |

> Inferido a partir do código. Validar com equipe de operações.

## Critérios de Aceitação

```gherkin
Dado um vídeo tocando e uma etiqueta "Defesa" com pré 5 s e pós 3 s
Quando o técnico toca a etiqueta aos 12:00
Então o vídeo pausa, o modal pede o nome "Defesa 01" e o corte vai de 11:55 a 12:03

Dado um vídeo com 10 lances marcados ontem
Quando o técnico abre o mesmo arquivo hoje
Então os 10 lances e os desenhos voltam

Dado lances sem desenho, enquadramento nem título
Quando o técnico exporta no modo original
Então o corte sai sem recodificar, começando no keyframe anterior ao início

Dado o armazenamento do navegador cheio
Quando o técnico marca um lance
Então o selo mostra "falhou", aparece o alerta com "liberar espaço" e "baixar cópia", e uma cópia de emergência é baixada

Dado um backup com uma sessão mais antiga que a do navegador
Quando o técnico importa o backup
Então a sessão do navegador é mantida e nada é apagado

Dado a nuvem com 8 lances num vídeo e o navegador com 12 no mesmo vídeo
Quando o módulo lê a nuvem
Então ficam os 12 lances, e o técnico é avisado de que a versão local foi mantida

Dado o módulo aberto antes da primeira leitura da nuvem
Quando o técnico edita algo
Então nada é enviado à nuvem até a leitura terminar
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Vídeo, marcação, painéis, sessão, lances, exportação, selo, nuvem (RF-01..05, 10, 12, 14) | Must | Núcleo do módulo; perda de lance é o pior defeito |
| Playlists, projetos, cinema, desenhos, relatório, backup, voz, idiomas (RF-06..09, 11, 13, 15, 16) | Should | Valor alto, com alternativa manual |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `mod_video.html` | `makeTag`, `currentDash`, `tagSpecs`, `specAdd`, `persistDashboards`, `loadDashboards` (`:1463-1540`) | 🟢 |
| `mod_video.html` | `proj*`, `analise*`, `idb*`, `ensurePerm`, `projLinkFolder`, `projResolveFile` (`:1541-1830`, `:2253-2300`) | 🟢 |
| `mod_video.html` | `rel*` (relatório e capítulos, `:1831-2147`), `exAll*` (exportar tudo, `:2148-2252`) | 🟢 |
| `mod_video.html` | `loadFile`, `togglePlay`, `setZoom`, `toggleAppFullscreen`, `openClip`, `renderTrim` (`:3053-3722`) | 🟢 |
| `mod_video.html` | `addEvent`, modal de nome, `setOutcomeUI`, `discardEvent` (`:3786-3936`) | 🟢 |
| `mod_video.html` | `renderPlaylists`, `pl*`, `cine*`, menus de contexto, `startPlaylist` (`:4031-5823`) | 🟢 |
| `mod_video.html` | desenho: `drawShape`, `setTool`, `startFreeze`, `renderDrawList` (`:5988-7080`) | 🟢 |
| `mod_video.html` | exportação: `renderExportTab`, `exportReencoded`, `recordGroup`, `exportCombined`, `exportEvents`, `buildClips` (`:7440-8163`, `:8699-9088`) | 🟢 |
| `mod_video.html` | gravação: `sv*`, `libMesclar`, `libWrite`, `libToCloud`, `bk*`, `saveSession`, `restoreSession` (`:8164-8622`) | 🟢 |
| `mod_video.html` | nuvem e contexto: `applyContext`, `initCloud`, `pushToCloud`, `pushToCloudNow`, `pullFromCloud` (`:9089-9352`) | 🟢 |
