# Scouting, Design Técnico

## Interface

### Organização do arquivo 🟢
| Bloco | Linhas | Papel |
|---|---|---|
| cabeçalho: `fluxgk-i18n.js`, fontes locais, CSS com variáveis (`--ink`, `--accent`, `--green`, `--red`, `--amber`) | 1–99 | |
| barra (marca, abas Goleiros/Mapa/Ajustes, ponto de sincronização, contador), faixa de contexto, `#app`, `#toast` | 100–119 | |
| comentário de abertura ("protótipo isolado", desatualizado) | 122–127 | |
| constantes e estado (`AREAS`, `CHAVE`, `DB`, `pagina`, `abertoId`, `filtros`) | 129–139 | |
| persistência | 141–202 | |
| contexto do hub, SDK, login | 204–242 | |
| identidade visual do clube ativo | 244–294 | |
| listener da nuvem | 296–324 | |
| utilidades e regras derivadas | 326–452 | |
| telas | 454–752 | |
| eventos | 754–921 | |
| partida: `carregar(); render();` | 923–924 | |

Sem framework: cada `render()` refaz `#app.innerHTML` inteiro e religa os eventos.

### Modelo de dados 🟢
```jsonc
// users/<uid>/scouting
{
  "goalkeepers": {
    "<id>": {                                   // id = 'g' + base36(agora) + 4 aleatórios
      "id": "g…", "nome": "string", "nomeAlt": "string",
      "clube": "string", "liga": "string",
      "anoNasc": 2001,                          // número ou null
      "nacionalidade": ["string"], "etiquetas": ["string"],
      "pe": "D | E | ''", "altura": "ate185 | 185a190 | mais190 | ''",
      "selecao": true,                          // true, false ou ausente (não informado)
      "prioridade": "alta | media | baixa | ''",
      "foto": "data:image/jpeg;base64,…",      // ≤ 240 px, q 0,72; ausente sem foto
      "links": [{ "titulo": "string", "url": "string" }],
      "notasGerais": "string",
      "criadoEm": "AAAA-MM-DD",
      "leitura": {                              // ausente enquanto pendente
        "data": "AAAA-MM-DD", "adversario": "string",
        "defensivas":     { "texto": "string", "nota": 1 },   // nota 1..5 ou null
        "ofensivas":      { … }, "comportamental": { … }, "tatica": { … }, "adaptabilidade": { … }
      },
      "atualizacoes": [
        { "data": "AAAA-MM-DD", "adversario": "string", "areas": { "<area>": { "texto": "…", "nota": 3 } } }
      ]
    }
  },
  "config": { "ligas": ["string"], "etiquetas": ["string"], "paises": ["string"] }
}
```
No navegador, `localStorage['fluxgk_scouting_v1'] = { gks: [goleiro…], config }` (lista, não mapa).

Note a assimetria: na leitura inicial as áreas ficam **na raiz** de `leitura`; nas observações, dentro de `areas`.

### Estado 🟢
| Variável | Papel |
|---|---|
| `DB` | `{ gks[], config }` em memória |
| `pagina`, `abertoId` | tela atual (`lista`, `mapa`, `ajustes`) e ficha aberta |
| `filtros` | 10 filtros da lista |
| `_db`, `_uid` | banco do `fluxdb` e técnico |
| `_pronto` | logado e pronto para gravar |
| `_ouvindo` | listener ligado |
| `_erroNuvem` | última falha de leitura |
| `_sincTimer` | espera de 600 ms |
| `_enviado` | `id → JSON` do último envio, e `__config` |

### Indicador de sincronização (`_dot`) 🟢
| Cor | Quando |
|---|---|
| cinza | antes de qualquer contato |
| âmbar `#d97706` | "aguardando conexão" ou "gravando…" |
| verde `#16a34a` | "salvo na nuvem" ou "sincronizado" |
| vermelho `#dc2626` | "sem sessão", erro do SDK, falha de gravação ou de leitura (dica com a mensagem) |

### Telas 🟢
| Tela | Função | Conteúdo |
|---|---|---|
| Goleiros | `telaLista` | título com total e pendentes; "Anotar agora"; busca e 9 filtros; aviso de nuvem ilegível; grade de `cartao` |
| Ficha | `telaFicha` | voltar; nome e apagar; identificação (foto, 11 campos, links); leitura (aviso de pendente, `formObs`, 5 × `blocoArea`); notas gerais |
| Mapa | `telaMapa` | barras por nacionalidade e por liga |
| Ajustes | `telaAjustes` | exportar/importar; listas; situação (totais e caminho na nuvem) |

Campos da ficha usam `data-c="<campo>"` e gravam no `change`; `links` e `anoNasc` redesenham a ficha.

### Gravação (`subirTudo`, `:178`) 🟢
```
para cada goleiro g:   se JSON(g) ≠ _enviado[g.id]  →  upd['goalkeepers/'+g.id] = g
se JSON(config) ≠ _enviado.__config               →  upd['config'] = config
nada mudou → verde e sai
_db.ref('users/<uid>/scouting').update(upd)
   ok    → verde
   falha → _enviado = {} (próxima envia tudo), vermelho
```
`_enviado` é marcado **antes** da resposta. Apagar é à parte: `ref(…/goalkeepers/<id>).remove()`.

