# Infraestrutura, Contratos

> Contrato HTTP da stack vista de fora: o que o Hestia entrega ao nginx do contêiner e o que o nginx responde ou
> repassa ao PocketBase. A superfície que o app usa dentro de `/api/` (coleções `users` e `nodes`, tempo real) está
> em `../adaptador-fluxdb/contracts.md` e em `../openapi/pocketbase-fluxgk.yaml`. Conferido contra a stack de
> produção (`127.0.0.1:3010`) em 13/10.

## 1. Entrada 🟢

| Item | Valor |
|---|---|
| Domínio | `fluxgk.rstecbr.com.br` (PRD); `hml.fluxgk.rstecbr.com.br` (HML, no ar desde 13/10) |
| TLS | no Hestia; o contêiner fala HTTP |
| Porta no host | `127.0.0.1:${PORTA_HTTP}` (PRD 3010, HML 3011) |
| Cabeçalhos que o Hestia acrescenta | `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`, `Upgrade`, `Connection: upgrade` |
| Tempo máximo no Hestia | 300 s de conexão, envio e leitura |
| Tamanho máximo | 1.024 MB no Hestia; 512 MB no contêiner |

## 2. Rotas 🟢

| Método | Rota | Resposta | Tipo | Cache | Observação |
|---|---|---|---|---|---|
| GET | `/health` | `200 healthy\n` | `text/plain` | — | sem log; usado pela verificação de saúde |
| GET | `/versao.json` | `{"versao":"1.<ano>.<seq>","ambiente":"prd\|hml","build":"<12 hex>"}` | `application/json` | `no-cache, no-store, must-revalidate` | escrito na partida do nginx |
| GET | `/api/fluxgk/versoes` | painel de versões (ver `../openapi/pocketbase-fluxgk.yaml`) | JSON | — | `pb_hooks`; 401 sem login, 403 se não for admin |
| POST | `/api/fluxgk/versoes/implantar` | `202 {ok, acao, versao}` ou `409 {message}` | JSON | — | só admin; só com `AMBIENTE=prd` e `GH_TOKEN_IMPLANTAR` |
| GET | `/api/health` | `200` JSON do PocketBase | `application/json` | — | repassado |
| GET | `/api/realtime` | fluxo SSE | `text/event-stream` | `no-store` (do PocketBase) | sem buffer no contêiner; 24 h de leitura |
| POST | `/api/realtime` | `204` | — | — | inscrição nos tópicos (`clientId` + `subscriptions`) |
| * | `/api/*` | do PocketBase | JSON | — | 300 s; `Upgrade` repassado |
| GET | `/_/` e abaixo | painel do PocketBase | `text/html` | — | público; login do superusuário |
| GET | `/static/fonts/*` | arquivo | `font/woff2`, `text/css` | `public, max-age=31536000, immutable` | |
| GET | `/static/pocketbase-adapter.js` | arquivo | `application/javascript` | `no-cache` | revalida por ETag |
| GET | `/static/vendor/*` | three.js, GLTFLoader, SkeletonUtils, SDK do PocketBase | `application/javascript` | padrão (ETag) | |
| GET | `/manifest.webmanifest`, `/manifest.json`, `/sw.js` | arquivo | `application/octet-stream` (webmanifest) | `no-cache, no-store, must-revalidate` | `Service-Worker-Allowed: /`; `sw.js` não existe |
| GET | `/`, `/index.html`, `/mod_*.html`, `/tatica3d.html` | arquivo | `text/html` | padrão (ETag + `Last-Modified`) | não é SPA |
| GET | `/ferramentas/diagnostico.html` | arquivo | `text/html` | padrão | diagnóstico de dados locais |
| GET | `/icons/*`, `/assets/*`, `/favicon.png`, `/icone-*.png`, `/fluxgk-i18n.js` | arquivo | pelo `mime.types` | padrão | `.glb` em `assets/` |
| GET | qualquer outra | `404` | `text/html` | — | `try_files $uri $uri/ =404` |

