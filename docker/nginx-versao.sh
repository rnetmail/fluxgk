#!/bin/sh
# FluxGK · na partida do nginx, grava /versao.json: a versão da imagem (arquivo VERSION do repositório),
# o ambiente da stack (AMBIENTE=prd|hml) e o commit que o Portainer recebeu pelo webhook (GIT_COMMIT).
# O hub mostra isso no rodapé; o CI confere o commit depois de cada deploy.
set -e
V=$(tr -d '[:space:]' < /etc/fluxgk/VERSION 2>/dev/null || echo dev)
A=$(printf '%s' "${AMBIENTE:-prd}" | tr -cd 'a-z0-9-')
C=$(printf '%s' "${GIT_COMMIT:-}" | tr -cd '0-9a-f')
printf '{"versao":"%s","ambiente":"%s","commit":"%s"}\n' "$V" "$A" "$C" > /usr/share/nginx/html/versao.json
echo "[fluxgk] versão $V · ambiente $A · commit ${C:-?}"
