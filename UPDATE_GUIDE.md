# 🔄 Guia de Atualização — Nosso Papo

**Assinado por:** Mr_Pink | **Domínio:** https://nossopapo.net

---

## 📖 Visão Geral

O script `update_nossopapo.sh` automatiza completamente o processo de atualização do aplicativo Nosso Papo no servidor de produção, garantindo segurança e confiabilidade através de:

- ✅ Backup automático antes de qualquer alteração
- ✅ Validação completa do código e build
- ✅ Rollback automático em caso de falha
- ✅ Health checks pós-atualização
- ✅ Logs detalhados de cada operação
- ✅ Zero downtime durante a atualização

---

## 🚀 Uso Básico

### Atualização Normal (Recomendado)

```bash
sudo /var/www/nossopapo/update_nossopapo.sh
```

Este comando irá:
1. Criar backup automático
2. Verificar se há atualizações no GitHub
3. Baixar as mudanças
4. Instalar dependências (se necessário)
5. Rebuildar o aplicativo
6. Recarregar o Nginx
7. Executar health check
8. Gerar relatório de atualização

**Nota:** Se não houver atualizações disponíveis, o script informará e não fará nenhuma alteração.

---

## ⚙️ Opções Avançadas

### Forçar Rebuild

Use quando quiser rebuildar mesmo sem mudanças no código (útil após editar `.env` ou resolver problemas):

```bash
sudo /var/www/nossopapo/update_nossopapo.sh --force
```

### Simular Atualização (Dry Run)

Para ver o que seria feito sem executar de fato:

```bash
sudo /var/www/nossopapo/update_nossopapo.sh --dry-run
```

### Modo Verbose

Para ver mais detalhes durante a execução:

```bash
sudo /var/www/nossopapo/update_nossopapo.sh --verbose
```

### Pular Backup (Não Recomendado)

Apenas para uso avançado quando você já tem um backup recente:

```bash
sudo /var/www/nossopapo/update_nossopapo.sh --skip-backup
```

### Combinar Opções

Você pode combinar múltiplas opções:

```bash
sudo /var/www/nossopapo/update_nossopapo.sh --force --verbose
```

---

## 📊 Entendendo a Saída

### Exemplo de Execução Bem-Sucedida

```
──────────────────────────────────────────────────────────
     _   _                         _____                     
    | \ | | ___  ___  ___  ___    |  __ \  __ _ _ __   ___  
    |  \| |/ _ \/ __/ __|/ _ \   | |__) |/ _` | '_ \ / _ \ 
    | |\  | (_) \__ \__ \ (_) |  |  ___/| (_| | |_) | (_) |
    |_| \_|\___/|___/___/\___/   |_|     \__,_| .__/ \___/ 
                                              |_|           
        💬 ATUALIZAÇÃO AUTOMÁTICA — Nosso Papo
──────────────────────────────────────────────────────────

Signed by Mr_Pink — Nosso Papo (nossopapo.net)

✅ Permissões de root verificadas
✅ Sistema operacional: Ubuntu 24.04.1 LTS
✅ Diretório da aplicação verificado
✅ Diretórios de backup e logs configurados
ℹ Versão atual: abc1234
▶ Criando backup...
✅ Backup criado: backup_20250116_150230.tar.gz (2.3M)
▶ Verificando atualizações disponíveis...
✅ 3 commit(s) novo(s) disponível(is)
▶ Baixando atualizações do GitHub...
✅ Código atualizado com sucesso
▶ Instalando dependências...
✅ Dependências instaladas
▶ Construindo projeto...
✅ Build concluído com sucesso
▶ Validando build...
✅ Build validado (5.2M)
▶ Testando configuração do Nginx...
✅ Configuração do Nginx OK
▶ Recarregando Nginx...
✅ Nginx recarregado
▶ Executando health check...
✅ Health check: OK (HTTP 200)
✅ PWA manifest: OK
▶ Limpando backups antigos...
✅ Backups mantidos: 7

═══════════════════════════════════════════════════════════
           ATUALIZAÇÃO CONCLUÍDA COM SUCESSO!
═══════════════════════════════════════════════════════════

📊 Resumo:
   • Versão anterior: abc1234
   • Versão atual: def5678
   • Tempo total: 2m 34s
   • Site: https://nossopapo.net
   • Log: /var/www/nossopapo/logs/update_20250116_150230.log

