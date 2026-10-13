# Infraestrutura

> Atualizado em 13/10/2026 depois da esteira HML → PRD: stacks gerenciadas no Portainer a partir do Git, HML com
> base própria, CI/CD no GitHub Actions, versão `1.<ano>.<seq>` e troca de versão pela tela do admin.

## Visão Geral
`docker-compose.yml`, `Dockerfile.nginx`, `Dockerfile.pocketbase`, `docker/pocketbase-entrypoint.sh`,
`nginx/conf.d/default.conf`, `pb_migrations/` e `.env.example`. Uma stack de dois contêineres numa VPS: **nginx**
serve as páginas e repassa a API, **PocketBase** guarda contas e dados. O Hestia do host faz o TLS do domínio e
repassa para o nginx pelo loopback. O mesmo compose serve produção e homologação, mudando só as variáveis. As duas stacks são **gerenciadas pelo
Portainer a partir do Git** (`fluxgk` ← `main`, `fluxgk-hml` ← `develop`); o deploy é o webhook de cada stack,
chamado pelo GitHub Actions. 🟢

## Responsabilidades
- Construir as duas imagens a partir do repositório, com versões fixas. 🟢
- Servir o PWA (páginas, ícones, fontes, bibliotecas e modelos 3D) e repassar `/api/`, `/api/realtime` e `/_/` ao PocketBase. 🟢
- Criar as coleções do app por migration e manter o superusuário do painel. 🟢
- Guardar os dados num volume próprio por stack. 🟢
- Entregar o IP real do cliente ao PocketBase, para o limite de tentativas contar por pessoa. 🟢
- Responder à verificação de saúde dos dois contêineres. 🟢
- Publicar a versão no ar (`/versao.json`: versão, ambiente e impressão digital do conteúdo). 🟢
- Verificar todo push e levar `develop` a HML sozinho; levar a PRD só por decisão humana (workflow `implantar`). 🟢
- Expor ao admin, pelo PocketBase (`pb_hooks/`), a lista de versões, o histórico e o pedido de troca. 🟢

