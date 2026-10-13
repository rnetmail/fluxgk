# Tradução (i18n)

## Visão Geral
`fluxgk-i18n.js` (2.275 linhas). Dicionário único de textos da interface e o mecanismo que o aplica nas telas,
carregado pelo hub e por todos os módulos, menos o Perfil. Hoje tem **dois idiomas**, inglês (`en`) e português
do Brasil (`pt`), com **2.117 chaves** em cada um (2.095 na extração + 22 da tela de versões, 13/10). O hub é quem escolhe o idioma; os módulos seguem. Não tem banco
próprio: a escolha fica no navegador e no perfil do usuário. 🟢

## Responsabilidades
- Guardar os textos por idioma e chave (`<módulo>.<nome>`). 🟢
- Descobrir o idioma inicial: escolha salva no navegador, senão o idioma do navegador. 🟢
- Entregar um texto por chave (`TX`), com reserva em inglês e, por último, o texto de reserva ou a própria chave. 🟢
- Aplicar os textos nos elementos marcados com `data-i18n*` e reaplicar quando a tela é redesenhada. 🟢
- Avisar as telas quando o idioma muda, para redesenharem o que é montado por código. 🟢

## Regras de Negócio
- RN-01 Idiomas aceitos: `en` e `pt`. Qualquer outro valor em `setLang` é ignorado sem aviso. 🟢
- RN-02 Idioma inicial: `localStorage['fluxgk_lang']` se for `en` ou `pt`; senão, `navigator.language` começando com `pt` → `pt`, qualquer outro → `en`. 🟢
- RN-03 Busca de texto: idioma atual → inglês → texto de reserva passado na chamada → a própria chave. 🟢
- RN-04 **O hub é dono da escolha.** O botão EN/PT do hub grava no navegador e no perfil (`profile/lang`), para valer em outros aparelhos; os módulos recebem o idioma no `FLUXGK_CONTEXT` e aplicam com `setLang(lang, false)`, sem gravar. 🟢
- RN-05 Ao entrar, o idioma do perfil só vale se o navegador ainda não tem escolha própria: a escolha local vence a do perfil. 🟢
- RN-06 Trocar o idioma no hub reenvia o contexto ao módulo aberto, que troca na hora. 🟢
- RN-07 `setLang` também ajusta o `lang` do documento (`pt` → `pt-BR`, `en` → `en`). 🟢
- RN-08 Os atributos traduzidos são: texto (`data-i18n`), `placeholder`, `title`, `aria-label`, `alt` e `value`. Com `data-i18n-html` o valor entra como HTML. 🟢
- RN-09 Telas que recriam HTML depois da tradução são retraduzidas sozinhas: um observador do DOM reaplica quando entra elemento marcado. 🟢
- RN-10 **O Perfil não usa este dicionário.** Tem dicionário próprio com `pt`, `en` e `ru`, guarda o idioma em `semey.gk.prefs` e, vindo do hub, aceita só `pt` ou `en` (qualquer outro vira `pt`). 🟢
- RN-11 A Quadra Tática não recebe o idioma pelo contexto: lê a mesma escolha do navegador (`fluxgk_lang`). 🟢

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | Dicionário por idioma e chave, com prefixo do módulo (`common`, `hub`, `plan`, `period`, `xg`, `st`, `min`, `data`, `scout`, `vid`, `tat`) | Must | Toda chave existe nos dois idiomas |
| RF-02 | Detecção do idioma inicial (RN-02) | Must | Critério de Aceitação 1 |
| RF-03 | `TX(chave, reserva)` com a ordem de busca de RN-03 | Must | Critério de Aceitação 2 |
| RF-04 | Aplicação nos atributos `data-i18n*` (RN-08) | Must | Botões, dicas e rótulos de acessibilidade traduzidos |
| RF-05 | Reaplicação automática quando a tela é redesenhada (RN-09) | Must | Critério de Aceitação 3 |
| RF-06 | `onChange` para telas montadas por código | Must | Lista redesenhada no idioma novo |
| RF-07 | Botão EN/PT no hub, gravando no navegador e no perfil (RN-04, RN-05) | Must | Critério de Aceitação 4 |
| RF-08 | Módulo aberto troca de idioma junto com o hub (RN-06) | Must | Critério de Aceitação 5 |
| RF-09 | `missing()` lista as chaves sem português, para diagnóstico | Could | Retorna lista vazia hoje |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Disponibilidade | sem acesso ao navegador (`localStorage` bloqueado), cai no idioma do navegador sem erro | `try/catch` em `detect` e `setLang` | 🟢 |
| Performance | o observador ignora as mudanças que ele mesmo causa e agrupa a reaplicação num único passo | `_applying`, `setTimeout(…, 0)` em `watch` | 🟢 |
| Robustez | erro numa tela avisada por `onChange` não impede as outras | `try/catch` por assinante | 🟢 |
| Segurança | `data-i18n-html` põe o valor como HTML; hoje nenhuma tela usa e 3 valores têm marcação | `_apply`; contagem em `*.html` | 🟢 |
| Manutenção | os dois idiomas têm exatamente as mesmas chaves | `missing()` vazio; 2.117 × 2.117 | 🟢 |

> Inferido a partir do código. Validar com equipe de operações.

## Critérios de Aceitação

```gherkin
Dado um navegador em português sem escolha salva
Quando o técnico abre o FluxGK pela primeira vez
Então a interface aparece em português

Dado o idioma em português e uma chave que só existe em inglês
Quando a tela pede essa chave
Então aparece o texto em inglês, e não a chave

Dado uma lista que a tela redesenha com innerHTML depois da tradução
Quando os itens novos entram na página
Então eles aparecem já traduzidos, sem chamada extra da tela

Dado o técnico que escolheu EN no computador
Quando ele entra pela primeira vez no celular
Então o app abre em inglês, porque o idioma veio do perfil

Dado o módulo de estatística aberto em português
Quando o técnico toca EN no hub
Então o módulo passa para inglês sem recarregar
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Dicionário, detecção, `TX`, aplicação, reaplicação, `onChange` (RF-01..06) | Must | Todo módulo depende disso para mostrar texto |
| Escolha no hub e no perfil, troca ao vivo (RF-07, 08) | Must | O técnico escolhe uma vez e vale em todo lugar |
| `missing()` (RF-09) | Could | Diagnóstico de quem traduz |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `fluxgk-i18n.js` | `DICT.en` (`:24`), `DICT.pt` (`:1092`) | 🟢 |
| `fluxgk-i18n.js` | `detect`, `lookup` (`:2167-2183`), `getLang`, `setLang`, `t`, `onChange`, `apply`, `_apply`, `missing` | 🟢 |
| `fluxgk-i18n.js` | observador do DOM (`watch`), `window.TX`, `window.FluxGKI18n` | 🟢 |
| `index.html` | botões EN/PT (`:231-232`), `setLang` do hub (`:656-668`), idioma do perfil ao entrar (`:427`) | 🟢 |
| `mod_*.html` | aplicação do idioma recebido no `FLUXGK_CONTEXT` (`setLang(d.lang, false)`) | 🟢 |
| `mod_profile.html` | dicionário próprio pt/en/ru (`:1230` em diante), `PREF_KEY` (`:3800`), idioma do contexto (`:5842`) | 🟢 |
| `tatica3d.html` | chaves `tat.*`, sem idioma pelo contexto | 🟢 |
