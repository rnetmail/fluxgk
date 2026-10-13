# História: registrar jogo

> Fluxo de um jogo: o tempo em quadra de cada goleiro, cada finalização sofrida e as ações ofensivas, o mapa de
> chutes com xG e os relatórios. Specs de origem: `../minutagem/`, `../estatistica/`, `../xg/`,
> `../periodizacao/`, `../hub/`.

## Persona
**Técnico de goleiros** no banco ou na arquibancada, com o tablet ou o celular, registrando ao vivo com o jogo
rodando; ou no dia seguinte, revendo o vídeo. Depois, quer números para a comissão e para conversar com o goleiro.

## Histórias

### US-01 Ver o jogo no calendário
**Como** técnico, **quero** que o jogo esteja no calendário da temporada com a cor da competição **para** planejar a semana em torno dele.
- Prioridade: Could · Confiança: 🟢
- Regras: evento `game` com competição e escudo do adversário reduzido a 64 px (periodização RN-06, RN-07).

### US-02 Registrar o tempo em quadra
**Como** técnico, **quero** anotar entradas e saídas de cada goleiro lendo o cronômetro regressivo **para** saber quantos minutos cada um jogou.
- Prioridade: Must · Confiança: 🟢
- Regras: entrada 20:00, saída 16:38 = 3 min 22 s; soma por período 1º, 2º e prorrogação; prorrogação desmarcada é ignorada; salvar exige data e adversário (minutagem RN-01..06).

### US-03 Registrar cada finalização
**Como** técnico, **quero** registrar minuto, momento, ação técnica, resultado, distância, zona do gol e zona da quadra de cada chute **para** ver onde o goleiro defende e onde sofre.
- Prioridade: Must · Confiança: 🟢
- Regras: finalização exige resultado; o goleiro escolhido se repete; % de defesas = defesas ÷ (defesas + gols); rótulos com tipo fixo, renomear não quebra os números (estatística RN-03, RN-05, RN-06).

### US-04 Registrar as ações ofensivas do goleiro
**Como** técnico, **quero** registrar lançamentos, chutes e passes do goleiro com o desfecho **para** avaliar a participação dele no ataque.
- Prioridade: Should · Confiança: 🟢
- Regras: ação ofensiva exige tipo e desfecho (estatística RN-03, RN-07).

### US-05 Marcar os chutes no mapa com xG
**Como** técnico, **quero** tocar no ponto do chute e informar corpo, jogada, assistência, pressão e defensores **para** ter o xG de cada lado.
- Prioridade: Should · Confiança: 🟢
- Regras: modelo multiplicativo limitado a 0,01–0,97; pênalti e tiro de 10 m fixos; não salva partida sem chutes (xG RN-02, RN-03, RN-07).

### US-06 Usar os mesmos adversários em todos os módulos
**Como** técnico, **quero** cadastrar o adversário uma vez, com escudo, **para** escolhê-lo na minutagem, na estatística e no xG.
- Prioridade: Must · Confiança: 🟢 (regra) / 🔴 (hoje quebrada)
- Regras: adversários são do clube, em `users/<uid>/clubs/<clubId>/opponents` (RN-36); hoje cada módulo regrava a lista inteira com o seu formato e apaga o que os outros gravaram (DT-03).

### US-07 Ver o histórico e o relatório
**Como** técnico, **quero** filtrar jogos e ver gráficos, minutos por goleiro, % de defesas e xG por adversário **para** mostrar à comissão.
- Prioridade: Must · Confiança: 🟢
- Regras: % do tempo do clube e % quando relacionado (minutagem RN-07); painel cruzado da estatística; relatório da temporada do xG (xG RN-09).

### US-08 Ditar enquanto o jogo corre
**Como** técnico, **quero** falar a observação do lance em vez de digitar **para** não tirar o olho do jogo.
- Prioridade: Should · Confiança: 🔴 (evolução D-02, serviço a definir)

## Critérios de Aceitação

```gherkin
Cenário: tempo em quadra com troca no segundo tempo
  Dado um jogo de 40 min sem prorrogação contra "Leões"
  Quando o técnico registra Rui de 20:00 a 0:00 no 1º tempo e de 20:00 a 8:30 no 2º
  E André de 8:30 a 0:00 no 2º
  Então Rui soma 31 min 30 s e André 8 min 30 s
  E o painel do hub passa a contar 1 jogo

Cenário: % de defesas
  Dado 10 finalizações no alvo contra Rui: 8 com resultado do tipo save e 2 do tipo goal
  Quando o técnico abre o painel do jogo
  Então Rui tem 80% de defesas

Cenário: renomear rótulo não quebra números
  Dado o resultado "Save" usado em 30 finalizações
  Quando o técnico o renomeia para "Defesa"
  Então as 30 finalizações mostram "Defesa" e o % de defesas não muda

Cenário: pênalti
  Dado um pênalti marcado no xG com goleiro presente
  Então o xG do chute é 0,76

Cenário: adversário compartilhado (após DT-03)
  Dado o adversário "Leões" com escudo cadastrado na Estatística
  Quando o técnico salva um jogo contra "Leões" na Minutagem
  Então o escudo continua lá quando a Estatística e o xG abrem

Cenário: jogo não se perde ao fechar (após a correção da estatística)
  Dado 12 finalizações registradas ao vivo e o jogo ainda não salvo
  Quando a bateria do tablet acaba
  Então ao reabrir, as 12 finalizações estão lá
```

## Passo a passo atual 🟢
1. Minutagem: formulário com data, adversário, competição, duração e prorrogação; intervalos por goleiro e período; "Salvar" grava em `<dataPath>/minutes/games/<id>`.
2. Estatística: jogo novo **só na memória**; finalizações e ações ofensivas registradas; "Salvar" grava o jogo em `<dataPath>/stats/…`.
3. xG: chutes no mapa, primeiro no navegador (`fxg_games`), subindo a lista inteira 0,5 s depois.
4. Os três módulos regravam a lista de adversários do clube, cada um no seu formato.
5. Relatórios e PDFs gerados no navegador.

## Evolução decidida pelo dono
- Ditado por voz em todo campo de anotação, inclusive ao vivo (D-02).
- Elencos separados por módulo continuam (D-04); goleiro identificado por nome na Minutagem.

## Lacunas
- 🔴 Adversários sobrescritos entre módulos (DT-03; estatística RN-11, minutagem RN-10, xG RN-14).
- 🔴 xG: cópia local sem separação por conta, clube e temporada; o último jogo apagado volta; configurações nunca chegam à nuvem (xG RN-12, RN-13, RN-15).
- 🔴 Estatística: jogo em andamento só na memória (estatística RN-12).
- 🟢 Minutagem com prorrogação pode passar de 100% (minutagem RN-08).
- 🟢 xG: documento único com teto de 5 MB por temporada (DT-05; D-07: volume desconhecido).
- 🟢 O mesmo jogo é registrado três vezes, uma por módulo, sem vínculo entre eles.
