# Scouting

## Visão Geral
`mod_scouting.html` (927 linhas). Acervo pessoal do técnico com goleiros de **outros clubes**: anotação rápida
durante o jogo, ficha de identificação, leitura em cinco áreas com nota de 1 a 5, observações posteriores, filtros,
contagem por país e por liga, e cópia em `.json`. O acervo é **do técnico**, não do clube nem da temporada (RN-41):
acompanha o técnico em qualquer clube. Grava em `users/<uid>/scouting` pelo `adaptador-fluxdb`, com cópia no
navegador. 🟢

## Responsabilidades
- Anotar um goleiro com três campos (nome, clube, liga) enquanto o jogo acontece. 🟢
- Manter a ficha: identificação, foto reduzida, etiquetas, links de vídeo, prioridade, notas gerais. 🟢
- Registrar a leitura inicial nas cinco áreas e, depois, observações que tocam só as áreas que chamaram atenção. 🟢
- Mostrar, por área, a leitura mais recente e o histórico. 🟢
- Filtrar e buscar o acervo; contar por nacionalidade e por liga. 🟢
- Guardar na nuvem só o que mudou e manter uma cópia no navegador para abrir na hora. 🟢
- Exportar e importar o acervo em `.json`. 🟢

## Regras de Negócio
- RN-01 Acervo em `users/<uid>/scouting = {goalkeepers/<id>, config}`, fora de `dataPath`: não depende do clube nem da temporada ativos. Enquanto aberto, o módulo usa a cor, o escudo e o nome do clube ativo só como identidade visual. 🟢
- RN-02 **Cinco áreas fixas:** ações defensivas, ações ofensivas, aspectos comportamentais, tática, adaptabilidade. Cada área recebe texto e/ou nota inteira de 1 a 5. 🟢
- RN-03 **Leitura inicial × observação:** enquanto nenhuma área tem texto ou nota, o goleiro está **pendente** e o próximo registro vira a leitura inicial (`leitura`); depois disso, cada registro é uma observação (`atualizacoes[]`). Registro sem nenhuma área preenchida é recusado. 🟢
- RN-04 **Valor atual de uma área** = a leitura com data mais recente que tocou a área (empate: a observação mais nova vence). O histórico lista todas, da mais recente para a mais antiga. 🟢
- RN-05 **Nota média do cartão** = média das notas atuais das áreas que têm nota, com uma casa decimal. 🟢
- RN-06 **Visto em** = a data mais recente entre a leitura inicial e as observações. A lista é ordenada por ela, mais recente primeiro. 🟢
- RN-07 Idade = ano atual − ano de nascimento; faixas: até 25, até 30, mais de 30. 🟢
- RN-08 Altura é guardada como faixa (`ate185`, `185a190`, `mais190`), não como número. 🟢
- RN-09 Nacionalidade e etiquetas são listas, digitadas separadas por vírgula. Links de vídeo: uma linha por link, `título | url`; linha só com url vira título "vídeo". 🟢
- RN-10 Foto reduzida a no máximo 240 px de lado, JPEG qualidade 0,72, guardada dentro da ficha. 🟢
- RN-11 As opções dos filtros de liga, país e etiqueta juntam as listas dos Ajustes com os valores já usados nas fichas. 🟢
- RN-12 Busca sem acento e sem diferença de maiúsculas em nome, outra grafia, clube, liga e nacionalidade. 🟢
- RN-13 **Gravação por diferença:** 600 ms depois da última edição, envia num único `update` só os goleiros (e a `config`) cujo JSON mudou desde o último envio. Falha de gravação zera o controle e a próxima envia tudo. 🟢
- RN-14 **A nuvem vence:** quando a leitura da nuvem chega, a lista local é substituída pela da nuvem. Se a nuvem está vazia e o navegador tem goleiros, eles são enviados. 🟢
- RN-15 Apagar um goleiro pede confirmação e remove o nó na nuvem. 🟢
- RN-16 Importar `.json` exige `gks` em lista e confirmação, e substitui o acervo do navegador. 🟢
- RN-17 Contexto aceito só da janela pai; exige `uid` e `cloudConfig`. O listener da nuvem só liga depois do login. 🟢

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | Anotação rápida com nome (obrigatório), clube e liga; Enter adiciona | Must | Critério de Aceitação 1 |
| RF-02 | Ficha com identificação, foto, etiquetas, links, prioridade e notas gerais, gravando a cada alteração | Must | Campo alterado aparece igual ao reabrir |
| RF-03 | Leitura inicial e observações por área com nota de 1 a 5 (RN-02, RN-03) | Must | Critério de Aceitação 2 |
| RF-04 | Valor atual e histórico por área (RN-04) | Must | Critério de Aceitação 3 |
| RF-05 | Cartões com foto ou iniciais, nota média, marcas (pendente, prioridade, idade, país, seleção, pé, etiquetas) e "visto em" | Must | |
| RF-06 | Filtros: busca, idade, nacionalidade, liga, pé, altura, seleção, etiqueta, visto há, prioridade; limpar filtros | Must | Critério de Aceitação 4 |
| RF-07 | Mapa: contagem por nacionalidade e por liga | Could | Barras proporcionais ao maior |
| RF-08 | Ajustes: listas de ligas, etiquetas e países; situação do acervo | Should | |
| RF-09 | Exportar e importar `.json` | Should | Critério de Aceitação 5 |
| RF-10 | Gravação por diferença e cópia local (RN-13, RN-14) | Must | Critério de Aceitação 6 |
| RF-11 | Indicador de sincronização (cinza, âmbar, verde, vermelho, com dica) | Should | Cor muda ao gravar e ao falhar |
| RF-12 | Apagar goleiro com confirmação | Must | Some na nuvem e nos outros aparelhos |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Performance | só o que mudou vai para a nuvem | `subirTudo`, `_enviado` (`:177-197`) | 🟢 |
| Capacidade | foto de celular reduzida a poucos KB, porque "o banco inteiro do sistema hoje usa ~21 MB" | comentário em `encolherFoto` (`:350-352`) | 🟢 |
| Disponibilidade | abre na hora com a cópia do navegador; sem nuvem, avisa e mostra a cópia | `carregar`, `_erroNuvem` (`:545`) | 🟢 |
| Segurança | textos do usuário escapados antes de entrar na tela | `esc` (`:327`) em todos os campos | 🟢 |
| Segurança | contexto só da janela pai | `:220` | 🟢 |
| Usabilidade | anotação rápida em 3 campos para usar com o jogo rodando | texto da tela (`:490`) | 🟢 |
| Internacionalização | tela em português escrito no HTML; data sempre em `pt-BR` | 1 chave `scout.*`; `fd` (`:333`) | 🟢 |

