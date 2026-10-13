# Scouting, Tarefas de Implementação

## Pré-requisitos
- [ ] Hub entregando `FLUXGK_CONTEXT` com `uid`, `cloudConfig`, `lang`, `club`, `season`, `coach` (`../hub/contracts.md`)
- [ ] `adaptador-fluxdb` com `on('value')`, `update`, `remove` e `onAuthStateChanged` (`../adaptador-fluxdb/contracts.md`)
- [ ] Fontes locais em `/static/fonts/`
- [ ] Chaves `scout.*` em `fluxgk-i18n.js` (hoje 1; ver T-17)

## Tarefas

### Paridade com o legado

- [ ] T-01, Contexto e login: aceitar `FLUXGK_CONTEXT` só da janela pai, exigir `uid` e `cloudConfig`, aplicar idioma, carregar SDK e adaptador sob demanda, ligar listener e gravação só depois do login; avisar `FLUXGK_MODULE_READY`
  - Origem no legado: `mod_scouting.html:204-242`
  - Critério de pronto: aberto pelo hub, lê `users/<uid>/scouting`; sem sessão, mostra o ponto vermelho "sem sessão"
  - Confiança: 🟢

- [ ] T-02, Identidade visual do clube ativo: cor na barra com contraste (inverte a tinta se a cor for clara), escudo ou sigla, faixa clube · temporada · técnico
  - Origem no legado: `aplicarIdentidade` (`:258-294`), `_claroDemais` (`:254`)
  - Critério de pronto: clube amarelo deixa o texto da barra escuro
  - Confiança: 🟢

- [ ] T-03, Modelo do goleiro e da `config` como no design; cópia local em `fluxgk_scouting_v1`
  - Origem no legado: `DB`, `carregar` (`:137-164`)
  - Critério de pronto: recarregar a página sem rede mostra o acervo
  - Confiança: 🟢

- [ ] T-04, Anotação rápida: nome obrigatório, clube e liga; Enter adiciona; goleiro novo no topo com `criadoEm`
  - Origem no legado: `qAdd` (`:765-778`)
  - Critério de pronto: Critério de Aceitação 1
  - Confiança: 🟢

- [ ] T-05, Ficha: identificação (11 campos com as conversões de RN-08 e RN-09), foto reduzida (240 px, q 0,72) por clique ou arraste, remover foto, links clicáveis, notas gerais, apagar com confirmação
  - Origem no legado: `telaFicha` (`:580-658`), eventos `:793-845`, `encolherFoto` (`:353`)
  - Critério de pronto: foto de 4 MB vira poucos KB; nacionalidade "Rússia, Cazaquistão" vira lista de 2
  - Confiança: 🟢

- [ ] T-06, Leitura inicial e observações: estrelas de 1 a 5 (clicar de novo limpa), só áreas preenchidas, recusa registro vazio, pendente → `leitura`, senão → `atualizacoes`
  - Origem no legado: `formObs` (`:675`), `novaObs` (`:848-869`), `ligarEstrelas` (`:904`), `pendente` (`:414`)
  - Critério de pronto: Critério de Aceitação 2
  - Confiança: 🟢

- [ ] T-07, Valor atual e histórico por área; nota média; "visto em"
  - Origem no legado: `areaAtual`, `historicoArea`, `vistoEm` (`:381-406`), `cartao` (`:550`)
  - Critério de pronto: Critério de Aceitação 3
  - Confiança: 🟢

- [ ] T-08, Lista com busca sem acento, 9 filtros, opções de RN-11, ordenação por "visto em", contador "x de y", limpar filtros
  - Origem no legado: `filtrados` (`:431`), `opcoes` (`:420`), `telaLista` (`:473`)
  - Critério de pronto: Critério de Aceitação 4
  - Confiança: 🟢

- [ ] T-09, Mapa por nacionalidade e por liga
  - Origem no legado: `telaMapa` (`:699`)
  - Critério de pronto: a barra maior ocupa a largura toda
  - Confiança: 🟢

- [ ] T-10, Ajustes: listas, exportar `.json`, importar com validação e confirmação, situação
  - Origem no legado: `telaAjustes` (`:722`), eventos `:871-900`
  - Critério de pronto: Critério de Aceitação 5
  - Confiança: 🟢

- [ ] T-11, Gravação por diferença com espera de 600 ms, um `update` só, controle `_enviado`, remoção à parte; indicador de sincronização
  - Origem no legado: `salvar`, `agendarSubida`, `subirTudo`, `apagarNaNuvem`, `_dot` (`:151-202`)
  - Critério de pronto: Critério de Aceitação 6
  - Confiança: 🟢

### Correções

- [ ] T-12, Importar substitui de verdade: depois de confirmar, apagar na nuvem os goleiros que não estão no arquivo (ou oferecer "juntar" × "substituir", com "juntar" como padrão)
  - Origem no legado: `impFile` (`:880-893`) usa só `update`
  - Critério de pronto: importar arquivo com 3 goleiros sobre um acervo de 10 e escolher "substituir" deixa 3 na nuvem depois de recarregar
  - Confiança: 🟢

- [ ] T-13, Mesclar em vez de trocar quando a nuvem chega: goleiro só no navegador e ainda não enviado é mantido e enviado; goleiro nos dois lados fica com a versão de `alteradoEm` mais recente (campo novo, gravado a cada alteração)
  - Origem no legado: `ligarListener` (`:301-316`)
  - Critério de pronto: anotar um goleiro sem rede, entrar depois num acervo que já tem dados e ver o goleiro novo nos dois aparelhos
  - Confiança: 🟢

