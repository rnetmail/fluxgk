#!/bin/sh
# FluxGK · entrada do contêiner do PocketBase.
#
# Faz duas coisas antes de servir:
#  1. cria/atualiza o SUPERUSUÁRIO (é por ele que o dono entra em /_/ e, entre
#     outras coisas, RESETA A SENHA de um goleiro — não há SMTP nesta stack);
#  2. aplica as migrations de pb_migrations/ (coleções do app).
#
# PB_ADMIN_EMAIL e PB_ADMIN_PASSWORD vêm das variáveis da stack no Portainer.
# Sem elas o contêiner sobe igual, mas ninguém entra no painel: o aviso é alto.
set -e

PB_DATA_DIR="${PB_DATA_DIR:-/pb/pb_data}"
PB_MIGRATIONS_DIR="${PB_MIGRATIONS_DIR:-/pb/pb_migrations}"

if [ -n "${PB_ADMIN_EMAIL}" ] && [ -n "${PB_ADMIN_PASSWORD}" ]; then
  echo "[entrypoint] superusuário: upsert de ${PB_ADMIN_EMAIL}"
  pocketbase superuser upsert "${PB_ADMIN_EMAIL}" "${PB_ADMIN_PASSWORD}" \
    --dir="${PB_DATA_DIR}" || echo "[entrypoint] AVISO: upsert do superusuário falhou"
else
  echo "[entrypoint] AVISO: PB_ADMIN_EMAIL/PB_ADMIN_PASSWORD não definidos —"
  echo "[entrypoint]        ninguém vai conseguir entrar no painel /_/ ."
fi

echo "[entrypoint] aplicando migrations de ${PB_MIGRATIONS_DIR}"
pocketbase migrate up --dir="${PB_DATA_DIR}" --migrationsDir="${PB_MIGRATIONS_DIR}"

echo "[entrypoint] iniciando: pocketbase $*"
exec pocketbase "$@"
