# Tradução (i18n), Tarefas de Implementação

## Pré-requisitos
- [ ] Hub enviando `lang` no `FLUXGK_CONTEXT` e gravando `profile/lang` (`../hub/contracts.md`)
- [ ] `adaptador-fluxdb` com `set` em `profile/lang` (`../adaptador-fluxdb/contracts.md`)
- [ ] **Textos nos 7 idiomas novos** (D-10): quem traduz e quem revisa (Lacunas Pendentes)
- [ ] **Decisão sobre a escolha local × perfil** (Lacunas Pendentes): define T-16

## Tarefas

### Paridade com o legado

- [ ] T-01, Dicionário por idioma e chave `<prefixo>.<nome>`, com os 11 prefixos de módulo e as 2.117 chaves atuais em `en` e `pt`
  - Origem no legado: `DICT.en` (`fluxgk-i18n.js:23-1091`), `DICT.pt` (`:1092-2161`)
  - Critério de pronto: toda chave existe nos dois idiomas; `missing()` vazio
  - Confiança: 🟢

- [ ] T-02, Detecção do idioma inicial: `fluxgk_lang` válido → ele; senão idioma do navegador; reserva em inglês; sem erro com `localStorage` bloqueado
  - Origem no legado: `detect` (`:2167-2176`)
  - Critério de pronto: Critério de Aceitação 1
  - Confiança: 🟢

- [ ] T-03, `TX(chave, reserva)` e `t`: idioma atual → inglês → reserva → chave
  - Origem no legado: `lookup` (`:2177-2183`), `t`
  - Critério de pronto: Critério de Aceitação 2
  - Confiança: 🟢

- [ ] T-04, `setLang(l, persist)`: troca, grava só com `persist !== false`, ajusta `<html lang>`, aplica e avisa os assinantes só quando mudou
  - Origem no legado: `setLang` (`:2189-2198`)
  - Critério de pronto: chamar com o idioma atual não redesenha as telas
  - Confiança: 🟢

- [ ] T-05, Aplicação nos atributos `data-i18n`, `-placeholder`, `-title`, `-aria`, `-alt`, `-value` e `data-i18n-html`, mantendo o texto do HTML quando falta a chave
  - Origem no legado: `apply`, `_apply`
  - Critério de pronto: dicas e rótulos de acessibilidade mudam junto com o texto
  - Confiança: 🟢

- [ ] T-06, Observador do DOM: reaplica quando entra elemento marcado, ignora as próprias mudanças e agrupa num passo
  - Origem no legado: `watch` (`:2245-2267`)
  - Critério de pronto: Critério de Aceitação 3
  - Confiança: 🟢

- [ ] T-07, `onChange` e as telas que redesenham por ele (controle de carga, periodização, estatística)
  - Origem no legado: `onChange`; `mod_data.html:2590`, `mod_periodization.html:1230`, `mod_stats.html:2712`
  - Critério de pronto: trocar o idioma redesenha listas montadas por código
  - Confiança: 🟢

- [ ] T-08, Botões de idioma do hub: gravar no navegador e em `profile/lang`, redesenhar o hub, reenviar o contexto ao módulo aberto; ao entrar, aplicar o idioma do perfil se o navegador não tem escolha
  - Origem no legado: `index.html:445`, `:650-668`, `:914`
  - Critério de pronto: Critérios de Aceitação 4 e 5
  - Confiança: 🟢

- [ ] T-09, Cada módulo aplica `lang` do contexto com `setLang(lang, false)`
  - Origem no legado: `mod_planner.html:506`, `mod_periodization.html:22`, `mod_xg.html:1365`, `mod_stats.html:24`, `mod_minutes.html:24`, `mod_data.html:2611`, `mod_scouting.html:222`, `mod_video.html:9112`
  - Critério de pronto: nenhum módulo grava `fluxgk_lang`
  - Confiança: 🟢

### Correções

- [ ] T-10, Lista de idiomas num lugar só (`I18N.langs`), lida por `detect`, `setLang`, botões do hub e Perfil; idioma recusado registra aviso no console
  - Origem no legado: `detect` e `setLang` (`'en'`/`'pt'` fixos), `index.html:669`, `mod_profile.html:5842`
  - Critério de pronto: acrescentar um idioma ao dicionário o faz aparecer no hub sem mexer em outro arquivo
  - Confiança: 🟢

- [ ] T-11, Perfil no dicionário único: levar as chaves do dicionário próprio (`pt`/`en`/`ru`) para o prefixo `prof.*`, usar `TX` e o idioma do contexto, aposentar `semey.gk.prefs` para idioma
  - Origem no legado: `mod_profile.html:1230` em diante, `PREF_KEY` (`:3800`), `:5842`
  - Critério de pronto: o Perfil abre no idioma do hub em qualquer dos idiomas aceitos, sem cair em português
  - Confiança: 🟢

- [ ] T-12, Scouting traduzido: textos do HTML e do código para chaves `scout.*`, com `data-i18n` e `TX`
  - Origem no legado: `mod_scouting.html` (1 chave, nenhum `TX`)
  - Critério de pronto: Scouting em inglês sem texto em português na tela
  - Confiança: 🟢

- [ ] T-13, Datas e números pelo idioma atual: função `I18N.locale()` (`pt` → `pt-BR`, `en` → `en-GB` ou `en-US`, a decidir) usada no lugar de `'pt-BR'` fixo
  - Origem no legado: `mod_scouting.html:333`, `mod_video.html:8638`, `LOC` do Perfil (`:2909`, `:3860`)
  - Critério de pronto: com o app em inglês, nenhuma data aparece no formato `dd/mm/aaaa` com mês em português
  - Confiança: 🟢 (D-28: inglês britânico, `en-GB`)

