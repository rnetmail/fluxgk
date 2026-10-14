# Domínio — FluxGK

> Detective do Reversa, 2026-10-13. Fontes: código e comentários (o histórico do Git não ajuda: 206 de 210 commits
> são "Add files via upload"). Escala: 🟢 CONFIRMADO · 🟡 INFERIDO · 🔴 LACUNA.

## O negócio em uma frase

Ferramenta do **treinador de goleiros de futsal** para planejar e registrar o trabalho de uma temporada num clube:
treinos, carga, jogos (minutagem, estatística, xG), vídeo, avaliação individual e observação de goleiros de fora.
Metodologia de referência: **abordagem baseada em restrições** ("Constraints-Led Approach"), padrão do perfil do técnico. 🟢

## Glossário

| Termo | Significado | Onde |
|---|---|---|
| **Técnico** (coach) | o usuário da conta; tudo pertence a ele | `users/<uid>` |
| **Clube** | time em que o técnico trabalha; tem nome, sigla, cor e escudo | hub |
| **Temporada** | recorte de tempo dentro de um clube (ex.: `2026/27`); os dados de módulo moram aqui | hub, `dataPath` |
| **Contexto** | par clube + temporada ativo, enviado aos módulos | `FLUXGK_CONTEXT` |
| **Goleiro / jogador** | atleta do elenco do clube na temporada | `load/players` |
| **Status do goleiro** | situação fora do normal: emprestado, lesão, convocado, saída | `data` |
| **Sessão de treino** (planner) | plano do treino: exercícios por fase + pós-treino qualitativo | `planner` |
| **Fase** | parte da sessão: aquecimento, principal, complementar, volta à calma | `planner` |
| **Tipo de treino** | individual, coletivo de goleiros, integrado, ativação pré-jogo, regenerativo | `planner`, `data` |
| **Exercício** | atividade reutilizável da biblioteca pessoal do técnico, com imagem e cena 3D | `planner` |
| **Affordances / Constraints / Emergent** | campos do pós-treino próprios da abordagem baseada em restrições | `planner` |
| **Pré-treino** | registro de **bem-estar** do goleiro antes do treino (escala 1–5) | `data` |
| **Pós-treino** | registro de **PSE** (1–10) e duração; gera a carga em UA | `data` |
| **PSE / RPE** | percepção subjetiva de esforço, 1 a 10 | `data` |
| **UA** | unidade arbitrária de carga = PSE × duração em minutos | `data` |
| **ACWR** | razão carga aguda / crônica (7 / 28), faixa segura 0,8–1,3 | `data` |
| **Falta** (`absence`) e **descanso** (`rest`) | registros de dia sem treino para o goleiro | `data` |
| **Macro / meso / microciclo** | níveis da periodização | `periodization` |
| **xG** | probabilidade de um chute virar gol, calculada pela posição e pelo contexto | `xg` |
| **Lance** | trecho marcado num vídeo de jogo | `video` |
| **Scouting** | observação de goleiros de outros clubes, fora de temporada | `scouting` |
| **Critérios** | modelo de avaliação do técnico, levado entre clubes | `profile` |

## Regras de negócio

### Conta, clube e temporada
- **RN-01** 🟢 Cada técnico só vê e altera os próprios dados (`owner = @request.auth.id` em `nodes`; `id = @request.auth.id` em `users`).
- **RN-02** 🟢 Nenhum módulo abre sem clube **e** temporada ativos (`openModule`, `index.html:960`).
- **RN-03** 🟢 Ao entrar, se o clube ativo não existe mais, vale o primeiro clube; se a temporada ativa não existe, vale a **última** temporada do clube.
- **RN-04** 🟢 Criar o primeiro clube o torna ativo e pede logo a primeira temporada.
- **RN-05** 🟢 Excluir um clube apaga também **todos os dados de todas as temporadas** dele (`data/<clubId>`). Pede confirmação.
- **RN-06** 🟢 Excluir uma temporada avisa antes se ela tem dados (`deleteSeason`).
- **RN-07** 🟢 Escudo do clube: no máximo 500 KB.
- **RN-08** 🟢 Falha ao carregar não pode ser lida como conta vazia (evita sobrescrever dados).
- **RN-09** 🟢 O idioma é escolha do hub; os módulos seguem e não gravam.
- **RN-10** 🟢 Senha esquecida: só o administrador redefine, pelo painel `/_/`. Não há e-mail.
- **RN-11** 🟡 Contas são criadas pelo administrador: não há tela de cadastro, embora a API aceite cadastro aberto.

