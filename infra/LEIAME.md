# Infraestrutura da VPS (Hostinger KVM 2, São Paulo, Ubuntu 26.04)

Sem senhas ou chaves neste repositório: elas ficam só no servidor.

- `bootstrap.sh`: configuração inicial (atualizações automáticas, swap, firewall, fail2ban, Docker) e sobe os serviços.
- `docker-compose.yml`: Caddy (HTTPS automático) + PocketBase da abertodigital, com limite de memória por projeto.
- `Caddyfile`: domínios. `api.abertodigital.com` → PocketBase.
- Dados ficam em `/srv/abertodigital` e `/srv/tradingjourney` (separados). Backups em `/srv/backups`.

Para atualizar: commit na `main` mexendo em `infra/`. O GitHub Actions roda o deploy na VPS sozinho (`deploy-vps infra` → `atualiza.sh`). Na mão: `bash /srv/infra/atualiza.sh`.

- `atualiza.sh`: baixa `infra/` do GitHub, sobe os containers e recarrega o Caddy.
- `deploy-vps.sh`: único comando que a chave do GitHub Actions pode rodar (`infra` ou `tradingjourney`). Instalado em `/usr/local/bin/deploy-vps`.
- `deploy-chave.sh`: cria a chave do deploy (uma vez) e mostra a chave privada para colar no secret `VPS_SSH_KEY`.
- `sites/<cliente>/`: sites estáticos dos clientes (servidos pelo Caddy). Checklist de cliente novo no README da raiz.