- [ ] T-14, Marcadores e plural no dicionário: `TX(chave, {n: 3})` substitui `{nome}`; chaves de plural por idioma (`.one`, `.few`, `.many`, `.other`) escolhidas por `Intl.PluralRules`
  - Origem no legado: `.replace('{n}', …)` nas telas (ex.: `mod_stats.html:2105`); 7 valores com `{n}`
  - Critério de pronto: "1 arquivo" e "2 arquivos" corretos em português; três formas certas em russo
  - Confiança: 🟢

- [ ] T-15, Quadra Tática recebe o idioma do Planner (na mensagem `fluxgk-tatica-load` ou em `?lang=` na URL do iframe)
  - Origem no legado: `tatica3d.html` sem contexto; `mod_planner.html:993`
  - Critério de pronto: com `localStorage` limpo, a quadra abre no idioma do Planner
  - Confiança: 🟢

- [ ] T-16, Escolha do idioma acompanhar o usuário: ao entrar, o perfil vence a escolha local (ou a escolha local passa a guardar a data e vence a mais recente)
  - Origem no legado: `index.html:445` (perfil só vale sem `fluxgk_lang`)
  - Critério de pronto: trocar o idioma no celular muda o computador no próximo acesso
  - Confiança: 🟢 (D-28: o idioma acompanha a conta)

- [ ] T-17, Tirar `<br>` dos 3 valores com HTML e quebrar a linha no CSS ou com `\n` + `white-space: pre-line`
  - Origem no legado: `hub.msg.loadFailBoot`, `data.pdf.coverTitle`, `plan.pdf.title`
  - Critério de pronto: nenhum valor do dicionário contém `<`; nenhum texto traduzido entra por `innerHTML`
  - Confiança: 🟢

### Evolução decidida pelo dono

- [ ] T-18, 9 idiomas (D-10): `pt-PT`, `pt-BR`, `en`, `fr`, `de`, `ru`, `es`, `it`, `nl`; `pt` atual vira `pt-BR`; detecção casa `pt-PT` antes de `pt`; reserva `pt-PT` → `pt-BR` → `en`
  - Origem no legado: `DICT` com `en` e `pt`
  - Critério de pronto: os 9 idiomas com as mesmas chaves; `missing(lang)` vazio para cada um
  - Confiança: 🟢

- [ ] T-19, Um arquivo por idioma (`i18n/<lang>.js` ou `.json`), baixado só o do idioma atual e o inglês de reserva, com o núcleo separado
  - Origem no legado: arquivo único de 2.275 linhas
  - Critério de pronto: trocar de idioma baixa só o arquivo novo; a página não baixa os 9
  - Confiança: 🟡 (com o núcleo assíncrono, a primeira pintura espera o arquivo do idioma)

- [ ] T-20, Seletor de idioma no hub com os 9 idiomas (lista, não botões EN/PT), adaptado ao celular (D-05)
  - Origem no legado: `index.html:243-244`
  - Critério de pronto: escolher alemão no celular troca hub e módulo aberto
  - Confiança: 🟢

## Tarefas de Teste

- [ ] TT-01, Detecção pelo navegador em português e em francês sem escolha salva (Critério 1)
- [ ] TT-02, Reserva em inglês para chave ausente (2)
- [ ] TT-03, Elemento inserido depois aparece traduzido (3)
- [ ] TT-04, Idioma do perfil aplicado num aparelho novo (4)
- [ ] TT-05, Módulo aberto troca junto com o hub (5)
- [ ] TT-06, Paridade de chaves entre todos os idiomas (roda no portão de entrega)
- [ ] TT-07, `setLang` com idioma desconhecido avisa e não muda (após T-10)
- [ ] TT-08, Plural em português e russo (após T-14)
- [ ] TT-09, Nenhuma data em `pt-BR` com o app em inglês (após T-13)
- [ ] TT-10, Quadra embutida segue o Planner (após T-15)

## Tarefas de Migração de Dados (se aplicável)

- [ ] TM-01, `profile/lang = 'pt'` → `'pt-BR'` e `fluxgk_lang = 'pt'` → `'pt-BR'` (com T-18), aceitando `pt` como sinônimo durante a transição
- [ ] TM-02, Idioma do Perfil em `semey.gk.prefs` → descartado (com T-11); o tema continua lá

## Ordem Sugerida
1. T-01 a T-09 com TT-01 a TT-06 como linha de base.
2. T-10: sem ela, cada idioma novo exige mudar quatro lugares.
3. T-11 e T-12: trazem Perfil e Scouting para o dicionário antes de traduzir para 9 idiomas, senão eles ficam de fora.
4. T-13, T-14 e T-17: preparam os textos para idiomas com outras regras.
5. T-18 + TM-01, T-20; T-19 se o tamanho do arquivo pesar.
6. T-15 e T-16 a qualquer momento.

## Lacunas (revisadas em 13/10)

Respostas do dono ao Reviewer em `../questions.md`; decisões D-11 a D-31 em `../domain.md`.

- ✅ Quem traduz os 7 idiomas novos e quem revisa o vocabulário de goleiro em cada um? Tradução automática sem revisão erra termos técnicos. → D-28: tradução automática revisada por técnico de cada idioma
- ✅ Idioma trocado em outro aparelho deve valer aqui no próximo acesso, ou cada aparelho guarda a sua escolha? → D-28: o idioma acompanha a conta
- ✅ Inglês britânico ou americano para datas e números? → D-28: inglês britânico
