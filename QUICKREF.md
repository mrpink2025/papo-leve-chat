# ⚡ Referência Rápida — Nosso Papo

**Assinado por:** Mr_Pink | **Domínio:** https://nossopapo.net

---

## 🚀 Instalação em 3 Passos

```bash
# 1. Baixar script
wget https://raw.githubusercontent.com/mrpink2025/papo-leve-chat/main/install_nossopapo.sh

# 2. Tornar executável
chmod +x install_nossopapo.sh

# 3. Executar
sudo ./install_nossopapo.sh
```

---

## 📂 Caminhos Importantes

```
/var/www/nossopapo/          # Aplicação
/var/www/nossopapo/dist/     # Build
/var/www/nossopapo/logs/     # Logs
/var/www/nossopapo/backups/  # Backups
/etc/nginx/sites-available/nossopapo  # Config Nginx
/etc/letsencrypt/live/nossopapo.net/  # SSL
```

---

## ⚙️ Comandos Essenciais

### Nginx
```bash
sudo systemctl status nginx    # Status
sudo systemctl restart nginx   # Reiniciar
sudo systemctl reload nginx    # Recarregar config
sudo nginx -t                  # Testar config
```

### SSL
```bash
sudo certbot certificates      # Ver certificados
sudo certbot renew            # Renovar
sudo certbot renew --dry-run  # Testar renovação
```

### Logs
```bash
tail -f /var/log/nginx/nossopapo_access.log  # Access log
tail -f /var/log/nginx/nossopapo_error.log   # Error log
tail -f /var/www/nossopapo/logs/install_*.log  # Install log
```

### Firewall
```bash
sudo ufw status               # Ver status
sudo ufw enable               # Ativar
sudo ufw allow 80/tcp         # Permitir porta
sudo ufw delete allow 80/tcp  # Remover regra
```

### Fail2Ban
```bash
sudo fail2ban-client status             # Status geral
sudo fail2ban-client status sshd        # Status SSH
sudo fail2ban-client set sshd banip IP  # Banir IP
sudo fail2ban-client set sshd unbanip IP # Desbanir IP
```

---

## 🔧 Tarefas Comuns

### Atualizar Aplicação
```bash
cd /var/www/nossopapo
git pull
bun install
bun run build
sudo systemctl reload nginx
```

### Backup Manual
```bash
/var/www/nossopapo/backup.sh
```

### Restaurar Backup
```bash
sudo systemctl stop nginx
sudo tar -xzf /var/www/nossopapo/backups/backup_file.tar.gz -C /
sudo systemctl start nginx
```

### Verificar PWA
```bash
/var/www/nossopapo/check_pwa.sh
```

### Modo Manutenção ON
```bash
# Adicionar em /etc/nginx/sites-available/nossopapo antes de location /:
return 503;
error_page 503 /maintenance.html;
sudo systemctl reload nginx
```

### Modo Manutenção OFF
```bash
# Remover as linhas acima e:
sudo systemctl reload nginx
```

---

## 🐛 Troubleshooting Rápido

### Site não carrega
```bash
sudo systemctl status nginx
sudo nginx -t
sudo systemctl restart nginx
curl -I https://nossopapo.net
```

### SSL não funciona
```bash
sudo certbot certificates
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### Erro 502 Bad Gateway
```bash
# Verificar se app está rodando
ps aux | grep node
# Verificar logs
tail -f /var/log/nginx/nossopapo_error.log
```

### Disco cheio
```bash
df -h
sudo journalctl --vacuum-time=7d
find /var/www/nossopapo/backups/ -mtime +7 -delete
```

### Alta CPU/Memória
```bash
htop
ps aux --sort=-%cpu | head -10
ps aux --sort=-%mem | head -10
```

---

## 🔐 Segurança Rápida

### Ver últimos logins
```bash
sudo last -20
```

### Ver tentativas de login falhas
```bash
sudo grep "Failed password" /var/log/auth.log | tail -20
```

### Ver IPs banidos
```bash
sudo fail2ban-client status sshd
```

### Verificar portas abertas
```bash
sudo ss -tulpn
```

### Headers de segurança
```bash
curl -I https://nossopapo.net | grep -i "x-"
```

---

## 📊 Monitoramento Rápido

### Status dos Serviços
```bash
sudo systemctl status nginx fail2ban certbot.timer
```

### Uso de Recursos
```bash
htop              # CPU e memória
df -h             # Disco
free -h           # Memória
uptime            # Uptime e load
```

### Top 10 IPs
```bash
sudo awk '{print $1}' /var/log/nginx/nossopapo_access.log | \
sort | uniq -c | sort -rn | head -10
```

### Erros recentes
```bash
sudo grep -i error /var/log/nginx/nossopapo_error.log | tail -20
```

---

## 🧪 Testes Rápidos

### Teste Nginx
```bash
sudo nginx -t
```

### Teste SSL
```bash
curl -I https://nossopapo.net
openssl s_client -connect nossopapo.net:443 < /dev/null
```

### Teste DNS
```bash
nslookup nossopapo.net
dig nossopapo.net
```

### Teste PWA
```bash
curl https://nossopapo.net/manifest.json
curl https://nossopapo.net/sw.js
```

### Teste Performance
```bash
curl -o /dev/null -s -w "Time: %{time_total}s\n" https://nossopapo.net
```

---

## 📱 Contatos

- **Website:** https://nossopapo.net
- **Email:** contato@nossopapo.net
- **GitHub:** https://github.com/mrpink2025/papo-leve-chat

---

## 💾 Backups

**Localização:** `/var/www/nossopapo/backups/`  
**Frequência:** Diário (2:00 AM)  
**Retenção:** 7 dias

```bash
# Listar backups
ls -lh /var/www/nossopapo/backups/

# Backup manual
/var/www/nossopapo/backup.sh
```

---

## 🎨 MOTD

Para ver o MOTD personalizado:
```bash
cat /etc/update-motd.d/10-nossopapo
```

Para recarregar:
```bash
sudo run-parts /etc/update-motd.d/
```

---

## 📝 Variáveis de Ambiente

**Arquivo:** `/var/www/nossopapo/.env`

```bash
# Editar
sudo nano /var/www/nossopapo/.env

# Após editar
cd /var/www/nossopapo
bun run build
sudo systemctl reload nginx
```

---

## ⚡ Scripts Úteis

```bash
/var/www/nossopapo/backup.sh      # Backup
/var/www/nossopapo/check_pwa.sh   # Verificar PWA
```

---

**Assinado por:** Mr_Pink  
**Nosso Papo** — Onde cada conversa importa  
© 2025 · https://nossopapo.net
