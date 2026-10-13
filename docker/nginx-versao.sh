#!/bin/sh
# FluxGK · na partida do nginx, grava /versao.json: a versão da imagem (arquivo VERSION do repositório)
# e o ambiente da stack (AMBIENTE=prd|hml).
# BUILD é a impressão digital do conteúdo da imagem (calculada no Dockerfile): é ela que o CI confere
# depois de cada deploy. O hub mostra versão e ambiente no rodapé.
set -e
V=$(tr -d '[:space:]' < /etc/fluxgk/VERSION 2>/dev/null || echo dev)
A=$(printf '%s' "${AMBIENTE:-prd}" | tr -cd 'a-z0-9-')
B=$(tr -cd '0-9a-f' < /etc/fluxgk/BUILD 2>/dev/null || true)
printf '{"versao":"%s","ambiente":"%s","build":"%s"}\n' "$V" "$A" "$B" > /usr/share/nginx/html/versao.json
echo "[fluxgk] versão $V · ambiente $A · build $B"
