# História: entrar e escolher o contexto

> Fluxo transversal: começa no `hub`, passa pelo `adaptador-fluxdb` e termina com um módulo aberto no clube e na
> temporada certos. Specs de origem: `../hub/`, `../adaptador-fluxdb/`, `../traducao/`, `../infraestrutura/`.

## Persona
**Técnico de goleiros de futsal.** Trabalha em um ou mais clubes, uma temporada de cada vez, e usa o app no
computador do clube, no tablet à beira da quadra e no celular. Não tem equipe de TI: se esquecer a senha, quem
resolve é o administrador.

## Histórias

### US-01 Entrar
**Como** técnico, **quero** entrar com e-mail e senha **para** ver o meu trabalho de onde parei.
- Prioridade: Must · Confiança: 🟢
- Regras: sessão guardada no navegador e renovada ao abrir; "não lembrar" hoje não tem efeito (DT-10); senha esquecida só pelo administrador no `/_/` (ADR 006).

### US-02 Voltar ao último clube e temporada
**Como** técnico, **quero** que o app abra no clube e na temporada que usei por último **para** não escolher toda vez.
- Prioridade: Must · Confiança: 🟢
- Regras: `active = {clubId, seasonId}` no perfil; clube que sumiu → primeiro clube; temporada que sumiu → a **última** do clube (hub RN-03).

### US-03 Criar o primeiro clube e a primeira temporada
**Como** técnico novo, **quero** cadastrar meu clube com cor e escudo e abrir a temporada **para** começar a registrar.
- Prioridade: Must · Confiança: 🟢
- Regras: o primeiro clube vira o ativo e já pede a temporada; rótulo sugerido `AAAA/AA+1`; escudo até 500 KB; id = `slug` do nome.

### US-04 Trocar de clube ou de temporada
**Como** técnico de mais de um clube, **quero** trocar o contexto pelo seletor **para** que tudo o que eu registrar vá para o lugar certo.
- Prioridade: Must · Confiança: 🟢
- Regras: nenhum módulo abre sem clube **e** temporada; o módulo aberto recebe o contexto novo; Scouting, biblioteca de exercícios e critérios de avaliação são do técnico e não mudam com o contexto (RN-40, RN-41).

### US-05 Abrir um módulo
**Como** técnico, **quero** tocar num cartão do painel e cair no módulo já com o meu clube **para** trabalhar sem repetir dados.
- Prioridade: Must · Confiança: 🟢
- Regras: o hub cria o iframe, espera `FLUXGK_MODULE_READY` (ou 600 ms) e envia `FLUXGK_CONTEXT` com `uid`, `dataPath = users/<uid>/data/<clubId>/<seasonId>`, idioma, clube, temporada e técnico.

### US-06 Escolher o idioma uma vez
**Como** técnico que trabalha fora do Brasil, **quero** escolher o idioma no hub **para** que o app inteiro e os outros aparelhos sigam.
- Prioridade: Must · Confiança: 🟢
- Regras: hoje EN e PT; a escolha local vence a do perfil (ver `../traducao/`); 9 idiomas decididos (D-10).

### US-07 Ver o resumo da temporada
**Como** técnico, **quero** ver no painel quantas sessões, jogos e goleiros a temporada tem **para** saber onde estou.
- Prioridade: Should · Confiança: 🟢
- Regras: sessões únicas por `data|hora|tipo`; descanso e falta, depois de D-01/D-08, em categorias próprias; goleiros ativos e, num rodapé, por status.

## Critérios de Aceitação

```gherkin
Cenário: entrar e voltar ao último contexto
  Dado o técnico com os clubes "Sporting" e "Benfica" e o último uso em "Benfica 2026/27"
  Quando ele entra com e-mail e senha corretos no tablet
  Então o painel abre em "Benfica 2026/27", com a cor e o escudo do Benfica

Cenário: primeira vez
  Dado uma conta sem nenhum clube
  Quando o técnico entra
  Então vê as boas-vindas e o seletor de clube
  E ao criar "Sporting" o app pede a temporada, sugerindo "2026/27"

Cenário: módulo exige contexto
  Dado o clube "Sporting" sem temporada ativa
  Quando o técnico toca em "Planejamento"
  Então o módulo não abre e o seletor de temporada aparece

Cenário: trocar de clube com módulo aberto
  Dado o Planejamento aberto em "Benfica 2026/27"
  Quando o técnico troca para "Sporting 2026/27"
  Então as sessões mostradas passam a ser as do Sporting
  E o Scouting continua mostrando o mesmo acervo

Cenário: falha de leitura não apaga
  Dado a nuvem lenta, que estoura 20 s duas vezes ao entrar
  Quando o painel abre
  Então aparece o aviso de tempo esgotado
  E nenhuma gravação é feita até a leitura funcionar

Cenário: senha esquecida
  Dado o técnico que não lembra a senha
  Quando ele toca em "esqueci a senha"
  Então o app diz que a senha é redefinida pelo administrador
```

## Passo a passo atual 🟢
1. `index.html` carrega o adaptador; `onAuthStateChanged` decide entre login e painel.
2. Login: `setPersistence` + `signInWithEmailAndPassword` → `POST /api/collections/users/auth-with-password` (com IP real para o limite de tentativas).
3. `loadAll`: lê `clubs`, `active` e `profile` (timeout de 20 s, uma nova tentativa); aplica o idioma do perfil se o navegador não tem escolha.
4. Corrige clube e temporada ativos que sumiram; mostra o painel (`applyIdentity`, `loadStats`).
5. Toque num cartão: `openModule` → iframe `mod_*.html?v=<ts>` → `FLUXGK_MODULE_READY` → `pushContext`.

## Evolução decidida pelo dono
- Cadastro de contas só pelo administrador, por tela própria (D-09); depois, conta Google + código de ativação por plano (basic 2 módulos, intermediate 5, advanced todos, pro todos + inteligência).
- Telas de cadastro mobile first (D-05).
- 9 idiomas (D-10).

## Lacunas
- 🟢 Cadastro aberto pela API hoje, contra D-09 (`../infraestrutura/tasks.md` T-10).
- 🟢 Sessão descartada se a renovação falhar sem rede: abrir o app offline com sessão guardada leva ao login (`../openapi/pocketbase-fluxgk.yaml`, `renovarSessao`).
- 🟢 Contexto enviado com destino `'*'`; `data` e `video` aceitam contexto de qualquer janela (`../hub/contracts.md`).