Signed by Mr_Pink — Nosso Papo (nossopapo.net)
```

---

## 🔄 Processo de Atualização Detalhado

### 1️⃣ Validações Iniciais (5-10s)

- Verifica permissões de root
- Valida sistema operacional
- Confirma existência do repositório Git
- Cria diretórios de backup/logs se necessário

### 2️⃣ Backup Automático (10-30s)

- Cria arquivo comprimido com:
  - Diretório `dist/` completo
  - Arquivo `.env`
  - `package.json` e `bun.lockb`
- Salva em `/var/www/nossopapo/backups/`
- Formato: `backup_YYYYMMDD_HHMMSS.tar.gz`

### 3️⃣ Verificação de Atualizações (5-10s)

- Executa `git fetch` para verificar mudanças
- Compara versão local com remota
- Mostra quantidade de commits novos
- Cancela se não houver atualizações (exceto com `--force`)

### 4️⃣ Atualização do Código (10-30s)

- Reseta mudanças locais se houver
- Executa `git pull origin main`
- Trata conflitos automaticamente (favorece versão remota)

### 5️⃣ Instalação de Dependências (30-120s)

- Executa `bun install`
- Atualiza apenas dependências modificadas
- Cache acelera processo em atualizações subsequentes

### 6️⃣ Build do Projeto (60-180s)

- Remove `dist/` anterior
- Executa `bun run build`
- Compila e otimiza todos os assets
- Gera bundle de produção

### 7️⃣ Validação (5s)

- Verifica existência de `dist/index.html`
- Confirma presença do `manifest.json`
- Valida tamanho do build

### 8️⃣ Atualização do Nginx (2-5s)

- Testa configuração (`nginx -t`)
- Recarrega Nginx sem downtime
- Mantém conexões ativas durante reload

### 9️⃣ Health Check (5-10s)

- Faz requisição HTTP ao site
- Valida resposta 200 OK
- Testa acessibilidade do PWA manifest
- Verifica service worker

### 🔟 Finalização (2s)

- Remove backups antigos (mantém últimos 7)
- Gera relatório final
- Registra tempo total de execução

---

## 🛡️ Segurança e Rollback

### Rollback Automático

O script possui **rollback automático** que é acionado em caso de:

1. **Falha no Build**
   - Se `bun run build` falhar
   - Restaura backup automaticamente
   - Recarrega Nginx com versão anterior

2. **Falha no Health Check**
   - Se o site retornar erro após atualização
   - Reverte para backup imediatamente
   - Notifica sobre o problema

3. **Erro Crítico**
   - Qualquer erro não tratado ativa rollback
   - Sistema sempre mantém versão funcional

### Processo de Rollback

```bash
⚠ Iniciando rollback...
💾 Restaurando backup: backup_20250116_150230.tar.gz
🔄 Recarregando Nginx...
❌ Rollback concluído. Sistema restaurado para versão anterior.
```

---

## 📝 Logs

### Localização

Todos os logs são salvos em:
```
/var/www/nossopapo/logs/update_YYYYMMDD_HHMMSS.log
```

### Visualizar Log Mais Recente

```bash
# Ver todo o log
cat $(ls -t /var/www/nossopapo/logs/update_*.log | head -1)

# Últimas 50 linhas
tail -50 $(ls -t /var/www/nossopapo/logs/update_*.log | head -1)

# Acompanhar em tempo real (durante atualização)
tail -f /var/www/nossopapo/logs/update_*.log
```

### Conteúdo do Log

O log contém:
- Timestamp de cada operação
- Saída completa do Git
- Logs do `bun install`
- Logs do `bun run build`
- Resultados de testes do Nginx
- Respostas dos health checks

---

## 💾 Backups

### Gerenciamento Automático

- **Criação:** Automática antes de cada atualização
- **Localização:** `/var/www/nossopapo/backups/`
- **Retenção:** Últimos 7 backups
- **Limpeza:** Automática (remove backups antigos)

### Listar Backups

```bash
ls -lht /var/www/nossopapo/backups/
```

### Restaurar Backup Manualmente

Se precisar restaurar um backup específico:

```bash
# 1. Parar Nginx (opcional, mas recomendado)
sudo systemctl stop nginx

# 2. Ir para o diretório
cd /var/www/nossopapo

# 3. Restaurar backup
sudo tar -xzf backups/backup_20250116_150230.tar.gz

