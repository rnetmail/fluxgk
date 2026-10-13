# Perfil do Goleiro (GK Profile)

## Visão Geral
`mod_profile.html` (o maior arquivo depois do vídeo, 5.946 linhas). Ficha individual de cada goleiro do elenco:
dados pessoais e físicos, avaliação por competências numa escala configurável, plano de desenvolvimento, diário
da temporada, evolução em gráficos, comparação entre goleiros, visão de grupo e relatórios em PDF (individual,
página única, elenco e período), em português, inglês ou russo. Veio de um app anterior ("Semey"). 🟢

## Responsabilidades
- Mostrar o elenco do Load Control (só leitura de nome e foto) unido aos dados de perfil. 🟢
- Editar a ficha do goleiro com gravação automática. 🟢
- Avaliar por competências (eixos e itens) com data e nota. 🟢
- Plano de desenvolvimento (forças, fraquezas, plano) e diário da temporada. 🟢
- Evolução, comparação e média do grupo em gráficos. 🟢
- Modelo de critérios do técnico (eixos, itens, escala, níveis) e identidade dos relatórios. 🟢
- Relatórios em PDF, opcionalmente em ZIP com um arquivo por goleiro. 🟢

## Regras de Negócio
- RN-01 O elenco é do Load Control: o Perfil **não cria nem exclui** goleiros, e nome e foto não são editados aqui (`ROSTER_READONLY`). 🟢
- RN-02 Campos de perfil aceitos: `nick, number, birth, nationality, team, season, contract, height, weight, wingspan, hand, foot, hist, plan, scores, item_notes, strengths, weaknesses, archived`; outros são descartados. 🟢
- RN-03 Edição da ficha é gravada automaticamente 0,9 s depois da última alteração; em erro, mostra aviso e mantém o pendente; sair com pendência pede confirmação. 🟢
- RN-04 Avaliação: **uma por goleiro por data** (`assessments/<goleiro>/<AAAA-MM-DD>`); avaliar de novo no mesmo dia substitui. 🟢
- RN-05 Modelo de fábrica: 3 eixos — **A** Ações específicas do goleiro (10 itens), **B** Percepção-ação e tomada de decisão (7), **C** Físico, mental e disciplinar (8) —, escala 1–5 e 5 níveis (Abaixo do exigido · Desenvolvimento inicial · Em desenvolvimento · Consolidado · Referência na equipe). 🟢
- RN-06 O modelo é do técnico (`users/<uid>/library/gkCriteria`) e o acompanha entre clubes; até 8 eixos; escala mínima 0–9 e máxima 2–100; nota 0 = "não avaliado". 🟢
- RN-07 Média do eixo e média geral = média dos itens avaliados (nota > 0). 🟢
- RN-08 Mudar a escala converte as notas proporcionalmente, preservando 0 = não avaliado. Itens de notas antigas ausentes do modelo atual são identificados como órfãos. 🟢
- RN-09 Abreviação do eixo deriva do nome (iniciais das 3 primeiras palavras com mais de 2 letras, ou 3 primeiras letras). 🟢
- RN-10 Goleiro arquivado some das listas (opção "mostrar arquivados"); nada é apagado. 🟢
- RN-11 Período dos relatórios: temporada inteira ou intervalo de datas (`from`/`to`). 🟢
- RN-12 Idiomas próprios do módulo: pt, en, ru (dicionário embutido); PDF com fontes cirílicas quando há russo. **Decisão do dono (D-10):** 9 idiomas no app inteiro e um dicionário só. 🟢
- 🟢 RN-13 Perfil, avaliações e diário ficam na temporada (`<dataPath>/profile/…`, `:2014-2016`, `:2070`); trocar de temporada começa a ficha do zero, mesmo para o mesmo goleiro. [Reviewer: confirmado no código]

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | Lista do elenco (cartões) com média geral e acesso à ficha; mostrar/ocultar arquivados | Must | Goleiro do Load Control aparece sem cadastro aqui |
| RF-02 | Ficha "Geral" com campos de RN-02 e gravação automática | Must | Critério de Aceitação 1 |
| RF-03 | Avaliação por competências com data, notas por item, nota por item e observação | Must | Critério de Aceitação 2 |
| RF-04 | Plano de desenvolvimento (forças, fraquezas, plano) | Should | Persistem na ficha |
| RF-05 | Diário da temporada (entradas datadas) | Should | Entrada aparece em ordem de data |
| RF-06 | Evolução: gráfico das médias ao longo das avaliações | Should | Uma linha por eixo + geral |
| RF-07 | Comparação entre goleiros selecionados e média do grupo | Should | Métrica escolhida (geral ou eixo) |
| RF-08 | Editor do modelo de critérios (eixos, itens, escala, níveis) e da identidade (clube, escudo, cores, responsável) | Should | Critério de Aceitação 3 |
| RF-09 | PDF individual, página única, elenco e período; seções escolhidas; capa e marca d'água; ZIP por goleiro | Should | PDF em russo usa fonte cirílica |
| RF-10 | Tema claro/escuro e idioma | Could | Preferência lembrada |
| RF-11 | **Evolução (D-10):** usar o dicionário único do app com os 9 idiomas | Should | Perfil em francês |
| RF-12 | **Evolução (D-02):** ditado por voz nas observações, plano, forças, fraquezas e diário | Should | Falar preenche o campo |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Disponibilidade | fila de gravação até o login; reenvio do pendente em erro; aviso ao sair | `mod_profile.html:2051-2072`, `:3991-4019` | 🟢 |
| Performance | gravação agrupada com atraso de 0,9 s | `queueSave`, `:3991-3997` | 🟢 |
| Segurança | campos fora da lista são descartados antes de gravar | `updateGoalkeeper`, `:2270-2284` | 🟢 |
| Segurança | contexto aceito só da janela pai; textos escapados | `:5919`; `esc`, `:3842` | 🟢 |
| Usabilidade | foco do campo restaurado após redesenhar a tela | `focoAtual`/`restauraFoco`, `:4068-4094` | 🟢 |
| Performance | bibliotecas de PDF carregadas só ao gerar (pdf-lib, fontkit, jszip) | `ensureLibs`, `:2404` | 🟢 |