## Regras de Negócio
- RN-01 **Nada fica aberto direto na internet:** o nginx liga só em `127.0.0.1:${PORTA_HTTP}`; o PocketBase não publica porta; o único caminho de fora é o Hestia. 🟢
- RN-02 **Um compose, dois ambientes:** produção `fluxgk` (branch `main`, porta 3010, `fluxgk.rstecbr.com.br`, Hestia `app-3010`) e homologação `fluxgk-hml` (branch `develop`, porta 3011, `hml.fluxgk.rstecbr.com.br`, Hestia `app-3011`), as duas stacks do Portainer criadas do Git. Sem `container_name`, para as duas conviverem. As portas 3000 e 3001 são de outro sistema. 🟢
- RN-03 Os dados de cada ambiente ficam no volume `<stack>_pb_data`, que não se mistura com o do outro. A base de HML nasceu, em 13/10, como cópia da de PRD; dali em diante as duas seguem separadas. 🟢
- RN-04 PocketBase vem do **binário oficial** da release do GitHub, versão fixada (`PB_VERSION`, padrão 0.40.5), e roda como usuário sem privilégio (`pb`, uid 10001). 🟢
- RN-05 **A cada início**, o contêiner do PocketBase recria ou atualiza o superusuário com `PB_ADMIN_EMAIL`/`PB_ADMIN_PASSWORD` e aplica as migrations. Sem as variáveis, sobe igual e avisa que ninguém entra no painel. 🟢
- RN-06 **Não há envio de e-mail** (ADR 006): senha esquecida é redefinida pelo superusuário no painel `/_/`. 🟢
- RN-07 A migration inicial cria a coleção `nodes` (`owner`, `path`, `data` json até 5 MB, índice único `owner + path`) e deixa cada usuário ver e alterar só o que é seu; o cadastro de conta fica **aberto** (`createRule = ''`). 🟢
- RN-08 IP real: confia só em faixas privadas e pega, da direita para a esquerda, o primeiro IP de fora do `X-Forwarded-For` (o que o Hestia acrescentou); o PocketBase lê em `X-Real-IP`. 🟢
- RN-09 Cache: fontes por 1 ano; adaptador `fluxdb` sempre revalidado; manifesto e service worker nunca em cache; HTML sem regra própria. 🟢
- RN-10 Envio de até 512 MB por requisição (pensado para vídeo). 🟢
- RN-11 Pastas do Reversa, `tools/` e o `README` não vão para a imagem: o Dockerfile copia arquivo por arquivo. A página de diagnóstico vai para `/ferramentas/diagnostico.html`. 🟢
- RN-12 O nginx só sobe depois que o PocketBase responde saudável. 🟢
- RN-13 **Versão** no formato `1.<ano>.<seq>` (seq de 3 dígitos, recomeça em 001 a cada ano), no arquivo `VERSION`, com tag e GitHub Release de mesmo nome. Primeira: `1.2026.001`. 🟢
- RN-14 **`/versao.json`**, escrito pelo nginx na partida: `{versao, ambiente, build}`. `build` é o sha256 (12 caracteres) de tudo o que a imagem serve; o CI recalcula e só aprova o deploy quando ele aparece no ar. 🟢
- RN-15 **CI em todo push** (`ci.yml`): formato de `VERSION`, sintaxe de todo JavaScript (`tools/checa-paginas.mjs`), compose, construção das imagens, fumaça do adaptador e das rotas de versão contra um PocketBase limpo. Em `develop`, chama o webhook de HML, espera a recriação e exige a impressão digital e duas leituras saudáveis seguidas. 🟢
- RN-16 **PRD só muda pelo workflow `implantar`** (decisão humana): `nova` numera a próxima versão a partir de `develop` com CI verde, grava `VERSION`, cria tag e release e avança `main` por fast-forward; `existente` põe `main` numa versão já publicada (voltar ou avançar). Em seguida, webhook de PRD e espera da versão no ar. 🟢
- RN-17 **Troca pela tela:** o admin (superusuário ou e-mail em `FLUXGK_ADMINS`) pede a troca em Configurações → Versões; o PocketBase (`pb_hooks/`) só dispara o `implantar`, com o token `GH_TOKEN_IMPLANTAR` (fine-grained: Actions write, Contents read, só este repositório). O app nunca fala com o Portainer. Só PRD troca; HML só consulta. 🟢
- RN-18 Voltar de versão volta só o código: migration tem de ser compatível com a versão anterior. 🟢
- RN-19 O webhook do Portainer CE **não** repassa variáveis da URL para a stack, e todo redeploy recria os contêineres, mesmo sem mudança (~40 s fora do ar). 🟢

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | Compose com `pocketbase` e `nginx`, rede interna, volume `pb_data`, porta do host por variável | Must | Critério de Aceitação 1 |
| RF-02 | Imagem do PocketBase pelo binário oficial, versão fixa, usuário sem privilégio, migrations embutidas | Must | `pocketbase --version` na construção |
| RF-03 | Entrada do contêiner: superusuário, migrations, servir | Must | Critério de Aceitação 2 |
| RF-04 | Migration da coleção `nodes` e regras de `users` (RN-07) | Must | Critério de Aceitação 3 |
| RF-05 | nginx servindo as páginas e repassando `/api/`, `/api/realtime` (sem buffer, 24 h) e `/_/` | Must | Critério de Aceitação 4 |
| RF-06 | IP real do cliente (RN-08) | Must | Critério de Aceitação 5 |
| RF-07 | Verificação de saúde: `/health` no nginx e `/api/health` no PocketBase | Must | Contêineres `healthy` |
| RF-08 | Cabeçalhos `nosniff` e `Referrer-Policy`; gzip | Should | Cabeçalhos presentes nas respostas |
| RF-09 | Regras de cache (RN-09) | Should | Adaptador novo chega sem limpar o navegador |
| RF-10 | Segundo ambiente (HML) pelo mesmo compose | Should | Critério de Aceitação 6 |
| RF-11 | Teste de fumaça do adaptador contra um PocketBase real (`tools/smoke-adapter.mjs`) | Should | Passa no CI, 41 verificações |
| RF-12 | `/versao.json` com versão, ambiente e impressão digital; faixa "HML" e versão no rodapé do hub | Must | Critério de Aceitação 7 |
| RF-13 | CI em todo push e deploy automático de `develop` em HML (`ci.yml`) | Must | Critério de Aceitação 8 |
| RF-14 | Workflow `implantar` (nova / existente) com tag, release e espera da versão em PRD | Must | Critério de Aceitação 9 |
| RF-15 | Rotas `GET /api/fluxgk/versoes` e `POST /api/fluxgk/versoes/implantar` (só admin; troca só em PRD) | Must | `tools/smoke-versoes.mjs`, 9 verificações |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Segurança | PocketBase sem porta publicada; nginx só no loopback | `docker-compose.yml` (`expose`, `127.0.0.1:`) | 🟢 |
| Segurança | dados sensíveis do `pb_data` cifrados quando `PB_ENCRYPTION_KEY` existe; hoje é opcional e vazio no exemplo | `docker-compose.yml`, `.env.example` | 🟢 |
| Segurança | painel `/_/` acessível pelo domínio, protegido só pela senha | `location /_/` | 🟢 |
| Disponibilidade | `restart: unless-stopped` e verificação de saúde nos dois | compose, Dockerfiles | 🟢 |
| Disponibilidade | um contêiner de cada, sem réplica; SQLite num volume local | compose | 🟢 |
| Recuperação | nenhuma rotina **automática** de backup do `pb_data`; backups manuais em `/root/.fluxgk/backups/` (13/10) | ADR 007 | 🟢 |
| Segurança | o token guardado no app só dispara workflows deste repositório; o webhook do Portainer só reimplanta a sua stack | `pb_hooks/fluxgk_versoes.js`; secrets do GitHub | 🟢 |
| Disponibilidade | todo deploy derruba o ambiente por ~40 s (recriação dos contêineres) | observado no 1º ciclo do CI (13/10) | 🟢 |
| Reprodutibilidade | versões fixas: nginx 1.27-alpine, alpine 3.20, PocketBase 0.40.5 | Dockerfiles | 🟢 |
| Reprodutibilidade | a construção baixa o binário do GitHub; sem rede, não constrói | `Dockerfile.pocketbase` | 🟢 |
| Operação | fuso `America/Bahia` nos dois contêineres | `TZ` | 🟢 |

