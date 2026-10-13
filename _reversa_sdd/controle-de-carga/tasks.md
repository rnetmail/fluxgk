# Controle de Carga, Tarefas de Implementação

## Pré-requisitos
- [ ] Hub entregando `FLUXGK_CONTEXT` (formatos novo e antigo) — `../hub/contracts.md`
- [ ] `adaptador-fluxdb` com a **fachada modular** (`../adaptador-fluxdb/contracts.md`, seção 5)
- [ ] Chart.js 4.4.1 e Tabler Icons 2.44.0
- [ ] Chaves `data.*` em `fluxgk-i18n.js`
- [ ] Para T-17: papel de Administrador reconhecido pelo app (`../hub/tasks.md`, T-17)

## Tarefas

### Paridade com o legado

- [ ] T-01, Contexto, raiz `<dataPath>/load`, inicialização modular e ordem de arranque (estado local → envio → escuta → render)
  - Origem no legado: `mod_data.html:942-985`, `:2596-2636`
  - Critério de pronto: o módulo abre no clube e temporada do hub
  - Confiança: 🟢

- [ ] T-02, Estado local (`loadUserState`, `save` com versão enxuta) e migração `glcv5`
  - Origem no legado: `mod_data.html:986-1055`
  - Critério de pronto: com o navegador cheio, grava a versão enxuta sem quebrar
  - Confiança: 🟢

- [ ] T-03, Elenco: cartões, adicionar com foto, excluir (com registros), perfil do goleiro, seletor
  - Origem no legado: `mod_data.html:1186-1300`, `:1358-1484`
  - Critério de pronto: goleiro novo aparece no seletor e no painel do hub
  - Confiança: 🟢

- [ ] T-04, Status com data e nota, reativar, "Fora do elenco"
  - Origem no legado: `mod_data.html:1194-1210`, `:1312-1357`
  - Critério de pronto: emprestado sai do seletor; reativar volta
  - Confiança: 🟢

- [ ] T-05, Campos configuráveis de bem-estar e pós-treino (padrões, editor, chaves únicas)
  - Origem no legado: `mod_data.html:765-913`
  - Critério de pronto: campo novo aparece no formulário, nos gráficos e no relatório
  - Confiança: 🟢

- [ ] T-06, Pré-treino, falta e descanso (`_onAttendanceChange`, `submitPre`, horário AM/PM)
  - Origem no legado: `mod_data.html:1491-1556`, `:2016-2039`
  - Critério de pronto: Critérios de Aceitação 1 e 2
  - Confiança: 🟢

- [ ] T-07, Pós-treino (`buildPSE`, `calcUA`, `submitPost`, pré-treinos abertos)
  - Origem no legado: `mod_data.html:1485-1490`, `:1557-1597`, `:2040-2071`
  - Critério de pronto: Critério de Aceitação 3; pré de outro goleiro é recusado
  - Confiança: 🟢

- [ ] T-08, Editar e excluir mantendo o par; reparo de vínculos; migração de escala
  - Origem no legado: `mod_data.html:1598-1723`
  - Critério de pronto: Critérios de Aceitação 4 e 5
  - Confiança: 🟢

- [ ] T-09, Painel, médias móveis, ACWR e gráficos; filtro por semanas
  - Origem no legado: `mod_data.html:1724-1840`
  - Critério de pronto: Critério de Aceitação 7
  - Confiança: 🟢

- [ ] T-10, Histórico, presença por treino, gráfico por tipo, tipos de treino
  - Origem no legado: `mod_data.html:1841-2015`
  - Critério de pronto: tipos novos somam com os da nuvem
  - Confiança: 🟢

- [ ] T-11, Relatórios em PDF e exportar/importar JSON
  - Origem no legado: `mod_data.html:2094-2570`
  - Critério de pronto: PDF com seções configuráveis; JSON reimporta sem perda
  - Confiança: 🟢

- [ ] T-12, Identidade (`applyTheme`, `applyBranding`, configurações)
  - Origem no legado: `mod_data.html:917-956`, `:1164-1185`
  - Critério de pronto: cor e escudo do clube aplicados
  - Confiança: 🟢

### Correções

- [x] T-13, **Sincronização correta ao abrir:** remover o `rtPushAll` incondicional; ler a nuvem primeiro; enviar só o que foi alterado localmente e ainda não confirmado (fila de pendências com `ts`) — **feito em 13/10** (`fluxgkReconciliarCarga`: concilia a cada leitura, vence o mais recente, `_sync` e lápides; `tools/test-carga.mjs` no CI; ponta a ponta em HML: foto e status preservados, registro local subiu, registro da nuvem chegou)
  - Origem no legado: `rtPushAll` (`:1072-1097`), arranque (`:2629-2632`)
  - Critério de pronto: Critério de Aceitação 6; abrir o módulo sem pendências faz zero gravações
  - Confiança: 🟢

- [x] T-14, **Fusão completa:** registros e jogadores do servidor substituem a versão local (ou vence o `ts` mais recente); exclusões no servidor removem do local — **feito em 13/10** junto com T-13 (exclusões e edições de outro aparelho chegam; vence o mais recente, D-11)
  - Origem no legado: `rtListen` (`:1121-1157`)
  - Critério de pronto: apagar no aparelho B remove no A; editar no B atualiza no A
  - Confiança: 🟢

- [x] T-15, **Foto e status sem apagar um ao outro:** gravar `players/<id>` com `update` de campos no mesmo nó (`{name}`, `{photo}`, `{status, statusDesde, statusNota}`), nunca `set` do nó com subset de campos — **feito em 13/10**: a reconciliação nunca regrava o goleiro inteiro; `rtSavePlayer` usa `update` de campos
  - Origem no legado: `rtSavePlayer` (`:1063`), `rtSaveStatus` (`:1065-1066`), `rtSavePhoto` (`:1067`), `rtPushAll` (`:1076-1083`)
  - Critério de pronto: mudar status não apaga foto; renomear não apaga status
  - Confiança: 🟢

