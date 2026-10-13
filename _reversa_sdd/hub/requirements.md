# Hub

## Visão Geral
Porta de entrada do FluxGK (`index.html`). Autentica o técnico, mantém o contexto ativo (clube + temporada), mostra
o painel com os contadores da temporada e abre os nove módulos num iframe, entregando a eles o contexto. 🟢

## Responsabilidades
- Autenticar e encerrar a sessão do técnico. 🟢
- Manter o perfil do técnico (nome, metodologia, idioma). 🟢
- Cadastrar, editar e excluir clubes (nome, sigla, cor, escudo) e temporadas. 🟢
- Guardar e restaurar o contexto ativo (`active`). 🟢
- Exibir o painel: sessões, jogos e goleiros ativos da temporada, com listagem detalhada de cada número. 🟢
- Abrir os módulos e enviar o contexto `FLUXGK_CONTEXT`; reagir aos avisos dos módulos. 🟢
- Definir o idioma do app (os módulos seguem). 🟢

## Regras de Negócio
- RN-01 Cada técnico só acessa os próprios dados (regras do PocketBase). 🟢
- RN-02 Nenhum módulo abre sem clube **e** temporada ativos; o seletor é aberto no lugar. 🟢
- RN-03 Ao entrar, clube ativo inexistente → primeiro clube; temporada ativa inexistente → **última** temporada do clube. 🟢
- RN-04 O primeiro clube criado vira o ativo e pede a primeira temporada. 🟢
- RN-05 Excluir clube apaga `clubs/<id>` e **todos** os dados `data/<id>`, após confirmação. 🟢
- RN-06 Excluir temporada verifica antes se há dados e avisa. 🟢
- RN-07 Escudo do clube: arquivo de até 500 KB. 🟢
- RN-08 Falha na leitura inicial não é tratada como conta vazia; o app abre com aviso e não sobrescreve nada. 🟢
- RN-09 Id de clube e de temporada = `slug` do nome/rótulo (minúsculas, `[a-z0-9-]`, até 28 caracteres; vazio → `c<timestamp>`). 🟢
- RN-10 Rótulo padrão de temporada nova: `AAAA/AA+1` do ano corrente. 🟢
- RN-11 Painel — **Sessões**: treinos únicos por `data|hora|tipo` em `load/sessions`. **Hoje** conta também `rest` e `absence` 🟢; **decisão do dono (D-01, D-08)**: descanso conta como descanso e falta como categoria própria, nenhum dos dois como sessão.
- RN-12 Painel — **Jogos**: quantidade de jogos em `minutes/games`. 🟢
- RN-13 Painel — **Goleiros**: jogadores de `load/players` com status vazio ou `ativo`; os demais aparecem num rodapé por status. 🟢
- RN-14 Metodologia padrão do perfil: "Constraints-Led Approach". 🟢
- RN-15 Idioma salvo no perfil vale entre aparelhos, sem sobrescrever uma escolha local já feita. 🟢
- RN-16 Senha esquecida: redefinida só pelo Administrador (sem e-mail). 🟢
- RN-17 Criação de conta: **decisão do dono (D-09)** — só o Administrador, por tela própria; a API hoje aceita cadastro aberto. 🟢 (estado atual) / evolução
- RN-18 **Versões (desde 1.2026.002):** em Configurações, a seção Versões só aparece para administrador (o servidor responde 403 aos demais). Mostra a versão no ar, a nova versão de HML com o que muda e o estado do CI, as versões publicadas e o histórico de trocas. Trocar pede confirmação, avisa ~1 min fora do ar, espera `/versao.json` mostrar a versão e recarrega. Voltar de versão avisa que os dados não voltam. Regras do servidor em `../infraestrutura/` (RN-16, RN-17). 🟢
- RN-19 O rodapé do login mostra `v<versão> · <AMBIENTE> · <build>`; fora de produção, uma faixa fixa "HML" no topo e `[HML]` no título da aba. 🟢

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | Login por e-mail e senha, com "lembrar de mim" | Must | Credencial válida abre o painel; inválida mostra a mensagem do código `auth/*` correspondente |
| RF-02 | Sair da conta | Must | Volta à tela de login e encerra o tempo real |
| RF-03 | Carregar perfil, clubes e contexto ativo, com timeout de 20 s e uma nova tentativa | Must | Ver RN-03 e RN-08 |
| RF-04 | CRUD de clube (nome obrigatório, sigla padrão = 3 primeiras letras, cor, escudo) | Must | Clube aparece no seletor e pinta a barra superior com a cor |
| RF-05 | CRUD de temporada (criar, renomear, excluir com aviso de dados) | Must | Temporada aparece no seletor e vira ativa ao ser criada |
| RF-06 | Trocar clube e temporada ativos e persistir em `active` | Must | Recarregar a página mantém o contexto |
| RF-07 | Painel com três contadores e listagem detalhada de cada um | Should | Números batem com RN-11 a RN-13 |
| RF-08 | Abrir módulo em iframe com o contexto | Must | O módulo recebe `FLUXGK_CONTEXT` com `uid`, `dataPath`, clube, temporada, técnico e idioma |
| RF-09 | Reenviar o contexto quando o módulo avisa que está pronto ou quando o perfil muda | Must | Módulo aberto reflete o novo nome do técnico sem recarregar |
| RF-10 | Atualizar o painel ao fechar o módulo; o hub também escuta `FLUXGK_STAT_UPDATE`, mas **nenhum módulo envia** 🟢 | Should | Contador muda após salvar um jogo na Minutagem e fechar o módulo |
| RF-11 | Tela cheia do módulo e maximização do vídeo (`FLUXGK_VIDEO_MAXIMIZE`) | Could | Botão alterna o modo; o Video Lab ocupa a janela |
| RF-12 | Trocar idioma | Should | Textos do hub e do módulo aberto mudam |
| RF-13 | **Evolução (D-01/D-08):** contadores separados de descanso e falta, fora de "Sessões" | Must | Registrar só um descanso não muda o número de sessões |
| RF-14 | **Evolução (D-09):** tela de cadastro de contas exclusiva do Administrador; cadastro aberto pela API desligado | Must | Requisição anônima de criação de conta é recusada; o Admin cria contas pela tela |
| RF-15 | **Evolução (D-05):** telas de cadastro mobile first | Should | Telas utilizáveis em 360 px sem rolagem horizontal |
| RF-16 | **Evolução (D-10):** seletor com 9 idiomas | Should | pt-PT, pt-BR, en, fr, de, ru, es, it, nl disponíveis |
| RF-17 | Configurações → Versões para o admin: atualizar a produção e voltar de versão, com histórico (RN-18) | Must | Admin vê "Nova versão 1.2026.00N disponível" e troca; conta comum não vê a seção |
| RF-18 | Versão e ambiente no rodapé; faixa HML fora de produção (RN-19) | Should | Em HML a faixa aparece; em PRD, não |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Performance | leitura inicial só de `clubs`, `active` e `profile`, nunca da árvore inteira | `index.html:423-436` | 🟢 |
| Performance | timeout de 20 s por leitura inicial, 1 nova tentativa após 1,2 s | `index.html:417`, `:436-439` | 🟢 |
| Performance | gravações com resposta em até 4 s, senão "pendente" | `index.html:398` | 🟢 |
| Disponibilidade | falha de carga não apaga nem sobrescreve dados | `index.html:459-464` | 🟢 |
| Segurança | isolamento por dono no servidor | `pb_migrations/1760270000_init_fluxgk.js` | 🟢 |
| Segurança | contexto enviado com `postMessage(…, '*')`, sem origem fixa | `index.html:949` | 🟢 (deficiência) |
| Usabilidade | cartões de módulo acionáveis por teclado (Enter/Espaço) | `index.html:381`, `:501` | 🟢 |

