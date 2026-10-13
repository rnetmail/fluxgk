# Tática 3D, Tarefas de Implementação

## Pré-requisitos
- [ ] three.js, GLTFLoader e SkeletonUtils em `/static/vendor/`, servidos pelo próprio site
- [ ] `assets/{goleiro,jogador,adversario}.glb` gerados por `tools/gerar-glb.py` (opcionais: sem eles, boneco interno)
- [ ] Chaves `tat.*` em `fluxgk-i18n.js`
- [ ] `planejamento` respondendo ao protocolo `fluxgk-tatica-*` (`../planejamento/tasks.md`, T-07)
- [ ] **Decisão sobre onde mora a imagem do exercício** (Lacunas Pendentes): define T-17

## Tarefas

### Paridade com o legado

- [ ] T-01, Renderer, cena, luz e sombra; mundo em metros (quadra 40 × 20 m, centro na origem, gols em `x = ±20`); densidade de pixels limitada a 2; leitura de `?embed=1`
  - Origem no legado: `tatica3d.html:193-240`
  - Critério de pronto: a quadra ocupa a janela e redimensiona sem distorcer
  - Confiança: 🟢

- [ ] T-02, Quadra: piso de madeira procedural, linhas oficiais, gols com rede, arquibancada e a prancha 2D
  - Origem no legado: `woodTexture` … `buildBoard2D` (`:241-539`)
  - Critério de pronto: marcações oficiais de futsal visíveis em 3D e na prancha 2D
  - Confiança: 🟢

- [ ] T-03, Construtores dos objetos de RN-02 (`buildHuman`, `buildBall`, `buildCone`, `buildChapeu` com 8 cores, minitrave, boneco, barreira, escada, arco, vara, anilha) e a tabela `BUILDERS`
  - Origem no legado: `:540-762`, `BUILDERS` (`:811`)
  - Critério de pronto: cada item da paleta coloca o objeto certo no ponto clicado
  - Confiança: 🟢

- [ ] T-04, Modelos `.glb` de goleiro, jogador e adversário normalizados a 1,78 m, carregados em segundo plano, com o boneco interno como reserva (sem arquivo ou aberto como `file:`)
  - Origem no legado: `loadModels` (`:763-810`)
  - Critério de pronto: com `assets/` removido, a quadra abre e mostra os bonecos internos
  - Confiança: 🟢

- [ ] T-05, Câmeras: os 6 presets com os parâmetros do design (`2d`, `meia`, `livre`, `tatica`, `gol`, `lateral`), `camCtl` com os limites de φ, raio e zoom, roda que aproxima puxando o alvo para o cursor, giro e deslocamento
  - Origem no legado: `setCamera` (`:878`), `:853-967`
  - Critério de pronto: Critério de Aceitação 1
  - Confiança: 🟢

- [ ] T-06, Vista 2D: esconder o 3D, mostrar a prancha, proxies (disco numerado por time com goleiro sempre 1 e jogadores a partir de 2; ícones pseudo-3D para equipamentos), `syncProxies` com `orient2D`
  - Origem no legado: `applyViewMode` (`:1253`), `attachProxy2D`, `discTexture`, `teamCount` (`:983`, `:1238`)
  - Critério de pronto: na vista 2D cada jogador vira disco com número, e girar a vista mantém os números legíveis
  - Confiança: 🟢

- [ ] T-07, Colocar e editar objetos: `addObject`, seleção, mover, girar (`Q`/`E`, 15°), redimensionar (`+`/`−`, 12%), duplicar, apagar, limites de `clampCourt`
  - Origem no legado: `addObject` (`:968`), `selectObj`, `clampCourt` (`:1287`), ações do selecionado (`:1734-1891`)
  - Critério de pronto: objeto arrastado para fora para 4 m além da linha; teclas e botões fazem o mesmo
  - Confiança: 🟢

- [ ] T-08, Desenho: linha, seta e tracejada (0,55 m com 0,4 m de vão) como tubos a `y = 0,02`; reto (Tab) ou livre; trava de eixo (Shift); alças de curvatura em traço de 2 pontos; duplo clique acrescenta ponto de curvatura; borracha
  - Origem no legado: `startStroke` … `removeDrawing` (`:1317-1600`), `addCtrlPointAt` (`:1579`)
  - Critério de pronto: Critério de Aceitação 2
  - Confiança: 🟢

