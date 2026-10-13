# Infraestrutura, Tarefas de Implementação

> Atualizado em 13/10/2026: T-12, T-13 e TM-02 feitas na esteira HML → PRD; T-23 a T-25 novas.

## Pré-requisitos
- [ ] VPS com Docker e Compose v2; Hestia com o domínio `fluxgk.rstecbr.com.br` (e `hml.` para T-12)
- [ ] Acesso de saída ao GitHub releases e ao Docker Hub na construção
- [ ] Variáveis da stack definidas (`PORTA_HTTP`, `PB_ADMIN_*`, `PB_ENCRYPTION_KEY`)
- [ ] **Decisão sobre o destino do backup** (Lacunas Pendentes): define T-11

## Tarefas

### Paridade com o legado

- [ ] T-01, Compose com `pocketbase` e `nginx`, rede `interna`, volume `pb_data`, nginx só em `127.0.0.1:${PORTA_HTTP}`, PocketBase só com `expose`, sem `container_name`, `restart: unless-stopped`, nginx esperando `service_healthy`
  - Origem no legado: `docker-compose.yml`
  - Critério de pronto: Critério de Aceitação 1
  - Confiança: 🟢

- [ ] T-02, Imagem do PocketBase pelo binário oficial (`PB_VERSION`, `PB_ARCH`), conferido com `--version`, usuário `pb` (uid 10001), `tzdata`, verificação de saúde em `/api/health`
  - Origem no legado: `Dockerfile.pocketbase`
  - Critério de pronto: `docker compose build pocketbase` com `PB_VERSION=0.40.5` gera imagem que roda como `pb`
  - Confiança: 🟢

- [ ] T-03, Entrada do PocketBase: `superuser upsert` (falha só avisa), `migrate up` (falha derruba), `exec pocketbase "$@"`
  - Origem no legado: `docker/pocketbase-entrypoint.sh`
  - Critério de pronto: Critério de Aceitação 2
  - Confiança: 🟢

- [ ] T-04, Migration inicial: regras de `users` e coleção `nodes` com campos, limites e índices do design
  - Origem no legado: `pb_migrations/1760270000_init_fluxgk.js`
  - Critério de pronto: Critério de Aceitação 3
  - Confiança: 🟢

- [ ] T-05, Imagem do nginx: `default.conf`, cópia arquivo por arquivo das páginas, i18n, manifestos e ícones, `diagnostico.html` em `/ferramentas/`, `icons/`, `static/`, `assets/`; verificação de saúde em `/health`
  - Origem no legado: `Dockerfile.nginx`
  - Critério de pronto: a imagem não contém `_reversa_sdd/`, `.reversa/`, `tools/` nem `README.md`
  - Confiança: 🟢

- [ ] T-06, Rotas do nginx: `/health`, `/api/realtime` (sem buffer, 24 h), `/api/`, `/_/`, arquivos com `try_files … =404`
  - Origem no legado: `nginx/conf.d/default.conf`
  - Critério de pronto: Critério de Aceitação 4
  - Confiança: 🟢

- [ ] T-07, IP real (`set_real_ip_from` das faixas privadas, `X-Forwarded-For`, recursivo) e `X-Real-IP` para o PocketBase
  - Origem no legado: `default.conf`; commit `a998f07`
  - Critério de pronto: Critério de Aceitação 5
  - Confiança: 🟢

- [ ] T-08, Cabeçalhos de segurança, gzip, cache das fontes, revalidação do adaptador, manifestos sem cache, limite de envio
  - Origem no legado: `default.conf`
  - Critério de pronto: `curl -I` mostra `nosniff`, `Referrer-Policy` e `Cache-Control` certos em cada rota
  - Confiança: 🟢

- [ ] T-09, Teste de fumaça do adaptador contra PocketBase real
  - Origem no legado: `tools/smoke-adapter.mjs`
  - Critério de pronto: todas as verificações passam contra a stack local
  - Confiança: 🟢

### Correções

- [ ] T-10, Fechar o cadastro aberto (D-09): `users.createRule = null` numa migration nova; contas criadas pelo superusuário até existir a tela de cadastro do administrador
  - Origem no legado: `users.createRule = ''` (migration `:23`)
  - Critério de pronto: `POST /api/collections/users/records` sem superusuário responde 400/403
  - Confiança: 🟢

