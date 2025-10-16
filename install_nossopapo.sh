#!/bin/bash
# Signed by Mr_Pink — Nosso Papo (nossopapo.net)
# Script de instalação completa para Ubuntu 24.04 LTS
# Versão: 1.0.0

set -e

# Cores ANSI
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
ORANGE='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Variáveis
DOMAIN="nossopapo.net"
APP_DIR="/var/www/nossopapo"
REPO_URL="https://github.com/mrpink2025/papo-leve-chat.git"
LOG_DIR="${APP_DIR}/logs"
INSTALL_LOG="${LOG_DIR}/install_$(date +%Y%m%d_%H%M%S).log"
NODE_VERSION="20"

# Criar estrutura de diretórios (antes de qualquer log)
mkdir -p "$APP_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "${APP_DIR}/backups"

# Função para logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$INSTALL_LOG"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$INSTALL_LOG"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$INSTALL_LOG"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$INSTALL_LOG"
}

# Banner de início
clear
echo -e "${ORANGE}${BOLD}"
cat << "EOF"
────────────────────────────────────────────────────────────────
     _   _                         _____                     
    | \ | | ___  ___  ___  ___    |  __ \  __ _ _ __   ___  
    |  \| |/ _ \/ __/ __|/ _ \   | |__) |/ _` | '_ \ / _ \ 
    | |\  | (_) \__ \__ \ (_) |  |  ___/| (_| | |_) | (_) |
    |_| \_|\___/|___/___/\___/   |_|     \__,_| .__/ \___/ 
                                              |_|           
          💬  NOSSO PAPO — onde cada conversa importa
────────────────────────────────────────────────────────────────
EOF
echo -e "${NC}"
echo -e "${CYAN}🚀 Instalação automatizada — Ubuntu 24.04 LTS${NC}"
echo -e "${CYAN}🧠 Assinado por: Mr_Pink${NC}"
echo -e "${CYAN}🌐 Domínio: ${DOMAIN}${NC}"
echo -e "────────────────────────────────────────────────────────────────\n"

# Verificação de root
if [[ $EUID -ne 0 ]]; then
   error "Este script deve ser executado como root (use sudo)"
fi

# Validação do sistema
log "⚙️  Validando sistema operacional..."
if ! grep -q "Ubuntu 24.04" /etc/os-release; then
    warning "Sistema operacional não é Ubuntu 24.04 LTS. Continuando mesmo assim..."
fi
success "Sistema validado"

# Verificar estrutura de diretórios
log "📁 Verificando estrutura de diretórios..."
success "Diretórios criados"

# Atualizar sistema
log "🔄 Atualizando sistema..."
apt-get update -qq
apt-get upgrade -y -qq
success "Sistema atualizado"

# Instalar dependências básicas
log "📦 Instalando dependências básicas..."
apt-get install -y -qq \
    curl \
    git \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    ufw \
    fail2ban \
    unattended-upgrades \
    nginx \
    certbot \
    python3-certbot-nginx \
    jq \
    htop \
    figlet \
    lolcat 2>&1 | tee -a "$INSTALL_LOG" > /dev/null
success "Dependências instaladas"

# Instalar Node.js
log "📦 Instalando Node.js ${NODE_VERSION}..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - >> "$INSTALL_LOG" 2>&1
    apt-get install -y nodejs >> "$INSTALL_LOG" 2>&1
fi
success "Node.js $(node --version) instalado"

# Instalar Bun (build tool)
log "📦 Instalando Bun..."
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash >> "$INSTALL_LOG" 2>&1
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
fi
success "Bun instalado"

# Clonar repositório
log "📥 Clonando repositório oficial..."
if [ -d "${APP_DIR}/src" ]; then
    log "Repositório já existe, fazendo pull..."
    cd "$APP_DIR"
    git pull >> "$INSTALL_LOG" 2>&1
else
    git clone "$REPO_URL" "$APP_DIR" >> "$INSTALL_LOG" 2>&1
fi
cd "$APP_DIR"
success "Repositório clonado"

# Instalar dependências do projeto
log "📦 Instalando dependências do projeto..."
bun install >> "$INSTALL_LOG" 2>&1
success "Dependências do projeto instaladas"

# Configurar .env
log "⚙️  Configurando variáveis de ambiente..."
if [ ! -f "${APP_DIR}/.env" ]; then
    cat > "${APP_DIR}/.env" << 'ENVEOF'
# Signed by Mr_Pink — Nosso Papo (nossopapo.net)
VITE_SUPABASE_URL=https://valazbmgqazykdzcwfcs.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhbGF6Ym1ncWF6eWtkemN3ZmNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1ODI1OTIsImV4cCI6MjA3NjE1ODU5Mn0.BKwXC0ZnGz1F0W7uMoJQcaUvN5K6mNJk5fYdj1LukFI
NODE_ENV=production
ENVEOF
    success "Arquivo .env criado"
else
    log ".env já existe, mantendo configuração existente"
fi

# Build do projeto
log "🔨 Building projeto..."
bun run build >> "$INSTALL_LOG" 2>&1
success "Build concluído"

# Configurar Nginx
log "🌐 Configurando Nginx..."
cat > /etc/nginx/sites-available/nossopapo << 'NGINXCONF'
# Signed by Mr_Pink — Nosso Papo (nossopapo.net)

server {
    listen 80;
    listen [::]:80;
    server_name nossopapo.net www.nossopapo.net;
    
    # Redirecionar HTTP para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name nossopapo.net www.nossopapo.net;

    # SSL será configurado pelo Certbot
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    
    # Remove server tokens
    server_tokens off;
    
    # Root directory
    root /var/www/nossopapo/dist;
    index index.html;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # PWA service worker
    location /sw.js {
        add_header Cache-Control "no-cache";
        proxy_cache_bypass $http_pragma;
        proxy_cache_revalidate on;
        expires off;
        access_log off;
    }

    # Manifest
    location /manifest.json {
        add_header Cache-Control "max-age=3600";
    }

    # Main application
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # Security
    location ~ /\.(?!well-known) {
        deny all;
    }

    # Logs
    access_log /var/log/nginx/nossopapo_access.log;
    error_log /var/log/nginx/nossopapo_error.log;
}
NGINXCONF

# Ativar site
ln -sf /etc/nginx/sites-available/nossopapo /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t >> "$INSTALL_LOG" 2>&1
systemctl reload nginx
success "Nginx configurado"

# Configurar SSL com Certbot
log "🔐 Configurando certificado SSL..."
if [ ! -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
    certbot --nginx -d "$DOMAIN" -d "www.${DOMAIN}" --non-interactive --agree-tos --email admin@${DOMAIN} --redirect >> "$INSTALL_LOG" 2>&1
    success "Certificado SSL instalado"
else
    log "Certificado SSL já existe"
fi

# Configurar renovação automática SSL
log "🔐 Configurando renovação automática SSL..."
systemctl enable certbot.timer
systemctl start certbot.timer
success "Renovação automática SSL configurada"

# Configurar Firewall (UFW)
log "🛡️  Configurando firewall..."
ufw --force enable >> "$INSTALL_LOG" 2>&1
ufw default deny incoming >> "$INSTALL_LOG" 2>&1
ufw default allow outgoing >> "$INSTALL_LOG" 2>&1
ufw allow ssh >> "$INSTALL_LOG" 2>&1
ufw allow 'Nginx Full' >> "$INSTALL_LOG" 2>&1
ufw delete allow 'Nginx HTTP' >> "$INSTALL_LOG" 2>&1 || true
success "Firewall configurado"

# Configurar Fail2Ban
log "🛡️  Configurando Fail2Ban..."
cat > /etc/fail2ban/jail.local << 'FAIL2BAN'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
FAIL2BAN

systemctl enable fail2ban
systemctl restart fail2ban
success "Fail2Ban configurado"

# Configurar atualizações automáticas
log "🔄 Configurando atualizações automáticas..."
cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'AUTOUPDATE'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
AUTOUPDATE

systemctl enable unattended-upgrades
systemctl start unattended-upgrades
success "Atualizações automáticas configuradas"

# Configurar logrotate
log "📝 Configurando logrotate..."
cat > /etc/logrotate.d/nossopapo << 'LOGROTATE'
/var/www/nossopapo/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
LOGROTATE
success "Logrotate configurado"

# Configurar MOTD personalizado
log "🎨 Configurando MOTD personalizado..."

# Limpar mensagens padrão do Ubuntu
chmod -x /etc/update-motd.d/* 2>/dev/null || true

# Criar script MOTD personalizado
cat > /etc/update-motd.d/10-nossopapo << 'MOTD'
#!/bin/bash
# Signed by Mr_Pink — Nosso Papo (nossopapo.net)

# Cores
ORANGE='\033[0;33m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
BOLD='\033[1m'
NC='\033[0m'

# Informações do sistema
UPTIME=$(uptime -p | sed 's/up //')
MEMORY=$(free -h | awk '/^Mem:/ {print $3 "/" $2}')
DISK=$(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 ")"}')
LOAD=$(uptime | awk -F'load average:' '{print $2}')

echo -e "${ORANGE}${BOLD}"
cat << "EOF"
───────────────────────────────────────────────────────────────
     _   _                         _____                     
    | \ | | ___  ___  ___  ___    |  __ \  __ _ _ __   ___  
    |  \| |/ _ \/ __/ __|/ _ \   | |__) |/ _` | '_ \ / _ \ 
    | |\  | (_) \__ \__ \ (_) |  |  ___/| (_| | |_) | (_) |
    |_| \_|\___/|___/___/\___/   |_|     \__,_| .__/ \___/ 
                                              |_|           
          💬  NOSSO PAPO — onde cada conversa importa
