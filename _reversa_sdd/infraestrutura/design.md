# Infraestrutura, Design Técnico

> Atualizado em 13/10/2026: stacks gerenciadas no Portainer, HML, CI/CD, versão e rotas de versão.

## Interface

### Topologia 🟢
```
navegador ──HTTPS──▶ Hestia (nginx do host, TLS)
                        │ proxy_pass http://127.0.0.1:${PORTA_HTTP}
                        ▼
              ┌──────── stack <nome> ─────────────────────────┐
              │ nginx:80 ──rede `interna`──▶ pocketbase:8090 │
              │   páginas, /static, /assets      SQLite em     │
              │   /api/, /api/realtime, /_/      volume pb_data│
              └────────────────────────────────────────────────┘
```

### Arquivos 🟢
| Arquivo | Papel |
|---|---|
| `docker-compose.yml` | serviços, rede, volume, variáveis |
| `Dockerfile.pocketbase` | 2 estágios: `fetch` baixa e confere o binário; final com `tzdata`, `wget`, usuário `pb` |
| `docker/pocketbase-entrypoint.sh` | superusuário, migrations, `exec pocketbase "$@"` |
| `pb_migrations/1760270000_init_fluxgk.js` | coleção `nodes`, regras de `users` |
| `Dockerfile.nginx` | `nginx:1.27-alpine` + `conf.d` + páginas copiadas uma a uma |
| `nginx/conf.d/default.conf` | servidor único |
| `.env.example` | modelo das variáveis da stack |
| `tools/smoke-adapter.mjs` | teste de fumaça do `fluxdb` (379 linhas) |
| `tools/gerar-glb.py` | gera os `.glb` da Tática 3D (fora da imagem) |
| `VERSION` | versão `1.<ano>.<seq>` (gravada pelo `implantar`) |
| `docker/nginx-versao.sh` | vira `/docker-entrypoint.d/40-fluxgk-versao.sh`; escreve `/versao.json` na partida |
| `pb_hooks/versoes.pb.js`, `pb_hooks/fluxgk_versoes.js` | rotas `/api/fluxgk/versoes*` (tela de versões do admin) |
| `.github/workflows/ci.yml` | CI em todo push; deploy de `develop` em HML |
| `.github/workflows/implantar.yml` | troca de versão em PRD (nova / existente) |
| `tools/checa-paginas.mjs`, `tools/smoke-versoes.mjs` | sintaxe de todo JavaScript; fumaça das rotas de versão |
| `.gitignore` | impede `.env` com senhas no Git |

### Variáveis 🟢
| Variável | Serviço | Obrigatória | Padrão | Uso |
|---|---|---|---|---|
| `PORTA_HTTP` | nginx | sim | — | porta no loopback do host (PRD 3010, HML 3011) |
| `PB_VERSION` | build | não | `0.40.5` | versão do binário |
| `PB_ADMIN_EMAIL` | pocketbase | na prática | — | superusuário |
| `PB_ADMIN_PASSWORD` | pocketbase | na prática | — | superusuário |
| `PB_ENCRYPTION_KEY` | pocketbase | não | vazio | cifra configurações sensíveis do `pb_data` (32 caracteres) |
| `TZ` | ambos | não | `America/Bahia` | fuso |
| `AMBIENTE` | ambos | não | `prd` | `prd` ou `hml`: vai para `/versao.json` e decide se a troca de versão é permitida |
| `FLUXGK_ADMINS` | pocketbase | não | vazio | e-mails dos admins da tela de versões |
| `GH_TOKEN_IMPLANTAR` | pocketbase | só em PRD | vazio | token fine-grained que dispara o `implantar` |
| `GIT_COMMIT` | — | — | — | resto da 1ª versão da esteira, ainda presente nas duas stacks do Portainer; não é usado |

