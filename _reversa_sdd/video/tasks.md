# Video Lab, Tarefas de Implementação

## Pré-requisitos
- [ ] Hub entregando `FLUXGK_CONTEXT` com `uid`, `dataPath`, `cloudConfig`, `lang`, `club`, `season`, `coach` (`../hub/contracts.md`)
- [ ] `adaptador-fluxdb` com `once('value')`, `set` e, para T-17, `on('value')` (`../adaptador-fluxdb/contracts.md`)
- [ ] mp4box 0.5.2 disponível (hoje por CDN; ver T-23)
- [ ] Chrome ou Edge de desktop para a pasta de projeto (File System Access API)
- [ ] Chaves `vid.*` em `fluxgk-i18n.js`
- [ ] **Decisão sobre o formato da nuvem** (Lacunas Pendentes): define T-19 e TM-01

## Tarefas

### Paridade com o legado

- [ ] T-01, Contexto e integração com o hub: `FLUXGK_MODULE_READY`, `applyContext` (cor, nome, escudo, técnico, idioma, `_videoDataPath`), `FLUXGK_VIDEO_MAXIMIZE`, botão "abrir em nova aba" com parâmetros na URL
  - Origem no legado: `mod_video.html:9085-9185`, `hubExpand` (`:3253`)
  - Critério de pronto: aberto pelo hub, mostra o clube e grava em `<dataPath>/video`; em aba própria, mostra o clube da URL e não grava na nuvem
  - Confiança: 🟢

- [ ] T-02, Carga do vídeo e player: ObjectURL, velocidades, zoom e deslocamento, tela cheia do app, teclado, lançador inicial
  - Origem no legado: `mod_video.html:3032-3425`, `showVlHome` (`:5838`)
  - Critério de pronto: vídeo local de 2 GB abre sem upload; atalhos de teclado funcionam
  - Confiança: 🟢

- [ ] T-03, Painéis e etiquetas: `makeTag`, cores, pré/pós por etiqueta, especificações na etiqueta, editor de dashboards, etiqueta removida legível
  - Origem no legado: `mod_video.html:1460-1537`, `:3722-3785`, `:7076-7416`
  - Critério de pronto: especificação criada num jogo aparece no próximo; lance de etiqueta apagada mostra "etiqueta removida"
  - Confiança: 🟢

- [ ] T-04, Marcação do lance: `addEvent` (pausa, corte `t − pré` a `t + pós`, nome numerado por etiqueta), modal com especificação, goleiro, resultado e observação, `discardEvent`
  - Origem no legado: `mod_video.html:3786-3926`
  - Critério de pronto: Critério de Aceitação 1
  - Confiança: 🟢

- [ ] T-05, Sessão por arquivo: `sessionKey` (`nome|tamanho`), `saveSession` (250 ms), `restoreSession`, `libWrite` com releitura
  - Origem no legado: `mod_video.html:8400-8440`, `:8459`, `:8578-8620`
  - Critério de pronto: Critério de Aceitação 2
  - Confiança: 🟢

- [ ] T-06, Lista de lances, corte aberto no player e aparar (`openClip`, `renderTrim`, `enforceClipBounds`)
  - Origem no legado: `mod_video.html:3426-3721`, `flatEventsInOrder` (`:3937`)
  - Critério de pronto: ajustar o fim de um lance muda o corte exportado
  - Confiança: 🟢

- [ ] T-07, Playlists com pastas, reordenação, mover e copiar; reprodução em sequência
  - Origem no legado: `mod_video.html:3927-4614`, `:5771-5814`
  - Critério de pronto: playlist toca os lances na ordem definida
  - Confiança: 🟢

- [ ] T-08, Projetos multi-vídeo e análises: vínculo da pasta no IndexedDB, `ensurePerm`, listar e abrir vídeos da pasta, playlists do projeto (itens que copiam o lance), aba Projeto
  - Origem no legado: `mod_video.html:1538-1818`, `:2249-3031`
  - Critério de pronto: reabrir o projeto acha os vídeos sem escolher de novo
  - Confiança: 🟢

- [ ] T-09, Modo cinema: revisão, entrada/saída, reverter, enquadramento por lance, trilha navegável, menus de botão direito
  - Origem no legado: `mod_video.html:4615-5567`
  - Critério de pronto: enquadramento salvo aparece no corte recodificado
  - Confiança: 🟢

- [ ] T-10, Desenho: formas, texto, medição calibrada (`measureScale`), congelamento de quadro, lista e edição de desenhos
  - Origem no legado: `mod_video.html:5971-7075`
  - Critério de pronto: desenho com congelamento de 3 s aparece no corte recodificado
  - Confiança: 🟢