> Inferido a partir do código. Validar com equipe de operações.

## Critérios de Aceitação

```gherkin
Dado a ficha de um goleiro aberta
Quando o técnico altera a altura e espera 1 segundo
Então a ficha é gravada e o indicador mostra "salvo"

Dado um goleiro com avaliação em 10/03
Quando o técnico avalia de novo em 10/03
Então continua havendo uma única avaliação nessa data, com as notas novas

Dado um modelo com escala 1–5 e notas 4
Quando o técnico muda a escala para 1–10
Então as notas são convertidas proporcionalmente e as não avaliadas continuam 0

Dado um goleiro excluído no Load Control
Quando o Perfil abre
Então ele não aparece mais na lista

Dado a tentativa de criar um goleiro pelo Perfil
Quando a operação é chamada
Então ela é recusada com ROSTER_READONLY
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Elenco, ficha, avaliação (RF-01..03) | Must | Núcleo |
| Plano, diário, evolução, comparação, critérios, PDF, idiomas, voz (RF-04..09, 11, 12) | Should | Valor alto |
| Tema e preferências (RF-10) | Could | Conforto |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `mod_profile.html` | `COMPETENCIAS`, `T` (dicionário pt/en/ru) | 🟢 |
| `mod_profile.html` | `ColorKit` (paleta acessível por OKLCH, extração de cores do escudo) | 🟢 |
| `mod_profile.html` | `ModelKit` (`factory`, `normalize`, `axisAvg`, `globalAvg`, `convert`, `orphanIds`) | 🟢 |
| `mod_profile.html` | `Charts` (`multiLine`, `groupedBars`) | 🟢 |
| `mod_profile.html` | `FDB` (caminhos, fila, listeners) e `Adapter` (interface herdada do "SemeyDB") | 🟢 |
| `mod_profile.html` | `Reports` (`generate`, `buildIndividual`, `buildOnePager`, `buildSquad`, `buildPeriod`, `drawCover`, `zipFiles`) | 🟢 |
| `mod_profile.html` | `App`, `render`, `view*`, `gk*`, `queueSave`, `flushSave`, receptor de contexto (`:5909+`) | 🟢 |