> Inferido a partir do código. Validar com equipe de operações.

## Critérios de Aceitação

```gherkin
Dado o repositório e um .env com PORTA_HTTP=3010
Quando o operador roda docker compose up -d --build
Então sobem os contêineres nginx e pocketbase, ambos saudáveis, e só 127.0.0.1:3010 fica ouvindo no host

Dado PB_ADMIN_EMAIL e PB_ADMIN_PASSWORD trocados na stack
Quando o contêiner do PocketBase reinicia
Então o superusuário passa a entrar no /_/ com a senha nova e as migrations pendentes são aplicadas

Dado dois técnicos com conta
Quando o técnico A pede os nós do técnico B pela API
Então a resposta vem vazia, porque a regra exige owner = usuário logado

Dado o app aberto num módulo com tempo real
Quando outro aparelho grava um dado do mesmo técnico
Então o aviso chega pelo /api/realtime sem ser cortado pelo proxy, mesmo após vários minutos parado

Dado dois clientes em casas diferentes atrás do Hestia
Quando um deles erra a senha até o limite
Então só ele é bloqueado, porque o PocketBase vê o IP real de cada um

Dado as stacks fluxgk (3010) e fluxgk-hml (3011) no mesmo Docker
Quando as duas estão no ar
Então cada uma usa o seu próprio volume e nenhuma altera os dados da outra

Dado a stack fluxgk-hml no ar
Quando alguém abre https://hml.fluxgk.rstecbr.com.br/versao.json
Então vê {"versao":"1.2026.00N","ambiente":"hml","build":"<12 hex>"} e o hub mostra a faixa HML

Dado um push em develop que muda index.html
Quando o CI termina verde
Então HML serve exatamente a impressão digital calculada pelo CI para aquele commit

Dado develop à frente de main com CI verde
Quando o admin toca "Atualizar para 1.2026.00N" em produção
Então o workflow implantar cria a tag e a release, main avança e /versao.json de PRD passa a mostrar 1.2026.00N
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Compose, imagens, entrada, migration, proxy, IP real, saúde (RF-01..07) | Must | Sem isso o app não sobe ou não é seguro |
| Cabeçalhos, cache, HML, teste de fumaça (RF-08..11) | Should | Qualidade e rede de segurança antes da produção |
| Versão, CI/CD, troca pela tela (RF-12..15) | Must | Decisão do dono de 13/10: todo trabalho em HML, PRD por decisão humana |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `docker-compose.yml` | serviços `pocketbase` e `nginx`, volume `pb_data`, rede `interna` | 🟢 |
| `Dockerfile.pocketbase` | estágio `fetch` (binário oficial), usuário `pb`, verificação de saúde, entrada | 🟢 |
| `docker/pocketbase-entrypoint.sh` | `superuser upsert`, `migrate up`, `exec pocketbase` | 🟢 |
| `pb_migrations/1760270000_init_fluxgk.js` | regras de `users`, coleção `nodes`, índices | 🟢 |
| `Dockerfile.nginx` | cópia arquivo por arquivo, verificação de saúde | 🟢 |
| `nginx/conf.d/default.conf` | IP real, cabeçalhos, gzip, `/health`, `/api/realtime`, `/api/`, `/_/`, cache | 🟢 |
| `.env.example` | variáveis da stack e portas por ambiente | 🟢 |
| `tools/smoke-adapter.mjs` | teste de fumaça do `fluxdb` contra PocketBase real | 🟢 |
| `/home/rstecbr/conf/web/fluxgk.rstecbr.com.br/nginx*.conf` | proxy do Hestia (fora do repositório) | 🟡 |
| `VERSION`, `docker/nginx-versao.sh` | versão e `/versao.json` (com a impressão digital calculada no `Dockerfile.nginx`) | 🟢 |
| `.github/workflows/ci.yml`, `implantar.yml` | CI, deploy em HML, troca de versão em PRD | 🟢 |
| `pb_hooks/versoes.pb.js`, `pb_hooks/fluxgk_versoes.js` | rotas de versão do admin | 🟢 |
| `tools/checa-paginas.mjs`, `tools/smoke-versoes.mjs` | sintaxe de todo JavaScript; fumaça das rotas de versão | 🟢 |
