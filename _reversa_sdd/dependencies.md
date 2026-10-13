# Dependências — FluxGK

> Scout, 2026-10-13. Não há gerenciador de pacotes: nenhum `package.json`. As bibliotecas chegam de três
> jeitos: copiadas para `static/vendor/`, por CDN em tempo de execução, ou por imagem Docker.

## Servidor / infraestrutura

| Componente | Versão | Origem | Onde |
|---|---|---|---|
| PocketBase | 0.40.5 | binário oficial do GitHub releases | `Dockerfile.pocketbase` (`PB_VERSION`) |
| Alpine | 3.20 | imagem base do PocketBase | `Dockerfile.pocketbase` |
| nginx | 1.27-alpine | imagem oficial | `Dockerfile.nginx` |
| Docker Compose | v2 (sem `version:`) | — | `docker-compose.yml` |
| Hestia (nginx do host) | — | proxy + TLS do domínio | fora do repositório |

## Navegador — copiadas para o repositório (`static/vendor/`)

| Biblioteca | Versão | Usada por |
|---|---|---|
| PocketBase JS SDK (`pocketbase.umd.js`) | 🔴 LACUNA: o arquivo minificado não expõe a versão | `static/pocketbase-adapter.js` |
| three.js (`three.min.js`) | 🔴 LACUNA: versão não legível no minificado | `tatica3d.html` |
| GLTFLoader.js, SkeletonUtils.js | acompanham o three.js | `tatica3d.html` |

## Navegador — por CDN em tempo de execução

| Biblioteca | Versão | CDN | Usada por |
|---|---|---|---|
| Chart.js | 4.4.1 | cdnjs (2 páginas) e jsDelivr (1) | estatísticas, xG, minutagem |
| mp4box | 0.5.2 | cdnjs e jsDelivr | `mod_video.html` |
| pdf-lib | 1.17.1 | jsDelivr | exportação em PDF |
| @pdf-lib/fontkit | 1.1.1 | jsDelivr | fontes nos PDFs |
| jszip | 3.10.1 | jsDelivr | exportação em lote |
| @tabler/icons-webfont | 2.44.0 | jsDelivr | ícones |
| @fontsource/jetbrains-mono, space-grotesk | 5.3.0 | jsDelivr | fontes embutidas nos PDFs |

🟡 INFERIDO: a mesma biblioteca vem de dois CDNs diferentes conforme a página (Chart.js, mp4box). Uma queda
de CDN derruba só parte das páginas, e o navegador não reaproveita o cache entre as duas origens.

## Ferramentas de desenvolvimento

| Ferramenta | Uso |
|---|---|
| Node 22 | `tools/smoke-adapter.mjs` |
| Python 3 | `tools/gerar-glb.py` |
