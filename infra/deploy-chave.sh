#!/usr/bin/env bash
# Cria (uma vez) a chave que o GitHub Actions usa para disparar o deploy nesta VPS.
# Uso: bash /srv/infra/deploy-chave.sh
{
set -euo pipefail
K=/root/.ssh/deploy_github
install -m 755 /srv/infra/deploy-vps.sh /usr/local/bin/deploy-vps
mkdir -p /root/.ssh && chmod 700 /root/.ssh && touch /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys
[ -f "$K" ] || ssh-keygen -q -t ed25519 -N '' -C github-actions-deploy -f "$K"
grep -q 'github-actions-deploy' /root/.ssh/authorized_keys || \
  echo "restrict,command=\"/usr/local/bin/deploy-vps\" $(cat "$K.pub")" >> /root/.ssh/authorized_keys
echo "Chave instalada (só consegue rodar o deploy)."
echo "Chave pública do servidor, para o workflow:"
echo "187.53.122.214 $(cut -d' ' -f1,2 /etc/ssh/ssh_host_ed25519_key.pub)"
echo
read -rp "Pressione Enter para MOSTRAR a chave privada (copie tudo, das linhas BEGIN até END)... " _
clear
cat "$K"
echo
read -rp "Depois de copiar e salvar no GitHub, pressione Enter para limpar a tela... " _
clear
echo "Pronto. A chave privada continua só em $K (não precisa copiar de novo)."
exit 0
}