### Serviços 🟢
| | pocketbase | nginx |
|---|---|---|
| Porta | `expose: 8090` (só na rede interna) | `127.0.0.1:${PORTA_HTTP}:80` |
| Volume | `pb_data:/pb/pb_data` | — |
| Saúde | `wget /api/health` a cada 30 s, 5 tentativas, 15 s de partida | `wget /health` a cada 30 s, 3 tentativas, 10 s de partida |
| Reinício | `unless-stopped` | `unless-stopped` |
| Dependência | — | `pocketbase: service_healthy` |
| Comando | `serve --http=0.0.0.0:8090 --dir=/pb/pb_data --migrationsDir=/pb/pb_migrations --publicDir=/pb/pb_public --hooksDir=/pb/pb_hooks` | `nginx -g 'daemon off;'` (antes, `40-fluxgk-versao.sh`) |

### Rotas do nginx (`default.conf`) 🟢
| Rota | Destino | Detalhe |
|---|---|---|
| `= /health` | resposta fixa `healthy` | sem log |
| `= /versao.json` | arquivo gerado na partida | `application/json`, `no-cache, no-store, must-revalidate` |
| `= /api/realtime` | `pocketbase:8090/api/realtime` | HTTP/1.1, `Connection ""`, sem buffer nem cache, leitura e envio de 24 h |
| `/api/` | `pocketbase:8090/api/` | `Upgrade`/`Connection` repassados, 300 s |
| `/_/` | `pocketbase:8090/_/` | painel do administrador |
| `/static/fonts/` | arquivo | `Cache-Control: public, max-age=31536000, immutable` |
| `= /static/pocketbase-adapter.js` | arquivo | `no-cache` (revalida por ETag) e repete os cabeçalhos de segurança |
| `manifest.webmanifest`, `manifest.json`, `sw.js` | arquivo | `no-cache, no-store, must-revalidate`; `Service-Worker-Allowed: /` |
| `/` | arquivo | `try_files $uri $uri/ =404` (não é SPA) |

Em todo o servidor: `client_max_body_size 512M`, gzip (≥ 1 KB; texto, JS, JSON, SVG, manifesto, woff2),
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `set_real_ip_from` para
127/8, 10/8, 172.16/12, 192.168/16 com `real_ip_header X-Forwarded-For` e `real_ip_recursive on`.

### Hestia (fora do repositório) 🟡
`/home/rstecbr/conf/web/fluxgk.rstecbr.com.br/nginx.ssl.conf`: `location /` → `proxy_pass http://127.0.0.1:3010`,
HTTP/1.1 com `Upgrade`, `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`, tempos de 300 s; bloqueia
arquivos que começam com ponto. `client_max_body_size 1024m` vem do `nginx.conf` do host. Não desliga buffer para
`/api/realtime`.

### Modelo de dados criado pela migration 🟢
| Coleção | Campos | Regras | Índices |
|---|---|---|---|
| `users` (auth padrão) | os do PocketBase | criar: aberto (`''`); listar, ver, alterar, apagar: `id = @request.auth.id` | padrão |
| `nodes` (base) | `owner` (relação com `users`, obrigatório, apaga em cascata, 1), `path` (texto, obrigatório, até 1.024), `data` (json, até 5 MB), `created`, `updated` | as cinco: `owner = @request.auth.id` | único `(owner, path)`; `(path)` |

`down` apaga `nodes` e não devolve as regras antigas de `users`.

### Ambientes 🟢
| | PRD | HML |
|---|---|---|
| Stack no Portainer | `fluxgk` (id 26), criada do Git | `fluxgk-hml`, criada do Git |
| Branch | `main` | `develop` |
| Porta | 3010 | 3011 |
| Domínio / Hestia | `fluxgk.rstecbr.com.br` / `app-3010` | `hml.fluxgk.rstecbr.com.br` / `app-3011` |
| Volume | `fluxgk_pb_data` | `fluxgk-hml_pb_data` (nasceu cópia de PRD em 13/10) |
| Deploy | webhook, só pelo `implantar` | webhook, a cada push verde em `develop` |
| Troca de versão pela tela | sim (com `GH_TOKEN_IMPLANTAR`) | não, só consulta |

