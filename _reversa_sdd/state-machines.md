# Máquinas de estado — FluxGK

> Detective, 2026-10-13.

## Par pré/pós-treino (Load Control) 🟢

Um registro `pre` com `postId = null` está **aberto**; com `postId` preenchido, **fechado**.

```mermaid
stateDiagram-v2
  [*] --> Aberto: salvar pré-treino (bem-estar)
  Aberto --> Fechado: salvar pós-treino (PSE + duração)<br/>pre.postId = post.id
  Fechado --> Aberto: apagar o pós-treino
  Fechado --> [*]: apagar o pré-treino (apaga o pós junto)
  Aberto --> [*]: apagar o pré-treino
  Fechado --> Fechado: editar data/hora/tipo do pré (o pós acompanha)
```
Reparos automáticos ao abrir o módulo: `post.preId` existe e `pre.postId` vazio → refaz o vínculo; `pre.postId`
aponta para pós inexistente → solta o vínculo (`repairPrePostLinks`, `mod_data.html:1618`).

Registros sem par: `absence` (falta) e `rest` (descanso), estados finais em si mesmos.

## Status do goleiro (Load Control) 🟢

Campos `status`, `statusDesde`, `statusNota`. Vazio (ou `ativo`) = ativo.

```mermaid
stateDiagram-v2
  [*] --> Ativo: cadastrar no elenco
  Ativo --> Emprestado
  Ativo --> Lesao: lesão
  Ativo --> Convocado: convocação
  Ativo --> Saida: saída do clube
  Emprestado --> Ativo: reativar (status = null)
  Lesao --> Ativo: reativar
  Convocado --> Ativo: reativar
  Saida --> Ativo: reativar
  Ativo --> [*]: excluir (apaga a carga do goleiro)
```
🟡 Não há transição direta entre status fora do normal no código lido; troca-se passando por ativo ou regravando o status.

## Sessão de treino (planner) 🟢

```mermaid
stateDiagram-v2
  [*] --> Rascunho: nova sessão
  Rascunho --> Arquivada: Salvar na biblioteca (id = Date.now())
  Arquivada --> EmEdicao: abrir da biblioteca
  EmEdicao --> Arquivada: Atualizar / fechar pós-treino (mesmo id)
  Arquivada --> Apagada: excluir (id marcado como apagado)
  Rascunho --> Pendente: sem conexão
  Arquivada --> Pendente: falha ao gravar
  Pendente --> Arquivada: reenvio (15 s / online / login)
```

## Gravação na nuvem do Video Lab 🟢

```mermaid
stateDiagram-v2
  [*] --> NaoCarregado
  NaoCarregado --> Sincronizado: pullFromCloud + mescla (_cloudLoaded = true)
  Sincronizado --> Enviando: edição (debounce 600 ms)
  Enviando --> Sincronizado: set ok
  Enviando --> Falhou: set recusado (tamanho, rede, permissão)
  Falhou --> Enviando: "tentar de novo"
```
Antes do primeiro `pull`, nenhuma edição sobe, para não sobrescrever a nuvem com estado vazio.

## Contexto do módulo 🟢

`sem contexto` → (recebe `FLUXGK_CONTEXT` completo: `uid`, `dataPath`, `cloudConfig`) → `com contexto` → (login
confirmado) → `ouvindo`. Contexto incompleto é recusado com erro no console. Trocar de temporada volta a
"aguardando resposta" antes de mostrar a lista.
