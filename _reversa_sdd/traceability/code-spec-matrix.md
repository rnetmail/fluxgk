# Matriz Código × Spec — FluxGK

> Writer, 2026-10-13; atualizada no mesmo dia depois da esteira HML → PRD (commits até `1.2026.002`). Cada arquivo do repositório que vai ao ar (ou que constrói o que vai ao ar) aparece com a
> unit que o especifica e o nível de cobertura. Contagem de linhas no commit `e1dc8c7`.
> Legenda: 🟢 coberto por requirements + design + tasks · 🟡 coberto em parte ou desatualizado · 🔴 sem spec.

## 1. Código do app

| Arquivo | Linhas | Unit dona | Também citado em | Cobertura |
|---|---|---|---|---|
| `index.html` | 1.107 | `hub/` (+ `contracts.md`) | `adaptador-fluxdb`, `traducao`, `infraestrutura`, `scouting` | 🟢 |
| `static/pocketbase-adapter.js` | 705 | `adaptador-fluxdb/` (+ `contracts.md`) | `hub`, `planejamento`, `periodizacao`, `infraestrutura`, `openapi` | 🟢 (specs atualizadas para a 1.1) |
| `mod_planner.html` | 2.197 | `planejamento/` | `tatica-3d`, `hub`, `traducao` | 🟢 |
| `mod_periodization.html` | 1.236 | `periodizacao/` | `traducao` | 🟢 |
| `mod_xg.html` | 2.052 | `xg/` | `traducao` | 🟢 |
| `mod_stats.html` | 2.753 | `estatistica/` | `xg` (adversários), `traducao` | 🟢 |
| `mod_minutes.html` | 1.354 | `minutagem/` | `xg` (adversários), `traducao` | 🟢 |
| `mod_data.html` | 2.648 | `controle-de-carga/` (+ `questions.md`) | `hub` (painel), `perfil` (elenco), `traducao` | 🟢 |
| `mod_profile.html` | 5.946 | `perfil/` | `traducao` | 🟢 |
| `mod_scouting.html` | 927 | `scouting/` | `traducao` | 🟢 |
| `mod_video.html` | 9.352 | `video/` | `hub`, `traducao` | 🟢 |
| `tatica3d.html` | 2.156 | `tatica-3d/` | `planejamento`, `traducao` | 🟢 |
| `fluxgk-i18n.js` | 2.277 | `traducao/` | todos os módulos | 🟢 |
| `diagnostico.html` | 156 | — | `infraestrutura` (só a rota `/ferramentas/`) | 🔴 lista o que o navegador guarda (em uso, legado, outro); comportamento não especificado |

## 2. Dados e servidor

| Arquivo | Linhas | Unit dona | Também citado em | Cobertura |
|---|---|---|---|---|
| `pb_hooks/versoes.pb.js` | 29 | `infraestrutura/` | `hub`, `openapi` | 🟢 |
| `pb_hooks/fluxgk_versoes.js` | 188 | `infraestrutura/` | `hub`, `openapi` | 🟢 |
| `pb_hooks/autoavaliacao.pb.js`, `pb_hooks/fluxgk_autoavaliacao.js` | — | `controle-de-carga/` | `infraestrutura`, `openapi` | 🟢 |
| `pb_migrations/1760400000_autoavaliacao_links.js` | — | `controle-de-carga/` | `infraestrutura` | 🟢 |
| `mod_autoavaliacao.html` | — | `controle-de-carga/` | `infraestrutura` | 🟢 |
| `pb_migrations/1760270000_init_fluxgk.js` | 80 | `infraestrutura/` | `adaptador-fluxdb`, `hub`, `openapi` | 🟢 |
| `docker/pocketbase-entrypoint.sh` | 29 | `infraestrutura/` | | 🟢 |
| `nginx/conf.d/default.conf` | 106 | `infraestrutura/` (+ `contracts.md`) | | 🟢 |
| `Dockerfile.nginx` | 23 | `infraestrutura/` | | 🟢 |
| `Dockerfile.pocketbase` | 43 | `infraestrutura/` | | 🟢 |
| `docker-compose.yml` | 63 | `infraestrutura/` | | 🟢 |
| `.env.example` | — | `infraestrutura/` | | 🟢 |
| `VERSION`, `docker/nginx-versao.sh` | — | `infraestrutura/` | `hub` (rodapé) | 🟢 |
| `.github/workflows/ci.yml`, `implantar.yml` | — | `infraestrutura/` | | 🟢 |
| `.gitignore` | — | `infraestrutura/` | | 🟢 |
| proxy do Hestia (`/home/rstecbr/conf/web/fluxgk.rstecbr.com.br/nginx*.conf`, fora do repositório) | — | `infraestrutura/` | | 🟡 lido, não versionado |

## 3. Recursos estáticos