### Elenco e status (Load Control é o dono)
- **RN-12** 🟢 O elenco tem um dono: o Load Control. O Perfil só lê nome e foto.
- **RN-13** 🟢 Goleiro **ativo** = sem status ou status `ativo`. Os demais (emprestado, lesão, convocado, saída) saem da contagem do painel, mas aparecem num rodapé.
- **RN-14** 🟢 Excluir um goleiro apaga todos os registros de carga dele.
- **RN-15** 🟡 `stats` e `minutes` têm listas próprias de goleiros, em texto, sem vínculo com o elenco do Load Control.

### Carga (Load Control)
- **RN-16** 🟢 Um treino de um goleiro é um **par**: pré-treino (bem-estar) e pós-treino (PSE e duração).
- **RN-17** 🟢 O pós-treino só existe ligado a um pré-treino **do mesmo goleiro**; se o pré escolhido é de outro, a lista é atualizada e o usuário escolhe de novo.
- **RN-18** 🟢 Corrigir data, hora ou tipo no pré leva o pós junto.
- **RN-19** 🟢 Apagar o pós **reabre** o pré; apagar um pré fechado **apaga** o pós.
- **RN-20** 🟢 UA = PSE × duração.
- **RN-21** 🟢 Bem-estar é 1–5. Registros antigos de 1–10 são convertidos uma vez: `round(v/2)` limitado a 1–5 (`_wb10to5`).
- **RN-22** 🟢 ACWR só aparece com ≥ 4 pós-treinos. 🟡 As janelas contam **datas com treino**, não dias corridos.
- **RN-23** 🟢 Tipos de treino na nuvem e no navegador **se somam**; nenhum lado apaga o outro.
- **RN-24** 🟢 Pares pré/pós com vínculo quebrado são reparados ao abrir o módulo (`repairPrePostLinks`).

### Painel do hub
- **RN-25** 🟢 "Sessões" conta **treinos**, não registros: `data + hora + tipo` identifica o treino, e vários goleiros no mesmo treino contam uma vez.
- **RN-26** 🟢 "Jogos" vem da Minutagem; "Goleiros", do elenco ativo do Load Control.
- 🔴 **Contradição**: o comentário diz que a falta (`abs`) conta como sessão, mas o tipo real é `absence`, e o código conta **qualquer** registro com data, inclusive `rest` (descanso). Um dia de descanso registrado aparece como sessão no painel. Validar com o dono se a falta deve contar e se o descanso não deve.

### Planejamento (planner)
- **RN-27** 🟢 Exercício novo: 8 minutos e 2 goleiros por padrão.
- **RN-28** 🟢 Imagens viram JPEG de até 1000 px de largura, qualidade 0,88.
- **RN-29** 🟢 Salvar a sessão a arquiva na biblioteca e abre uma sessão nova em branco; o pós-treino atualiza **a mesma** sessão, sem duplicar.
- **RN-30** 🟢 A biblioteca de exercícios é **do técnico**, vale para todos os clubes e temporadas.
- **RN-31** 🟢 Nada é gravado sem conexão: vai para uma fila, reenviada a cada 15 s; sair com fila pendente pede confirmação.
- **RN-32** 🟢 Item apagado não pode voltar: se a nuvem o devolver, é apagado de novo.
- 🔴 **Lacuna**: o pós-treino mostra campos de anotação **por goleiro** e **por exercício** que não são salvos. Validar se deveriam ser.

### Jogos
- **RN-33** 🟢 Resultado do jogo: `W` se gols pró > contra, `L` se menor, `D` se igual (`mod_stats.html:1290`).
- **RN-34** 🟢 Temporada padrão de um jogo novo: `AAAA-AA` do ano corrente.
- **RN-35** 🟢 Minutagem: o tempo de cada goleiro é a soma dos intervalos de entrada e saída por período (1º, 2º, prorrogação 1 e 2); sem prorrogação, os períodos extras são ignorados. Jogo exige data e adversário.
- **RN-36** 🟢 Adversários são **do clube**, compartilhados entre Estatística, Minutagem e xG. 🔴 Hoje cada módulo regrava a lista inteira com a sua versão; ver `code-analysis.md`.
- **RN-37** 🟢 xG: modelo multiplicativo (ver `code-analysis.md`), limitado a 0,01–0,97; pênalti e tiro de 10 m têm valores fixos.

### Perfil, scouting e vídeo
- **RN-38** 🟢 Uma avaliação por goleiro por **data**; outra no mesmo dia substitui.
- **RN-39** 🟢 Goleiro pode ser **arquivado** no Perfil (some da lista, não é apagado).
- **RN-40** 🟢 Os critérios de avaliação são do técnico e o acompanham entre clubes.
- **RN-41** 🟢 Scouting é do técnico, fora de clube e temporada.
- **RN-42** 🟢 Vídeos ficam no computador do técnico; só os metadados (lances, playlists, dashboards) vão para a nuvem.
- **RN-43** 🟢 Na fusão nuvem × navegador do vídeo, no conflito vence a versão com **mais lances**, e uma cópia de segurança local é feita antes.

