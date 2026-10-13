#!/bin/sh
# FluxGK · na partida do nginx, grava /versao.json: a versão da imagem (arquivo VERSION do repositório),
# o ambiente da stack (AMBIENTE=prd|hml) e o commit que o Portainer recebeu pelo webhook (GIT_COMMIT).
# BUILD é a impressão digital do conteúdo da imagem (calculada no Dockerfile): é ela que o CI confere
# depois de cada deploy. O hub mostra versão e ambiente no rodapé.
set -e
V=$(tr -d '[:space:]' < /etc/fluxgk/VERSION 2>/dev/null || echo dev)
A=$(printf '%s' "${AMBIENTE:-prd}" | tr -cd 'a-z0-9-')
C=$(printf '%s' "${GIT_COMMIT:-}" | tr -cd '0-9a-f')
B=$(tr -cd '0-9a-f' < /etc/fluxgk/BUILD 2>/dev/null || true)
printf '{"versao":"%s","ambiente":"%s","build":"%s","commit":"%s"}\n' "$V" "$A" "$B" "$C" > /usr/share/nginx/html/versao.json
echo "[fluxgk] versão $V · ambiente $A · build $B · commit ${C:-?}"
