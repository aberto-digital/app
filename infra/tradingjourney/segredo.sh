#!/usr/bin/env bash
# Grava (ou troca) um segredo das edge functions do TradingJourney sem mostrar na tela.
# Uso: bash /srv/infra/tradingjourney/segredo.sh STRIPE_WEBHOOK_SECRET
set -euo pipefail
k=${1:?informe o nome, ex.: STRIPE_WEBHOOK_SECRET}
FENV=/srv/tradingjourney/functions.env
touch "$FENV"; chmod 600 "$FENV"
printf "Cole o valor de %s (não aparece na tela; Enter vazio pula): " "$k"
IFS= read -rs v; echo
[ -z "$v" ] && { echo "  (pulado)"; exit 0; }
python3 - "$FENV" "$k" "$v" <<'PY'
import sys
p, k, v = sys.argv[1:4]
linhas = [l for l in open(p).read().splitlines() if l and not l.startswith(k + "=")]
linhas.append(f"{k}={v}")
open(p, "w").write("\n".join(linhas) + "\n")
PY
echo "  $k gravado."
if [ "${2:-}" != "--sem-reiniciar" ] && [ -f /srv/tradingjourney/supabase/.env ]; then
  cd /srv/tradingjourney/supabase && docker compose up -d --force-recreate functions >/dev/null 2>&1 && echo "  funções reiniciadas."
fi
