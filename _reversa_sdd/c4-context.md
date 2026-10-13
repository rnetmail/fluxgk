# C4 — Contexto (nível 1)

> Architect do Reversa, 2026-10-13.

```mermaid
flowchart TB
  coach["👤 Técnico de goleiros<br/>(navegador desktop ou celular)"]
  admin["👤 Administrador<br/>(dono da plataforma)"]
  fluxgk["FluxGK<br/>PWA de treinamento de goleiros de futsal<br/>fluxgk.rstecbr.com.br"]
  cdn["CDNs públicos<br/>cdnjs · jsDelivr<br/>Chart.js, pdf-lib, jszip, mp4box, ícones"]
  disk["Disco do técnico<br/>vídeos de jogos<br/>(File System Access)"]
  yt["YouTube<br/>links de vídeo nos relatórios"]
  gh["GitHub<br/>rnetmail/fluxgk"]

  coach -->|HTTPS: usa o app| fluxgk
  admin -->|HTTPS: painel /_/ (senhas, dados)| fluxgk
  coach -.->|o navegador baixa bibliotecas| cdn
  coach -.->|abre e exporta vídeos localmente| disk
  coach -.->|link no relatório| yt
  admin -.->|código-fonte| gh
```

| Elemento | Papel | Confiança |
|---|---|---|
| Técnico | único tipo de usuário do app; dados isolados por conta | 🟢 |
| Administrador | cria contas, redefine senhas, configura o PocketBase | 🟢 |
| CDNs | dependência em tempo de execução; se caírem, gráficos, PDFs e exportação de vídeo param | 🟢 |
| Disco do técnico | onde os vídeos vivem; o servidor nunca os recebe | 🟢 |
| YouTube | só links digitados pelo técnico (`vid.rel.anLinkPh`) | 🟢 |
| GitHub | repositório; sem CI/CD ligado | 🟢 |