> Inferido a partir do código. Validar com equipe de operações.

## Critérios de Aceitação

```gherkin
Dado um técnico com conta ativa
Quando ele entra com e-mail e senha corretos
Então o painel abre no último clube e temporada usados

Dado um técnico com conta ativa
Quando ele entra com a senha errada
Então vê a mensagem de credencial inválida e continua na tela de login

Dado um técnico sem nenhum clube
Quando o painel abre
Então aparece a mensagem de boas-vindas e o seletor de clube

Dado um técnico com clube mas sem temporada ativa
Quando ele toca num módulo
Então o módulo não abre e o seletor de clube e temporada aparece

Dado que a leitura inicial excedeu 20 s duas vezes
Quando o painel abre
Então aparece o aviso de tempo esgotado e nenhum dado é gravado por conta disso

Dado um clube com dados em duas temporadas
Quando o técnico confirma a exclusão do clube
Então o clube e os dados das duas temporadas deixam de existir

Dado uma temporada com dois treinos e um descanso registrados
Quando o painel é exibido (após a evolução D-01)
Então "Sessões" mostra 2 e o descanso aparece na sua própria categoria
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Login, contexto, abrir módulo (RF-01..06, 08, 09) | Must | Caminho crítico de todos os módulos |
| Separar descanso e falta das sessões (RF-13) | Must | Decisão do dono; número errado no painel |
| Cadastro de conta só pelo Admin (RF-14) | Must | Decisão do dono; hoje a API está aberta |
| Painel e listagens (RF-07, RF-10) | Should | Informativo, não bloqueia trabalho |
| Idiomas (RF-12, RF-16) | Should | Decisão do dono; o app funciona em en/pt hoje |
| Telas mobile first (RF-15) | Should | Decisão do dono |
| Tela cheia (RF-11) | Could | Conforto de uso |

> Prioridade inferida por frequência de chamada, posição na cadeia de dependências e decisões do dono.

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `index.html` | `boot`, `doLogin`, `doLogout` | 🟢 |
| `index.html` | `loadAll`, `withTimeout`, `raceTimeout` | 🟢 |
| `index.html` | `selectClub`, `selectSeason`, `addSeason`, `renameSeason`, `deleteSeason` | 🟢 |
| `index.html` | `saveClub`, `deleteClub`, `onBadge`, `slug` | 🟢 |
| `index.html` | `loadStats`, `openStatList`, `_gkAtivo`, `HUB_ST` | 🟢 |
| `index.html` | `ctxPayload`, `pushContext`, `openModule`, `closeModule` | 🟢 |
| `index.html` | `saveSettings`, `setLang` | 🟢 |
| `index.html` | `carregarVersoes`, `_htmlVersoes`, `pedirVersao`, `_esperarVersao`; leitura de `/versao.json` no fim da página | 🟢 |