Webhooks: secrets `PORTAINER_WEBHOOK_PRD` e `PORTAINER_WEBHOOK_HML` no GitHub, e cópia em `/root/.fluxgk/webhook-*`
(fora do repositório). Variáveis com senha ficam nas stacks do Portainer e em `/root/.fluxgk/fluxgk.env`.

### Impressão digital (`BUILD`) 🟢
No `Dockerfile.nginx`: `find /usr/share/nginx/html /etc/nginx/conf.d /etc/fluxgk /docker-entrypoint.d/40-fluxgk-versao.sh
-type f -exec sha256sum {} + | sort -k2 | sha256sum | cut -c1-12`. É determinística (só conteúdo), então o CI
constrói a mesma imagem, lê `/etc/fluxgk/BUILD` e espera o mesmo valor em `/versao.json` do ambiente.

### Esteira 🟢
```
push em develop ─▶ ci.yml/verificar ─▶ ci.yml/hml ─▶ webhook fluxgk-hml ─▶ Portainer: git pull + build + up
                                         └▶ espera 45 s, BUILD igual e 2 × /api/health

admin em PRD: Configurações → Versões ─▶ POST /api/fluxgk/versoes/implantar (pb_hooks)
   ─▶ GitHub: workflow_dispatch implantar.yml (ref main) ─▶ nova: VERSION + tag + release + main ← develop
                                                         └▶ existente: main ← tag (force)
   ─▶ webhook fluxgk ─▶ espera /versao.json == versão ─▶ a tela recarrega
```
O `implantar` só pode ser disparado estando no branch padrão (`main`). A primeira versão com a tela (`1.2026.002`)
foi levada à mão pelo dono, com o mesmo roteiro.

## Fluxo Principal
1. O operador ajusta o `.env` (ou as variáveis da stack) e roda `docker compose up -d --build` na pasta do repositório.
2. Construção do PocketBase: o estágio `fetch` baixa `pocketbase_<versão>_linux_amd64.zip` da release do GitHub, descompacta e roda `--version`; o estágio final copia o binário, as migrations e a entrada, cria `/pb/pb_data` e `/pb/pb_public` e passa tudo ao usuário `pb`.
3. Construção do nginx: troca o `default.conf`, copia as 11 páginas, o i18n, os manifestos e ícones; `diagnostico.html` vai para `/ferramentas/`; copia `icons/`, `static/` e `assets/`.
4. O PocketBase inicia pela entrada: `superuser upsert` (falha só avisa), `migrate up` (falha derruba o contêiner, por `set -e`), `exec pocketbase serve …`.
5. Quando `/api/health` responde, o nginx sobe e passa a responder `/health`.
6. Requisição do navegador: Hestia (TLS) → nginx do contêiner → arquivo estático ou proxy para o PocketBase com o IP real em `X-Real-IP`.

## Fluxos Alternativos
- **Sem `PB_ADMIN_*`:** sobe; aviso no log; ninguém entra em `/_/`. 🟢
- **`upsert` falhou:** aviso no log e segue. 🟢
- **Migration falhou:** o contêiner sai; o nginx não sobe (espera `service_healthy`). 🟢
- **Sem acesso ao GitHub na construção:** a imagem do PocketBase não constrói; a que já existe continua rodando. 🟢
- **Senha esquecida:** o superusuário entra em `/_/` e redefine na coleção `users` (ADR 006). 🟢
- **Rodar o teste de fumaça:** `PB_URL=http://127.0.0.1:8090 node tools/smoke-adapter.mjs`, com o PocketBase acessível a partir da máquina; cria usuários de teste e confere gravação, leitura, regras e tempo real. 🟢