- [x] T-16, Exclusão confirmada: `_del` com tratamento de erro e fila de reenvio — **feito em 13/10**: lápide guardada até a nuvem confirmar a exclusão; reenviada na próxima leitura
  - Origem no legado: `_del` (`:1059`)
  - Critério de pronto: exclusão sem rede é refeita quando a rede volta e não ressuscita
  - Confiança: 🟢

- [ ] T-17, Contexto só da janela pai (`e.source === window.parent`)
  - Origem no legado: `:2596-2600`
  - Critério de pronto: contexto de outra janela é ignorado
  - Confiança: 🟢

- [ ] T-18, Escuta mais fina: listeners separados para `players`, `sessions/<goleiro atual>`, `config`, `trainingTypes`, em vez do nó `load` inteiro
  - Origem no legado: `rtListen` (`:1099-1102`)
  - Critério de pronto: gravar um registro não rebaixa fotos de todos os goleiros
  - Confiança: 🟡 (depende da cópia local do adaptador)

- [ ] T-19, Migração `glcv5` só com confirmação do usuário e indicação de qual conta e clube vão receber os dados
  - Origem no legado: `loadUserState` (`:991-1009`)
  - Critério de pronto: em navegador com `glcv5`, aparece a pergunta antes de importar
  - Confiança: 🟡

### Evoluções decididas pelo dono

- [ ] T-20, **ACWR configurável (D-03):** função única `acwr(posts, metodo)` usada nos três lugares; parâmetro global `acwrMethod: 'datas-com-treino' | 'dias-corridos'` (padrão o atual), editável só pelo Administrador; "dias corridos" preenche os dias sem treino com 0 nas janelas de 7 e 28 dias
  - Origem no legado: `:1826-1829`, `:2184`, `:2286-2292`
  - Critério de pronto: com o padrão, os números não mudam; com "dias corridos", 7 dias de calendário entram na média aguda
  - Confiança: 🟢 (cálculo) / 🟢 (D-20: parâmetro do sistema inteiro; D-21: admin por `FLUXGK_ADMINS`, depois `role`)

- [ ] T-21, Ditado por voz nos campos de texto (nota de status e campos extras do pós-treino) (D-02)
  - Origem no legado: `stNote`, campos de `postFields`
  - Critério de pronto: falar preenche o campo
  - Confiança: 🟢 (D-26: reconhecimento de voz do navegador primeiro; serviço externo só se a qualidade não servir)

### Autoavaliação do goleiro (pedido de 13/10)

- [x] T-AUTO-1, Coleção `autoavaliacao_links`, rotas públicas e gravação na árvore do técnico — **feito em 13/10** (`tools/smoke-auto.mjs`, 15 verificações, no CI)
- [x] T-AUTO-2, Página pública `mod_autoavaliacao.html` para o celular — **feito em 13/10**
- [x] T-AUTO-3, Load Control: link por goleiro, WhatsApp, revogar, respostas e cartão no painel — **feito em 13/10** (ponta a ponta em HML: gerar link, responder no celular, chegar ao vivo, revogar)
- [ ] T-AUTO-4, Gráfico da autoavaliação na série temporal e no PDF do goleiro
  - Critério de pronto: humor, sono e alimentação aparecem como linhas no painel e no relatório
  - Confiança: 🟡 (não pedido; natural para a próxima volta)
- [ ] T-AUTO-5, Lembrete diário ao goleiro (notificação ou mensagem)
  - Confiança: 🔴 (canal a definir: WhatsApp Business, e-mail, push)

## Tarefas de Teste

- [ ] TT-01, Pré-treino com bem-estar (Critério 1)
- [ ] TT-02, Descanso e falta (2)
- [ ] TT-03, Pós-treino e UA (3)
- [ ] TT-04, Exclusões do par (4 e 5)
- [ ] TT-05, Dois aparelhos: status, edição e exclusão (6, após T-13 e T-14)
- [ ] TT-06, ACWR nos dois métodos (7, após T-20), com tabela de casos
- [ ] TT-07, Abrir o módulo sem pendências não grava nada (após T-13) — contar requisições
- [ ] TT-08, Mudar status preserva foto (após T-15)

## Tarefas de Migração de Dados (se aplicável)

- [ ] TM-01, Consolidar jogadores gravados como nós filhos (`players/<id>/photo`, `/status`…) num único nó por jogador, sem perder campos
- [ ] TM-02, Recuperação: para contas em que fotos sumiram, procurar a foto em caches locais antigos (`glc_*`) e oferecer reenvio

## Ordem Sugerida
1. T-13, T-14 e T-15 primeiro: perda de dados e principal causa de lentidão.
2. TT-07 antes e depois de T-13 para medir o ganho.
3. T-01 a T-12 com TT-01 a TT-04 como linha de base.
4. T-16, T-17, T-19; depois T-18 junto com a cópia local do adaptador.
5. T-20 quando o papel de Administrador existir; T-21 depois do serviço de voz.

## Lacunas (revisadas em 13/10)

Respostas do dono ao Reviewer em `../questions.md`; decisões D-11 a D-31 em `../domain.md`.

- ✅ Onde mora o parâmetro global do ACWR (por técnico, por clube ou do sistema inteiro)? → D-20: o método vale para o sistema inteiro
- ✅ Em conflito entre aparelhos, vence o registro mais recente (`ts`) ou o servidor sempre? → D-11: vence o mais recente, item a item
