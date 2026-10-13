# Perguntas para validação — FluxGK

> Reviewer, 13/10/2026. **Todas respondidas em 13/10: o dono aceitou as 21 recomendações (D-11 a D-31 em `domain.md`).** Lacunas 🔴 que só o dono responde, juntadas das 14 units (29 itens, 21 depois de tirar
> repetições). Cada uma traz uma **recomendação**; responder "aceito" vale como resposta. As do Load Control
> (`controle-de-carga/questions.md`, Q-01 a Q-05) estão incluídas aqui como P-01, P-02, P-05, P-06 e P-07.

## Bloco A — Dados e sincronização

## Pergunta 1
**Contexto:** dois aparelhos editam o mesmo registro; hoje cada módulo resolve de um jeito (DT-08).
**Spec afetada:** `controle-de-carga/`, `video/`, `scouting/`, `periodizacao/`, `adaptador-fluxdb/`
**Pergunta:** em conflito entre aparelhos, vence o registro mais recente (carimbo de tempo de cada item) ou o que está no servidor?
**Recomendação:** o mais recente, item a item (o `ts` já existe em vários módulos).
**Impacto:** define a mescla de Load Control, Video Lab, Scouting e Periodização.
✅ Respondida — D-11
**Resposta:** aceita a recomendação (dono, 13/10/2026).

## Pergunta 2
**Contexto:** a ficha do goleiro (perfil, avaliações, diário) está em `<clube>/<temporada>/profile`.
**Spec afetada:** `perfil/requirements.md` RN-13
**Pergunta:** a ficha deve acompanhar o goleiro entre temporadas, ou continuar começando do zero a cada temporada?
**Recomendação:** acompanhar o goleiro no clube (ficha em `<clube>/profile`), com as avaliações datadas.
**Impacto:** migração das fichas existentes e o caminho dos dados do Perfil.
✅ Respondida — D-12
**Resposta:** aceita a recomendação (dono, 13/10/2026).

## Pergunta 3
**Contexto:** a sessão do Planejamento guarda uma cópia inteira de cada exercício, com imagem.
**Spec afetada:** `planejamento/tasks.md` T-19
**Pergunta:** a sessão deve guardar o exercício como estava no dia (cópia) ou sempre o atual da biblioteca (referência)?
**Recomendação:** cópia do texto e referência da imagem (o histórico não muda, o registro fica leve).
**Impacto:** tamanho dos dados e migração das sessões.
✅ Respondida — D-13
**Resposta:** aceita a recomendação (dono, 13/10/2026).

## Pergunta 4
**Contexto:** imagens (exercício, escudo, foto) vão em `data:` dentro dos registros (DT-04).
**Spec afetada:** `tatica-3d/` T-17, `planejamento/`, `hub/`, `scouting/`
**Pergunta:** as imagens passam a ser arquivos do PocketBase (registro leva só o endereço) ou continuam dentro dos dados?
**Recomendação:** arquivos, numa coleção própria por técnico.
**Impacto:** uma migração de dados que vale para todos os módulos.
✅ Respondida — D-14
**Resposta:** aceita a recomendação (dono, 13/10/2026).

## Pergunta 5
**Contexto:** o Video Lab grava um documento só, com teto de 5 MB (DT-05).
**Spec afetada:** `video/tasks.md` T-19, TM-01
**Pergunta:** manter o documento único ou passar a um registro por sessão de vídeo?
**Recomendação:** um registro por sessão (sem teto; cada edição pequena).
**Impacto:** formato da nuvem do Video Lab e migração.
✅ Respondida — D-15
**Resposta:** aceita a recomendação (dono, 13/10/2026).

## Pergunta 6
**Contexto:** a Estatística guarda o jogo ao vivo só na memória; recarregar perde tudo.
**Spec afetada:** `estatistica/tasks.md`
**Pergunta:** o rascunho do jogo ao vivo fica só no aparelho ou também na nuvem (para continuar em outro aparelho)?
**Recomendação:** no aparelho a cada lance e na nuvem a cada minuto.
**Impacto:** onde e quando o rascunho é gravado.
✅ Respondida — D-16
**Resposta:** aceita a recomendação (dono, 13/10/2026).

