#!/usr/bin/env bash
# Atualiza a infra do servidor com o que está no GitHub (aberto-digital/app, pasta infra).
# Uso no servidor: bash /srv/infra/atualiza.sh  (ou automático: GitHub Actions -> deploy-vps infra)
# O corpo fica entre { } para o bash ler tudo antes de rodar (o próprio arquivo é sobrescrito no meio).
{
set -euo pipefail
rm -rf /srv/infra-src
git clone -q --depth 1 https://github.com/aberto-digital/app /srv/infra-src
cp -r /srv/infra-src/infra/* /srv/infra/
[ -x /usr/local/bin/deploy-vps ] && install -m 755 /srv/infra/deploy-vps.sh /usr/local/bin/deploy-vps
rm -rf /srv/infra-src
cd /srv/infra
mkdir -p /srv/abertodigital/push && chown 1000:1000 /srv/abertodigital/push
docker compose up -d --build
docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile >/dev/null 2>&1 || true
sleep 3
docker compose ps
echo "--- últimas linhas do PocketBase ---"
docker compose logs --tail 15 ad-pocketbase
exit 0
}