# 4. Reiniciar Nginx
sudo systemctl start nginx
```

---

## 🔧 Troubleshooting

### Script não executa

**Problema:** `Permission denied`

**Solução:**
```bash
sudo chmod +x /var/www/nossopapo/update_nossopapo.sh
```

---

### Git pull falha com conflitos

**Problema:** Mudanças locais conflitantes

**Solução:** O script reseta automaticamente, mas você pode fazer manualmente:
```bash
cd /var/www/nossopapo
git reset --hard HEAD
git pull
```

---

### Build falha

**Problema:** Erro durante `bun run build`

**Ações Automáticas:**
1. Script executa rollback
2. Versão anterior é restaurada
3. Site continua funcionando

**Investigar:**
```bash
# Ver log completo
cat $(ls -t /var/www/nossopapo/logs/update_*.log | head -1)

# Tentar build manualmente
cd /var/www/nossopapo
bun run build
```

---

### Health check falha

**Problema:** Site não responde após atualização

**Ações Automáticas:**
1. Rollback imediato
2. Nginx recarregado com versão anterior

**Verificar:**
```bash
# Testar manualmente
curl -I https://nossopapo.net

# Ver logs do Nginx
sudo tail -50 /var/log/nginx/nossopapo_error.log
```

---

### Espaço em disco insuficiente

**Problema:** Não há espaço para criar backup

**Solução:**
```bash
# Verificar espaço
df -h

# Remover backups antigos manualmente
sudo rm /var/www/nossopapo/backups/backup_202501*.tar.gz

# Limpar logs antigos
sudo find /var/www/nossopapo/logs -mtime +30 -delete
```

---

## ⏰ Atualização Automática (Agendada)

### Configurar Atualização Diária

Para agendar atualizações automáticas (ex: 3:00 AM):

```bash
# Editar crontab
sudo crontab -e

# Adicionar linha:
0 3 * * * /var/www/nossopapo/update_nossopapo.sh --force >> /var/www/nossopapo/logs/auto_update.log 2>&1
```

### Desativar Atualização Automática

```bash
# Editar crontab
sudo crontab -e

# Comentar ou remover a linha da atualização
```

---

## ✅ Checklist Pós-Atualização

Após uma atualização bem-sucedida, verifique:

- [ ] Site está acessível: https://nossopapo.net
- [ ] PWA está funcionando
- [ ] Login funciona corretamente
- [ ] Mensagens podem ser enviadas/recebidas
- [ ] Chamadas de áudio/vídeo funcionam
- [ ] Notificações push funcionam (se habilitadas)
- [ ] Sem erros no console do navegador (F12)
- [ ] Performance está normal

---

## 📞 Suporte

Se encontrar problemas:

1. **Verifique os logs:**
   ```bash
   cat $(ls -t /var/www/nossopapo/logs/update_*.log | head -1)
   ```

2. **Verifique status dos serviços:**
   ```bash
   sudo systemctl status nginx
   ```

3. **Restaure backup anterior:**
   ```bash
   sudo systemctl stop nginx
   cd /var/www/nossopapo
   sudo tar -xzf backups/backup_MAIS_RECENTE.tar.gz
   sudo systemctl start nginx
   ```

4. **Reverta via Git:**
   ```bash
   cd /var/www/nossopapo
   git log --oneline -10  # Ver últimos commits
   git reset --hard COMMIT_ANTERIOR
   bun install
   bun run build
   sudo systemctl reload nginx
   ```

---

## 🎯 Melhores Práticas

1. **Sempre faça backup antes de mudanças manuais**
   ```bash
   /var/www/nossopapo/backup.sh
   ```

2. **Teste em horários de baixo tráfego**
   - Ideal: Madrugada (2-5 AM)
   - Evite: Horário comercial

3. **Monitore após atualização**
   ```bash
   # Acompanhar logs em tempo real
   tail -f /var/log/nginx/nossopapo_access.log
   ```

4. **Mantenha backups externos**
   - Copie backups importantes para outro servidor
   - Use rsync ou scp

5. **Documente mudanças importantes**
   - Anote versões antes/depois
   - Registre problemas encontrados

---

## 📚 Referências

- **Instalação:** Ver `INSTALLATION.md`
- **Manutenção:** Ver `MAINTENANCE.md`
- **Comandos Rápidos:** Ver `QUICKREF.md`
- **GitHub:** https://github.com/mrpink2025/papo-leve-chat

---

**Assinado por:** Mr_Pink  
**Nosso Papo** — Onde cada conversa importa  
© 2025 · https://nossopapo.net