> Inferido a partir do código. Validar com equipe de operações.

## Critérios de Aceitação

```gherkin
Dado a lista de goleiros aberta durante um jogo
Quando o técnico digita só o nome "Ivanov" e aperta Enter
Então o goleiro aparece no topo com a marca "leitura pendente" e o acervo é gravado na nuvem

Dado um goleiro pendente
Quando o técnico registra nota 4 em ações defensivas e texto em tática
Então isso vira a leitura inicial, a marca "pendente" some, e o próximo registro vira observação

Dado um goleiro com leitura inicial de 01/03 com nota 3 em tática e uma observação de 10/05 com nota 4 em tática
Quando a ficha é aberta
Então tática mostra 4/5 de 10/05, e o histórico mostra "2 leituras nesta área"

Dado 10 goleiros, 3 deles com liga "Superliga" e 1 desses visto há 8 meses
Quando o técnico filtra liga "Superliga" e "visto há até 6 meses"
Então aparecem 2 goleiros e o contador mostra "2 de 10"

Dado um acervo exportado em .json
Quando o técnico importa o arquivo em outra conta e confirma
Então os goleiros do arquivo aparecem e são gravados na nuvem dessa conta

Dado o acervo com 50 goleiros já gravados
Quando o técnico altera a prioridade de um deles
Então o update enviado contém só esse goleiro
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Anotação, ficha, leituras, áreas, cartões, filtros, gravação, apagar (RF-01..06, 10, 12) | Must | É o trabalho de observação |
| Ajustes, `.json`, indicador (RF-08, 09, 11) | Should | Organização e cópia própria |
| Mapa (RF-07) | Could | Visão de conjunto |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `mod_scouting.html` | marcação: barra (Goleiros, Mapa, Ajustes), faixa de contexto (`:1-120`) | 🟢 |
| `mod_scouting.html` | `AREAS`, `CHAVE`, `DB`, `filtros` (`:129-139`) | 🟢 |
| `mod_scouting.html` | persistência: `carregar`, `salvar`, `agendarSubida`, `subirTudo`, `apagarNaNuvem` (`:157-202`) | 🟢 |
| `mod_scouting.html` | contexto e login: `carregaSDK`, listener de `message` (`:205-242`), `aplicarIdentidade` (`:258`), `ligarListener` (`:298`) | 🟢 |
| `mod_scouting.html` | regras: `idade`, `faixaIdade`, `areaAtual`, `historicoArea`, `vistoEm`, `mesesDesde`, `pendente`, `opcoes`, `filtrados` (`:368-452`) | 🟢 |
| `mod_scouting.html` | telas: `telaLista`, `cartao`, `telaFicha`, `blocoArea`, `formObs`, `telaMapa`, `telaAjustes` (`:473-752`) | 🟢 |
| `mod_scouting.html` | eventos: `ligarEventos` (`:757`), `ligarEstrelas` (`:904`) | 🟢 |
| `index.html` | cartão do módulo (`:355`), `MOD_FILES.scouting` (`:360`) | 🟢 |
