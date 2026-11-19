# TradingJourney na VPS (Supabase self-hosted)

Tudo roda em Docker na mesma VPS da abertodigital, atrás do Caddy (HTTPS automático).

| O quê | Onde |
|---|---|
| API, login, arquivos, funções, painel Studio | https://api.tradingjourney.com.br |
| Site (teste) | https://beta.tradingjourney.com.br |
| Supabase (compose oficial + segredos) | /srv/tradingjourney/supabase (.env só na VPS) |
| Segredos das funções | /srv/tradingjourney/functions.env |
| Site publicado | /srv/tj-site/www |

## Ordem
1. `bash /srv/infra/atualiza.sh` (traz estes scripts e recarrega o Caddy)
2. `bash /srv/infra/tradingjourney/instala.sh` (uma vez)
3. `bash /srv/infra/tradingjourney/migra-dados.sh` (copia do cloud; `--recomecar` refaz)
4. `bash /srv/infra/tradingjourney/publica.sh` (site + funções do GitHub; repetir a cada atualização)
5. Trocar um segredo: `bash /srv/infra/tradingjourney/segredo.sh STRIPE_WEBHOOK_SECRET`

Senha do painel: `grep DASHBOARD_PASSWORD /srv/tradingjourney/supabase/.env` (usuário `supabase`).