───────────────────────────────────────────────────────────────
EOF
echo -e "${NC}"

echo -e "${CYAN}🌐 Domínio:${NC}       https://nossopapo.net"
echo -e "${CYAN}📦 Caminho:${NC}       /var/www/nossopapo"
echo -e "${CYAN}🔐 SSL:${NC}           /etc/letsencrypt/live/nossopapo.net"
echo -e "${CYAN}⚙️  Ambiente:${NC}     Produção — Ubuntu 24.04 LTS"
echo -e "${CYAN}🧠 Autor:${NC}         Mr_Pink"
echo -e "───────────────────────────────────────────────────────────────"
echo -e "${GREEN}📊 Status do Sistema:${NC}"
echo -e "  Uptime:   ${UPTIME}"
echo -e "  Memória:  ${MEMORY}"
echo -e "  Disco:    ${DISK}"
echo -e "  Load:    ${LOAD}"
echo -e "───────────────────────────────────────────────────────────────"
echo -e "${CYAN}${BOLD}\"Conexões reais. Conversas que ficam.\"${NC}"
echo -e "───────────────────────────────────────────────────────────────"
echo ""
MOTD

chmod +x /etc/update-motd.d/10-nossopapo

# Desabilitar mensagens de last login (opcional)
touch ~/.hushlogin