- [ ] T-11, Backup diário do `pb_data`: `pocketbase` em modo de cópia consistente (`/api/backups` ou `sqlite3 .backup`), guardado fora do volume e fora da VPS, com retenção e um teste de restauração por mês
  - Origem no legado: inexistente (ADR 007, lacuna)
  - Critério de pronto: restaurar o backup de ontem numa stack descartável mostra as contas e os nós de ontem
  - Confiança: 🟢 (D-29: cópia diária fora da VPS — armazenamento de objetos ou Google Drive —, 30 dias)

- [x] T-12, HML de verdade: `develop` com remoto, stack `fluxgk-hml` na 3011 com volume próprio, domínio `hml.` no Hestia — **feito em 13/10:** stacks `fluxgk-hml` (develop, 3011) e `fluxgk` (main, 3010) no Portainer, domínio `hml.` no Hestia (`app-3011`), volumes separados
  - Origem no legado: `.env.example` e comentário do compose (desenho previsto, não executado)
  - Critério de pronto: Critério de Aceitação 6
  - Confiança: 🟢

- [x] T-13, Subir a partir de commit, não da árvore de trabalho: Portainer puxando o branch da stack (ou `git worktree` limpo por versão), com `/health` e o teste de fumaça antes de trocar — **feito em 13/10:** as duas stacks vêm do Git pelo Portainer; deploy por webhook depois do CI (`ci.yml`) ou do `implantar`
  - Origem no legado: stack de PRD com `working_dir` na árvore do repositório
  - Critério de pronto: alteração não commitada no repositório não aparece em produção depois de um `up --build`
  - Confiança: 🟢

- [ ] T-14, Senha do superusuário sem sobrescrita silenciosa: `upsert` só quando o superusuário não existe, ou só com `PB_ADMIN_FORCE=1`
  - Origem no legado: `pocketbase-entrypoint.sh` (`upsert` a cada início)
  - Critério de pronto: trocar a senha no painel e reiniciar mantém a senha nova
  - Confiança: 🟡 (hoje a variável é a única forma de recuperar o acesso; com a mudança, a recuperação precisa de passo documentado)

- [ ] T-15, Painel `/_/` restrito: `allow` por IP do dono ou autenticação básica no nginx, além da senha do PocketBase
  - Origem no legado: `location /_/` em `default.conf`
  - Critério de pronto: `/_/` de um IP fora da lista responde 403
  - Confiança: 🟢 (D-30: o IP varia; autenticação extra no nginx na frente do `/_/`)

- [ ] T-16, `/api/realtime` no Hestia: rota própria sem buffer e com tempo de leitura longo, igual ao nginx do contêiner
  - Origem no legado: `nginx.ssl.conf` do Hestia (300 s, buffer padrão)
  - Critério de pronto: aba parada 15 minutos recebe a gravação de outro aparelho sem recarregar e sem reconexão no log
  - Confiança: 🟡 (efeito real não medido)

- [ ] T-17, `PB_ENCRYPTION_KEY` obrigatória em PRD e HML: a entrada recusa subir sem ela quando `APP_ENV` for `prd` ou `hml`
  - Origem no legado: `.env.example` com a chave vazia
  - Critério de pronto: stack de PRD sem a chave não sobe e diz por quê
  - Confiança: 🟢

- [ ] T-18, Limpeza: um manifesto só (`manifest.webmanifest`), tirar `sw.js` da regra se não houver service worker, apagar `CNAME`, `down` da migration devolvendo as regras de `users`
  - Origem no legado: `manifest.json`, `default.conf`, `CNAME`, migration (`down`)
  - Critério de pronto: nenhum arquivo servido sem uso; `migrate down` deixa `users` como estava
  - Confiança: 🟢

- [ ] T-19, Cache do HTML por ETag (`no-cache`) no lugar de `?v=<timestamp>` (DT-09)
  - Origem no legado: hub abrindo módulos com `?v=`; `default.conf` sem regra para HTML
  - Critério de pronto: abrir o Video Lab duas vezes sem mudança baixa o HTML só na primeira (304 na segunda)
  - Confiança: 🟢

- [ ] T-20, Bibliotecas de CDN servidas pelo próprio nginx (Chart.js, mp4box) (DT-12)
  - Origem no legado: módulos com `<script src="https://cdn…">`
  - Critério de pronto: com saída para a internet bloqueada no navegador, exceto o domínio, todos os módulos abrem
  - Confiança: 🟢

### Evolução decidida pelo dono

