# Infraestrutura da VPS (Hostinger KVM 2, São Paulo, Ubuntu 26.04)

Sem senhas ou chaves neste repositório: elas ficam só no servidor.

- `bootstrap.sh`: configuração inicial (atualizações automáticas, swap, firewall, fail2ban, Docker) e sobe os serviços.
- `docker-compose.yml`: Caddy (HTTPS automático) + PocketBase da abertodigital, com limite de memória por projeto.
- `Caddyfile`: domínios. `api.abertodigital.com` → PocketBase.
- Dados ficam em `/srv/abertodigital` e `/srv/tradingjourney` (separados). Backups em `/srv/backups`.

Para atualizar no servidor: `cd /srv/infra && git pull` (ou copiar os arquivos) e `docker compose up -d --build`.