- [ ] T-14, Mapa conta "—" para quem não tem nacionalidade (`length ? lista : ['—']`)
  - Origem no legado: `telaMapa` (`:702`)
  - Critério de pronto: a soma das barras por país é ≥ total de goleiros
  - Confiança: 🟢

- [ ] T-15, Filtro de seleção com três valores: convocado, não convocado, não informado
  - Origem no legado: `filtrados` (`:443`)
  - Critério de pronto: goleiro sem informação não aparece em "Não convocado"
  - Confiança: 🟢

- [ ] T-16, Links só com `http:` ou `https:`; os demais são recusados com aviso
  - Origem no legado: `data-c="links"` (`:802-808`), `href` em `:641`
  - Critério de pronto: `javascript:alert(1)` não vira link
  - Confiança: 🟢

- [ ] T-17, Tradução: textos da tela e das áreas para chaves `scout.*`; datas pelo idioma atual (com a T-12 e a T-13 de `traducao`)
  - Origem no legado: HTML e código em português; `fd` (`:333`)
  - Critério de pronto: Scouting em inglês sem texto em português
  - Confiança: 🟢

- [ ] T-18, Religar o listener depois de erro de leitura (ao voltar a conexão e a cada 30 s), com o aviso sumindo quando a leitura volta
  - Origem no legado: `ligarListener`, ramo de erro (`:317-323`)
  - Critério de pronto: derrubar e voltar a rede sem recarregar volta ao verde
  - Confiança: 🟢

- [ ] T-19, Corrigir o comentário de abertura ("protótipo isolado") para o que o módulo é hoje
  - Origem no legado: `:122-127`
  - Critério de pronto: comentário e código dizem a mesma coisa
  - Confiança: 🟢

- [ ] T-20, Escutar e gravar por goleiro (`goalkeepers/<id>`), não a raiz inteira, quando o adaptador oferecer `child_*`; foto fora da ficha (arquivo do PocketBase) junto com a DT-04
  - Origem no legado: `on('value')` em `users/<uid>/scouting` (`:301`); `g.foto` em base64
  - Critério de pronto: alterar um goleiro num acervo de 300 não baixa as 300 fichas de novo
  - Confiança: 🟡 (D-14 decidido: fotos viram arquivos; falta a evolução do adaptador para escuta por item)

### Evolução decidida pelo dono

- [ ] T-21, Ditado por voz nos textos das áreas e nas notas gerais, inclusive com o jogo rodando (D-02)
  - Origem no legado: inexistente
  - Critério de pronto: falar durante a anotação preenche o texto da área
  - Confiança: 🟢 (D-26: reconhecimento de voz do navegador primeiro; serviço externo só se a qualidade não servir)

- [ ] T-22, Telas adaptadas ao celular, mobile first (D-05): anotação rápida e nova observação usáveis com uma mão
  - Origem no legado: CSS com `.fbar` e `.row`
  - Critério de pronto: num celular em pé, anotar um goleiro e registrar uma observação sem zoom
  - Confiança: 🟢

- [ ] T-23, Áreas configuráveis pelo técnico, como os critérios do Perfil (RN-40)
  - Origem no legado: `AREAS` fixo (`:129-135`)
  - Critério de pronto: técnico acrescenta a área "jogo aéreo" e ela aparece no formulário e na ficha
  - Confiança: 🟢 (D-23: áreas fixas por enquanto — tarefa adiada)

## Tarefas de Teste

- [ ] TT-01, Anotação rápida cria goleiro pendente e grava (Critério 1)
- [ ] TT-02, Primeiro registro vira leitura inicial; o seguinte, observação (2)
- [ ] TT-03, Valor atual pela data mais recente, empate para a observação (3)
- [ ] TT-04, Filtros combinados e contador (4)
- [ ] TT-05, Exportar e importar (5)
- [ ] TT-06, `update` contém só o que mudou (6)
- [ ] TT-07, Registro sem nenhuma área é recusado
- [ ] TT-08, Importar "substituir" apaga na nuvem (após T-12)
- [ ] TT-09, Goleiro anotado sem rede sobrevive à leitura da nuvem (após T-13)
- [ ] TT-10, Link `javascript:` recusado (após T-16)

## Tarefas de Migração de Dados (se aplicável)

- [ ] TM-01, `alteradoEm` nos goleiros existentes (com T-13): preencher com `vistoEm` ou `criadoEm`
- [ ] TM-02, Fotos em base64 → arquivos (com T-20), junto com a migração de imagens do resto do app

## Ordem Sugerida
1. T-13 e T-12: hoje dá para perder goleiro anotado e a importação não faz o que a confirmação diz.
2. T-01 a T-11 com TT-01 a TT-07 como linha de base.
3. T-16, T-14, T-15, T-18 e T-19.
4. T-17 com o resto da tradução; T-22 com as outras telas.
5. T-20 + TM-02 quando o adaptador e a decisão sobre imagens saírem.
6. T-21 com o serviço de voz; T-23 se o dono quiser.

## Lacunas (revisadas em 13/10)

Respostas do dono ao Reviewer em `../questions.md`; decisões D-11 a D-31 em `../domain.md`.

- ✅ As cinco áreas são do método do dono ou devem ser configuráveis como os critérios do Perfil? → D-23: fixas por enquanto
- ✅ Ditado por voz: o mesmo serviço dos outros módulos. → D-26: voz do navegador primeiro
- ✅ Um goleiro observado que vira adversário (ou contratado) deve se ligar ao cadastro do clube? → D-24: sem vínculo agora; "copiar para o elenco" quando contratado
