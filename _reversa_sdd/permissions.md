# Permissões — FluxGK

> Detective, 2026-10-13. Não há papéis dentro do app: cada conta é um técnico isolado.

## Papéis

| Papel | Como existe | Onde entra |
|---|---|---|
| **Técnico** | registro em `users` | app (`index.html`) |
| **Superusuário** | `_superusers` do PocketBase, recriado a cada início do contêiner com `PB_ADMIN_EMAIL`/`PB_ADMIN_PASSWORD` | painel `/_/` |
| **Visitante** | sem login | só a tela de login e os arquivos estáticos |

## Matriz

| Recurso | Visitante | Técnico | Superusuário |
|---|---|---|---|
| Arquivos do site (HTML, JS, fontes, modelos 3D) | ler | ler | ler |
| `users` — criar conta | 🟢 **sim, pela API** (`createRule = ''`); a interface não oferece | — | sim |
| `users` — ver / editar / apagar | não | só a própria | todas |
| `nodes` — listar / ver / criar / editar / apagar | não | só onde `owner` = ele | todos |
| Redefinir senha de técnico | não | não (sem e-mail) | sim, no `/_/` |
| Configurações do PocketBase (URL, proxy, rate limit) | não | não | sim |
| Painel `/_/` | tela de login exposta publicamente | idem | sim |

## Observações
- 🟢 O isolamento depende só das regras do PocketBase; o cliente monta os caminhos (`users/<uid>/…`), mas o servidor
  ignora o `<uid>` do caminho e confere `owner`. Um técnico que forjar o caminho de outro grava **na própria** conta.
- 🟢 Não há compartilhamento: dois técnicos do mesmo clube não veem os dados um do outro, nem um auxiliar vê os do principal.
- 🟢 Rate limiting por IP desde 13/10: login 20/min, cadastro 10/min, API 600 por 10 s.
- 🟡 O painel `/_/` fica acessível publicamente pelo domínio (proxy do nginx). Protegido só pela senha do superusuário.
- 🟡 O `postMessage` sem verificação de origem permite que outro site, embutindo `mod_data` ou `mod_video`, induza
  gravações na conta de quem estiver logado (ver `code-analysis.md`).
