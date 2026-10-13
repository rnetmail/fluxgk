# Tática 3D (Quadra Tática)

## Visão Geral
`tatica3d.html` (2.156 linhas). Prancheta tática de futsal em 3D (three.js): quadra oficial de 40 × 20 m com
piso de madeira, gols com rede e arquibancada, onde o técnico posiciona goleiros, jogadores, adversários e
material de treino e desenha linhas, setas e trajetórias. Funciona sozinha (aberta direto, com arquivo `.json`) ou
**embutida no GK Planner**, onde vira a figura e o desenho editável de um exercício. Não tem banco próprio. 🟢

## Responsabilidades
- Montar a cena 3D da quadra e trocar entre câmeras predefinidas e a vista 2D. 🟢
- Posicionar, mover, girar, redimensionar, duplicar e apagar objetos. 🟢
- Desenhar traços (linha, seta, tracejada), retos ou livres, com trava de eixo e curvatura por alças. 🟢
- Desfazer, limpar, salvar e abrir a cena em `.json`, e tirar foto da vista. 🟢
- No Planner: receber o desenho do exercício, devolver a imagem padronizada e a cena. 🟢

## Regras de Negócio
- RN-01 Escala: 1 unidade = 1 m; quadra 40 × 20 m; objetos não saem de 4 m além das linhas (`clampCourt`). 🟢
- RN-02 Objetos disponíveis: goleiro, jogador, adversário, bola, cone, chapéu chinês (8 cores), minitrave, boneco, barreira, escada, arco, vara, anilha. 🟢
- RN-03 Goleiro, jogador e adversário usam os modelos `assets/{goleiro,jogador,adversario}.glb` normalizados a 1,78 m de altura; sem o arquivo (ou aberto como `file:`), usam o boneco interno. 🟢
- RN-04 Na vista 2D, jogadores e adversários viram discos numerados por time (1, 2, 3… na ordem de colocação). 🟢
- RN-05 Câmeras: 2D, meia-quadra, livre, tática (de cima), gol e lateral. 🟢
- RN-06 Traço de 2 pontos pode ser curvado por alças; traço livre não (salvo se a cena disser o contrário). 🟢
- RN-07 **Imagem para o exercício é sempre a mesma vista**, independente da câmera do técnico: 2D de cima, fundo branco, sem marcas de seleção, em **meia-quadra** (do fundo do gol até ~17 m à frente, padrão do treino de goleiro) ou **quadra inteira**; JPEG de até 1000 px, qualidade 0,88. A vista do técnico é restaurada depois. 🟢
- RN-08 A cena viaja junto com a imagem, para o exercício poder ser reaberto e editado. 🟢
- RN-09 Cena = `{app: 'FluxGK Tatica 3D', v: 1, objetos: [{k, x, z, r, s, c?}], desenhos: [{s, c, p: [[x, z]…], b, k?}]}`, números com 3 ou 4 casas; a chave de cor `c` só existe quando há cor, porque `undefined` faz o PocketBase recusar a gravação do exercício inteiro. 🟢
- RN-10 Abrir uma cena limpa a quadra, remonta tudo e zera o desfazer e a numeração dos times. Exercício sem desenho abre a quadra limpa. 🟢
- RN-11 No modo embutido, só aceita a cena (`fluxgk-tatica-load`) da janela pai. 🟢

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | Cena 3D da quadra com piso, linhas, gols com rede, arquibancada, luz e sombra | Must | Quadra 40 × 20 m com marcações oficiais |
| RF-02 | Câmeras predefinidas, câmera livre e vista 2D | Must | Critério de Aceitação 1 |
| RF-03 | Paleta de objetos (RN-02); tocar e clicar na quadra coloca o objeto | Must | Objeto aparece no ponto clicado |
| RF-04 | Selecionar, mover, girar, aumentar, diminuir, duplicar e apagar, por botão e teclado | Must | `Q`/`E` giram 15°; `+`/`−` mudam 12% |
| RF-05 | Desenho com estilos linha, seta e tracejada; reto (Tab) ou livre; trava de eixo (Shift); curvatura por alças; borracha | Must | Critério de Aceitação 2 |
| RF-06 | Desfazer (Ctrl+Z) e limpar | Must | Desfazer remove o último objeto ou traço |
| RF-07 | Salvar e abrir a cena em `.json` | Should | Critério de Aceitação 3 |
| RF-08 | Foto da vista atual em PNG | Could | Arquivo `fluxgk-tatica-<data>.png` |
| RF-09 | Modo embutido no Planner: receber a cena, "usar no exercício" (imagem + cena), alternar meia-quadra/quadra inteira, fechar | Must | Critérios de Aceitação 4 e 5 |
| RF-10 | Interface no idioma do app (`tat.*`) | Should | Botões em português e inglês |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Disponibilidade | three.js, GLTFLoader e SkeletonUtils servidos pelo próprio site, sem CDN | `tatica3d.html:190-192` (`/static/vendor/`) | 🟢 |
| Disponibilidade | sem os modelos `.glb`, segue com o boneco interno | `loadModels`, `:775-785` | 🟢 |
| Capacidade | imagem do exercício em JPEG de até 1000 px, porque o PNG de 1600 px passava de 1 MB e estourava o armazenamento do navegador | comentário em `captureReport`, `:1946-1948` | 🟢 |
| Performance | densidade de pixels limitada a 2 | `renderer.setPixelRatio(Math.min(dpr, 2))`, `:206` | 🟢 |
| Segurança | cena aceita só da janela pai | `:1995-2000` | 🟢 |
| Compatibilidade | a cena omite chaves `undefined`, que o PocketBase recusa | comentário em `cenaAtual`, `:2043-2044` | 🟢 |