success "MOTD personalizado configurado"

# Configurar permissões
log "🔐 Configurando permissões..."
chown -R www-data:www-data "$APP_DIR"
chmod -R 755 "$APP_DIR"
success "Permissões configuradas"

# Criar script de backup
log "💾 Criando script de backup..."
cat > "${APP_DIR}/backup.sh" << 'BACKUP'
#!/bin/bash
# Signed by Mr_Pink — Nosso Papo (nossopapo.net)
# Script de backup automático

BACKUP_DIR="/var/www/nossopapo/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/nossopapo_backup_${DATE}.tar.gz"

# Criar backup
tar -czf "$BACKUP_FILE" \
    --exclude='/var/www/nossopapo/node_modules' \
    --exclude='/var/www/nossopapo/backups' \
    --exclude='/var/www/nossopapo/logs' \
    /var/www/nossopapo/

# Manter apenas últimos 7 backups
find "$BACKUP_DIR" -name "nossopapo_backup_*.tar.gz" -mtime +7 -delete

echo "Backup criado: $BACKUP_FILE"
BACKUP

chmod +x "${APP_DIR}/backup.sh"

# Adicionar cron para backup diário
(crontab -l 2>/dev/null; echo "0 2 * * * ${APP_DIR}/backup.sh >> ${LOG_DIR}/backup.log 2>&1") | crontab -

success "Script de backup configurado"

# Verificação de saúde
log "🏥 Executando verificação de saúde..."

# Verificar Nginx
if systemctl is-active --quiet nginx; then
    success "Nginx está rodando"
else
    error "Nginx não está rodando"
fi

# Verificar SSL
if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    CERT_EXPIRY=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" | cut -d= -f2)
    success "SSL válido até: ${CERT_EXPIRY}"
else
    warning "Certificado SSL não encontrado"
fi

# Verificar firewall
if ufw status | grep -q "Status: active"; then
    success "Firewall ativo"
else
    warning "Firewall não está ativo"
fi

# Verificar Fail2Ban
if systemctl is-active --quiet fail2ban; then
    success "Fail2Ban está rodando"
else
    warning "Fail2Ban não está rodando"
fi

# Criar script de verificação PWA
log "📱 Criando script de verificação PWA..."
cat > "${APP_DIR}/check_pwa.sh" << 'PWA'
#!/bin/bash
# Signed by Mr_Pink — Nosso Papo (nossopapo.net)
# Verificação PWA

DOMAIN="nossopapo.net"

echo "🔍 Verificando PWA para ${DOMAIN}..."
echo ""

