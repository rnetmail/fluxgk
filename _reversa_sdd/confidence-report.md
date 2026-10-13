# Relatório de Confiança — FluxGK

> Gerado pelo Reviewer em 13/10/2026. Extração #1, nível completo, organização por módulo. Revisão cruzada: não
> (o plugin do Codex não estava ativo). Contagem: marcas 🟢/🟡/🔴 nos arquivos de cada unit.

## Resumo Geral

| Nível | Quantidade | Percentual |
|-------|-----------|------------|
| 🟢 CONFIRMADO | 1273 | 93.7% |
| 🟡 INFERIDO   | 58 | 4.3% |
| 🔴 LACUNA     | 27 | 2.0% |
| **Total**     | 1358 | 100% |

**Confiança geral:** 95.9% (🟢 + metade dos 🟡). Antes da revisão: 1.236 🟢 · 82 🟡 · 53 🔴 (93,1%).

## Por Spec

| Spec | 🟢 | 🟡 | 🔴 | Confiança |
|------|----|----|-----|-----------|
| `controle-de-carga/` | 74 | 7 | 7 | 88.1% |
| `xg/` | 75 | 3 | 8 | 89.0% |
| `estatistica/` | 74 | 3 | 4 | 93.2% |
| `minutagem/` | 66 | 4 | 2 | 94.4% |
| `infraestrutura/` | 124 | 8 | 3 | 94.8% |
| `planejamento/` | 88 | 5 | 2 | 95.3% |
| `video/` | 110 | 7 | 0 | 97.0% |
| `adaptador-fluxdb/` | 146 | 6 | 1 | 97.4% |
| `hub/` | 97 | 4 | 0 | 98.0% |
| `periodizacao/` | 73 | 3 | 0 | 98.0% |
| `perfil/` | 78 | 3 | 0 | 98.1% |
| `traducao/` | 79 | 2 | 0 | 98.8% |
| `scouting/` | 101 | 2 | 0 | 99.0% |
| `tatica-3d/` | 88 | 1 | 0 | 99.4% |

## O que a revisão fez

1. **Specs desatualizadas pelo próprio dia de trabalho:** `adaptador-fluxdb/` reescrito para a fluxdb 1.1 (cópia local);
   `infraestrutura/` com stacks do Git no Portainer, HML, CI/CD, versão `1.<ano>.<seq>` e rotas de versão;
   `hub/` com a tela Configurações → Versões; `openapi/` com as duas rotas novas; contagem de chaves da `traducao/`;
   notas em `architecture.md` (DT-01, DT-11), ADR 007, `code-analysis.md` e no fluxograma do `fluxdb` (1.0).
2. **Referências de linha:** um verificador automático conferiu cada `função (:linha)` contra o código. 70 referências
   ao `index.html` estavam deslocadas pelas mudanças do dia e foram remapeadas por diff linha a linha; 1 referência errada
   no Scouting foi corrigida. Os 9 avisos que restam são falsos positivos (trecho dentro da função citada, mais de 12
   linhas abaixo do início).
3. **🟡 → 🟢 com evidência no código:** colisão de `slug` de clube (`hub`), `_ss.clubName` inexistente (`planejamento`),
   `gkId` que troca só espaços (`minutagem`), ausência de validação de datas (`periodizacao`, 2), ficha presa à temporada
   (`perfil`, 2), imagem JPEG no exercício (`tatica-3d`), teto de 5 MB (`video`), `PB_ARCH` fixo (`infraestrutura`),
   `Snapshot.ref` (`adaptador-fluxdb`).
4. **🔴 → 🟢 por investigação:** versão do SDK do PocketBase = **0.22.1** (arquivo idêntico ao do npm). Servidor 0.40.5:
   registrado como risco 🟡 e tarefa T-22 do adaptador.
5. **🔴/🟡 → 🟢 pelo dono:** 21 perguntas respondidas ("aceito recomendações") → decisões D-11 a D-31 em `domain.md`;
   26 tarefas reclassificadas e as seções de lacunas das units apontam a decisão que as resolve.

## Lacunas Pendentes 🔴

**Abertas (dependem de alguém):**
- **Volume real de uma conta** (`adaptador-fluxdb/`, D-07) — desconhecido; define até onde a cópia local completa por página aguenta e se os tetos de 5 MB são um problema real. Medir em produção.
- **Consumidor da API pública e do MCP** (`infraestrutura/` T-21, D-31) — a forma depende de quem consome.
- **Lista vazia na nuvem da Estatística** (`estatistica/`) — "esvaziada" ou "nunca configurada"? Não entrou nas perguntas de 13/10.
- **Pagamento e planos** (`infraestrutura/` T-22, D-09) — a desenhar.

**Defeitos confirmados no código, marcados 🔴 por contrariarem o comportamento esperado** (todos já têm tarefa de correção):
- `xg/` (8): cópia local sem escopo, lista vazia não chega à nuvem, adversários em formato próprio, `FB.set` inexistente.
- `controle-de-carga/` (7): `rtPushAll` antes de ler, foto e status apagados, exclusões de outro aparelho não chegam, descanso/falta como sessão.
- `estatistica/` (4) e `minutagem/` (2): jogo ao vivo só na memória; adversários regravados sem escudo.
- `planejamento/` (2): anotações do pós-treino não são gravadas (D-02 manda gravar).

## Recomendações

1. **Corrigir primeiro o que perde dado:** adversários compartilhados (D-17, três módulos juntos), `rtPushAll` do Load Control,
   jogo ao vivo da Estatística (D-16), anotações do pós-treino (D-02) e o backup automático (D-29).
2. **Medir o volume de uma conta real** antes de decidir os formatos de nuvem (D-07, D-15, D-14).
3. **Atualizar o SDK do PocketBase** para a linha do servidor (adaptador T-22), com a fumaça de 41 verificações como rede.
4. Toda correção entra por `develop` (HML) e chega a PRD pela tela de versões do admin.
