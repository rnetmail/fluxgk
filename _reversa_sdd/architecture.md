# Arquitetura — FluxGK

> Architect do Reversa, 2026-10-13. Diagramas em `c4-context.md`, `c4-containers.md`, `c4-components.md` e
> `erd-complete.md`; impacto em `traceability/spec-impact-matrix.md`.

## Estilo

**Cliente gordo, servidor fino.** Toda regra de negócio roda no navegador, em 12 páginas HTML autocontidas sem
build. O servidor (PocketBase) autentica, isola por dono e guarda uma árvore JSON num SQLite. Os módulos são
mini-apps em iframe, coordenados por um hub via `postMessage`. 🟢

## Camadas

| Camada | Onde | Faz | Não faz |
|---|---|---|---|
| Apresentação + domínio | `index.html`, `mod_*.html` | telas, cálculos (UA, ACWR, xG, minutagem), relatórios | — |
| Acesso a dados | `fluxdb` | traduz chamadas Firebase para REST/SSE do PocketBase | cache, fila, transação |
| Resiliência local | cada módulo | cópia no `localStorage`, filas | regra comum de conflito |
| Persistência | PocketBase + SQLite | auth, regras `owner`, armazenamento | validação de domínio, consultas |
| Borda | nginx da stack + Hestia | TLS, estáticos, proxy, IP real, gzip | cache de HTML |

## Integrações

| Integração | Direção | Protocolo / formato | Confiança |
|---|---|---|---|
| PocketBase REST (`/api/collections/{users,nodes}/…`) | navegador → servidor | HTTPS + JSON, token no header | 🟢 |
| PocketBase realtime (`/api/realtime`) | servidor → navegador | SSE; o evento traz o **registro inteiro** | 🟢 |
| `/api/health` | navegador → servidor | GET a cada 20 s por página | 🟢 |
| Painel `/_/` | administrador | HTML do PocketBase | 🟢 |
| `postMessage` hub ↔ módulos | iframe ↔ pai | `FLUXGK_CONTEXT`, `FLUXGK_MODULE_READY`, `FLUXGK_STAT_UPDATE`, `FLUXGK_VIDEO_MAXIMIZE`; destino `'*'` | 🟢 |
| CDNs (Chart.js 4.4.1, pdf-lib 1.17.1, fontkit 1.1.1, jszip 3.10.1, mp4box 0.5.2, Tabler 2.44.0) | navegador | `<script>`/`<link>`; Chart.js e mp4box de dois CDNs | 🟢 |
| File System Access + IndexedDB | navegador ↔ disco local | handles de pasta (Chrome/Edge desktop) | 🟢 |
| Exportação | navegador → arquivo | PDF (pdf-lib), ZIP (jszip), MP4/WebM, JSON | 🟢 |
| E-mail | — | **não há** (decisão) | 🟢 |

## Qualidades

| Atributo | Situação | Confiança |
|---|---|---|
| **Desempenho** | limitado pela quantidade de viagens à rede, não pelo servidor (7 ms, CPU ociosa). **Na extração (fluxdb 1.0):** gravação = 4 viagens; releitura inteira a cada mudança; Load Control reenvia o cache inteiro ao abrir; HTML sem cache | 🟢 medido |
| **Escala de usuários** | o servidor aguenta; o cliente é que pesa. SSE: 2 conexões por técnico com módulo aberto | 🟡 |
| **Escala de dados** | documentos únicos de 5 MB (`xg/games`, `video`); imagens base64 dentro dos dados | 🟢 |
| **Integridade** | sem validação no servidor; conflitos resolvidos de três jeitos diferentes; adversários sobrescritos entre módulos | 🟢 |
| **Segurança** | isolamento forte por `owner`; rate limit; cadastro aberto pela API; `postMessage` sem origem; `/_/` público | 🟢 |
| **Disponibilidade** | um contêiner de cada; sem HML; sem backup registrado | 🟡 |
| **Testabilidade** | só o teste de fumaça do adaptador; páginas sem teste | 🟢 |
| **Offline** | PWA sem service worker: instala, mas não abre offline | 🟢 |

## Dívida técnica (por prioridade)

| # | Dívida | Efeito | Onde |
|---|---|---|---|
| DT-01 | adaptador sem cópia local: 4 viagens por gravação e releitura inteira por mudança — **resolvido na fluxdb 1.1** (`e1dc8c7`) | lentidão que cresce com o uso | `fluxdb` |
| DT-02 | `rtPushAll` reenvia todo o cache ao abrir o Load Control, antes de ler a nuvem | lentidão + desfaz alterações de outro aparelho | `data` |
| DT-03 | três módulos regravam a lista inteira de adversários | perda de adversários e escudos | `stats`, `minutes`, `xg` |
| DT-04 | imagens base64 dentro dos dados (escudo, foto, exercício copiado em cada sessão) | leituras de MB; hub baixa escudos em todo boot | `hub`, `data`, `planner` |
| DT-05 | documentos únicos com teto de 5 MB | o módulo para de salvar quando a temporada cresce | `xg`, `video` |
| DT-06 | cada iframe é um cliente completo (SDK, adaptador, SSE, auth) | conexões e downloads em dobro | todos |
| DT-07 | três elencos de goleiros sem vínculo; goleiro e adversário identificados por nome | relatórios cruzados impossíveis; renomear quebra histórico | `data`, `stats`, `minutes` |
| DT-08 | regras de conflito diferentes por módulo | comportamento imprevisível com dois aparelhos | `data`, `video`, `scouting`, `planner` |
| DT-09 | `?v=<timestamp>` e HTML sem cache | ~440 KB baixados a cada abertura do Video Lab | `hub`, nginx |
| DT-10 | bugs pontuais: notas do pós-treino não salvas; `FB.set` inexistente no xG; descanso contado como sessão; "não lembrar" sem efeito; 429 vira erro genérico; `ServerValue.TIMESTAMP` literal | dado perdido ou mensagem errada | vários |
| DT-11 | sem testes das páginas, sem CI, sem HML — **CI e HML resolvidos em 13/10** (ver `infraestrutura/`); testes das páginas continuam faltando | toda mudança ia direto para produção sem rede de segurança | infra |
| DT-12 | bibliotecas por CDN, Chart.js e mp4box de dois CDNs | dependência externa em tempo de execução | módulos |
| DT-13 | ACWR copiado em 3 lugares, e com janela por datas com treino | divergência futura; número diferente da literatura | `data` |

## Direção recomendada (para o Writer e o ciclo forward)

1. **Adaptador com cópia local** (DT-01): mesma superfície, leitura em memória, 1 requisição por gravação, eco do
   tempo real ignorado, avisos agrupados. Resolve a maior parte da lentidão sem tocar nos módulos.
2. **Load Control lê antes de enviar** e envia só o que mudou, como o `scouting` já faz (DT-02).
3. **Adversários por item** (`opponents/<id>` com `update`), não lista inteira (DT-03).
4. Imagens fora da árvore: arquivos do PocketBase (campo `file`) em vez de base64 (DT-04, DT-05). Exige migração de dados.
5. HML real e teste de fumaça por página antes de produção (DT-11).

🟡 Os itens 1–3 cabem no código atual. O item 4 muda o modelo de dados e precisa de decisão humana.