- [ ] T-11, Exportação: escolha automática da via (`expNeedsReencode`), corte em keyframe com mp4box, recodificação por canvas + `MediaRecorder` (MP4/AVC1 ou WebM/VP9), exportar tudo e combinado com cartela, `showSaveFilePicker` ou download
  - Origem no legado: `mod_video.html:7417-8141`, `:8676-9084`, `:2148-2248`
  - Critério de pronto: Critério de Aceitação 3; corte com desenho sai recodificado
  - Confiança: 🟢

- [ ] T-12, Relatório de vídeo para a direção: análises escolhidas, blocos por playlist, nota geral, cores do clube, capítulos copiáveis para o YouTube
  - Origem no legado: `mod_video.html:1823-2147`
  - Critério de pronto: capítulos com o início certo de cada playlist, somando cartela e duração dos lances
  - Confiança: 🟢

- [ ] T-13, Guarda do salvamento: selo no rodapé, aviso a 80%, liberação de espaço, alerta com "tentar de novo"/"baixar cópia", backup de emergência, pergunta ao fechar a aba
  - Origem no legado: `mod_video.html:8164-8328`
  - Critério de pronto: Critério de Aceitação 4
  - Confiança: 🟢

- [ ] T-14, Backup e restauração em `.json` (mescla por id, nunca apaga)
  - Origem no legado: `mod_video.html:8461-8577`
  - Critério de pronto: Critério de Aceitação 5
  - Confiança: 🟢

- [ ] T-15, Nuvem: `initCloud`, `pullFromCloud` com `libMesclar` e cópia de segurança, `pushToCloud` (600 ms) e `pushToCloudNow`, biblioteca como lista com `__key`
  - Origem no legado: `mod_video.html:9186-9331`, `:8329-8390`, `:8442-8458`
  - Critério de pronto: Critérios de Aceitação 6 e 7
  - Confiança: 🟢

### Correções

- [ ] T-16, Leitura da nuvem falhou não libera a gravação: manter `_cloudLoaded = false`, mostrar o selo "não sincronizado" e tentar ler de novo (intervalo e ao reconectar); só gravar depois de uma leitura bem-sucedida
  - Origem no legado: `pullFromCloud` (`.catch`, `:9329`)
  - Critério de pronto: com a leitura derrubada, uma edição local não altera o documento da nuvem
  - Confiança: 🟢

- [ ] T-17, Escutar a nuvem enquanto o módulo está aberto (`on('value')` no lugar do `once`), aplicando a mesma mescla; e gravar com mescla, não com `set` cego do documento inteiro
  - Origem no legado: `pullFromCloud` (`once`, `:9286`), `pushToCloud` (`set`, `:9244`)
  - Critério de pronto: dois aparelhos marcando lances no mesmo vídeo terminam com os lances dos dois
  - Confiança: 🟢

- [ ] T-18, Mesclar painéis, projetos e goleiros item a item (por `id`, com data de alteração), como a biblioteca
  - Origem no legado: `pullFromCloud` substitui `dashboards`, `projects`, `gks` (`:9302-9321`)
  - Critério de pronto: painel criado sem conexão continua lá depois de sincronizar
  - Confiança: 🟢

- [ ] T-19, Sair do documento único de 5 MB: uma sessão por nó (`<dataPath>/video/library/<chave>`) e painéis, projetos e goleiros em nós próprios; cada edição grava só o nó que mudou
  - Origem no legado: payload único de `pushToCloud` (`:9233-9239`); DT-05
  - Critério de pronto: temporada com 60 jogos marcados grava sem erro de tamanho; marcar um lance envia só a sessão daquele vídeo
  - Confiança: 🟢 (D-15: um registro por sessão de vídeo)

- [ ] T-20, Chaves locais com clube e temporada (`fluxgk_videolab_*::<dataPath>`), migrando as chaves globais atuais para o contexto em que forem abertas primeiro
  - Origem no legado: `STORE_KEY` (`:1470`), `PROJ_KEY` (`:1539`), `GKS_KEY` (`:1569`), `LIB_KEY` (`:8143`)
  - Critério de pronto: trocar de temporada não leva sessões da anterior para a nova
  - Confiança: 🟡

- [ ] T-21, Liberar espaço sem apagar resgate: não remover `fluxgk_sess_mirror::*` do Planner (só caches que têm cópia confirmada na nuvem)
  - Origem no legado: `svLiberarEspaco` (`:8191-8208`)
  - Critério de pronto: com o armazenamento cheio, o espelho do Planner continua no navegador
  - Confiança: 🟡