## Decisões do dono (Robson, 2026-10-13)

| # | Pergunta | Decisão | Efeito nas specs |
|---|---|---|---|
| D-01 | Descanso e falta contam como sessão no painel? | **Não.** Descanso conta como **descanso**; falta é **categoria própria** (L-08). | O contador "Sessões" do hub deixa de contar `rest` e `absence`; descanso e falta aparecem cada um na sua categoria. |
| D-02 | Salvar as anotações por goleiro e por exercício do pós-treino? | **Sim.** E **toda anotação** do app deve aceitar **captura de áudio com transcrição para texto**, inclusive durante um jogo ao vivo. | Corrige a perda no `planner`; requisito transversal novo: ditado por voz em todos os campos de anotação, com uso em jogo ao vivo (minutagem, estatística, xG, vídeo). **Ditado implementado em 14/10/2026** (feature 002: `static/fluxgk-ditado.js`, observação por lance e Notas do jogo). |
| D-03 | ACWR por dias corridos ou por datas com treino? | **Como está (datas com treino)**, com possibilidade de mudar por **parâmetro de configuração do app, alterável só pelo Administrador**. | Parâmetro global do método do ACWR; exige papel de administrador dentro do app (hoje só existe no painel `/_/`). |
| D-04 | Unificar os três elencos? | **Manter como está.** | Sem mudança; RN-15 continua. |
| D-05 | Cadastro aberto pela API é intencional? | O SaaS deve ter **API e MCP**. Os cadastros devem ter **CRUD em tela**, adaptado ao dispositivo, **mobile first**. | Requisitos novos: API pública documentada, servidor MCP, telas de cadastro (inclusive de conta) responsivas. A regra de criação de conta pela API precisa ser desenhada junto (hoje é aberta e sem tela). |
| D-06 | Os dados do Firebase foram migrados? | **A produção começa vazia.** Se for possível obter os dados antigos, ótimo. | Importação do Firebase vira item opcional, condicionado a conseguir a exportação. |
| D-07 | Volume de dados de um técnico típico? | **Desconhecido.** | Os tetos de 5 MB (`xg/games`, `video`) ficam como risco sem medida; recomenda-se medir em produção. |
| D-08 | (L-08) A falta é descanso? | **Não: falta é categoria própria.** | `absence` separado de `rest` nos contadores e relatórios. |
| D-09 | (L-09) Quem cria conta? | **Por enquanto, só o Administrador.** Depois: login com **conta Google** + **código de ativação** gerado após o **pagamento**, com ativação automática conforme o plano: **basic** até 2 módulos; **intermediate** até 5; **advanced** todos; **pro** todos + módulo extra de **inteligência** (a desenvolver). | Agora: fechar o cadastro aberto da API (`createRule`) e criar a tela de cadastro de contas do Admin. Depois: Google OAuth, pagamento, códigos de ativação, planos e liberação de módulos por plano. |
| D-10 | (L-06) Idiomas | **Vários idiomas no app inteiro:** Português (PT), Português (BR), Inglês, Francês, Alemão, Russo, Espanhol, Italiano e Holandês, por enquanto. | O `fluxgk-i18n.js` passa de 2 para 9 idiomas, com `pt` dividido em `pt-PT` e `pt-BR`; o dicionário próprio do Perfil (pt/en/ru) é unificado. |

### Respostas ao Reviewer (Robson, 2026-10-13: "aceito recomendações")