# Verificar manifest
if curl -s "https://${DOMAIN}/manifest.json" | jq . > /dev/null 2>&1; then
    echo "✅ manifest.json válido"
else
    echo "❌ manifest.json inválido ou não encontrado"
fi

# Verificar service worker
if curl -s -I "https://${DOMAIN}/sw.js" | grep -q "200 OK"; then
    echo "✅ Service worker encontrado"
else
    echo "❌ Service worker não encontrado"
fi

# Verificar HTTPS
if curl -s -I "https://${DOMAIN}" | grep -q "200 OK"; then
    echo "✅ HTTPS funcionando"
else
    echo "❌ HTTPS não funcionando"
fi

# Verificar ícones PWA
for size in 192 512; do
    if curl -s -I "https://${DOMAIN}/app-icon-${size}.png" | grep -q "200 OK"; then
        echo "✅ Ícone ${size}x${size} encontrado"
    else
        echo "❌ Ícone ${size}x${size} não encontrado"
    fi
done

echo ""
echo "🔗 Teste manual: https://web.dev/measure/?url=https://${DOMAIN}"
PWA

chmod +x "${APP_DIR}/check_pwa.sh"
success "Script de verificação PWA criado"

# Finalizar instalação
log "📝 Gerando relatório de instalação..."

# Salvar informações no log
cat >> "$INSTALL_LOG" << REPORT

────────────────────────────────────────────────────────────────
📊 RELATÓRIO DE INSTALAÇÃO
────────────────────────────────────────────────────────────────
Data/Hora: $(date +'%Y-%m-%d %H:%M:%S')
Sistema: $(lsb_release -d | cut -f2)
Node.js: $(node --version)
Nginx: $(nginx -v 2>&1 | cut -d'/' -f2)
Domínio: ${DOMAIN}
Diretório: ${APP_DIR}
SSL: /etc/letsencrypt/live/${DOMAIN}

Serviços Ativos:
$(systemctl is-active nginx) - Nginx
$(systemctl is-active fail2ban) - Fail2Ban
$(systemctl is-active certbot.timer) - Certbot Timer
$(systemctl is-active unattended-upgrades) - Auto Updates

Signed by Mr_Pink — Nosso Papo (nossopapo.net)
────────────────────────────────────────────────────────────────
REPORT

# Banner final
clear
echo -e "${GREEN}${BOLD}"
cat << "EOF"
────────────────────────────────────────────────────────────────
  ✅  INSTALAÇÃO FINALIZADA COM SUCESSO!
────────────────────────────────────────────────────────────────
EOF
echo -e "${NC}"

echo -e "${CYAN}🌐 Acesse:${NC}        https://${DOMAIN}"
echo -e "${CYAN}📂 Diretório:${NC}     ${APP_DIR}"
echo -e "${CYAN}🔐 SSL válido:${NC}    /etc/letsencrypt/live/${DOMAIN}"
echo -e "${CYAN}📝 Logs:${NC}          ${LOG_DIR}"
echo -e "${CYAN}🧠 Assinado por:${NC}  Mr_Pink"
echo ""
echo -e "${GREEN}────────────────────────────────────────────────────────────────${NC}"
echo -e "${GREEN}${BOLD}🚀 Nosso Papo está ativo e pronto para uso!${NC}"
echo -e "${GREEN}────────────────────────────────────────────────────────────────${NC}"
echo ""
echo -e "${CYAN}📋 Comandos úteis:${NC}"
echo -e "  • Ver logs:           tail -f ${LOG_DIR}/install_*.log"
echo -e "  • Verificar PWA:      ${APP_DIR}/check_pwa.sh"
echo -e "  • Backup manual:      ${APP_DIR}/backup.sh"
echo -e "  • Status Nginx:       systemctl status nginx"
echo -e "  • Renovar SSL:        certbot renew --dry-run"
echo ""
echo -e "${YELLOW}💡 Próximos passos:${NC}"
echo -e "  1. Faça logout e login novamente para ver o novo MOTD"
echo -e "  2. Teste o acesso: https://${DOMAIN}"
echo -e "  3. Execute: ${APP_DIR}/check_pwa.sh"
echo -e "  4. Configure as variáveis de ambiente em ${APP_DIR}/.env"
echo ""
echo -e "${GREEN}────────────────────────────────────────────────────────────────${NC}"
echo -e "${CYAN}\"Conexões reais. Conversas que ficam.\"${NC}"
echo -e "${GREEN}────────────────────────────────────────────────────────────────${NC}"
echo ""

log "✅ Instalação concluída com sucesso!"
log "📝 Log completo salvo em: $INSTALL_LOG"
