#!/usr/bin/env bash
# Publica o TradingJourney (site + edge functions) a partir do GitHub, na VPS.
# Uso: bash /srv/infra/tradingjourney/publica.sh [branch]   (padrão: main)
# Na primeira vez pede um token do GitHub só de leitura (o repositório é privado).
set -euo pipefail

BASE=/srv/tradingjourney
SB=$BASE/supabase
REPO=julioromanelli-png/tradingjourney
BRANCH=${1:-main}
TOKEN_F=$BASE/.github-token

if [ ! -s "$TOKEN_F" ]; then
  echo "GitHub > Settings > Developer settings > Fine-grained tokens: acesso só a $REPO, permissão Contents: Read-only."
  printf "Cole o token (não aparece): "; IFS= read -rs t; echo
  printf %s "$t" > "$TOKEN_F"; chmod 600 "$TOKEN_F"; unset t
fi

SRC=$BASE/src
rm -rf "$SRC.novo"
git -c "http.extraHeader=Authorization: Basic $(printf 'x-access-token:%s' "$(cat "$TOKEN_F")" | base64 -w0)" \
  clone -q --depth 1 --branch "$BRANCH" "https://github.com/$REPO" "$SRC.novo"
rm -rf "$SRC"; mv "$SRC.novo" "$SRC"
echo "===> Código: $(git -C "$SRC" log -1 --format='%h %s')"

# Edge functions: copia por cima, mantendo o roteador "main" do Supabase
F=$SB/volumes/functions
for d in "$SRC"/supabase/functions/*/; do
  n=$(basename "$d"); [ "$n" = "_tests" ] && continue
  rm -rf "${F:?}/$n"; cp -r "$d" "$F/$n"
done
(cd "$SB" && docker compose up -d --force-recreate functions >/dev/null)
echo "===> Funções atualizadas"

# Site: build num container Node e troca a pasta de uma vez só
ANON=$(grep "^ANON_KEY=" "$SB/.env" | cut -d= -f2-)
docker run --rm -v "$SRC":/app -w /app \
  -e VITE_SUPABASE_URL=https://api.tradingjourney.com.br \
  -e VITE_SUPABASE_ANON_KEY="$ANON" -e VITE_SUPABASE_PUBLISHABLE_KEY="$ANON" \
  -e VITE_SUPABASE_PROJECT_ID=tradingjourney \
  -e VITE_VAPID_PUBLIC_KEY=BJenp-Zv0Oux4HuxIbEKjr9TEV63NPZRdm0w1SbHxfhVdArtwGmac1ivEZyDY8vtnpmdYih3sEOqkrJN1VbmFok \
  -e VITE_SENTRY_DSN=https://38fca19e5f119de1ecd825bdc9caa0e7@o4512374090956800.ingest.us.sentry.io/4512374104064000 \
  -e VITE_VERCEL_GIT_COMMIT_SHA="$(git -C "$SRC" rev-parse HEAD)" \
  node:22-alpine sh -c "npm ci --no-audit --no-fund --loglevel=error && npm run build" | tail -5
# /srv/tj-site é montada inteira no Caddy, então a troca da pasta www aparece na hora
SITE=/srv/tj-site; mkdir -p $SITE
rm -rf "$SITE/www.novo"; cp -r "$SRC/dist" "$SITE/www.novo"
rm -rf "$SITE/www.velho"; if [ -d "$SITE/www" ]; then mv "$SITE/www" "$SITE/www.velho"; fi
mv "$SITE/www.novo" "$SITE/www"
rm -rf "$SRC/node_modules"
echo "===> Site publicado em $SITE/www"
