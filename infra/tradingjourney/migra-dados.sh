#!/usr/bin/env bash
# Copia banco, usuários, segredos do Vault e arquivos do Supabase cloud para o Supabase da VPS.
# Uso: bash /srv/infra/tradingjourney/migra-dados.sh            (primeira cópia, banco local vazio)
#      bash /srv/infra/tradingjourney/migra-dados.sh --recomecar (apaga o banco LOCAL e copia de novo)
# O Supabase cloud só é LIDO. Nada é apagado nem alterado lá.
set -euo pipefail

BASE=/srv/tradingjourney
SB=$BASE/supabase
AQUI=$(cd "$(dirname "$0")" && pwd)
REF=tnquehrbhonpivorkrqt
CLOUD=https://$REF.supabase.co
W=$BASE/migracao
mkdir -p "$W"; chmod 700 "$W"
cd "$SB"
PGPW=$(grep "^POSTGRES_PASSWORD=" .env | cut -d= -f2-)
SRK_LOCAL=$(grep "^SERVICE_ROLE_KEY=" .env | cut -d= -f2-)

local_sql() { docker exec -i -e PGPASSWORD="$PGPW" supabase-db psql -h 127.0.0.1 -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -q "$@"; }
espera_banco() {
  for _ in $(seq 1 60); do local_sql -c "select 1" >/dev/null 2>&1 && return 0; sleep 3; done
  echo "O banco local não respondeu."; exit 1
}

# 0) Supabase CLI (só para o dump, que roda o pg_dump certo em docker)
if ! command -v supabase >/dev/null; then
  arch=$(dpkg --print-architecture 2>/dev/null || echo amd64)
  echo "===> Instalando o Supabase CLI ..."
  curl -fsSL "https://github.com/supabase/cli/releases/latest/download/supabase_linux_${arch}.tar.gz" | tar -xz -C /usr/local/bin supabase
fi

# 1) Acesso ao banco antigo (digitado aqui, não fica salvo)
echo
echo "No Supabase: Connect > Session pooler. Copie a URI (com o [YOUR-...-PASSWORD] mesmo)."
read -rp "URI do Session pooler: " URI
printf "Senha do banco do Supabase (não aparece): "; IFS= read -rs PW; echo
PWQ=$(printf %s "$PW" | python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.stdin.read(),safe=""))')
DBURL=${URI/\[YOUR-DATABASE-PASSWORD\]/$PWQ}
DBURL=${DBURL/\[YOUR-PASSWORD\]/$PWQ}
printf "service_role key do Supabase cloud, para copiar os arquivos (não aparece): "; IFS= read -rs SRK_CLOUD; echo
unset PW PWQ

# 2) Banco local precisa estar vazio
espera_banco
tem=$(local_sql -At -c "select count(*) from pg_tables where schemaname='public'")
if [ "$tem" != "0" ]; then
  if [ "${1:-}" != "--recomecar" ]; then
    echo "O banco LOCAL já tem tabelas. Para apagar só o local e copiar de novo: --recomecar"; exit 1
  fi
  echo "===> Apagando o banco LOCAL da VPS (o cloud não é tocado) ..."
  docker compose down
  rm -rf volumes/db/data volumes/storage/*
  docker compose up -d
  sleep 15; espera_banco
fi

# 3) Dump do cloud
echo "===> Lendo o banco do Supabase cloud ..."
rm -f "$W"/*.sql
supabase db dump --db-url "$DBURL" -f "$W/roles.sql" --role-only
supabase db dump --db-url "$DBURL" -f "$W/schema.sql"
supabase db dump --db-url "$DBURL" -f "$W/data.sql" --use-copy --data-only
ls -la "$W"

# 4) Restaura numa transação só (se algo falhar, nada fica pela metade)
echo "===> Restaurando na VPS ..."
if ! {
  cat "$W/roles.sql"
  cat "$W/schema.sql"
  echo "SET session_replication_role = replica;"
  cat "$W/data.sql"
} | local_sql --single-transaction > "$W/restaura.log" 2>&1; then
  echo "A restauração falhou e nada foi gravado. Erro:"
  grep -m5 -A3 "ERROR" "$W/restaura.log" || tail -20 "$W/restaura.log"
  exit 1
fi
echo "  restaurado ($(grep -c WARNING "$W/restaura.log" || true) avisos)"

# 5) Ajustes de servidor: funções que chamavam o endereço do cloud, Vault e cron
echo "===> Ajustando funções, Vault e cron ..."
local_sql <<'SQL'
do $$
declare r record; d text;
begin
  for r in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.prosrc like '%tnquehrbhonpivorkrqt.supabase.co/functions/v1%'
  loop
    d := replace(pg_get_functiondef(r.oid), 'https://tnquehrbhonpivorkrqt.supabase.co/functions/v1', 'http://api-gw:8000/functions/v1');
    execute d;
  end loop;
end $$;
SQL

SEGREDOS=$(docker exec supabase-db psql "$DBURL" -At -c \
  "select coalesce(json_agg(json_build_object('n',name,'s',decrypted_secret,'d',coalesce(description,''))),'[]') from vault.decrypted_secrets")
export SEGREDOS
python3 - <<'PY' | local_sql
import json, os
q = lambda s: "'" + s.replace("'", "''") + "'"
print("delete from vault.secrets;")
for x in json.loads(os.environ["SEGREDOS"]):
    print(f"select vault.create_secret({q(x['s'])}, {q(x['n'])}, {q(x['d'])});")
PY
# Os mesmos valores vão para as funções (push e VAPID)
python3 - "$BASE/functions.env" <<'PY'
import json, os, sys
p = sys.argv[1]
mapa = {"push_dispatch_secret": "PUSH_DISPATCH_SECRET", "vapid_private_key": "VAPID_PRIVATE_KEY",
        "vapid_public_key": "VAPID_PUBLIC_KEY", "vapid_subject": "VAPID_SUBJECT"}
novos = {mapa[x["n"]]: x["s"] for x in json.loads(os.environ["SEGREDOS"]) if x["n"] in mapa}
linhas = [l for l in open(p).read().splitlines() if l and l.split("=", 1)[0] not in novos]
linhas += [f"{k}={v}" for k, v in novos.items()]
open(p, "w").write("\n".join(linhas) + "\n")
print("  segredos do Vault copiados:", ", ".join(sorted(novos)))
PY
unset SEGREDOS

local_sql -c "select cron.schedule('push-scheduler', '*/5 * * * *', \$\$select public.run_push_scheduler()\$\$);" >/dev/null
local_sql -c "notify pgrst, 'reload schema';"

