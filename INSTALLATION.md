# 🚀 Guia de Instalação — Nosso Papo

**Assinado por:** Mr_Pink  
**Domínio:** https://nossopapo.net

---

## 📋 Pré-requisitos

- **Sistema Operacional:** Ubuntu 24.04 LTS (recomendado)
- **Acesso:** Root ou sudo
- **Domínio:** DNS configurado apontando para o servidor
- **Memória:** Mínimo 2GB RAM
- **Disco:** Mínimo 20GB disponível

---

## 🎯 Instalação Rápida

### 1. Baixar o Script

```bash
wget https://raw.githubusercontent.com/mrpink2025/papo-leve-chat/main/install_nossopapo.sh
chmod +x install_nossopapo.sh
```

### 2. Executar como Root

```bash
sudo ./install_nossopapo.sh
```

O script irá:
- ✅ Validar sistema operacional
- ✅ Instalar dependências (Node.js, Nginx, Certbot, etc)
- ✅ Clonar repositório oficial
- ✅ Build do projeto
- ✅ Configurar Nginx + SSL (HTTPS)
- ✅ Configurar firewall (UFW + Fail2Ban)
- ✅ Configurar atualizações automáticas
- ✅ Criar MOTD personalizado
- ✅ Configurar backups automáticos

### 3. Verificar Instalação

Após a instalação, faça logout e login novamente para ver o MOTD personalizado:

```bash
exit
ssh user@servidor
```

Você verá:

```
───────────────────────────────────────────────────────────────
     _   _                         _____                     
    | \ | | ___  ___  ___  ___    |  __ \  __ _ _ __   ___  
    |  \| |/ _ \/ __/ __|/ _ \   | |__) |/ _` | '_ \ / _ \ 
    | |\  | (_) \__ \__ \ (_) |  |  ___/| (_| | |_) | (_) |
    |_| \_|\___/|___/___/\___/   |_|     \__,_| .__/ \___/ 
                                              |_|           
          💬  NOSSO PAPO — onde cada conversa importa
───────────────────────────────────────────────────────────────
```

---

## 🔧 Configuração Pós-Instalação

### Configurar Variáveis de Ambiente

Edite o arquivo `.env` se necessário:

```bash
sudo nano /var/www/nossopapo/.env
```

### Verificar PWA

Execute o script de verificação:

```bash
/var/www/nossopapo/check_pwa.sh
```

### Testar Site

Acesse: https://nossopapo.net

---

## 📂 Estrutura de Diretórios

```
/var/www/nossopapo/
├── dist/              # Build de produção
├── src/               # Código fonte
├── logs/              # Logs da aplicação
├── backups/           # Backups automáticos
├── .env               # Variáveis de ambiente
├── backup.sh          # Script de backup
└── check_pwa.sh       # Verificação PWA
```

---

## 🛠️ Comandos Úteis

### Logs

```bash
# Ver log de instalação
tail -f /var/www/nossopapo/logs/install_*.log

# Ver logs do Nginx
tail -f /var/log/nginx/nossopapo_access.log
tail -f /var/log/nginx/nossopapo_error.log
```

### Serviços

```bash
# Status do Nginx
sudo systemctl status nginx

# Recarregar Nginx
sudo systemctl reload nginx

# Status do Firewall
sudo ufw status

# Status do Fail2Ban
sudo systemctl status fail2ban
```

### SSL

```bash
# Renovar certificado (teste)
sudo certbot renew --dry-run

# Renovar certificado (real)
sudo certbot renew

# Ver status do certificado
sudo certbot certificates
```

### Backup

```bash
# Backup manual
/var/www/nossopapo/backup.sh

# Ver backups existentes
ls -lh /var/www/nossopapo/backups/

# Restaurar backup
tar -xzf /var/www/nossopapo/backups/nossopapo_backup_YYYYMMDD_HHMMSS.tar.gz -C /
```

---

## 🔐 Segurança

O script configura automaticamente:

### Firewall (UFW)
- SSH (porta 22) ✅
- HTTP (porta 80) ✅
- HTTPS (porta 443) ✅
- Todas as outras portas bloqueadas ❌

### Fail2Ban
- Proteção contra força bruta SSH
- Proteção contra ataques Nginx
- Ban automático após 5 tentativas falhas

### SSL/HTTPS
- Certificado Let's Encrypt
- Renovação automática
- Redirecionamento HTTP → HTTPS
- Security headers configurados

### Atualizações
- Atualizações de segurança automáticas
- Sem reinicializações automáticas

---

## 🐛 Solução de Problemas

### Erro: "Nginx não inicia"

```bash
# Verificar configuração
sudo nginx -t

# Ver logs de erro
sudo tail -f /var/log/nginx/error.log
```

### Erro: "SSL não funciona"

```bash
# Verificar certificado
sudo certbot certificates

# Renovar manualmente
sudo certbot renew --force-renewal
```

### Site não carrega

```bash
# Verificar status do Nginx
sudo systemctl status nginx

# Reiniciar Nginx
sudo systemctl restart nginx

# Verificar portas
sudo netstat -tulpn | grep :443
```

### PWA não instala

```bash
# Executar verificação
/var/www/nossopapo/check_pwa.sh

# Verificar manifest
curl https://nossopapo.net/manifest.json

# Verificar service worker
curl https://nossopapo.net/sw.js
```

---

## 📊 Monitoramento

### Ver uso de recursos

```bash
# CPU e memória
htop

# Espaço em disco
df -h

# Status dos serviços
sudo systemctl status nginx fail2ban certbot.timer
```

### Ver logs em tempo real

```bash
# Todos os logs do Nginx
sudo tail -f /var/log/nginx/*.log

# Logs de autenticação
sudo tail -f /var/log/auth.log

# Logs do Fail2Ban
sudo tail -f /var/log/fail2ban.log
```

---

## 🔄 Atualização do App

Para atualizar o Nosso Papo para a versão mais recente:

```bash
# Fazer backup
/var/www/nossopapo/backup.sh

# Ir para o diretório
cd /var/www/nossopapo

# Fazer pull das alterações
git pull

# Instalar dependências
bun install

# Build
bun run build

# Recarregar Nginx
sudo systemctl reload nginx
```

---

## 📞 Suporte

- **Website:** https://nossopapo.net
- **Email:** contato@nossopapo.net
- **GitHub:** https://github.com/mrpink2025/papo-leve-chat

---

## 📝 Notas Importantes

1. **Backup Regular:** Backups automáticos são executados diariamente às 2:00 AM
2. **SSL Renewal:** Certificados são renovados automaticamente 30 dias antes do vencimento
3. **Firewall:** Alterar configurações do firewall requer cuidado para não bloquear acesso SSH
4. **Logs:** Logs são rotacionados automaticamente após 14 dias
5. **MOTD:** Para ver o MOTD, faça logout e login novamente via SSH

---

**Assinado por:** Mr_Pink  
**Nosso Papo** — Onde cada conversa importa  
© 2025 · https://nossopapo.net
