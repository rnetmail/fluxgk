# Planejamento (GK Planner)

## Visão Geral
`mod_planner.html`. O técnico monta a sessão de treino dos goleiros (exercícios por fase, com imagem e cena tática
3D), arquiva-a na biblioteca da temporada, registra o pós-treino qualitativo e gera relatórios. Mantém também a
biblioteca pessoal de exercícios, que vale para todos os clubes e temporadas. 🟢

## Responsabilidades
- Formulário da sessão: data, hora, duração, tipo, goleiros, objetivo, método. 🟢
- Exercícios da sessão: criar, editar, reordenar, remover, copiar de outra sessão ou da biblioteca. 🟢
- Biblioteca de exercícios do técnico (CRUD, com imagem recomprimida e cena do `tatica-3d`). 🟢
- Biblioteca de sessões da temporada (listar, ordenar, editar, excluir, selecionar, exportar). 🟢
- Pós-treino: avaliação (estrelas), objetivo atingido, seis campos qualitativos. 🟢
- Relatório em HTML imprimível de uma, várias ou todas as sessões. 🟢
- Proteção contra perda: fila de reenvio, espelho local, resgate de sessões do navegador e de outras temporadas. 🟢

## Regras de Negócio
- RN-01 Sessões são da temporada (`<dataPath>/planner/sessions`); exercícios da biblioteca são do técnico (`users/<uid>/library/exercises`). 🟢
- RN-02 Id de sessão e de exercício = `Date.now()` no momento da criação; editar mantém o id. 🟢
- RN-03 Fases: `warmup`, `main`, `complementary`, `cooldown`; valor desconhecido vira `main`. Tipos: `indiv`, `group`, `integrated`, `prematch`, `recovery`; desconhecido vira `indiv`. Rótulos antigos em PT/EN são aceitos por alias. 🟢
- RN-04 Exercício novo: nome vazio vira "Sem título" (traduzido), duração 8 min, 2 goleiros. 🟢
- RN-05 Toda imagem não-JPEG ou maior que 400 KB é reduzida a no máximo 1000 px de largura, JPEG qualidade 0,88, fundo branco; só substitui se ficar menor. 🟢
- RN-06 Exercícios antigos sem a marca `imgQ = 'jpeg'` são recomprimidos uma vez e regravados. 🟢
- RN-07 Adicionar um exercício da biblioteca à sessão cria uma **cópia** com id novo; a sessão guarda o exercício inteiro, com imagem. 🟢
- RN-08 "Salvar na biblioteca" grava a sessão, limpa o planejador para uma sessão nova e abre a biblioteca. 🟢
- RN-09 O pós-treino atualiza a **mesma** sessão (mesmo id), nunca duplica. 🟢
- RN-10 Sem conexão pronta (adaptador, login e caminhos), nada é gravado: o item entra numa fila e é reenviado a cada 15 s, ao voltar a rede e ao confirmar o login. Sair com fila pendente pede confirmação. 🟢
- RN-11 Item apagado na sessão de uso nunca volta: sai da fila e, se a nuvem o devolver, é apagado de novo. 🟢
- RN-12 O navegador guarda um espelho das 40 sessões mais recentes **sem imagens nem cena** (cai para 10 se faltar espaço); a nuvem é a fonte de verdade. 🟢
- RN-13 A biblioteca local guarda só o índice, sem imagens; se o espaço acabar, avisa uma vez e segue só na nuvem. 🟢
- RN-14 Resgate: mostra sessões que existem só no navegador e permite restaurá-las na temporada aberta; procura sessões em outros clubes/temporadas da conta (até 4 níveis) e permite copiá-las. 🟢
- RN-15 Relatórios em ordem cronológica quando há mais de uma sessão. 🟢
- RN-16 O idioma vem do hub e não é gravado pelo módulo. 🟢
- 🟢 RN-17 As anotações por goleiro e por exercício do pós-treino são gravadas na sessão (`postGkNotes = [{gk, nota}]`, `postNote` no exercício), voltam ao reabrir e entram no relatório. **Corrigido em 13/10 (D-02)** — antes apareciam na tela e não eram gravadas.

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | Formulário da sessão preservado ao trocar de aba | Must | Preencher, ir ao pós-treino e voltar mantém os campos |
| RF-02 | CRUD de exercício na sessão, com reordenação | Must | Ordem e conteúdo refletidos no relatório |
| RF-03 | Imagem do exercício por arquivo ou arrastar, com redução (RN-05) | Should | Foto de 4 MB vira JPEG ≤ 1000 px |
| RF-04 | Cena tática 3D anexada ao exercício | Should | Abrir, desenhar e confirmar grava `tatica` e a imagem gerada |
| RF-05 | Biblioteca de exercícios: criar, editar, apagar, usar na sessão | Must | Exercício criado aparece em outro clube do mesmo técnico |
| RF-06 | Copiar exercícios de uma sessão salva (um ou todos) | Could | A cópia entra na sessão aberta |
| RF-07 | Salvar sessão na biblioteca (RN-08) | Must | Sessão aparece na biblioteca; planejador fica vazio |
| RF-08 | Pós-treino: estrelas 0–5, objetivo atingido e 6 campos | Must | Reabrir a sessão mostra o que foi salvo |
| RF-09 | Biblioteca de sessões: lista por data (crescente/decrescente), editar, excluir, seleção múltipla | Must | Excluir remove da nuvem e do espelho |
| RF-10 | Relatório de uma, das selecionadas ou de todas | Should | Abre em nova aba pronto para imprimir |
| RF-11 | Fila de reenvio, aviso ao sair e indicador de sincronização (amarelo/verde/vermelho) | Must | Cenário de rede ausente no Critério de Aceitação |
| RF-12 | Resgate do navegador e de outras temporadas, com cópia de segurança em JSON | Should | Sessões de outra temporada podem ser trazidas |
| RF-13 | **Correção (D-02):** gravar anotações por goleiro e por exercício do pós-treino | Must | Reabrir a sessão mostra as anotações por goleiro e por exercício |
| RF-14 | **Evolução (D-02):** ditado por voz com transcrição em todos os campos de anotação | Should | Falar no campo de observação preenche o texto |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Disponibilidade | fila com reenvio a cada 15 s, no evento `online` e após login | `mod_planner.html:822-839` | 🟢 |
| Disponibilidade | aviso ao fechar com pendências (`beforeunload`) | `mod_planner.html:840-843` | 🟢 |
| Disponibilidade | espelho local limitado (40 → 10 sessões, sem imagem) para não estourar os ~5 MB do navegador | `mod_planner.html:1352-1373` | 🟢 |
| Performance | imagens reduzidas antes de gravar | `mod_planner.html:675-689`, `:861-881` | 🟢 |
| Segurança | contexto aceito só da janela pai | `mod_planner.html:499` | 🟢 |
| Segurança | listeners ligados só depois do login (as regras negavam e a assinatura morria) | `mod_planner.html:1830-1835` | 🟢 |
| Performance | **deficiência:** cada sessão carrega as imagens dos exercícios; o listener baixa todas a cada mudança | `mod_planner.html:2109`, `:1860` | 🟢 |