## Fluxo Principal
1. Partida: `carregar()` lê `fluxgk_scouting_v1` e `render()` mostra a cópia local; avisa `FLUXGK_MODULE_READY` ao pai.
2. Chega `FLUXGK_CONTEXT` da janela pai: aplica idioma, `uid` e identidade do clube; carrega o SDK e o adaptador se faltarem, inicia o `fluxdb`.
3. `onAuthStateChanged` com usuário: `_pronto = true`, `ligarListener()` e `agendarSubida()`.
4. Listener `on('value')` em `users/<uid>/scouting`: com dados, substitui `DB.gks` e `DB.config` pela nuvem e regrava a cópia local; vazio, envia o que houver no navegador; `render()`.
5. O técnico anota: `qAdd` cria o goleiro no topo com `criadoEm = hoje`, `salvar()` grava no navegador e agenda a subida.
6. Abre a ficha, completa a identificação; cada `change` grava.
7. "+ Nova observação": `formObs` com data (hoje), adversário e as 5 áreas com estrelas (clicar de novo na mesma estrela limpa). Salvar monta `areas` só com o que foi preenchido; pendente → `leitura`, senão → `atualizacoes.push`.
8. 600 ms depois da última edição, `subirTudo` envia só o que mudou.

## Fluxos Alternativos
- **Sem sessão:** vermelho "sem sessão"; edições ficam só no navegador (âmbar "aguardando conexão"). 🟢
- **Leitura negada:** `_ouvindo = false`, aviso na lista e em Ajustes com a mensagem; a lista mostra a cópia local. O listener não é religado. 🟢
- **Gravação falhou:** vermelho; a próxima edição reenvia tudo. 🟢
- **Foto:** clique ou arrastar; só `image/*`; reduzida antes de gravar; "Remover" apaga o campo. 🟢
- **Importar:** valida `gks` em lista, pede confirmação com as duas contagens, substitui `DB` e chama `subirTudo`. 🟢
- **Exportar:** baixa `fluxgk-scouting-<data>.json` com `DB` inteiro. 🟢
- **Busca:** a lista redesenha a cada tecla e devolve o foco e o cursor ao campo. 🟢
- **Aberto fora do hub (sem pai):** aceita contexto de qualquer janela (a checagem só vale com pai); sem contexto, trabalha só no navegador. 🟢

## Dependências
- `adaptador-fluxdb` (`ref().on('value')`, `update`, `remove`, `auth().onAuthStateChanged`), carregado sob demanda de `/static/`. 🟢
- `hub`: contexto (`uid`, `cloudConfig`, `lang`, `club`, `season`, `coach`). 🟢
- `fluxgk-i18n.js` (1 chave). 🟢
- Fontes locais (`/static/fonts/fonts.css`). 🟢
- Nenhuma biblioteca de terceiros. 🟢

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---|---|---|
| Acervo do técnico, fora de clube e temporada | comentário `:142-146`; RN-41 | 🟢 |
| Gravar só o que mudou, num `update` | `subirTudo`, `_enviado` | 🟢 |
| Nuvem como fonte de verdade; navegador só para abrir rápido | comentário `:145-146` | 🟢 |
| Listener só depois do login (senão a inscrição morre em silêncio) | comentário `:296-297` | 🟢 |
| Anotação em 3 campos; leitura completa depois | texto da tela `:490` | 🟢 |
| Observação posterior toca só as áreas que chamaram atenção | `formObs`, `:683` | 🟢 |
| Foto pequena dentro da ficha | comentário `:350-352` | 🟢 |
| Identidade do clube ativo, mesmo com acervo pessoal | comentário `:244-246` | 🟢 |

## Observabilidade
- `console` com prefixo `[scouting]`: cache ilegível ou cheio, contexto incompleto, autenticado, goleiros carregados, nuvem vazia, leitura negada, falhas de gravação e remoção. 🟢
- Ponto de sincronização com dica; contador de goleiros; aba Ajustes mostra caminho na nuvem e último erro. 🟢

## Riscos e Lacunas
- 🟢 **Importar não substitui a nuvem:** a importação troca o navegador e envia por `update`, que não apaga. Goleiros que estavam na nuvem e não estão no arquivo continuam lá e voltam na próxima leitura, apesar da confirmação dizer "substituir".
- 🟢 **Edição sem conexão pode sumir:** quando a leitura da nuvem chega, a lista local é trocada pela da nuvem (RN-14). Goleiro anotado antes do login, ou entre a leitura e a gravação, se perde se a nuvem já tinha dados.
- 🟢 **Mapa perde quem não tem nacionalidade:** `(g.nacionalidade || ['—'])` — lista vazia não é falsa, então o goleiro não entra em nenhum país.
- 🟢 **"Não convocado" inclui "não informado":** o filtro compara `String(!!g.selecao)`.
- 🟢 **Link sem validação:** a url vai para `href` como foi digitada; `javascript:` passa pelo `esc`. Acervo importado de outra pessoa pode trazer link perigoso.
- 🟢 **Leitura negada não volta:** depois de um erro, o listener não religa até recarregar.
- 🟢 Tela e datas em português fixo (ver `traducao`).
- 🟢 Comentário de abertura diz que o módulo não fala com o hub nem com o PocketBase; o código fala com os dois.
- 🟢 Idade aproximada pelo ano; o mesmo goleiro "faz aniversário" em 1º de janeiro.
- 🟢 Fotos em base64 dentro de cada ficha (DT-04): o acervo inteiro é remontado e reentregue a cada mudança pelo `on('value')` na raiz (da cópia local desde a fluxdb 1.1, sem rede, mas cada evento SSE traz a ficha inteira).
- 🟡 Goleiro observado não tem vínculo com o adversário do clube (`clubs/<clubId>/opponents`) nem com os elencos (DT-07): a mesma pessoa pode existir em três lugares.