## Pergunta 7
**Contexto:** três módulos gravam a lista de adversários do clube, cada um num formato, e apagam o que os outros gravaram (DT-03).
**Spec afetada:** `xg/`, `estatistica/`, `minutagem/`
**Pergunta:** quem é o dono do cadastro de adversários?
**Recomendação:** o hub (tela de clube), com formato único `{id, name, badge}` e gravação item a item; os módulos só leem e acrescentam.
**Impacto:** correção dos três módulos juntos.
✅ Respondida — D-17
**Resposta:** aceita a recomendação (dono, 13/10/2026).

## Pergunta 8
**Contexto:** dados antigos no navegador sem conta, clube nem temporada (xG `fxg_*`, Load Control `glcv5`).
**Spec afetada:** `xg/` TM, `controle-de-carga/questions.md` Q-04
**Pergunta:** ao migrar, esses dados vão para quem abrir primeiro naquele navegador, ou só depois de uma confirmação na tela?
**Recomendação:** confirmação na tela ("importar N jogos para <clube/temporada>?").
**Impacto:** a regra da migração local.
✅ Respondida — D-18
**Resposta:** aceita a recomendação (dono, 13/10/2026).

## Pergunta 9
**Contexto:** fotos e status de goleiros que o `rtPushAll` já apagou do servidor (Load Control, Q-05).
**Spec afetada:** `controle-de-carga/`
**Pergunta:** tentar recuperar do navegador de cada técnico, ou aceitar a perda?
**Recomendação:** recuperar quando a cópia local existir, sem bloquear quem não tiver.
**Impacto:** TM-02 do Load Control.
✅ Respondida — D-19
**Resposta:** aceita a recomendação (dono, 13/10/2026).

## Bloco B — Regras do domínio

## Pergunta 10
**Contexto:** D-03 pede o método do ACWR configurável só pelo Admin.
**Spec afetada:** `controle-de-carga/` Q-01
**Pergunta:** o parâmetro vale para o sistema inteiro, por técnico ou por clube?
**Recomendação:** sistema inteiro (comparabilidade entre técnicos).
✅ Respondida — D-20
**Resposta:** aceita a recomendação (dono, 13/10/2026).

## Pergunta 11
**Contexto:** desde 13/10, a tela de versões reconhece o Admin por e-mail em `FLUXGK_ADMINS` ou superusuário.
**Spec afetada:** `hub/` T-17, `controle-de-carga/` Q-02
**Pergunta:** esse fica como o modelo definitivo de Administrador, ou passamos a um campo `role` na conta?
**Recomendação:** campo `role` na conta quando vier o cadastro pelo Admin (D-09); até lá, `FLUXGK_ADMINS`.
✅ Respondida — D-21
**Resposta:** aceita a recomendação (dono, 13/10/2026).

## Pergunta 12
**Contexto:** Periodização: excluir um mesociclo deixa os temas dele órfãos; não há hierarquia entre macro, meso e micro.
**Spec afetada:** `periodizacao/`
**Pergunta:** temas de meso excluído vão para "sem meso" ou são apagados? A hierarquia é obrigatória ou só um aviso?
**Recomendação:** mover para "sem meso"; hierarquia como aviso.
✅ Respondida — D-22
**Resposta:** aceita a recomendação (dono, 13/10/2026).

## Pergunta 13
**Contexto:** o Scouting avalia em cinco áreas fixas; o Perfil deixa o técnico definir os critérios.
**Spec afetada:** `scouting/` T-23
**Pergunta:** as cinco áreas são do seu método, ou devem ser configuráveis como no Perfil?
**Recomendação:** fixas por enquanto.
✅ Respondida — D-23
**Resposta:** aceita a recomendação (dono, 13/10/2026).

