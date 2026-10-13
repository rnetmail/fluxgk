# Tática 3D, Design Técnico

## Interface

### Organização do arquivo 🟢
| Bloco | Linhas | Papel |
|---|---|---|
| marcação: barra (modos, câmeras, desfazer, abrir, salvar, foto), paleta, estilos de traço, ações do selecionado | 1–189 | |
| three.js, GLTFLoader, SkeletonUtils (`/static/vendor/`) | 190–192 | |
| renderer, cena, luz, dimensões | 193–240 | `EMBED` lido de `?embed=1` |
| quadra: piso procedural, linhas, redes, gols, arquibancada, prancha 2D | 241–539 | |
| construtores de objetos, modelos `.glb`, `BUILDERS` | 540–852 | |
| câmeras (`ortho`, `camCtl`, `setCamera`), roda do mouse, raycast | 853–967 | |
| `addObject`, discos numerados, ícones 2D, `attachProxy2D`, `applyViewMode`, seleção | 968–1316 | |
| desenho: traço, tubo, tracejado, alças de curvatura | 1317–1600 | |
| ponteiro (pointerdown/move/up, duplo clique) | 1600–1733 | |
| modos, cores do chapéu, ações do selecionado, desfazer, limpar, teclado | 1734–1891 | |
| captura padronizada, modo embutido | 1892–2010 | |
| foto PNG, cena em JSON, abrir, `carregarCena`, laço de animação | 2011–2156 | |

### Mundo 🟢
- Unidade: metro. Quadra `L = 40` (eixo X), `W = 20` (eixo Z), centro na origem; gols em `x = ±20`.
- Objetos presos a `x ∈ [−24, 24]`, `z ∈ [−14, 14]` (`clampCourt`, `:1287`).
- Traços a `y = 0,02`, como tubos de raio 0,045 m (`DRAW_Y`, `DRAW_R`, `:1317`); tracejado = segmentos de 0,55 m com 0,4 m de vão.

### Modos (`mode`, `:833`) 🟢
`select` · `place` (com `placeKind`) · `draw` · `erase` · `camera`. Botão direito ou modo câmera giram; Shift, botão do
meio ou vista 2D deslocam; a roda aproxima puxando o alvo para o ponto do cursor.

### Câmeras (`setCamera`, `:878`) 🟢
| Preset | Câmera | Parâmetros |
|---|---|---|
| `2d` | ortográfica | quadra inteira, zoom 1 |
| `meia` | ortográfica | gol embaixo, alvo `x = −10,3`, zoom 1,55 |
| `livre` | perspectiva | raio 30, φ 1,02 |
| `tatica` | perspectiva | raio 36, φ 0,10 (quase de cima) |
| `gol` | perspectiva | alvo `(−14; 0,8; 0)`, raio 13, φ 1,25, θ −π/2 |
| `lateral` | perspectiva | raio 24, φ 1,18 |

`camCtl` limita φ a `[0,08; π/2 − 0,02]` e o raio a `[4; 80]`; zoom ortográfico a `[0,45; 8]`.

### Vista 2D (`applyViewMode`, `:1253`) 🟢
Esconde piso, linhas 3D, gols e arquibancada e mostra a prancha 2D. Cada objeto tem um **proxy**: disco numerado
(goleiro, jogador, adversário; cor do time e listras) ou ícone pseudo-3D (equipamentos). `syncProxies` reorienta os
números conforme `orient2D`.

### Cena (`cenaAtual`, `:2037`) 🟢
```jsonc
{ "app": "FluxGK Tatica 3D", "v": 1,
  "objetos":  [{ "k": "jogador", "x": -12.5, "z": 3.2, "r": 1.5708, "s": 1, "c": 16711680 }],   // c só se houver cor
  "desenhos": [{ "s": "seta", "c": 16777215, "p": [[-15, 0], [-8, 4]], "b": true, "k": [[…]] }] } // k = pontos de curvatura
```
`k` (tipo) ∈ chaves de `BUILDERS`; `s` (estilo do traço) ∈ `linha | seta | tracejada`; `b` = pode curvar.

### Mensagens com o Planner 🟢
| Direção | Mensagem | Conteúdo |
|---|---|---|
| quadra → Planner | `fluxgk-tatica-ready` | a quadra está de pé |
| Planner → quadra | `fluxgk-tatica-load` | `cena` do exercício, ou `null` para quadra limpa |
| quadra → Planner | `fluxgk-tatica-image` | `dataUrl` (JPEG) + `cena` |
| quadra → Planner | `fluxgk-tatica-close` | fechar o modal |

Todas com destino `'*'`.

