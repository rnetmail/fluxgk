# História: analisar vídeo

> Fluxo de análise de vídeo: do arquivo do jogo no computador até os cortes exportados e o relatório para a
> direção. Specs de origem: `../video/`, `../hub/`, `../adaptador-fluxdb/`.

## Persona
**Técnico de goleiros** no computador do clube (Chrome ou Edge de desktop), com os vídeos dos jogos numa pasta
local, às vezes de vários GB. Revê o jogo, separa os lances do goleiro, monta playlists para conversar com ele e
um vídeo editado para a direção.

## Histórias

### US-01 Abrir o vídeo sem enviar
**Como** técnico, **quero** abrir o vídeo do jogo direto do meu computador **para** começar na hora, sem esperar upload.
- Prioridade: Must · Confiança: 🟢
- Regras: o vídeo nunca sai do computador; só metadados vão para a nuvem (ADR 005, RN-42); pasta de projeto lembrada no IndexedDB (vídeo RN-01).

### US-02 Marcar lances com um toque
**Como** técnico, **quero** tocar numa etiqueta do painel no momento do lance **para** criar o corte sem parar de assistir.
- Prioridade: Must · Confiança: 🟢
- Regras: marcar pausa o vídeo e abre o nome (`<etiqueta> NN`); corte de `t − pré` a `t + pós`; especificação, goleiro, resultado `ok`/`bad` e observação (vídeo RN-03..05).

### US-03 Reabrir de onde parei
**Como** técnico, **quero** que abrir o mesmo arquivo traga de volta os lances e desenhos **para** continuar a análise outro dia.
- Prioridade: Must · Confiança: 🟢
- Regras: sessão por `nome|tamanho`; gravação local em 250 ms, conferida ao reler (vídeo RN-02, RN-09).

### US-04 Desenhar sobre o lance
**Como** técnico, **quero** desenhar setas, áreas e medidas e congelar o quadro **para** mostrar ao goleiro o posicionamento.
- Prioridade: Should · Confiança: 🟢
- Regras: desenho força a exportação recodificada (vídeo RN-13).

### US-05 Organizar em playlists e projetos
**Como** técnico, **quero** juntar lances de vários jogos em playlists e projetos **para** montar o trabalho de um tema (ex.: saídas 1x1 na temporada).
- Prioridade: Should · Confiança: 🟢

### US-06 Exportar cortes
**Como** técnico, **quero** exportar um lance, todos, ou um vídeo combinado com cartela **para** mandar ao goleiro e à direção.
- Prioridade: Must · Confiança: 🟢
- Regras: sem sobreposição, corte rápido no keyframe (mp4box); com desenho, título, marca ou resolução, recodifica (MP4/AVC1 ou WebM/VP9) (vídeo RN-13).

### US-07 Relatório para a direção
**Como** técnico, **quero** um relatório com as análises e os capítulos copiáveis para o YouTube **para** publicar o vídeo editado com índice.
- Prioridade: Could · Confiança: 🟢
- Regras: capítulos somam cartela + duração dos lances na ordem exportada (vídeo RN-15).

### US-08 Não perder trabalho
**Como** técnico, **quero** ser avisado quando o navegador estiver cheio e ter uma cópia de segurança **para** não perder uma noite de análise.
- Prioridade: Must · Confiança: 🟢
- Regras: aviso a 80%; libera caches com cópia na nuvem; backup de emergência baixado sozinho; backup `.json` que mescla sem apagar (vídeo RN-09, RN-14).

### US-09 Mesmo trabalho em dois computadores
**Como** técnico, **quero** marcar lances no clube e continuar em casa **para** não depender de uma máquina.
- Prioridade: Should · Confiança: 🟢 (regra) / 🔴 (limitação atual)
- Regras: na leitura da nuvem vence a sessão com mais lances; empate, a mais recente; cópia local de segurança por 7 dias (vídeo RN-11). O vídeo precisa existir nos dois computadores com o mesmo nome e tamanho.

### US-10 Ditar a observação
**Como** técnico, **quero** falar a observação do lance com o vídeo rodando **para** analisar mais rápido.
- Prioridade: Should · Confiança: 🔴 (D-02, serviço de voz a definir)

## Critérios de Aceitação

```gherkin
Cenário: marcar um lance
  Dado o vídeo "final.mp4" aberto e a etiqueta "1x1" com pré 4 s e pós 3 s
  Quando o técnico toca "1x1" aos 12:30
  Então o vídeo pausa, o modal sugere "1x1 01" e o corte vai de 12:26 a 12:33

Cenário: reabrir a sessão
  Dado 15 lances marcados em "final.mp4" (2,1 GB)
  Quando o técnico fecha o navegador e abre o mesmo arquivo amanhã
  Então os 15 lances e os desenhos voltam

Cenário: exportação escolhe a via
  Dado um lance sem desenho e outro com seta desenhada
  Quando o técnico exporta os dois em resolução original
  Então o primeiro sai cortado sem recodificar e o segundo sai recodificado com a seta

Cenário: dois computadores
  Dado 10 lances no clube e 12 em casa para o mesmo arquivo
  Quando o computador do clube lê a nuvem
  Então fica com a sessão de 12 lances, e a de 10 é guardada como cópia de segurança local

Cenário: armazenamento cheio
  Dado o navegador sem espaço
  Quando o técnico marca um lance
  Então aparece o alerta com "tentar de novo" e "baixar cópia"
  E uma cópia de emergência é baixada
```

## Passo a passo atual 🟢
1. O hub abre `mod_video.html` com o contexto; o módulo mostra o lançador (vídeo solto ou projeto).
2. O vídeo abre por ObjectURL; a sessão `nome|tamanho` é restaurada do navegador.
3. Lances, desenhos, playlists e projetos são gravados no navegador (250 ms) e, depois da primeira leitura da nuvem, o documento inteiro `<dataPath>/video` sobe 600 ms após cada alteração.
4. Exportação no navegador (mp4box ou canvas + `MediaRecorder`), salva por `showSaveFilePicker` ou download.

## Evolução decidida pelo dono
- Ditado por voz (D-02).
- 9 idiomas (D-10).

## Lacunas
- 🔴 Documento único de até 5 MB por temporada; com o volume real desconhecido (D-07), o módulo pode parar de salvar (DT-05; vídeo T-19).
- 🔴 Falha na leitura da nuvem pode liberar a gravação e sobrescrever o trabalho de outro aparelho (vídeo T-16).
- 🟢 Mescla "mais lances vence": apagar lances num computador é desfeito pelo outro que tem mais.
- 🟢 Renomear o arquivo perde o vínculo com a sessão (vídeo T-24).
- 🟢 Só Chrome e Edge de desktop têm pasta de projeto; no celular, só vídeo solto.
- 🟢 mp4box e Chart.js por CDN (DT-12).
