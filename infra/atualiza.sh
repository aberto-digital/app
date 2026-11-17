#!/usr/bin/env bash
# Atualiza a infra do servidor com o que está no GitHub (aberto-digital/app, pasta infra).
# Uso no servidor: bash /srv/infra/atualiza.sh
set -euo pipefail
rm -rf /srv/infra-src
git clone -q --depth 1 https://github.com/aberto-digital/app /srv/infra-src
cp -r /srv/infra-src/infra/* /srv/infra/
rm -rf /srv/infra-src
cd /srv/infra
docker compose up -d --build
sleep 3
docker compose ps
echo "--- últimas linhas do PocketBase ---"
docker compose logs --tail 15 ad-pocketbase