## Fluxo Principal
1. O Planner abre o modal e cria o iframe `tatica3d.html?embed=1` na primeira vez (`mod_planner.html:993`).
2. A quadra monta a cena, carrega os `.glb` em segundo plano e, no modo embutido, acrescenta à barra "meia-quadra/quadra inteira", "usar no exercício" e "fechar"; avisa `fluxgk-tatica-ready` (`tatica3d.html:1967-2004`).
3. O Planner responde com `fluxgk-tatica-load` e a cena do exercício (`_enviarCenaTatica`, `mod_planner.html:989`); a quadra confere que veio da janela pai e chama `carregarCena` (`:2080`).
4. O técnico posiciona objetos (`addObject`, `:968`) e desenha (`startStroke` → `extendStroke` → `finishStroke`, `:1361-1464`).
5. "Usar no exercício": `captureReport` (`:1892`) guarda a vista do técnico, esconde seleção e alças, liga a vista 2D, enquadra com uma câmera ortográfica própria (meia-quadra: `x` de −21,5 a −3, `z` ±11; inteira: `x` ±22, `z` ±11), renderiza 1600 px com fundo branco, comprime para JPEG de 1000 px (q 0,88) e restaura tudo.
6. Envia `fluxgk-tatica-image` com a imagem e `cenaAtual()`. O Planner grava `ex.img` (imagem) e `ex.tatica` (cena sem `undefined`) e fecha o modal (`mod_planner.html:1013-1019`).

## Fluxos Alternativos
- **Sozinha (fora do Planner):** sem os botões do modo embutido; o trabalho sai por "salvar" (`.json`) e "foto" (PNG da vista atual). 🟢
- **Abrir `.json` inválido:** aviso "arquivo inválido", cena atual mantida. 🟢
- **Sem os `.glb` ou aberta como `file:`:** boneco interno (`buildHuman`). 🟢
- **Exercício sem desenho:** quadra limpa (`carregarCena({objetos: [], desenhos: []})`). 🟢
- **Duplo clique num traço:** acrescenta ponto de curvatura (`addCtrlPointAt`, `:1579`). 🟢
- **Limpar:** pede confirmação, apaga tudo, zera desfazer e numeração (`:1865-1873`). 🟢

## Dependências
- three.js, GLTFLoader, SkeletonUtils em `/static/vendor/`. 🟢
- `assets/{goleiro,jogador,adversario}.glb`, gerados por `tools/gerar-glb.py`. 🟢
- `fluxgk-i18n.js` (chaves `tat.*`). 🟢
- `planejamento` (Planner), único consumidor do modo embutido. 🟢
- Nenhum acesso a banco nem ao adaptador. 🟢

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---|---|---|
| Imagem padronizada, independente da câmera do técnico | comentário em `captureReport`, `:1909-1913` | 🟢 |
| JPEG de 1000 px em vez de PNG de 1600 px | comentário `:1946-1948` | 🟢 |
| Cena enviada junto com a imagem, para reabrir e editar | comentário `:1983-1984` | 🟢 |
| Chave de cor omitida quando vazia (PocketBase recusa `undefined`) | comentário `:2043-2044` | 🟢 |
| Meia-quadra como enquadramento padrão (treino de goleiro) | `_capFrame = 'half'`, `:1891` | 🟢 |
| Modelos 3D opcionais, com boneco interno de reserva | comentário `:763-764`; `loadModels` | 🟢 |
| Bibliotecas servidas pelo próprio site | `:190-192` | 🟢 |

## Estado Interno 🟢
`placeables` (objetos), `drawings` (traços, com `userData.style`, `color`, `pts`, `canBend`, `ctrl`), `undoStack`
(`{type: 'obj' | 'draw', ref}`), `teamCount` (próximo número de jogador e adversário), `selected`, `selDrawing`,
`mode`, `placeKind`, `drawStyle`, `drawColor`, `straightStroke`, `axisLock`, `chapeuCor`, `is2D`, `orient2D`,
`activeCamera`, `camCtl`, `_capFrame`, `MODELS`, `mixers`.

## Observabilidade
- `toast` com mensagens `tat.msg.*` (cena carregada, imagem enviada, nada a desfazer, quadra limpa). 🟢
- `console.warn('[tatica] cena nao carregou')` no modo embutido. 🟢

## Riscos e Lacunas
- 🟢 **Número do jogador não vai na cena:** a numeração é refeita pela ordem ao abrir. Durante a edição, apagar o 2 deixa 1 e 3; ao reabrir, o 3 vira 2. A figura salva e a cena reaberta podem mostrar números diferentes.
- 🟢 **Desfazer só desfaz o que foi acrescentado:** mover, girar, redimensionar, apagar e curvar não entram na pilha; desfazer depois de apagar um objeto não o traz de volta e não avisa.
- 🟢 **Planner aceita `fluxgk-tatica-image` de qualquer janela** (`mod_planner.html:1007-1022` não confere `e.source`); a quadra, ao contrário, confere a origem da cena.
- 🟢 Mensagens com destino `'*'`.
- 🟢 A foto PNG (`b-photo`) sai com o anel de seleção e as alças visíveis, ao contrário da captura do exercício.
- 🟢 A imagem do exercício vai como `data:` JPEG dentro dos dados do exercício (`fluxgk-tatica-image` → `setExImg(d.dataUrl)`, `mod_planner.html:1013-1014`), somando ao tamanho do registro na nuvem.