# 6) Arquivos do Storage
echo "===> Copiando arquivos do Storage ..."
local_sql -c "drop table if exists public._donos_arquivos; create table public._donos_arquivos as select bucket_id, name, owner, owner_id from storage.objects;"
local_sql -At -c "select coalesce(json_agg(json_build_object('b',bucket_id,'n',name,'t',coalesce(metadata->>'mimetype','application/octet-stream'),'c',coalesce(metadata->>'cacheControl','max-age=3600'))),'[]') from storage.objects" > "$W/objetos.json"
GW=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' supabase-envoy | awk '{print $1}')
CLOUD="$CLOUD" LOCAL="http://$GW:8000" SRK_CLOUD="$SRK_CLOUD" SRK_LOCAL="$SRK_LOCAL" python3 - "$W/objetos.json" <<'PY'
import json, os, sys, urllib.request, urllib.parse
objs = json.load(open(sys.argv[1]))
ok = falha = 0
def req(url, key, data=None, headers=None, method="GET"):
    h = {"Authorization": f"Bearer {key}", "apikey": key, **(headers or {})}
    return urllib.request.urlopen(urllib.request.Request(url, data=data, headers=h, method=method), timeout=120)
for o in objs:
    caminho = urllib.parse.quote(o["b"]) + "/" + urllib.parse.quote(o["n"], safe="/")
    try:
        corpo = req(f'{os.environ["CLOUD"]}/storage/v1/object/{caminho}', os.environ["SRK_CLOUD"]).read()
        req(f'{os.environ["LOCAL"]}/storage/v1/object/{caminho}', os.environ["SRK_LOCAL"], data=corpo, method="POST",
            headers={"Content-Type": o["t"], "x-upsert": "true", "cache-control": o["c"]}).read()
        ok += 1
    except Exception as e:
        falha += 1
        print("  falhou:", o["b"], o["n"][:60], "-", str(e)[:80])
print(f"  arquivos copiados: {ok}, falhas: {falha}, total: {len(objs)}")
PY
unset SRK_CLOUD
local_sql -c "update storage.objects o set owner = d.owner, owner_id = d.owner_id from public._donos_arquivos d where d.bucket_id = o.bucket_id and d.name = o.name; drop table public._donos_arquivos;"

# 7) Reinicia o que lê o banco e confere
docker compose restart auth rest storage realtime functions >/dev/null
sleep 10
echo "===> Conferência (VPS):"
local_sql -At -c "select 'usuarios', count(*) from auth.users union all select 'trades', count(*) from public.trades union all select 'accounts', count(*) from public.accounts union all select 'arquivos', count(*) from storage.objects union all select 'cron', count(*) from cron.job;"
echo "===> Conferência (cloud):"
docker exec supabase-db psql "$DBURL" -At -c "select 'usuarios', count(*) from auth.users union all select 'trades', count(*) from public.trades union all select 'accounts', count(*) from public.accounts union all select 'arquivos', count(*) from storage.objects;"
unset DBURL
echo "Pronto. Os arquivos .sql ficam em $W (só root lê)."