- [ ] T-22, Aceitar contexto só da janela pai (`e.source === window.parent`) e registrar contexto inválido em vez de engolir o erro
  - Origem no legado: listener de mensagem (`:9123-9126`), `catch` vazio em `applyContext` (`:9121`)
  - Critério de pronto: página de outro site embutindo o módulo não consegue trocar o `dataPath`
  - Confiança: 🟢

- [ ] T-23, Servir o mp4box pelo próprio nginx em `/static/vendor/`, com o CDN só como reserva
  - Origem no legado: `mod_video.html:9-15`
  - Critério de pronto: sem acesso ao jsDelivr e ao cdnjs, a exportação rápida funciona
  - Confiança: 🟢

- [ ] T-24, Sessão que sobrevive a renomear o arquivo: ao não achar `nome|tamanho`, oferecer as sessões com o mesmo tamanho e duração
  - Origem no legado: `sessionKey` (`:8459`), `restoreSession` (`:8596`)
  - Critério de pronto: renomear `jogo.mp4` para `jogo-final.mp4` e abrir oferece a sessão antiga
  - Confiança: 🟡

- [ ] T-25, Corrigir o comentário da mescla para dizer o que o código faz (mais lances vence; empate, a mais recente)
  - Origem no legado: comentário `:8333-8334` × `_melhorSessao` (`:8335-8342`)
  - Critério de pronto: comentário e código dizem a mesma coisa
  - Confiança: 🟢

### Evolução decidida pelo dono

- [ ] T-26, Ditado por voz no nome e na observação do lance, inclusive com o vídeo rodando (D-02)
  - Origem no legado: inexistente
  - Critério de pronto: falar durante o modal preenche a observação
  - Confiança: 🟢 (D-26: reconhecimento de voz do navegador primeiro; serviço externo só se a qualidade não servir)

- [ ] T-27, 9 idiomas pelo dicionário único (D-10)
  - Origem no legado: chaves `vid.*` em `fluxgk-i18n.js` (hoje en/pt)
  - Critério de pronto: Video Lab em alemão sem chave faltando
  - Confiança: 🟢

## Tarefas de Teste

- [ ] TT-01, Marcação com pré/pós da etiqueta e nome numerado (Critério 1)
- [ ] TT-02, Reabrir o arquivo restaura a sessão (2)
- [ ] TT-03, Escolha da via de exportação: sem sobreposição → mp4box; com desenho → recodificação (3)
- [ ] TT-04, Armazenamento cheio: selo, alerta e backup de emergência (4)
- [ ] TT-05, Importar backup mais antigo não apaga nada (5)
- [ ] TT-06, Mescla: mais lances vence; empate, a mais recente (6)
- [ ] TT-07, Nada sobe antes da primeira leitura (7)
- [ ] TT-08, Leitura falha não sobrescreve a nuvem (após T-16)
- [ ] TT-09, Dois aparelhos no mesmo vídeo não perdem lances (após T-17)
- [ ] TT-10, Painel criado sem conexão sobrevive (após T-18)
- [ ] TT-11, Mensagem de contexto de outra janela é recusada (após T-22)

## Tarefas de Migração de Dados (se aplicável)

- [ ] TM-01, Documento único `<dataPath>/video` → um nó por sessão e nós próprios para painéis, projetos e goleiros (com T-19), lendo os dois formatos durante a transição
- [ ] TM-02, Chaves locais globais → chaves por contexto (com T-20), feita no navegador na primeira abertura

## Ordem Sugerida
1. T-16: hoje uma leitura que falha pode apagar o trabalho de outro aparelho.
2. T-18 e T-17: completam a proteção contra perda.
3. T-01 a T-15 com TT-01 a TT-07 como linha de base.
4. T-19 + TM-01 quando a decisão de formato sair; T-20 + TM-02 junto, porque as duas mexem em onde a sessão mora.
5. T-21 a T-25.
6. T-26 e T-27 com o resto do app.

## Lacunas (revisadas em 13/10)

Respostas do dono ao Reviewer em `../questions.md`; decisões D-11 a D-31 em `../domain.md`.

- ✅ Formato da nuvem: manter o documento único (mais simples, teto de 5 MB) ou um nó por sessão (sem teto, cada edição pequena)? Sem o volume real de uma conta (D-07), o teto é risco sem medida. → D-15: um registro por sessão
- ✅ Ditado por voz: o mesmo serviço da Minutagem e do Perfil. → D-26: voz do navegador primeiro