- [ ] T-09, Ponteiro e modos: `select`, `place`, `draw`, `erase`, `camera`; botão direito gira, Shift/botão do meio desloca; toque em tela funciona igual ao mouse
  - Origem no legado: `:1600-1733`, `mode` (`:833`)
  - Critério de pronto: num tablet, colocar, mover e desenhar funcionam com o dedo
  - Confiança: 🟢

- [ ] T-10, Desfazer (Ctrl+Z) e limpar com confirmação, zerando a pilha e a numeração
  - Origem no legado: `doUndo` (`:1859`), `b-clear` (`:1865-1873`)
  - Critério de pronto: desfazer remove o último objeto ou traço acrescentado; limpar pede confirmação
  - Confiança: 🟢

- [ ] T-11, Cena em JSON: `cenaAtual` (RN-09, sem chave `undefined`), salvar `.json`, abrir `.json` com aviso de arquivo inválido, `carregarCena` (limpa, remonta, zera desfazer e numeração)
  - Origem no legado: `cenaAtual` (`:2037`), `carregarCena` (`:2080`), `:2022-2110`
  - Critério de pronto: Critério de Aceitação 3; arquivo corrompido mantém a cena atual
  - Confiança: 🟢

- [ ] T-12, Foto PNG da vista atual (`fluxgk-tatica-<data>.png`)
  - Origem no legado: `b-photo` (`:2026-2033`)
  - Critério de pronto: o arquivo baixa com a vista que está na tela
  - Confiança: 🟢

- [ ] T-13, Captura padronizada para o exercício (RN-07): guardar a vista, esconder seleção e alças, vista 2D, câmera ortográfica própria (meia-quadra `x` −21,5 a −3, `z` ±11; inteira `x` ±22, `z` ±11), 1600 px com fundo branco, JPEG de 1000 px q 0,88, restaurar tudo
  - Origem no legado: `captureReport` (`:1892`), `_capFrame` (`:1891`)
  - Critério de pronto: Critério de Aceitação 4
  - Confiança: 🟢

- [ ] T-14, Modo embutido: botões meia-quadra/quadra inteira, "usar no exercício" e "fechar"; mensagens `ready`, `load`, `image`, `close`; `load` aceito só da janela pai; `null` abre quadra limpa
  - Origem no legado: `:1967-2010`
  - Critério de pronto: Critérios de Aceitação 5 e 6
  - Confiança: 🟢

- [ ] T-15, Interface pelo dicionário (`tat.*`) e avisos por `toast`
  - Origem no legado: `data-i18n` da marcação, `TX('tat.msg.*')`
  - Critério de pronto: trocar o idioma do app troca botões e avisos da quadra
  - Confiança: 🟢

### Correções

- [ ] T-16, Guardar o número do jogador na cena (`n` em cada objeto de time) e, ao abrir, usar o número salvo; `teamCount` passa a ser o maior número presente + 1. Cena antiga sem `n` continua numerando pela ordem
  - Origem no legado: `teamCount` (`:983`, `:1238`), `cenaAtual` (`:2037`), `carregarCena` (`:2085`)
  - Critério de pronto: apagar o jogador 3 de 2, 3, 4, salvar e reabrir mostra 2 e 4, igual à figura do exercício
  - Confiança: 🟢

- [ ] T-17, Imagem do exercício fora do registro: guardar o JPEG como arquivo (campo de arquivo do PocketBase ou armazenamento próprio) e gravar no exercício só a referência; ler `data:` antigo durante a transição
  - Origem no legado: `fluxgk-tatica-image` (`:1985`) → `ex.img` (`mod_planner.html:1013-1019`); ligada a T-19 do `planejamento`
  - Critério de pronto: exercício com figura não contém `data:image` no registro; a figura continua aparecendo no Planner e no relatório
  - Confiança: 🟢 (D-14: imagens viram arquivos do PocketBase)

- [ ] T-18, Desfazer completo: registrar na pilha mover, girar, redimensionar, apagar, duplicar e curvar, guardando o estado anterior; desfazer de objeto já apagado restaura em vez de não fazer nada
  - Origem no legado: `undoStack` só recebe `obj` (`:978`) e `draw` (`:1450`); `doUndo` (`:1859-1864`)
  - Critério de pronto: apagar um cone e desfazer traz o cone de volta no mesmo lugar; mover e desfazer devolve a posição
  - Confiança: 🟢