> Inferido a partir do código. Validar com equipe de operações.

## Critérios de Aceitação

```gherkin
Dado um técnico com temporada ativa
Quando ele monta uma sessão com dois exercícios e toca em "Salvar na biblioteca"
Então a sessão aparece na biblioteca da temporada e o planejador fica vazio

Dado uma sessão salva
Quando o técnico abre o pós-treino, dá 4 estrelas e escreve o ponto positivo
Então a mesma sessão (mesmo id) passa a ter rating 4 e o texto, sem uma sessão nova

Dado que a conexão com o banco ainda não está pronta
Quando o técnico salva um exercício
Então o exercício entra na fila, o indicador fica vermelho
E é gravado sozinho em até 15 s depois que a conexão aparecer

Dado um item apagado nesta sessão de uso
Quando a nuvem devolve esse item numa leitura
Então ele não aparece na tela e é apagado de novo

Dado uma foto PNG de 3 MB
Quando ela é anexada a um exercício
Então a imagem gravada é JPEG com no máximo 1000 px de largura

Dado sessões gravadas em outra temporada da mesma conta
Quando o técnico busca em outras temporadas e confirma a importação
Então as sessões passam a existir também na temporada aberta

Dado o pós-treino de uma sessão com dois goleiros
Quando o técnico escreve uma anotação para cada goleiro e salva (após RF-13)
Então reabrir a sessão mostra as duas anotações
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Sessão, exercícios, biblioteca, pós-treino (RF-01, 02, 05, 07, 08, 09) | Must | Núcleo do módulo |
| Fila e proteção contra perda (RF-11) | Must | Perda de dado já ocorreu (comentários) |
| Gravar anotações do pós-treino (RF-13) | Must | Decisão do dono; hoje há perda |
| Imagem, cena 3D, relatório, resgate (RF-03, 04, 10, 12) | Should | Valor alto, com alternativa |
| Voz (RF-14) | Should | Decisão do dono; requisito novo |
| Copiar de outra sessão (RF-06) | Could | Atalho |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `mod_planner.html` | `PAGES`, `showPage`, `_saveSessionForm`, `_restoreSessionForm` | 🟢 |
| `mod_planner.html` | `openWizard`, `confirmEx`, `renderExercises`, `rmEx`, `moveEx`, `setExImg`, `_shrinkDataUrl` | 🟢 |
| `mod_planner.html` | `renderExLib`, `addLibToSession`, `rmLibEx`, `openExPicker`, `pickLibEx`, `recompressLibrary` | 🟢 |
| `mod_planner.html` | `openTactica`, `_enviarCenaTatica` (iframe `tatica3d.html?embed=1`) | 🟢 |
| `mod_planner.html` | `refreshPost`, `setRating`, `closeSession`, `_persistSessionToLibrary`, `saveCurrentSession`, `_newSession` | 🟢 |
| `mod_planner.html` | `renderLibrary`, `editSessionFromLibrary`, `saveEditedSession`, `deleteSession`, `toggleSelect`, `sessionsByDate` | 🟢 |
| `mod_planner.html` | `buildReportHTML`, `exportSession`, `exportSelected`, `exportAll`, `openReport` | 🟢 |
| `mod_planner.html` | `_queueEx`, `_queueSess`, `flushPending`, `_marcarApagado`, `_persistExercise` | 🟢 |
| `mod_planner.html` | `_espelho*`, `_sessoesNoNavegador`, `baixarCopiaLocal`, `restaurarDoNavegador`, `buscarOutrasTemporadas`, `importarDeOutraTemporada` | 🟢 |
| `mod_planner.html` | `_loadCloud`, `_initCloud`, `_ligarListeners` | 🟢 |