## 3. Cabeçalhos de resposta 🟢

| Cabeçalho | Onde | Valor |
|---|---|---|
| `X-Content-Type-Options` | todas (nginx) | `nosniff` |
| `Referrer-Policy` | todas (nginx) | `strict-origin-when-cross-origin` |
| `Content-Encoding: gzip` | texto, CSS, JS, JSON, SVG, manifesto, woff2 ≥ 1 KB | |
| `X-Frame-Options: SAMEORIGIN`, `Cross-Origin-Opener-Policy: same-origin`, `X-Xss-Protection` | `/api/*` (do PocketBase) | |

As páginas não têm `X-Frame-Options` nem `Content-Security-Policy`: o hub embute os módulos por iframe da mesma
origem e nada impede outro site de embutir o hub.

## 4. IP do cliente 🟢

```
cliente ─▶ Hestia: X-Forwarded-For: <ip do cliente>        (o que o cliente mandar à esquerda é mantido)
Hestia ─▶ nginx:   conexão de 172.x (gateway do Docker)
nginx:   $remote_addr = primeiro IP não privado da direita para a esquerda do X-Forwarded-For
nginx ─▶ PocketBase: X-Real-IP: $remote_addr
```
Faixas confiáveis: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`. O PocketBase usa esse IP no
limite de tentativas e nos logs.

## 5. Variáveis da stack 🟢

| Variável | Obrigatória | Formato | Efeito de faltar |
|---|---|---|---|
| `PORTA_HTTP` | sim | inteiro, livre no host (não 3000/3001) | compose não sobe |
| `PB_VERSION` | não | `X.Y.Z` de release do PocketBase | usa `0.40.5` |
| `PB_ADMIN_EMAIL` | na prática | e-mail | ninguém entra em `/_/`; aviso no log |
| `PB_ADMIN_PASSWORD` | na prática | texto (mín. do PocketBase) | idem |
| `PB_ENCRYPTION_KEY` | não | 32 caracteres (`openssl rand -hex 16`) | configurações do PocketBase em claro |
| `TZ` | não | fuso IANA | `America/Bahia` |
| `AMBIENTE` | não | `prd` \| `hml` | `prd` (HML **precisa** definir `hml`, senão aceita troca de versão) |
| `FLUXGK_ADMINS` | não | e-mails separados por vírgula | ninguém vê a tela de versões, exceto o superusuário |
| `GH_TOKEN_IMPLANTAR` | só PRD | token fine-grained do GitHub | a tela mostra, mas não troca de versão |

## 6. Verificação de saúde 🟢

| Contêiner | Comando | Intervalo | Tempo | Partida | Tentativas |
|---|---|---|---|---|---|
| pocketbase | `wget -q --spider http://127.0.0.1:8090/api/health` | 30 s | 5 s | 15 s | 5 |
| nginx | `wget -q --spider http://127.0.0.1/health` | 30 s | 5 s | 10 s | 3 |

`/health` responde 200 mesmo com o PocketBase fora: diz que o nginx está de pé, não que o app funciona. Para
saber se o app funciona, use `/api/health`.

## 7. O que o contrato não garante hoje
- 🟢 `POST /api/collections/users/records` está aberto a qualquer um (`createRule = ''`); com corpo vazio responde 400 por validação, não 403.
- 🟢 `manifest.webmanifest` sai como `application/octet-stream`: o `mime.types` do nginx não conhece a extensão. Navegadores aceitam, mas o tipo certo é `application/manifest+json` (e só com ele o gzip configurado se aplica).
- 🟢 Tempo real atravessando o Hestia: o nginx da stack responde `X-Accel-Buffering: no` no `/api/realtime` (desde 13/10; antes o Hestia segurava o SSE em buffer). Leitura de 300 s no Hestia: reconexão depois de 5 min parado.
