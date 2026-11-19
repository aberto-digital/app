#!/usr/bin/env bash
# Instala o Supabase self-hosted do TradingJourney na VPS (uma vez só).
# Uso no servidor: bash /srv/infra/tradingjourney/instala.sh
# Os segredos são gerados aqui mesmo e ficam só em /srv/tradingjourney (nunca no GitHub).
set -euo pipefail

BASE=/srv/tradingjourney
SB=$BASE/supabase
AQUI=$(cd "$(dirname "$0")" && pwd)
API_URL=https://api.tradingjourney.com.br
SITE=https://www.tradingjourney.com.br

mkdir -p "$BASE" /srv/tj-site/www
chmod 700 "$BASE"

docker compose version >/dev/null || { echo "docker compose não encontrado"; exit 1; }
command -v python3 >/dev/null || { apt-get update -qq && apt-get install -y -qq python3; }
command -v openssl >/dev/null || { apt-get update -qq && apt-get install -y -qq openssl; }

# 1) Projeto oficial do Supabase (docker compose + chaves geradas aqui)
if [ ! -f "$SB/.env" ]; then
  echo "===> Baixando o Supabase self-hosted (oficial) ..."
  cd "$BASE"
  curl -fsSL https://raw.githubusercontent.com/supabase/supabase/master/docker/setup.sh -o /tmp/sb-setup.sh
  sh /tmp/sb-setup.sh --skip-deps -y --project-dir supabase >/tmp/sb-setup.log 2>&1 \
    || { echo "Falhou. Veja: tail -50 /tmp/sb-setup.log"; exit 1; }
  rm -f /tmp/sb-setup.sh
  # o log tem as senhas geradas: não fica guardado
  grep -E "^(===>|ERROR|WARNING)" /tmp/sb-setup.log | grep -viE "password|secret|key" || true
  rm -f /tmp/sb-setup.log
fi
cd "$SB"
chmod 600 .env

defina() { # defina CHAVE valor  (no .env do Supabase)
  if grep -q "^$1=" .env; then sed -i "s|^$1=.*$|$1=$2|" .env; else echo "$1=$2" >> .env; fi
}
defina SUPABASE_PUBLIC_URL "$API_URL"
defina API_EXTERNAL_URL "$API_URL/auth/v1"
defina SITE_URL "$SITE"
defina ADDITIONAL_REDIRECT_URLS "$SITE/**,https://tradingjourney.com.br/**,https://beta.tradingjourney.com.br/**,http://localhost:8080/**"
defina ENABLE_PHONE_SIGNUP false
defina ENABLE_PHONE_AUTOCONFIRM false
defina STUDIO_DEFAULT_ORGANIZATION TradingJourney
defina STUDIO_DEFAULT_PROJECT TradingJourney
defina COMPOSE_FILE docker-compose.yml:docker-compose.tj.yml
grep -q "^SEND_EMAIL_HOOK_SECRET=" .env || echo "SEND_EMAIL_HOOK_SECRET=v1,whsec_$(openssl rand -base64 32 | tr -d '\n')" >> .env

cp "$AQUI/docker-compose.tj.yml" "$SB/docker-compose.tj.yml"

# 2) Funções: verify_jwt por função (o roteador oficial só tem a opção global)
MAIN=volumes/functions/main/index.ts
if ! grep -q FUNCTIONS_NO_VERIFY_JWT "$MAIN"; then
  python3 - "$MAIN" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
a = "const VERIFY_JWT = Deno.env.get('VERIFY_JWT') === 'true'"
b = "if (req.method !== 'OPTIONS' && VERIFY_JWT) {"
assert a in s and b in s, "o main/index.ts mudou: revisar o ajuste de verify_jwt"
s = s.replace(a, a + "\nconst NO_VERIFY = new Set((Deno.env.get('FUNCTIONS_NO_VERIFY_JWT') ?? '').split(',').map((n) => n.trim()).filter(Boolean))")
s = s.replace(b, "if (req.method !== 'OPTIONS' && VERIFY_JWT && !NO_VERIFY.has(new URL(req.url).pathname.split('/')[1])) {")
open(p, 'w').write(s)
PY
fi

# 3) Segredos das funções (Stripe, Resend, Google). VAPID e push vêm do banco antigo no migra-dados.sh
FENV=$BASE/functions.env
touch "$FENV"; chmod 600 "$FENV"
hook=$(grep "^SEND_EMAIL_HOOK_SECRET=" .env | cut -d= -f2-)
python3 - "$FENV" "SEND_EMAIL_HOOK_SECRET" "$hook" <<'PY'
import sys
p, k, v = sys.argv[1:4]
linhas = [l for l in open(p).read().splitlines() if l and not l.startswith(k + "=")]
linhas.append(f"{k}={v}")
open(p, "w").write("\n".join(linhas) + "\n")
PY
for k in RESEND_API_KEY STRIPE_SECRET_KEY GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET; do
  grep -q "^$k=." "$FENV" && continue
  bash "$AQUI/segredo.sh" "$k" --sem-reiniciar || true
done

# 4) Sobe tudo
echo "===> Subindo o Supabase (a primeira vez demora alguns minutos) ..."
docker compose pull -q
docker compose up -d
sleep 20
docker compose ps --format "table {{.Name}}\t{{.Status}}"
echo
echo "Pronto. Painel: $API_URL  (usuário: supabase; senha: grep DASHBOARD_PASSWORD $SB/.env)"
echo "Próximo passo: bash /srv/infra/tradingjourney/migra-dados.sh"
