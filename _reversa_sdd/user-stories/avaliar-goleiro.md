# História: avaliar goleiro

> Fluxo de avaliação: do goleiro do próprio elenco (Perfil) e do goleiro de outro clube (Scouting). Specs de
> origem: `../perfil/`, `../scouting/`, `../controle-de-carga/` (dono do elenco), `../traducao/`.

## Persona
**Técnico de goleiros** que avalia o próprio elenco em datas marcadas da temporada, com o método dele, e conversa
com o goleiro e a direção a partir disso. Também observa goleiros de outros clubes, para indicação ou para
preparar jogos. Trabalha em clubes de países diferentes (português, inglês, russo).

## Histórias

### US-01 Ficha do goleiro do elenco
**Como** técnico, **quero** manter a ficha de cada goleiro (dados pessoais, físicos, contrato, histórico, pontos fortes e fracos) **para** ter tudo dele num lugar.
- Prioridade: Must · Confiança: 🟢
- Regras: o elenco vem do Controle de carga — o Perfil não cria, não exclui e não muda nome nem foto; grava sozinho 0,9 s depois da última edição (perfil RN-01..03).

### US-02 Avaliar por competências com o meu método
**Como** técnico, **quero** avaliar cada goleiro numa escala, por eixo e item que eu defino, **para** medir a evolução com o critério que eu uso.
- Prioridade: Must · Confiança: 🟢
- Regras: modelo do técnico, que o acompanha entre clubes; fábrica com 3 eixos (A 10 itens, B 7, C 8), escala 1–5 e 5 níveis; até 8 eixos; nota 0 = não avaliado; média do eixo = média dos itens avaliados; mudar a escala converte as notas (perfil RN-05..08; RN-40).

### US-03 Uma avaliação por data
**Como** técnico, **quero** registrar avaliações em datas diferentes **para** ver a evolução ao longo da temporada.
- Prioridade: Must · Confiança: 🟢
- Regras: uma por goleiro por data; outra no mesmo dia substitui (perfil RN-04; RN-38).

### US-04 Plano e diário
**Como** técnico, **quero** um plano de desenvolvimento e um diário da temporada por goleiro **para** registrar o que combinamos e o que aconteceu.
- Prioridade: Should · Confiança: 🟢

### US-05 Comparar e ver o grupo
**Como** técnico, **quero** comparar goleiros e ver o grupo em gráficos **para** decidir quem joga e onde investir treino.
- Prioridade: Should · Confiança: 🟢

### US-06 Relatórios no idioma do clube
**Como** técnico, **quero** gerar o relatório individual, de página única, do elenco ou de um período, no idioma escolhido **para** entregar à direção do clube onde estou.
- Prioridade: Must · Confiança: 🟢
- Regras: período = temporada inteira ou intervalo; hoje pt, en e ru, com um conjunto de arquivos por idioma (perfil RN-11, RN-12); D-10: 9 idiomas e um dicionário só.

### US-07 Arquivar quem saiu
**Como** técnico, **quero** arquivar um goleiro **para** tirá-lo das listas sem perder o histórico.
- Prioridade: Should · Confiança: 🟢
- Regras: arquivado some das listas, nada é apagado (perfil RN-10; RN-39).

### US-08 Observar um goleiro de outro clube
**Como** técnico, **quero** anotar um goleiro durante um jogo e fazer a leitura completa depois, em cinco áreas com nota de 1 a 5, **para** montar meu acervo de observação.
- Prioridade: Must · Confiança: 🟢
- Regras: acervo do técnico, fora de clube e temporada; leitura inicial e observações; valor atual por área = leitura mais recente (scouting RN-01..04; RN-41).

### US-09 Ditar a avaliação
**Como** técnico, **quero** falar as observações da avaliação e da leitura **para** registrar mais rápido.
- Prioridade: Should · Confiança: 🔴 (D-02, serviço de voz a definir)

## Critérios de Aceitação

```gherkin
Cenário: avaliação com o modelo de fábrica
  Dado o goleiro "Rui" no elenco e o modelo de fábrica (escala 1–5)
  Quando o técnico dá 4 em 8 dos 10 itens do eixo A e deixa 2 sem nota
  Então a média do eixo A é 4,0, calculada só com os 8 itens avaliados

Cenário: mesma data substitui
  Dado uma avaliação de Rui em 10/03
  Quando o técnico avalia Rui de novo em 10/03
  Então continua existindo uma avaliação em 10/03, com as notas novas

Cenário: modelo acompanha o técnico
  Dado o técnico que acrescentou o eixo "Jogo com os pés" no Sporting
  Quando ele abre o Perfil no Benfica
  Então o eixo "Jogo com os pés" está no modelo

Cenário: mudar a escala
  Dado notas na escala 1–5 e o técnico muda para 1–10
  Então uma nota 4 passa a valer 8 e as notas 0 continuam "não avaliado"

Cenário: elenco é do Controle de carga
  Dado o goleiro "Rui" cadastrado no Controle de carga
  Quando o técnico abre o Perfil
  Então Rui aparece, sem opção de excluir nem de mudar nome ou foto

Cenário: goleiro observado
  Dado um goleiro anotado só pelo nome durante o jogo
  Quando o técnico faz a leitura nas cinco áreas no dia seguinte
  Então a marca "leitura pendente" some e a nota média aparece no cartão
```

## Passo a passo atual 🟢
1. Perfil: recebe o contexto; lê o elenco de `<dataPath>/load/players`, as fichas, avaliações e diário de `<dataPath>/profile/…` e o modelo de `users/<uid>/library/gkCriteria`.
2. O técnico edita a ficha (gravação automática) ou abre uma avaliação na data; grava em `assessments/<goleiro>/<data>`.
3. Gráficos, comparação e grupo calculados na tela; PDFs no navegador, com fontes cirílicas quando há russo.
4. Scouting: acervo em `users/<uid>/scouting`, gravado por diferença (ver `./entrar-e-escolher-contexto.md` para o contexto e `../scouting/` para o fluxo).

## Evolução decidida pelo dono
- 9 idiomas e um dicionário só; o Perfil entra no `fluxgk-i18n.js` (D-10; tradução T-11).
- Ditado por voz (D-02).
- Elencos separados continuam (D-04).

## Lacunas
- 🟡 Ficha, avaliações e diário são da temporada: na temporada nova, o mesmo goleiro começa do zero (perfil RN-13).
- 🟢 Goleiro do Perfil (elenco da carga), da Estatística e da Minutagem são registros diferentes; o goleiro observado no Scouting também (DT-07).
- 🟢 Scouting: importar não substitui a nuvem, e edição sem conexão pode sumir quando a nuvem chega (`../scouting/design.md`, Riscos).
- 🟡 As cinco áreas do Scouting são fixas, enquanto o modelo do Perfil é configurável; não há decisão sobre unificar.
