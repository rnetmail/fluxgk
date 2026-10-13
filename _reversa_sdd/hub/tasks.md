# Hub, Tarefas de Implementação

## Pré-requisitos
- [ ] Adaptador `fluxdb` disponível com `auth` e `database` (ver `../adaptador-fluxdb/contracts.md`)
- [ ] Coleções `users` e `nodes` criadas pela migration `pb_migrations/1760270000_init_fluxgk.js`
- [ ] `fluxgk-i18n.js` com as chaves `hub.*` e `common.*`
- [ ] Módulos respondem ao contrato de contexto (`contracts.md`)

## Tarefas

### Comportamento atual (paridade com o legado)

- [ ] T-01, Boot: carregar o adaptador, inicializar com `{backend:'pocketbase', url:''}`, ligar `onAuthStateChanged`; erro de carga mostra mensagem no `scr-loading`
  - Origem no legado: `index.html:978-1105`
  - Critério de pronto: sem sessão abre o login; com sessão abre o painel; adaptador ausente mostra a mensagem de falha
  - Confiança: 🟢

- [ ] T-02, Login e logout com persistência LOCAL/SESSION e mapeamento das mensagens `auth/*`
  - Origem no legado: `index.html:402-414`
  - Critério de pronto: os 5 códigos mapeados exibem seu texto; código desconhecido exibe `e.message`
  - Confiança: 🟢

- [ ] T-03, `loadAll`: 3 leituras paralelas com timeout de 20 s, 2 tentativas, correção do contexto órfão, marca `_loadFailed`
  - Origem no legado: `index.html:423-476`
  - Critério de pronto: cenários RN-03 e RN-08 passam
  - Confiança: 🟢

- [ ] T-04, Identidade visual e saudação (`applyIdentity`) e grade de módulos (`renderMods`) acessível por teclado
  - Origem no legado: `index.html:478-507`
  - Critério de pronto: cor do clube na barra; escudo ou sigla de 2 letras; cartão abre com Enter/Espaço
  - Confiança: 🟢

- [ ] T-05, CRUD de clube (`editClub`, `saveClub`, `deleteClub`, `onBadge` ≤ 500 KB, `renderPresets` com 10 cores)
  - Origem no legado: `index.html:806-905`
  - Critério de pronto: criar, editar e excluir funcionam; excluir remove `clubs/<id>` e `data/<id>`
  - Confiança: 🟢

- [ ] T-06, CRUD de temporada (`addSeason`, `renameSeason`, `deleteSeason`) e troca de contexto (`selectClub`, `selectSeason`)
  - Origem no legado: `index.html:739-804`
  - Critério de pronto: contexto persiste em `active` e sobrevive a recarregar a página
  - Confiança: 🟢

- [ ] T-07, Contadores do painel (`loadStats`) e listagens (`openStatList`)
  - Origem no legado: `index.html:508-666`
  - Critério de pronto: números conferem com RN-12 e RN-13 sobre um conjunto de dados de teste
  - Confiança: 🟢

- [ ] T-08, Perfil do técnico (`openSettings`, `saveSettings`) com reenvio do contexto ao módulo aberto
  - Origem no legado: `index.html:906-925`
  - Critério de pronto: mudar o nome do técnico atualiza o hub e o módulo aberto
  - Confiança: 🟢

- [ ] T-09, Abertura de módulos e protocolo de mensagens (`openModule`, `ctxPayload`, `pushContext`, escuta de `message`)
  - Origem no legado: `index.html:926-975`
  - Critério de pronto: os 9 módulos recebem o contexto completo; `STAT_UPDATE` e `VIDEO_MAXIMIZE` funcionam
  - Confiança: 🟢

- [ ] T-10, Idioma (`setLang`, `markLangButtons`) persistido local e em `profile/lang`
  - Origem no legado: `index.html:667-689`
  - Critério de pronto: trocar idioma atualiza hub e módulo aberto; o idioma acompanha a conta em outro aparelho
  - Confiança: 🟢

### Correções de defeitos identificados

- [ ] T-11, Contador "Sessões" ignora `rest` e `absence`; exibir descanso e falta em categorias próprias (D-01, D-08)
  - Origem no legado: `index.html:516-526` (conta qualquer registro com `date`) e `:601-609`
  - Critério de pronto: cenário "dois treinos e um descanso → Sessões = 2" passa
  - Confiança: 🟢

- [ ] T-12, Escuta de mensagens confere `event.origin === location.origin` e `postMessage` usa `location.origin` em vez de `'*'`
  - Origem no legado: `index.html:949`, `:953`
  - Critério de pronto: mensagem de outra origem é ignorada
  - Confiança: 🟢