| # | Pergunta | Decisão | Impacto |
|---|---|---|---|
| D-11 | (P-1) em conflito entre aparelhos, vence o registro mais recente (carimbo de tempo de cada item) ou o que está no servidor? | **o mais recente, item a item (o `ts` já existe em vários módulos).** | Specs: `controle-de-carga/`, `video/`, `scouting/`, `periodizacao/`, `adaptador-fluxdb/`. |
| D-12 | (P-2) a ficha deve acompanhar o goleiro entre temporadas, ou continuar começando do zero a cada temporada? | **acompanhar o goleiro no clube (ficha em `<clube>/profile`), com as avaliações datadas.** | Specs: `perfil/requirements.md` RN-13. |
| D-13 | (P-3) a sessão deve guardar o exercício como estava no dia (cópia) ou sempre o atual da biblioteca (referência)? | **cópia do texto e referência da imagem (o histórico não muda, o registro fica leve).** | Specs: `planejamento/tasks.md` T-19. |
| D-14 | (P-4) as imagens passam a ser arquivos do PocketBase (registro leva só o endereço) ou continuam dentro dos dados? | **arquivos, numa coleção própria por técnico.** | Specs: `tatica-3d/` T-17, `planejamento/`, `hub/`, `scouting/`. |
| D-15 | (P-5) manter o documento único ou passar a um registro por sessão de vídeo? | **um registro por sessão (sem teto; cada edição pequena).** | Specs: `video/tasks.md` T-19, TM-01. |
| D-16 | (P-6) o rascunho do jogo ao vivo fica só no aparelho ou também na nuvem (para continuar em outro aparelho)? | **no aparelho a cada lance e na nuvem a cada minuto.** | Specs: `estatistica/tasks.md`. |
| D-17 | (P-7) quem é o dono do cadastro de adversários? | **o hub (tela de clube), com formato único `{id, name, badge}` e gravação item a item; os módulos só leem e acrescentam.** | Specs: `xg/`, `estatistica/`, `minutagem/`. |
| D-18 | (P-8) ao migrar, esses dados vão para quem abrir primeiro naquele navegador, ou só depois de uma confirmação na tela? | **confirmação na tela ("importar N jogos para <clube/temporada>?").** | Specs: `xg/` TM, `controle-de-carga/questions.md` Q-04. |
| D-19 | (P-9) tentar recuperar do navegador de cada técnico, ou aceitar a perda? | **recuperar quando a cópia local existir, sem bloquear quem não tiver.** | Specs: `controle-de-carga/`. |
| D-20 | (P-10) o parâmetro vale para o sistema inteiro, por técnico ou por clube? | **sistema inteiro (comparabilidade entre técnicos).** | Specs: `controle-de-carga/` Q-01. |
| D-21 | (P-11) esse fica como o modelo definitivo de Administrador, ou passamos a um campo `role` na conta? | **campo `role` na conta quando vier o cadastro pelo Admin (D-09); até lá, `FLUXGK_ADMINS`.** | Specs: `hub/` T-17, `controle-de-carga/` Q-02. |
| D-22 | (P-12) temas de meso excluído vão para "sem meso" ou são apagados? A hierarquia é obrigatória ou só um aviso? | **mover para "sem meso"; hierarquia como aviso.** | Specs: `periodizacao/`. |
| D-23 | (P-13) as cinco áreas são do seu método, ou devem ser configuráveis como no Perfil? | **fixas por enquanto.** | Specs: `scouting/` T-23. |
| D-24 | (P-14) deve haver vínculo com o cadastro do clube (adversário ou elenco)? | **não agora; só um botão "copiar para o elenco" quando for contratado.** | Specs: `scouting/`. |
| D-25 | (P-15) o cronômetro do app segue o do jogo (com pausas manuais) ou o técnico informa o horário lido no placar? | **o técnico informa o horário do placar (como hoje), com atalho "agora".** | Specs: `minutagem/`. |
| D-26 | (P-16) usar o reconhecimento do próprio navegador (grátis, depende de internet no Chrome) ou um serviço externo (pago, mais preciso)? | **o do navegador primeiro; serviço externo se a qualidade em português/russo não servir.** | Specs: `planejamento/`, `perfil/`, `minutagem/`, `estatistica/`, `xg/`, `video/`, `scouting/`. **Implementado em 14/10/2026** com a Web Speech API do navegador (feature 002); serviço externo segue em aberto para pt-PT e russo. |
| D-27 | (P-17) ela precisa funcionar bem no celular, ou o uso real é computador e tablet? | **computador e tablet.** | Specs: `tatica-3d/` T-23. |
| D-28 | (P-18) quem traduz e revisa os 7 idiomas novos? O idioma trocado num aparelho deve valer nos outros? Datas em inglês britânico ou americano? | **tradução automática revisada por um técnico de cada idioma; o idioma acompanha a conta; inglês britânico (o Perfil já usa).** | Specs: `traducao/`. |
| D-29 | (P-19) para onde vai o backup diário e por quanto tempo fica? | **cópia diária fora da VPS (armazenamento de objetos ou Google Drive), 30 dias.** | Specs: `infraestrutura/` T-11. |
| D-30 | (P-20) dá para restringir por IP, ou você entra de lugares variados? | **se o IP varia, autenticação extra no nginx (usuário e senha) na frente do `/_/`.** | Specs: `infraestrutura/` T-15. |
| D-31 | (P-21) quem consome primeiro (um sistema seu, um cliente, um agente de IA)? | **responder isto antes de desenhar; a forma (rotas no PocketBase ou serviço à parte) depende do consumidor.** | Specs: `infraestrutura/` T-21, `openapi/`. |


## Lacunas que continuam abertas

Nenhuma das perguntas feitas ao dono ficou aberta. As lacunas 🔴 restantes estão nas specs de cada unit.