## Pergunta 14
**Contexto:** goleiro observado no Scouting que vira adversário ou é contratado.
**Spec afetada:** `scouting/`
**Pergunta:** deve haver vínculo com o cadastro do clube (adversário ou elenco)?
**Recomendação:** não agora; só um botão "copiar para o elenco" quando for contratado.
✅ Respondida — D-24
**Resposta:** aceita a recomendação (dono, 13/10/2026).

## Pergunta 15
**Contexto:** Minutagem ao vivo.
**Spec afetada:** `minutagem/`
**Pergunta:** o cronômetro do app segue o do jogo (com pausas manuais) ou o técnico informa o horário lido no placar?
**Recomendação:** o técnico informa o horário do placar (como hoje), com atalho "agora".
✅ Respondida — D-25
**Resposta:** aceita a recomendação (dono, 13/10/2026).

## Bloco C — Produto

## Pergunta 16
**Contexto:** D-02 pede ditado por voz em toda anotação, inclusive ao vivo (repetida em 6 units).
**Spec afetada:** `planejamento/`, `perfil/`, `minutagem/`, `estatistica/`, `xg/`, `video/`, `scouting/`
**Pergunta:** usar o reconhecimento do próprio navegador (grátis, depende de internet no Chrome) ou um serviço externo (pago, mais preciso)?
**Recomendação:** o do navegador primeiro; serviço externo se a qualidade em português/russo não servir.
✅ Respondida — D-26
**Resposta:** aceita a recomendação (dono, 13/10/2026).

## Pergunta 17
**Contexto:** a Quadra Tática foi feita para tela grande.
**Spec afetada:** `tatica-3d/` T-23
**Pergunta:** ela precisa funcionar bem no celular, ou o uso real é computador e tablet?
**Recomendação:** computador e tablet.
✅ Respondida — D-27
**Resposta:** aceita a recomendação (dono, 13/10/2026).

## Pergunta 18
**Contexto:** D-10, 9 idiomas.
**Spec afetada:** `traducao/`
**Pergunta:** quem traduz e revisa os 7 idiomas novos? O idioma trocado num aparelho deve valer nos outros? Datas em inglês britânico ou americano?
**Recomendação:** tradução automática revisada por um técnico de cada idioma; o idioma acompanha a conta; inglês britânico (o Perfil já usa).
✅ Respondida — D-28
**Resposta:** aceita a recomendação (dono, 13/10/2026).

## Bloco D — Infraestrutura

## Pergunta 19
**Contexto:** não há backup automático do banco (só manuais em `/root/.fluxgk/backups/`).
**Spec afetada:** `infraestrutura/` T-11
**Pergunta:** para onde vai o backup diário e por quanto tempo fica?
**Recomendação:** cópia diária fora da VPS (armazenamento de objetos ou Google Drive), 30 dias.
✅ Respondida — D-29
**Resposta:** aceita a recomendação (dono, 13/10/2026).

## Pergunta 20
**Contexto:** o painel `/_/` do PocketBase está aberto pelo domínio, protegido só pela senha.
**Spec afetada:** `infraestrutura/` T-15
**Pergunta:** dá para restringir por IP, ou você entra de lugares variados?
**Recomendação:** se o IP varia, autenticação extra no nginx (usuário e senha) na frente do `/_/`.
✅ Respondida — D-30
**Resposta:** aceita a recomendação (dono, 13/10/2026).

## Pergunta 21
**Contexto:** D-05 pede API pública e MCP.
**Spec afetada:** `infraestrutura/` T-21, `openapi/`
**Pergunta:** quem consome primeiro (um sistema seu, um cliente, um agente de IA)?
**Recomendação:** responder isto antes de desenhar; a forma (rotas no PocketBase ou serviço à parte) depende do consumidor.
✅ Respondida — D-31
**Resposta:** aceita a recomendação (dono, 13/10/2026).