> Inferido a partir do código. Validar com equipe de operações.

## Critérios de Aceitação

```gherkin
Dado a quadra em câmera livre com zoom
Quando o técnico escolhe a câmera "gol"
Então a vista passa para trás do gol, e a vista 2D mostra os jogadores como discos numerados

Dado o modo desenho com estilo seta e "reto" ligado
Quando o técnico arrasta de um ponto a outro
Então aparece uma seta reta de 2 pontos, que pode ser curvada pelas alças

Dado uma cena com 3 jogadores, 2 cones e 1 seta
Quando o técnico salva em .json e abre o arquivo depois
Então os 6 elementos voltam na mesma posição, rotação, tamanho e cor

Dado a quadra embutida no Planner em câmera lateral, com um objeto selecionado
Quando o técnico toca "usar no exercício" em meia-quadra
Então o Planner recebe uma imagem 2D de cima, com fundo branco, sem o anel de seleção, mostrando do fundo do gol até ~17 m, e a vista lateral volta como estava

Dado um exercício que já tem desenho
Quando o técnico abre a quadra tática pelo Planner
Então a cena do exercício é carregada e pode ser alterada

Dado uma mensagem fluxgk-tatica-load vinda de outra janela que não a do Planner
Quando ela chega à quadra embutida
Então é ignorada
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Cena, câmeras, objetos, edição, desenho, desfazer, modo embutido (RF-01..06, 09) | Must | É o que o Planner usa para ilustrar o exercício |
| `.json` e idioma (RF-07, 10) | Should | Uso fora do Planner |
| Foto PNG (RF-08) | Could | A imagem do exercício já cobre o uso principal |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `tatica3d.html` | renderer, cena, luz, dimensões (`:200-240`) | 🟢 |
| `tatica3d.html` | quadra, rede, gols, arquibancada, prancha 2D (`woodTexture` … `buildBoard2D`, `:241-539`) | 🟢 |
| `tatica3d.html` | objetos (`buildHuman`, `buildBall`, `buildCone`, `buildChapeu`, … `buildVara`, `:540-762`), modelos `.glb` (`:763-810`), `BUILDERS` (`:811`) | 🟢 |
| `tatica3d.html` | câmeras (`setCamera`, `:878`), seleção (`pickPlaceable`, `addObject`, `selectObj`, `:935-1286`), discos 2D (`discTexture`, `attachProxy2D`) | 🟢 |
| `tatica3d.html` | desenho (`startStroke` … `removeDrawing`, `:1317-1600`) | 🟢 |
| `tatica3d.html` | interface e teclado (`setMode`, `scaleSelected`, `doUndo`, `:1734-1891`) | 🟢 |
| `tatica3d.html` | `captureReport` (`:1892`), modo embutido (`:1967-2004`), foto, `cenaAtual` (`:2037`), `.json`, `carregarCena` (`:2080`) (`:2022-2110`) | 🟢 |
| `mod_planner.html` | abertura do iframe, envio da cena e recepção da imagem (`:658-1025`) | 🟢 |
| `tools/gerar-glb.py` | gera os três modelos `.glb` low-poly | 🟢 |