| Arquivo | Unit | Cobertura |
|---|---|---|
| `static/vendor/pocketbase.umd.js` | `adaptador-fluxdb/` | 🟢 (versão do SDK não registrada nas specs) |
| `static/vendor/three.min.js`, `GLTFLoader.js`, `SkeletonUtils.js` | `tatica-3d/` (como dependência) | 🟢 |
| `assets/{goleiro,jogador,adversario}.glb` | `tatica-3d/` | 🟢 |
| `static/fonts/*` + `fonts.css` | `infraestrutura/` (cache), `hub` | 🟢 |
| `manifest.webmanifest`, `manifest.json`, `icons/`, `favicon.png`, `icone-*.png` | `infraestrutura/` | 🟡 dois manifestos; só o `.webmanifest` é usado |
| `CNAME`, `README.md` | `infraestrutura/` (como resto) | 🟢 |

## 4. Ferramentas

| Arquivo | Linhas | Unit | Cobertura |
|---|---|---|---|
| `tools/smoke-adapter.mjs` | 379 | `adaptador-fluxdb/`, `infraestrutura/` | 🟢 |
| `tools/gerar-glb.py` | 241 | `tatica-3d/` | 🟢 |
| `tools/checa-paginas.mjs` | 50 | `infraestrutura/` (CI) | 🟢 |
| `tools/smoke-versoes.mjs` | 59 | `infraestrutura/` (CI) | 🟢 |

## 5. Specs por unit

| Unit | Arquivos | Tarefas (T) | Testes (TT) | Migrações (TM) |
|---|---|---|---|---|
| `hub/` | requirements, design, tasks, contracts | 19 | 7 | 1 |
| `adaptador-fluxdb/` | requirements, design, tasks, contracts | 21 | 9 | 0 |
| `planejamento/` | requirements, design, tasks | 22 | 8 | 1 |
| `periodizacao/` | requirements, design, tasks | 17 | 6 | 1 |
| `xg/` | requirements, design, tasks | 21 | 7 | 3 |
| `estatistica/` | requirements, design, tasks | 19 | 6 | 1 |
| `minutagem/` | requirements, design, tasks | 18 | 7 | 1 |
| `controle-de-carga/` | requirements, design, tasks, questions | 21 | 8 | 2 |
| `perfil/` | requirements, design, tasks | 20 | 9 | 1 |
| `scouting/` | requirements, design, tasks | 23 | 10 | 2 |
| `video/` | requirements, design, tasks | 27 | 11 | 2 |
| `tatica-3d/` | requirements, design, tasks | 23 | 11 | 2 |
| `traducao/` | requirements, design, tasks | 20 | 10 | 2 |
| `infraestrutura/` | requirements, design, tasks, contracts | 25 | 9 | 3 |
| **Total** | **46** | **296** | **118** | **22** |

Globais: `openapi/pocketbase-fluxgk.yaml`; `user-stories/` (entrar-e-escolher-contexto, registrar-treino-e-carga,
registrar-jogo, analisar-video, avaliar-goleiro); esta matriz.

## 6. Caminhos de dados × unit que grava

| Caminho (sob `users/<uid>/`) | Grava | Lê | Spec |
|---|---|---|---|
| `profile`, `active`, `clubs/<id>/meta`, `badge`, `seasons` | hub | hub, módulos (contexto) | `hub/` |
| `clubs/<id>/opponents` | estatística, minutagem, xG (**três escritores**) | os três | `estatistica/`, `minutagem/`, `xg/` |
| `library/exercises` | planejamento | planejamento | `planejamento/` |
| `library/gkCriteria` | perfil | perfil | `perfil/` |
| `scouting` | scouting | scouting | `scouting/` |
| `data/<club>/<season>/planner` | planejamento | planejamento | `planejamento/` |
| `data/<club>/<season>/periodization` | periodização | periodização | `periodizacao/` |
| `data/<club>/<season>/xg…` | xG | xG | `xg/` |
| `data/<club>/<season>/stats` | estatística | estatística | `estatistica/` |
| `data/<club>/<season>/minutes` | minutagem | minutagem, hub (painel) | `minutagem/` |
| `data/<club>/<season>/load` | controle de carga | controle de carga, hub (painel), perfil (elenco) | `controle-de-carga/` |
| `data/<club>/<season>/profile` | perfil | perfil | `perfil/` |
| `data/<club>/<season>/video` | vídeo | vídeo | `video/` |

Árvore completa em `../data-dictionary.md`; impacto cruzado em `./spec-impact-matrix.md`.

## 7. Lacunas de rastreabilidade
- 🔴 `diagnostico.html` sem spec: ferramenta que lista o armazenamento do navegador por categoria. Pequena, mas é a única forma de o técnico ver o que ficou só no aparelho.
- 🟢 ~~`adaptador-fluxdb/` descreve a 1.0~~ — atualizado para a 1.1 em 13/10, antes do Reviewer.
- 🟡 Decisões D-01 a D-10 estão nas units afetadas; não há um índice decisão → tarefa. As tarefas de evolução citam a decisão no título (`(D-0x)`).
- 🟢 Nenhum teste automatizado das páginas existe; os 118 TT são tarefas a construir. Os testes existentes, todos no CI: `tools/smoke-adapter.mjs` (41), `tools/smoke-versoes.mjs` (9) e `tools/checa-paginas.mjs` (sintaxe).