- [ ] T-21, API pública e servidor MCP (D-05): rotas próprias no PocketBase (hooks JS) ou serviço à parte na stack, repassado pelo nginx em `/api/v1/` e `/mcp`
  - Origem no legado: inexistente
  - Critério de pronto: `/api/v1/` documentada em `openapi/` e acessível com chave de API
  - Confiança: 🔴 (D-31: definir primeiro quem consome; a forma depende disso)

- [ ] T-22, Login com conta Google e liberação por plano (D-09, depois): provedor OAuth2 do PocketBase configurado por variável; códigos de ativação numa coleção própria
  - Origem no legado: inexistente
  - Critério de pronto: conta Google com código ativo entra e vê só os módulos do plano
  - Confiança: 🔴 (pagamento e planos a desenhar)

### Esteira (13/10)

- [ ] T-23, Tirar a variável `GIT_COMMIT` das duas stacks do Portainer (sobra da 1ª versão da esteira)
  - Origem no legado: variáveis das stacks `fluxgk` e `fluxgk-hml`
  - Critério de pronto: `PortainerService.ver` não lista `GIT_COMMIT`
  - Confiança: 🟢

- [ ] T-24, Deploy sem queda: recriar só o que mudou (o Portainer CE recria tudo a cada webhook) ou subir o contêiner novo antes de derrubar o velho
  - Origem no legado: webhook das stacks; ~40 s de 500 observados no 1º ciclo do CI
  - Critério de pronto: um push que só muda `.github` não tira HML do ar
  - Confiança: 🟡 (depende do que o Portainer CE permite; alternativa é deploy por `docker compose` com healthcheck)

- [ ] T-25, Atualizar `actions/checkout` e `actions/setup-node` para versões em Node 24 e fixar o runner (`ubuntu-24.04`) antes da migração do `ubuntu-latest` (19/10/2026)
  - Origem no legado: avisos do GitHub nos workflows
  - Critério de pronto: CI sem avisos de depreciação
  - Confiança: 🟢

## Tarefas de Teste

- [ ] TT-01, Stack sobe saudável e só o loopback ouve (Critério 1)
- [ ] TT-02, Reinício reaplica superusuário e migrations (2)
- [ ] TT-03, Técnico não lê nó de outro (3)
- [ ] TT-04, Tempo real atravessa os dois proxies (4)
- [ ] TT-05, Limite de tentativas conta por IP real (5)
- [x] TT-06, PRD e HML com volumes separados (6) — conferido em 13/10
- [ ] TT-07, Cadastro pela API recusado (após T-10)
- [ ] TT-08, Restauração do backup (após T-11)
- [ ] TT-09, Imagem do nginx sem pastas de trabalho (T-05)

## Tarefas de Migração de Dados (se aplicável)

- [x] TM-01, Primeiro backup completo do `fluxgk_pb_data` antes de qualquer outra tarefa desta lista — **feito em 13/10:** backups manuais antes e depois da troca de PRD em `/root/.fluxgk/backups/`
- [x] TM-02, HML nasce com cópia do `pb_data` de PRD (com T-12), com senhas de teste para não expor dados reais a quem só testa — **feito em 13/10:** cópia consistente (`sqlite3 .backup`) de PRD para `fluxgk-hml_pb_data`; senhas de teste não foram trocadas
- [ ] TM-03, Importação do Firebase (D-06), se a exportação for obtida: script que lê o JSON exportado e grava em `nodes` por `owner` e `path`

## Ordem Sugerida
1. TM-01 e T-11: hoje um volume perdido apaga tudo.
2. T-10 e T-17: segurança que não depende de nada.
3. T-12 e T-13 com TT-01 a TT-06: rede de segurança antes de mexer no resto.
4. T-15, T-14 e T-16.
5. T-18 a T-20.
6. T-21 e T-22 quando o desenho de API, MCP, pagamento e planos sair.
7. T-01 a T-09 são o que existe; servem de linha de base para quem reconstruir a stack em outra máquina.

## Lacunas (revisadas em 13/10)

Respostas do dono ao Reviewer em `../questions.md`; decisões D-11 a D-31 em `../domain.md`.

- ✅ Para onde vai o backup (outro servidor, armazenamento de objetos, Google Drive) e por quanto tempo fica? → D-29: cópia diária fora da VPS, 30 dias
- ✅ O painel `/_/` pode ser restrito por IP, ou o dono entra de lugares variados? → D-30: autenticação extra no nginx
- 🔴 API pública e MCP: rotas dentro do PocketBase ou serviço à parte? Quem consome primeiro? → D-31: definir primeiro quem consome — **continua aberta**
