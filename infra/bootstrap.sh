#!/usr/bin/env bash
# abertodigital - configuração inicial da VPS (Ubuntu 26.04 LTS)
# Uso (como root, no terminal da Hostinger):
#   curl -fsSL https://raw.githubusercontent.com/aberto-digital/app/main/infra/bootstrap.sh | bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "==> 1/7 Atualizando o sistema"
apt-get update -y && apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg ufw fail2ban unattended-upgrades git jq

echo "==> 2/7 Atualizações de segurança automáticas"
dpkg-reconfigure -f noninteractive unattended-upgrades
timedatectl set-timezone America/Sao_Paulo || true

echo "==> 3/7 Memória de troca (swap 2 GB)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
sysctl -w vm.swappiness=10 >/dev/null && echo 'vm.swappiness=10' > /etc/sysctl.d/99-swap.conf

echo "==> 4/7 Firewall (SSH, HTTP, HTTPS)"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable
systemctl enable --now fail2ban

echo "==> 5/7 Docker (repositório oficial)"
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${UBUNTU_CODENAME:-$VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
cat > /etc/docker/daemon.json <<'J'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
J
systemctl restart docker

echo "==> 6/7 Estrutura de pastas"
mkdir -p /srv/abertodigital /srv/tradingjourney /srv/backups
if [ ! -d /srv/infra/.git ]; then
  git clone --depth 1 https://github.com/aberto-digital/app /srv/infra-src
  mkdir -p /srv/infra && cp -r /srv/infra-src/infra/* /srv/infra/ && rm -rf /srv/infra-src
fi

echo "==> 7/7 Subindo Caddy + PocketBase da abertodigital"
cd /srv/infra && docker compose up -d --build

echo
echo "Pronto. Containers:"
docker ps --format 'table {{.Names}}\t{{.Status}}'
free -h | head -2
