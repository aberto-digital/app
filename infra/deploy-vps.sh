#!/usr/bin/env bash
# Deploy disparado pelo GitHub Actions (instalado em /usr/local/bin/deploy-vps).
# A chave do GitHub só consegue rodar ESTE script (authorized_keys com command= e restrict),
# e ele só aceita os pedidos da lista abaixo.
{
set -euo pipefail
pedido=${SSH_ORIGINAL_COMMAND:-${1:-}}
exec 9>/var/lock/deploy-vps.lock
flock -w 900 9 || { echo "outro deploy em andamento, desisti"; exit 1; }
echo "=== $(date '+%F %T') deploy: $pedido" >> /var/log/deploy-vps.log
case "$pedido" in
  infra)          bash /srv/infra/atualiza.sh ;;
  tradingjourney) bash /srv/tradingjourney/bin/publica.sh main ;;
  *)              echo "pedido não permitido: '$pedido'"; exit 2 ;;
esac 2>&1 | tee -a /var/log/deploy-vps.log
echo "=== ok" >> /var/log/deploy-vps.log
exit 0
}
