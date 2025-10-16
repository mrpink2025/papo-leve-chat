# 🔧 Guia de Manutenção — Nosso Papo

**Assinado por:** Mr_Pink  
**Domínio:** https://nossopapo.net

---

## 📅 Tarefas de Manutenção

### Diária (Automática)
- ✅ Backup do sistema (2:00 AM)
- ✅ Limpeza de logs antigos
- ✅ Verificação de atualizações de segurança

### Semanal (Manual)
```bash
# Verificar espaço em disco
df -h

# Verificar uso de memória
free -h

# Ver logs de erro recentes
sudo grep -i error /var/log/nginx/nossopapo_error.log | tail -20

# Verificar status do SSL
sudo certbot certificates

# Verificar bans do Fail2Ban
sudo fail2ban-client status sshd
```

### Mensal (Manual)
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Limpar pacotes não utilizados
sudo apt autoremove -y
sudo apt autoclean

# Verificar integridade do backup
ls -lh /var/www/nossopapo/backups/

# Testar restauração de backup (em ambiente de teste)
```

---

## 🚨 Procedimentos de Emergência

### Site Fora do Ar

**1. Verificar Nginx**
```bash
sudo systemctl status nginx
sudo nginx -t
sudo systemctl restart nginx
```

**2. Verificar SSL**
```bash
sudo certbot certificates
sudo certbot renew --force-renewal
```

**3. Verificar DNS**
```bash
nslookup nossopapo.net
dig nossopapo.net
```

**4. Verificar Firewall**
```bash
sudo ufw status
sudo ufw allow 'Nginx Full'
```

### Ataque ou Tráfego Suspeito

**1. Ver IPs banidos**
```bash
sudo fail2ban-client status sshd
sudo fail2ban-client status nginx-http-auth
```

**2. Banir IP manualmente**
```bash
sudo fail2ban-client set sshd banip IP_ADDRESS
```

**3. Ver conexões ativas**
```bash
sudo netstat -tupln | grep :443
```

**4. Ativar modo manutenção**
```bash
# Criar página de manutenção
sudo cat > /var/www/nossopapo/dist/maintenance.html << 'HTML'
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manutenção - Nosso Papo</title>
    <style>
        body {
            font-family: 'Poppins', sans-serif;
            background: linear-gradient(135deg, #FF9500 0%, #FF6B00 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        p {
            font-size: 1.2rem;
            opacity: 0.9;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Em Manutenção</h1>
        <p>Nosso Papo está passando por manutenção.</p>
        <p>Voltaremos em breve!</p>
        <p style="margin-top: 2rem; opacity: 0.7; font-size: 0.9rem;">
            Assinado por: Mr_Pink
        </p>
    </div>
</body>
</html>
HTML

# Redirecionar para manutenção no Nginx
sudo nano /etc/nginx/sites-available/nossopapo
# Adicionar antes do location /:
# return 503;
# error_page 503 /maintenance.html;
# location = /maintenance.html {
#     root /var/www/nossopapo/dist;
# }

sudo systemctl reload nginx
```

### Disco Cheio

```bash
# Ver uso de disco
df -h

# Encontrar diretórios grandes
sudo du -sh /var/* | sort -h

# Limpar logs antigos
sudo journalctl --vacuum-time=7d

# Limpar backups antigos (manter últimos 3)
cd /var/www/nossopapo/backups/
ls -t | tail -n +4 | xargs rm -f

# Limpar cache do Nginx
sudo rm -rf /var/cache/nginx/*
```

### Certificado SSL Expirado

```bash
# Verificar data de expiração
sudo openssl x509 -enddate -noout -in /etc/letsencrypt/live/nossopapo.net/fullchain.pem

# Renovar imediatamente
sudo certbot renew --force-renewal

# Se falhar, recriar
sudo certbot delete --cert-name nossopapo.net
sudo certbot --nginx -d nossopapo.net -d www.nossopapo.net
```

---

## 🔄 Rollback e Restauração

### Restaurar de Backup

```bash
# 1. Parar Nginx
sudo systemctl stop nginx

# 2. Fazer backup do estado atual
sudo mv /var/www/nossopapo /var/www/nossopapo.broken

# 3. Restaurar backup
sudo tar -xzf /var/www/nossopapo/backups/nossopapo_backup_YYYYMMDD.tar.gz -C /

# 4. Recriar build se necessário
cd /var/www/nossopapo
bun install
bun run build

# 5. Reiniciar Nginx
sudo systemctl start nginx

# 6. Verificar
curl -I https://nossopapo.net
```

### Reverter Atualização Git

```bash
cd /var/www/nossopapo

# Ver commits recentes
git log --oneline -10

# Voltar para commit específico
git reset --hard COMMIT_HASH

# Rebuild
bun install
bun run build

# Recarregar Nginx
sudo systemctl reload nginx
```

---

## 📊 Análise de Performance

### Nginx

```bash
# Ver requests por IP
sudo awk '{print $1}' /var/log/nginx/nossopapo_access.log | sort | uniq -c | sort -rn | head -20

# Ver URLs mais acessadas
sudo awk '{print $7}' /var/log/nginx/nossopapo_access.log | sort | uniq -c | sort -rn | head -20

# Ver erros 4xx/5xx
sudo grep " 5[0-9][0-9] " /var/log/nginx/nossopapo_access.log | tail -20
sudo grep " 4[0-9][0-9] " /var/log/nginx/nossopapo_access.log | tail -20

# Taxa de transferência
sudo cat /var/log/nginx/nossopapo_access.log | awk '{sum+=$10} END {print sum/1024/1024 " MB"}'
```

### Sistema

```bash
# CPU
top -bn1 | head -20

# Memória
free -h

# Processos
ps aux --sort=-%mem | head -10
ps aux --sort=-%cpu | head -10

# Conexões ativas
ss -s

# Uptime
uptime
```

---

## 🔐 Auditoria de Segurança

### Checklist Mensal

```bash
# 1. Verificar portas abertas
sudo ss -tulpn

# 2. Ver últimas autenticações
sudo last -20

# 3. Ver tentativas falhas de login
sudo grep "Failed password" /var/log/auth.log | tail -20

# 4. Verificar usuários com acesso
sudo cat /etc/passwd | grep "/bin/bash"

# 5. Verificar bans do Fail2Ban
sudo fail2ban-client status

# 6. Verificar certificado SSL
sudo openssl s_client -connect nossopapo.net:443 -servername nossopapo.net < /dev/null 2>/dev/null | openssl x509 -noout -dates

# 7. Verificar headers de segurança
curl -I https://nossopapo.net | grep -i "x-"

# 8. Verificar permissões
sudo ls -la /var/www/nossopapo/
```

### Hardening Adicional

```bash
# Desabilitar login root via SSH
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl reload sshd

# Alterar porta SSH (opcional)
sudo sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config
sudo ufw allow 2222/tcp
sudo systemctl reload sshd

# Instalar auditd para logs detalhados
sudo apt install auditd -y
sudo systemctl enable auditd
sudo systemctl start auditd
```

---

## 📈 Otimização

### Nginx

**Ajustar worker_processes**
```bash
# Ver número de CPUs
nproc

# Editar nginx.conf
sudo nano /etc/nginx/nginx.conf
# worker_processes auto;
# worker_connections 1024;
```

**Habilitar HTTP/2**
```bash
# Já está habilitado em /etc/nginx/sites-available/nossopapo
# listen 443 ssl http2;
```

**Cache de conteúdo estático**
```bash
# Já configurado para assets (js, css, imagens)
# Verificar em /etc/nginx/sites-available/nossopapo
```

### Sistema

**Ajustar swap**
```bash
# Ver swap atual
swapon --show

# Ajustar swappiness
sudo sysctl vm.swappiness=10
echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
```

**Limpar cache de memória**
```bash
# Limpar cache de página
sudo sync; echo 1 | sudo tee /proc/sys/vm/drop_caches
```

---

## 🧹 Scripts de Limpeza

### Limpeza Completa

```bash
#!/bin/bash
# Limpeza completa do sistema

echo "🧹 Iniciando limpeza do sistema..."

# Limpar apt
sudo apt-get clean
sudo apt-get autoclean
sudo apt-get autoremove -y

# Limpar logs antigos
sudo journalctl --vacuum-time=7d

# Limpar cache Nginx
sudo rm -rf /var/cache/nginx/*

# Limpar backups antigos (manter últimos 7)
find /var/www/nossopapo/backups/ -name "*.tar.gz" -mtime +7 -delete

# Limpar logs de instalação antigos (manter últimos 30 dias)
find /var/www/nossopapo/logs/ -name "install_*.log" -mtime +30 -delete

# Mostrar espaço recuperado
df -h /

echo "✅ Limpeza concluída!"
```

---

## 📞 Contatos de Emergência

- **Suporte Técnico:** admin@nossopapo.net
- **Emergências:** [NÚMERO DE TELEFONE]
- **GitHub Issues:** https://github.com/mrpink2025/papo-leve-chat/issues

---

## 📝 Registro de Manutenções

### Template

```
Data: YYYY-MM-DD HH:MM
Responsável: [NOME]
Tipo: [Preventiva/Corretiva/Emergência]
Descrição: [O que foi feito]
Resultado: [Sucesso/Falha/Parcial]
Observações: [Notas adicionais]
Downtime: [Tempo de indisponibilidade]

Signed by Mr_Pink — Nosso Papo (nossopapo.net)
```

---

**Assinado por:** Mr_Pink  
**Nosso Papo** — Onde cada conversa importa  
© 2025 · https://nossopapo.net