- [ ] T-19, Foto PNG limpa: esconder seleção e alças antes de renderizar a foto e restaurar depois, como faz a captura do exercício
  - Origem no legado: `b-photo` (`:2026-2033`) × `captureReport` (`:1892`)
  - Critério de pronto: foto tirada com um objeto selecionado sai sem o anel nem as alças
  - Confiança: 🟢

- [ ] T-20, Mensagens com destino definido: no modo embutido, `postMessage` para a origem do Planner (`location.origin`), não `'*'`
  - Origem no legado: `:1985`, `:1991`, `:2006`
  - Critério de pronto: a quadra embutida numa página de outra origem não entrega a imagem nem a cena
  - Confiança: 🟢

- [ ] T-21, Validar a cena recebida antes de montar: `k` entre as chaves de `BUILDERS`, `s` entre os estilos, números finitos, listas com tamanho máximo; item inválido é pulado e registrado
  - Origem no legado: `carregarCena` (`:2080`)
  - Critério de pronto: cena com um objeto de tipo desconhecido abre os demais e avisa no console
  - Confiança: 🟡

### Evolução decidida pelo dono

- [ ] T-22, 9 idiomas pelo dicionário único (D-10)
  - Origem no legado: chaves `tat.*` em `fluxgk-i18n.js` (hoje en/pt)
  - Critério de pronto: quadra em holandês sem chave faltando
  - Confiança: 🟢

- [ ] T-23, Uso no celular, mobile first (D-05): barra e paleta recolhíveis, alvos de toque de 44 px, gesto de pinça para zoom
  - Origem no legado: barra e paleta na marcação (`:1-189`)
  - Critério de pronto: num celular em pé, dá para colocar 5 jogadores, desenhar uma seta e usar no exercício sem zoom do navegador
  - Confiança: 🟢 (D-27: uso em computador e tablet; celular não é prioridade — tarefa adiada)

## Tarefas de Teste

- [ ] TT-01, Troca de câmera e vista 2D com discos numerados (Critério 1)
- [ ] TT-02, Seta reta de 2 pontos curvável pelas alças (2)
- [ ] TT-03, Salvar e abrir `.json` preserva posição, rotação, tamanho e cor (3)
- [ ] TT-04, Captura padronizada independe da câmera e restaura a vista (4)
- [ ] TT-05, Exercício com desenho reabre editável; sem desenho, quadra limpa (5)
- [ ] TT-06, `fluxgk-tatica-load` de outra janela é ignorada (6)
- [ ] TT-07, `cenaAtual` não produz chave `undefined` em objeto sem cor
- [ ] TT-08, Sem `.glb`, a quadra usa o boneco interno
- [ ] TT-09, Número do jogador sobrevive a salvar e reabrir (após T-16)
- [ ] TT-10, Desfazer apagar e mover (após T-18)
- [ ] TT-11, Foto sem marcas de seleção (após T-19)

## Tarefas de Migração de Dados (se aplicável)

- [ ] TM-01, `ex.img` em `data:` JPEG → arquivo com referência (com T-17), lendo os dois formatos durante a transição; feita junto com a TM-01 do `planejamento`
- [ ] TM-02, Cenas sem `n` (com T-16): nenhuma conversão; o número é atribuído pela ordem na primeira abertura e salvo na próxima gravação

## Ordem Sugerida
1. T-01 a T-15 com TT-01 a TT-08 como linha de base: é o que o Planner usa hoje.
2. T-16: a figura e a cena reaberta não podem mostrar números diferentes.
3. T-20 e T-21, junto com a T-18 do `planejamento`, que fecha o mesmo protocolo do outro lado.
4. T-18 e T-19.
5. T-17 + TM-01 quando a decisão sobre a imagem sair, na mesma entrega da T-19 do `planejamento`.
6. T-22 e T-23 com o resto do app.

## Lacunas (revisadas em 13/10)

Respostas do dono ao Reviewer em `../questions.md`; decisões D-11 a D-31 em `../domain.md`.

- ✅ Onde mora a imagem do exercício: continuar `data:` dentro do registro (simples, soma ao tamanho) ou arquivo com referência (registro leve, mais uma peça para guardar e apagar)? Sem o volume real de uma conta (D-07), o peso é risco sem medida. → D-14: arquivos do PocketBase
- ✅ A quadra precisa funcionar bem no celular, ou o uso real é no computador e no tablet? → D-27: computador e tablet