- [ ] T-13, Trocar o retorno `pending` ("salvo offline") por estado verdadeiro: ou fila real, ou mensagem "ainda gravando"
  - Origem no legado: `index.html:398-399`
  - Critério de pronto: sem rede, o usuário não lê "salvo"
  - Confiança: 🟢

- [ ] T-14, Não ler `clubs` inteiro no boot: separar escudos e adversários (ler sob demanda) ou guardar escudos como arquivo
  - Origem no legado: `index.html:429-431`, `:841-851`
  - Critério de pronto: o boot não baixa escudos de clubes não ativos nem a lista de adversários
  - Confiança: 🟢 (D-14: imagens viram arquivos do PocketBase; o registro guarda o endereço)

- [ ] T-15, `deleteSeason` verifica a existência de dados sem baixar o ramo inteiro
  - Origem no legado: `index.html:785-787`
  - Critério de pronto: a verificação lê no máximo um nó
  - Confiança: 🟢

- [ ] T-16, Impedir colisão de `slug` entre clubes (sufixo quando o id já existe)
  - Origem no legado: `index.html:379`, `:854`
  - Critério de pronto: dois clubes "Clube A" e "Clube-A" coexistem
  - Confiança: 🟡

### Evoluções decididas pelo dono

- [ ] T-17, Cadastro de contas só pelo Administrador: tela de CRUD de contas visível só para o Admin; `createRule` de `users` deixa de ser aberto (D-09)
  - Origem no legado: `pb_migrations/1760270000_init_fluxgk.js` (`users.createRule = ''`)
  - Critério de pronto: criação anônima pela API retorna erro; o Admin cria, lista e desativa contas na tela
  - Confiança: 🟢 (D-21: `FLUXGK_ADMINS` até existir o cadastro pelo Admin; depois, campo `role` na conta)

- [ ] T-18, Telas de cadastro mobile first (clube, temporada, perfil, contas) (D-05)
  - Origem no legado: painéis `sh-club`, `sh-switch`, `sh-set` de `index.html`
  - Critério de pronto: uso completo a 360 px de largura, sem rolagem horizontal
  - Confiança: 🟡

- [ ] T-19, Seletor de 9 idiomas (D-10)
  - Origem no legado: `index.html:667-689` (só `en`/`pt`)
  - Critério de pronto: pt-PT, pt-BR, en, fr, de, ru, es, it, nl selecionáveis; ver `../traducao/`
  - Confiança: 🟢

## Tarefas de Teste

- [ ] TT-01, Login feliz e login com senha errada (Critérios de Aceitação 1 e 2)
- [ ] TT-02, Conta sem clube abre o seletor; módulo não abre sem temporada (3 e 4)
- [ ] TT-03, Timeout duplo da leitura inicial não grava nada (5) — simular com adaptador lento
- [ ] TT-04, Excluir clube remove os dados de todas as temporadas (6)
- [ ] TT-05, Contadores com treino, descanso e falta (7)
- [ ] TT-06, Contexto entregue a cada um dos 9 módulos (teste de navegador)
- [ ] TT-07, Mensagem `FLUXGK_CONTEXT` vinda de outra origem é ignorada (após T-12)

## Tarefas de Migração de Dados (se aplicável)

- [ ] TM-01, Se T-14 levar os escudos para arquivo: migrar `clubs/<id>/badge` (data URL) para o novo armazenamento e limpar o campo antigo

## Ordem Sugerida
1. T-01 a T-10 (paridade) antes de qualquer mudança, com TT-01 a TT-06 como rede de segurança.
2. T-11, T-12, T-13 e T-15: correções pequenas e independentes.
3. T-17 depois de existir o papel de Administrador dentro do app (bloqueia também o ACWR configurável do `controle-de-carga`).
4. T-14 e TM-01 só depois da decisão sobre imagens fora da árvore.
5. T-18 e T-19 podem andar em paralelo com o restante.

## Lacunas (revisadas em 13/10)

Respostas do dono ao Reviewer em `../questions.md`; decisões D-11 a D-31 em `../domain.md`.

- ✅ Como o app reconhece o Administrador? **Desde 13/10, a tela de versões usa e-mail em `FLUXGK_ADMINS` ou superusuário** (`pb_hooks/fluxgk_versoes.js`). Falta decidir se esse é o modelo definitivo para T-17 e para o parâmetro do ACWR (D-03). → D-20: o método vale para o sistema inteiro