## Dependências
- Docker com Compose v2 (Portainer previsto, não usado hoje). 🟢
- Hestia: TLS e proxy do domínio. 🟢
- GitHub releases do PocketBase, na construção. 🟢
- Imagens `nginx:1.27-alpine` e `alpine:3.20` do Docker Hub. 🟢

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---|---|---|
| Binário oficial em vez de imagem de terceiros (a imagem citada antes não existia) | comentário em `Dockerfile.pocketbase` | 🟢 |
| Sem `container_name`, para PRD e HML conviverem | comentário em `docker-compose.yml` | 🟢 |
| PocketBase sem porta publicada; painel pelo proxy | comentário em `docker-compose.yml` | 🟢 |
| Superusuário refeito a cada início, sem SMTP | `pocketbase-entrypoint.sh`; ADR 006 | 🟢 |
| Coleção genérica `nodes` com regra por dono | migration; ADR 002 | 🟢 |
| IP real pelo `X-Forwarded-For`, da direita para a esquerda | comentário em `default.conf`; commit `a998f07` | 🟢 |
| Cópia arquivo por arquivo na imagem do nginx | `Dockerfile.nginx` | 🟢 |
| Adaptador sempre revalidado; fontes com cache longo | comentários em `default.conf` | 🟢 |

## Estado Interno
Todo o estado do sistema está no volume `pb_data`: `data.db` (contas e `nodes`), `auxiliary.db` (logs do
PocketBase), `storage/` (arquivos, hoje sem uso) e `types.d.ts`. 🟢

## Observabilidade
- Logs dos contêineres (`docker logs`): entrada com prefixo `[entrypoint]`, acesso do nginx (menos `/health` e fontes). 🟢
- Logs de requisição do PocketBase em `auxiliary.db`, vistos no painel `/_/`. 🟢
- Estado de saúde no Docker. Nenhum alerta para fora. 🟢

## Riscos e Lacunas
- 🟢 **Sem backup automático do `pb_data`:** só os manuais de 13/10 em `/root/.fluxgk/backups/`; um volume apagado ou corrompido perde o que veio depois.
- 🟢 ~~Sem HML e sem esteira~~ — resolvido em 13/10: stacks do Git no Portainer, HML com base própria, CI/CD.
- 🟢 **Todo deploy derruba o ambiente por ~40 s:** o Portainer recria os contêineres a cada webhook, mesmo sem mudança.
- 🟢 **`implantar` com `existente` força `main`** para a tag: commits de `main` que não estão em tag nenhuma se perdem (hoje `main` só recebe releases, então não há).
- 🟢 A variável `GIT_COMMIT` sobrou nas duas stacks do Portainer e não é usada.
- 🟢 **Cadastro aberto** (`createRule = ''`), contra D-09 (só o administrador cria conta por enquanto).
- 🟢 **Painel `/_/` exposto** pelo domínio, protegido só pela senha do superusuário.
- 🟢 **`PB_ADMIN_PASSWORD` reaplicada a cada início:** quem trocar a senha pelo painel a perde no próximo reinício.
- 🟢 **`down` da migration incompleto:** não devolve as regras de `users`.
- 🟢 Regras de cache para `sw.js` sem service worker no app; dois manifestos (`manifest.json` com ícones de `icons/` e retrato fixo; `manifest.webmanifest`, o que as páginas usam).
- 🟢 HTML sem regra de cache e com `?v=<timestamp>` nos módulos (DT-09).
- 🟢 `CNAME` com `fluxgk.com` é resto do GitHub Pages; não tem efeito na stack.
- 🟡 **Hestia com 300 s de leitura e buffer ligado** na frente do `/api/realtime`: o nginx do contêiner segura 24 h, mas o Hestia corta antes. Se o PocketBase mandar `X-Accel-Buffering: no` e o SDK reconectar, o efeito é só reconexão a cada 5 min parado; não medido.
- 🟡 Limite de envio de 512 MB pensado para vídeo, mas os vídeos ficam no computador (ADR 005); nenhuma rota recebe arquivo hoje.
- 🟢 Construção só para `linux_amd64` (`ARG PB_ARCH=linux_amd64` no `Dockerfile.pocketbase`).
