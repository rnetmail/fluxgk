# História: registrar treino e carga

> Fluxo de um dia de treino: o planejamento da sessão, a coleta antes e depois do treino e a leitura da carga.
> Specs de origem: `../periodizacao/`, `../planejamento/`, `../tatica-3d/`, `../controle-de-carga/`, `../hub/`.

## Persona
**Técnico de goleiros** com 2 a 4 goleiros no elenco da temporada. Planeja a semana dentro do mesociclo,
monta a sessão no computador, coleta bem-estar e PSE à beira da quadra no tablet ou celular, e presta contas à
comissão com relatórios em PDF.

## Histórias

### US-01 Saber o tema do dia
**Como** técnico, **quero** ver no calendário o meso, o micro e o tema do dia **para** montar a sessão alinhada à periodização.
- Prioridade: Should · Confiança: 🟢
- Regras: periodização é um documento por temporada; tema do dia pertence a um meso; dia mostra macro · meso e temas · micro · jogos (periodização RN-01, RN-08, RN-10).

### US-02 Montar a sessão
**Como** técnico, **quero** montar a sessão com exercícios por fase, cada um com imagem e desenho tático **para** conduzir o treino e registrá-lo.
- Prioridade: Must · Confiança: 🟢
- Regras: fases `warmup`, `main`, `complementary`, `cooldown`; exercício da biblioteca entra como **cópia**; imagem reduzida a 1000 px JPEG; desenho pela Quadra Tática, que devolve imagem 2D padronizada e cena editável (planejamento RN-03, RN-05, RN-07; tática RN-07, RN-08).

### US-03 Reaproveitar exercícios
**Como** técnico, **quero** guardar exercícios na minha biblioteca **para** usá-los em qualquer clube e temporada.
- Prioridade: Must · Confiança: 🟢
- Regras: biblioteca em `users/<uid>/library/exercises`, do técnico, fora do contexto (planejamento RN-01).

### US-04 Coletar o pré-treino
**Como** técnico, **quero** marcar presença, falta ou descanso de cada goleiro e, se presente, o bem-estar **para** ajustar o treino ao estado de cada um.
- Prioridade: Must · Confiança: 🟢
- Regras: presente → `pre` com sono, fadiga, dor muscular, estresse e humor de 1 a 5 (campos configuráveis); falta → `absence`; descanso → `rest`; goleiro fora de `ativo` não aparece na coleta (carga RN-03, RN-05, RN-06).

### US-05 Coletar o pós-treino
**Como** técnico, **quero** registrar PSE e duração de cada goleiro **para** calcular a carga da sessão.
- Prioridade: Must · Confiança: 🟢
- Regras: o pós fecha o pré aberto do mesmo goleiro; `ua = pse × duração`; corrigir o pré leva o pós junto (carga RN-08, RN-09).

### US-06 Registrar o pós-treino qualitativo
**Como** técnico, **quero** anotar como foi a sessão, por goleiro e por exercício, **para** ter o histórico do que funcionou.
- Prioridade: Must · Confiança: 🟢 (estado atual) / evolução
- Regras: atualiza a **mesma** sessão; hoje as anotações por goleiro e por exercício **não são gravadas** (planejamento RN-17); D-02 manda gravar e aceitar ditado por voz.

### US-07 Acompanhar a carga
**Como** técnico, **quero** ver UA, ACWR e gráficos por goleiro **para** evitar sobrecarga e explicar escolhas à comissão.
- Prioridade: Must · Confiança: 🟢
- Regras: ACWR = média das UA das últimas 7 datas com treino ÷ média das últimas 28, com ≥ 4 pós-treinos; faixa 0,8–1,3; D-03: método por dias corridos ativável só pelo administrador (carga RN-10).

### US-08 Prestar contas
**Como** técnico, **quero** gerar o PDF da sessão e o relatório de carga **para** mandar à comissão.
- Prioridade: Should · Confiança: 🟢
- Regras: relatórios do planejamento em ordem cronológica; PDF de carga com marca do clube (planejamento RN-15; `../controle-de-carga/`).

## Critérios de Aceitação

```gherkin
Cenário: sessão com desenho tático
  Dado o mesociclo "Bloco de força" com o tema "saídas 1x1" na terça
  Quando o técnico monta a sessão de terça com 2 exercícios da biblioteca e desenha o segundo na Quadra Tática
  Então a sessão guarda cópias dos 2 exercícios, o segundo com imagem 2D de meia-quadra e a cena editável
  E alterar a biblioteca depois não muda a sessão

Cenário: pré e pós de um goleiro
  Dado o goleiro "Rui" ativo
  Quando o técnico marca presença com sono 4, fadiga 2, dor 2, estresse 1, humor 5
  E, depois do treino, PSE 7 e 60 minutos
  Então existe um pré fechado ligado a um pós com UA 420

Cenário: falta não pede pós-treino
  Dado o goleiro "André" ausente no treino de hoje
  Quando o técnico registra a falta
  Então nenhum bem-estar é pedido, nenhum pós-treino fica pendente
  E (após D-01/D-08) a falta aparece como categoria própria, não como sessão

Cenário: ACWR com poucos dados
  Dado um goleiro com 3 pós-treinos na temporada
  Quando o técnico abre a carga dele
  Então o ACWR não é mostrado, porque exige pelo menos 4

Cenário: pós-treino qualitativo (após D-02)
  Dado a sessão de terça arquivada
  Quando o técnico anota "Rui atrasou o passo lateral" no exercício 2 e salva
  Então a anotação está lá ao reabrir a sessão em outro aparelho

Cenário: sem conexão no ginásio
  Dado o tablet sem rede
  Quando o técnico registra o pós-treino de 3 goleiros
  Então os registros ficam no aparelho e sobem quando a rede volta, sem duplicar
```

## Passo a passo atual 🟢
1. Periodização: o técnico consulta (ou cria) macro, meso, micro e temas do dia; o documento inteiro é regravado a cada mudança.
2. Planejamento: monta a sessão, abre a Quadra Tática por iframe para cada desenho (`fluxgk-tatica-*`), "Salvar na biblioteca" grava em `<dataPath>/planner/sessions/<id>`.
3. Controle de carga: coleta `pre`/`absence`/`rest` antes, `post` depois, em `<dataPath>/load/sessions/<playerId>/<id>`.
4. Carga e ACWR calculados na tela; PDFs gerados no navegador.
5. Hub: o painel conta sessões únicas por `data|hora|tipo`.

## Evolução decidida pelo dono
- Gravar as anotações do pós-treino e aceitar ditado por voz em toda anotação (D-02).
- ACWR por dias corridos como opção do administrador (D-03).
- Descanso e falta fora do contador de sessões (D-01, D-08).

## Lacunas
- 🔴 Ao abrir, o Controle de carga envia toda a cópia local antes de ler a nuvem e pode desfazer o que outro aparelho gravou (carga RN-13, DT-02).
- 🟢 A sessão guarda o exercício inteiro com imagem: a biblioteca de sessões cresce com imagens repetidas (DT-04; planejamento T-19).
- 🟢 Os três elencos (carga, estatística, minutagem) não se ligam; o goleiro da carga não é o mesmo registro do jogo (DT-07, D-04: manter).
