# Controle de Carga, Perguntas em Aberto

> Lacunas 🔴 que dependem de decisão humana antes da implementação. Cada pergunta traz o contexto, as opções e
> uma recomendação. Ao responder, registre a decisão em `../domain.md` (seção "Decisões do dono").

## Q-01, Onde mora o parâmetro do método do ACWR?

✅ **Respondida em 13/10 — D-20** (o dono aceitou a recomendação; ver `../questions.md` e `../domain.md`).

**Contexto.** D-03: manter o cálculo atual (janelas por **datas com treino**) com a opção de **dias corridos**,
alterável só pelo Administrador. Hoje não há nenhuma configuração do sistema: tudo vive em `users/<uid>/…`.

| Opção | Efeito |
|---|---|
| A. Global do sistema | um valor vale para todos os técnicos; exige coleção ou nó de configuração do sistema |
| B. Por técnico | o Admin define para cada conta; guarda em `users/<uid>/settings` |
| C. Por clube | o Admin define por clube de cada técnico; guarda em `users/<uid>/clubs/<clubId>/settings` |

**Recomendação:** A. O método é uma escolha metodológica da plataforma, e mudar por conta torna relatórios de
técnicos diferentes incomparáveis. 🟡

## Q-02, Como o app reconhece o Administrador?

✅ **Respondida em 13/10 — D-21** (o dono aceitou a recomendação; ver `../questions.md` e `../domain.md`).

**Contexto.** O papel de Administrador hoje só existe como superusuário do painel `/_/` do PocketBase, fora do app.
D-03 (ACWR) e D-09 (criação de contas) pedem ações de Admin dentro do app.

| Opção | Efeito |
|---|---|
| A. Campo `role` em `users` (`coach` / `admin`) | simples; as regras do PocketBase passam a checar `@request.auth.role` |
| B. Coleção `admins` com relação para `users` | separa o papel; regras mais verbosas |
| C. Usar só o superusuário do PocketBase | sem mudança no modelo; o Admin opera no painel `/_/`, sem tela no app |

**Recomendação:** A. Também é o que a cobrança por plano de D-09 vai precisar (campo de plano na conta). 🟡
Pergunta repetida em `../hub/tasks.md` (lacuna de T-17).

## Q-03, Conflito entre aparelhos: quem vence?

✅ **Respondida em 13/10 — D-11** (o dono aceitou a recomendação; ver `../questions.md` e `../domain.md`).

**Contexto.** Hoje o navegador vence ao abrir (envia tudo) e o servidor só acrescenta registros novos. A correção
(T-13, T-14) precisa de uma regra única.

| Opção | Efeito |
|---|---|
| A. Vence o mais recente (`ts` do registro) | edição feita offline e enviada depois ainda vence, se for mais nova |
| B. Vence sempre o servidor | simples; edição offline concorrente se perde |
| C. Vence o servidor, mas o local guarda a versão descartada para resgate | como B, com rede de segurança (como o Video Lab faz) |

**Recomendação:** A, com o `ts` já gravado em cada registro (`ts: Date.now()`). 🟡

## Q-04, Migração dos dados antigos do navegador (`glcv5`)

✅ **Respondida em 13/10 — D-18** (o dono aceitou a recomendação; ver `../questions.md` e `../domain.md`).

**Contexto.** Hoje os dados do formato anterior ao login são importados automaticamente para a conta e o clube de
quem abrir o módulo primeiro naquele navegador.

| Opção | Efeito |
|---|---|
| A. Perguntar antes de importar, mostrando conta e clube | evita importar na conta errada |
| B. Desligar a migração | dados antigos ficam só no navegador (exportáveis em JSON) |

**Recomendação:** A. 🟡

## Q-05, Fotos que já sumiram do servidor

✅ **Respondida em 13/10 — D-19** (o dono aceitou a recomendação; ver `../questions.md` e `../domain.md`).

**Contexto.** O envio na abertura pode ter apagado fotos de goleiros no servidor (`design.md`, Riscos). Não se sabe se
aconteceu em produção.

**Pergunta:** vale verificar a produção (contar goleiros sem foto) e tentar recuperar dos caches dos navegadores
dos técnicos (TM-02)? 🔴
