#!/bin/bash

################################################################################
# Script de Atualização Automática — Nosso Papo
# Assinado por: Mr_Pink — Nosso Papo (nossopapo.net)
# 
# Este script atualiza o aplicativo Nosso Papo no servidor de produção:
# - Faz backup automático antes de atualizar
# - Baixa as últimas alterações do GitHub
# - Instala dependências e reconstrói o aplicativo
# - Valida o build e faz health check
# - Rollback automático em caso de falha
################################################################################

set -e  # Parar em caso de erro (exceto onde tratado)

# Cores ANSI
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Variáveis do sistema
APP_DIR="/var/www/nossopapo"
REPO_URL="https://github.com/mrpink2025/papo-leve-chat.git"
BACKUP_DIR="${APP_DIR}/backups"
LOG_DIR="${APP_DIR}/logs"
DOMAIN="nossopapo.net"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${LOG_DIR}/update_${TIMESTAMP}.log"
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz"
LOCK_FILE="/var/lock/nossopapo_update.lock"

# Flags
FORCE_UPDATE=false
SKIP_BACKUP=false
DRY_RUN=false
VERBOSE=false
ALLOW_ROLLBACK=false

# Webhook URL para notificações (opcional)
# Descomente e configure para receber notificações no Discord/Slack
# WEBHOOK_URL="https://discord.com/api/webhooks/..."

# Função de logging
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" >> "${LOG_FILE}"
    
    case $level in
        "INFO")
            echo -e "${BLUE}ℹ${NC} ${message}"
            ;;
        "SUCCESS")
            echo -e "${GREEN}✅${NC} ${message}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠${NC} ${message}"
            ;;
        "ERROR")
            echo -e "${RED}❌${NC} ${message}"
            ;;
        "STEP")
            echo -e "${CYAN}▶${NC} ${BOLD}${message}${NC}"
            ;;
    esac
}

error() {
    log "ERROR" "$@"
    exit 1
}

warning() {
    log "WARNING" "$@"
}

success() {
    log "SUCCESS" "$@"
}

info() {
    log "INFO" "$@"
}

step() {
    log "STEP" "$@"
}

# Executar comando de forma segura com possibilidade de rollback
safe_execute() {
    local description=$1
    shift
    local command="$@"
    
    if ! eval "$command"; then
        error "Falha: $description"
        if [[ "$ALLOW_ROLLBACK" == true ]]; then
            rollback
        fi
        exit 1
    fi
}

# Banner
show_banner() {
    echo -e "${PURPLE}"
    cat << "EOF"
──────────────────────────────────────────────────────────
     _   _                         _____                     
    | \ | | ___  ___  ___  ___    |  __ \  __ _ _ __   ___  
    |  \| |/ _ \/ __/ __|/ _ \   | |__) |/ _` | '_ \ / _ \ 
    | |\  | (_) \__ \__ \ (_) |  |  ___/| (_| | |_) | (_) |
    |_| \_|\___/|___/___/\___/   |_|     \__,_| .__/ \___/ 
                                              |_|           
        💬 ATUALIZAÇÃO AUTOMÁTICA — Nosso Papo
──────────────────────────────────────────────────────────
EOF
    echo -e "${NC}"
    echo -e "${WHITE}Signed by Mr_Pink — Nosso Papo (nossopapo.net)${NC}\n"
}

# Função de ajuda
show_help() {
    cat << EOF
Uso: $0 [OPTIONS]

Script de atualização automática do Nosso Papo

Opções:
    --force         Forçar rebuild mesmo sem mudanças
    --skip-backup   Pular backup (uso avançado, não recomendado)
    --dry-run       Simular atualização sem executar
    --verbose       Modo verbose com mais detalhes
    -h, --help      Mostrar esta ajuda

Exemplos:
    sudo $0                    # Atualização normal
    sudo $0 --force            # Forçar atualização completa
    sudo $0 --dry-run          # Simular sem executar

EOF
    exit 0
}

# Processar argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE_UPDATE=true
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_help
            ;;
        *)
            echo "Opção desconhecida: $1"
            show_help
            ;;
    esac
done

# Verificar root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "Este script deve ser executado como root (sudo)"
    fi
    success "Permissões de root verificadas"
}

# Verificar sistema operacional
check_os() {
    if [[ ! -f /etc/os-release ]]; then
        error "Não foi possível detectar o sistema operacional"
    fi
    
    . /etc/os-release
    if [[ "$ID" != "ubuntu" ]]; then
        warning "Sistema operacional não é Ubuntu. Continuando mesmo assim..."
    fi
    success "Sistema operacional: $PRETTY_NAME"
}

# Verificar diretório
check_directory() {
    if [[ ! -d "$APP_DIR" ]]; then
        error "Diretório da aplicação não encontrado: $APP_DIR"
    fi
    
    if [[ ! -d "$APP_DIR/.git" ]]; then
        error "Repositório Git não encontrado em $APP_DIR"
    fi
    
    success "Diretório da aplicação verificado"
}

# Corrigir propriedade do repositório Git
fix_git_ownership() {
    step "Verificando configuração do Git..."

    # Validar mudança de diretório
    if ! cd "$APP_DIR" 2>/dev/null; then
        error "Falha ao acessar diretório: $APP_DIR"
    fi

    # Confirmar que estamos no diretório correto
    if [[ "$PWD" != "$APP_DIR" ]]; then
        error "Diretório atual incorreto. Esperado: $APP_DIR, Atual: $PWD"
    fi

    # Verificar status do Git e tratar 'unsafe repository'
    local status_output
    status_output=$(git status 2>&1 || true)

    if [[ "$status_output" == *"dubious ownership"* || "$status_output" == *"unsafe repository"* ]]; then
        warning "Repositório marcado como 'unsafe'. Configurando safe.directory (global)..."
        if git config --global --add safe.directory "$APP_DIR"; then
            success "safe.directory (global) configurado"
            # Tentar novamente após configurar
            if git status &>/dev/null; then
                success "Repositório Git OK após ajuste de segurança"
                return 0
            fi
        else
            error "Falha ao configurar safe.directory global para $APP_DIR"
        fi
    fi

    # Se ainda falhar, tentar configuração local (quando permitido)
    if ! git status &>/dev/null; then
        warning "Tentando configurar safe.directory (local)..."
        if git config --local safe.directory "$APP_DIR"; then
            success "Repositório Git configurado (local)"
        else
            error "Falha ao configurar safe.directory local. Verifique permissões e propriedade do diretório."
        fi
    else
        success "Repositório Git OK"
    fi
}

# Criar diretórios necessários
setup_directories() {
    mkdir -p "${BACKUP_DIR}"
    mkdir -p "${LOG_DIR}"
    success "Diretórios de backup e logs configurados"
}

# Verificar lock de execução
check_lock() {
    if [[ -f "$LOCK_FILE" ]]; then
        local pid=$(cat "$LOCK_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            error "Atualização já está rodando (PID: $pid)"
        else
            warning "Lock file obsoleto removido"
            rm -f "$LOCK_FILE"
        fi
    fi
    
    echo $$ > "$LOCK_FILE"
    success "Lock de execução criado"
}

# Remover lock ao sair
cleanup_lock() {
    rm -f "$LOCK_FILE"
}

# Verificar espaço em disco
check_disk_space() {
    step "Verificando espaço em disco..."
    
    local available=$(df -BG "$APP_DIR" | tail -1 | awk '{print $4}' | sed 's/G//')
    local required=2  # GB necessários
    
    if [[ $available -lt $required ]]; then
        error "Espaço insuficiente: ${available}GB disponível, ${required}GB necessário"
    fi
    
    success "Espaço em disco: ${available}GB disponível"
}

# Obter versão atual
get_current_version() {
    if ! cd "$APP_DIR" 2>/dev/null; then
        error "Falha ao acessar diretório: $APP_DIR"
    fi
    
    # Tentar obter versão do Git
    if git rev-parse --short HEAD 2>/dev/null; then
        return 0
    else
        # Se falhar, retornar "unknown"
        echo "unknown"
        return 0
    fi
}

# Criar backup
create_backup() {
    if [[ "$SKIP_BACKUP" == true ]]; then
        warning "Backup pulado (--skip-backup)"
        return 0
    fi
    
    step "Criando backup..."
    
    if [[ "$DRY_RUN" == true ]]; then
        info "DRY RUN: Backup seria criado em ${BACKUP_FILE}"
        return 0
    fi
    
    if ! cd "$APP_DIR" 2>/dev/null; then
        error "Falha ao acessar diretório: $APP_DIR"
    fi
    
    # Criar backup do dist/ e .env
    tar -czf "${BACKUP_FILE}" \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=logs \
        --exclude=backups \
        dist/ .env package.json bun.lockb 2>/dev/null || true
    
    if [[ -f "${BACKUP_FILE}" ]]; then
        local size=$(du -h "${BACKUP_FILE}" | cut -f1)
        success "Backup criado: ${BACKUP_FILE##*/} (${size})"
    else
        error "Falha ao criar backup"
    fi
}

# Verificar atualizações disponíveis
check_updates() {
    step "Verificando atualizações disponíveis..."
    
    if ! cd "$APP_DIR" 2>/dev/null; then
        error "Falha ao acessar diretório: $APP_DIR"
    fi
    
    # Garantir que o repositório Git está configurado corretamente
    status_output=$(git status 2>&1 || true)
    if [[ "$status_output" == *"dubious ownership"* || "$status_output" == *"unsafe repository"* ]]; then
        warning "Repositório marcado como 'unsafe'. Ajustando safe.directory (global)..."
        if git config --global --add safe.directory "$APP_DIR"; then
            success "safe.directory (global) configurado"
        else
            error "Falha ao configurar safe.directory global"
        fi
    elif ! git status &>/dev/null; then
        warning "Corrigindo configuração do Git (local)..."
        git config --local safe.directory "$APP_DIR" || warning "Não foi possível configurar safe.directory local"
    fi
    
    git fetch origin 2>&1 | tee -a "${LOG_FILE}"
    
    local LOCAL=$(git rev-parse @)
    local REMOTE=$(git rev-parse @{u})
    local BASE=$(git merge-base @ @{u})
    
    if [[ "$LOCAL" == "$REMOTE" ]]; then
        if [[ "$FORCE_UPDATE" == false ]]; then
            success "Repositório já está atualizado!"
            info "Use --force para forçar rebuild"
            exit 0
        else
            info "Forçando atualização (--force)"
        fi
    elif [[ "$LOCAL" == "$BASE" ]]; then
        local commits=$(git rev-list --count HEAD..@{u})
        success "${commits} commit(s) novo(s) disponível(is)"
        
        if [[ "$VERBOSE" == true ]]; then
            echo -e "\n${CYAN}Mudanças:${NC}"
            git log --oneline HEAD..@{u} | head -10
            echo ""
        fi
    else
        error "Repositório local tem mudanças não enviadas para o GitHub"
    fi
}

# Atualizar código
update_code() {
    step "Baixando atualizações do GitHub..."
    
    if [[ "$DRY_RUN" == true ]]; then
        info "DRY RUN: git pull seria executado"
        return 0
    fi
    
    if ! cd "$APP_DIR" 2>/dev/null; then
        error "Falha ao acessar diretório: $APP_DIR"
    fi
    
    # Resetar mudanças locais se houver
    if [[ -n $(git status --porcelain) ]]; then
        warning "Mudanças locais detectadas, resetando..."
        git reset --hard HEAD
    fi
    
    # Pull do repositório
    if git pull origin main 2>&1 | tee -a "${LOG_FILE}"; then
        success "Código atualizado com sucesso"
    else
        error "Falha ao atualizar código do GitHub"
    fi
}

# Instalar dependências
install_dependencies() {
    step "Instalando dependências..."
    
    if [[ "$DRY_RUN" == true ]]; then
        info "DRY RUN: bun install seria executado"
        return 0
    fi
    
    if ! cd "$APP_DIR" 2>/dev/null; then
        error "Falha ao acessar diretório: $APP_DIR"
    fi
    
    if command -v bun &> /dev/null; then
        if bun install 2>&1 | tee -a "${LOG_FILE}"; then
            success "Dependências instaladas"
        else
            error "Falha ao instalar dependências"
        fi
    else
        error "Bun não está instalado"
    fi
}

# Build do projeto
build_project() {
    step "Construindo projeto..."
    
    if [[ "$DRY_RUN" == true ]]; then
        info "DRY RUN: bun run build seria executado"
        return 0
    fi
    
    if ! cd "$APP_DIR" 2>/dev/null; then
        error "Falha ao acessar diretório: $APP_DIR"
    fi
    
    # Limpar build anterior
    rm -rf dist/
    
    if bun run build 2>&1 | tee -a "${LOG_FILE}"; then
        success "Build concluído com sucesso"
    else
        error "Falha no build do projeto"
    fi
}

# Validar build
validate_build() {
    step "Validando build..."
    
    if [[ "$DRY_RUN" == true ]]; then
        info "DRY RUN: Validação seria executada"
        return 0
    fi
    
    # Verificar arquivos essenciais
    if [[ ! -f "${APP_DIR}/dist/index.html" ]]; then
        error "Build inválido: index.html não encontrado"
    fi
    
    # Aceitar manifest.json ou manifest.webmanifest
    if [[ ! -f "${APP_DIR}/dist/manifest.json" && ! -f "${APP_DIR}/dist/manifest.webmanifest" ]]; then
        error "Build inválido: manifest.json ou manifest.webmanifest não encontrado"
    fi
    
    if [[ ! -d "${APP_DIR}/dist/assets" ]]; then
        error "Build inválido: diretório assets não encontrado"
    fi
    
    # Verificar tamanho mínimo do build (100KB)
    local size_kb=$(du -sk "${APP_DIR}/dist" | cut -f1)
    if [[ $size_kb -lt 100 ]]; then
        error "Build muito pequeno (${size_kb}KB). Possível falha no build."
    fi
    
    local size=$(du -sh "${APP_DIR}/dist" | cut -f1)
    success "Build validado (${size})"
}

# Testar Nginx
test_nginx() {
    step "Testando configuração do Nginx..."
    
    if [[ "$DRY_RUN" == true ]]; then
        info "DRY RUN: nginx -t seria executado"
        return 0
    fi
    
    if nginx -t 2>&1 | tee -a "${LOG_FILE}"; then
        success "Configuração do Nginx OK"
    else
        error "Configuração do Nginx inválida"
    fi
}

# Recarregar Nginx
reload_nginx() {
    step "Recarregando Nginx..."
    
    if [[ "$DRY_RUN" == true ]]; then
        info "DRY RUN: systemctl reload nginx seria executado"
        return 0
    fi
    
    if systemctl reload nginx 2>&1 | tee -a "${LOG_FILE}"; then
        success "Nginx recarregado"
    else
        error "Falha ao recarregar Nginx"
    fi
}

# Health check
health_check() {
    step "Executando health check..."
    
    if [[ "$DRY_RUN" == true ]]; then
        info "DRY RUN: Health check seria executado"
        return 0
    fi
    
    sleep 3  # Aguardar Nginx processar
    
    # Health check com retry e follow redirects
    local max_attempts=3
    local attempt=1
    local response=""
    
    while [[ $attempt -le $max_attempts ]]; do
        response=$(curl -s -L -o /dev/null -w "%{http_code}" "https://${DOMAIN}" --max-time 10)
        
        if [[ "$response" == "200" ]]; then
            success "Health check: OK (HTTP ${response})"
            break
        else
            warning "Tentativa ${attempt}/${max_attempts}: HTTP ${response}"
            sleep 2
            ((attempt++))
        fi
    done
    
    if [[ "$response" != "200" ]]; then
        error "Health check falhou após ${max_attempts} tentativas (HTTP ${response})"
    fi
    
    # Verificar PWA manifest (tentar ambos os formatos)
    local manifest_response=$(curl -s -L -o /dev/null -w "%{http_code}" "https://${DOMAIN}/manifest.webmanifest" --max-time 5)
    if [[ "$manifest_response" != "200" ]]; then
        manifest_response=$(curl -s -L -o /dev/null -w "%{http_code}" "https://${DOMAIN}/manifest.json" --max-time 5)
    fi
    
    if [[ "$manifest_response" == "200" ]]; then
        success "PWA manifest: OK"
    else
        warning "PWA manifest não acessível (HTTP ${manifest_response})"
    fi
    
    # Verificar Service Worker
    local sw_response=$(curl -s -L -o /dev/null -w "%{http_code}" "https://${DOMAIN}/sw.js" --max-time 5)
    if [[ "$sw_response" == "200" ]]; then
        success "Service Worker: OK"
    else
        warning "Service Worker não acessível (HTTP ${sw_response})"
    fi
}

# Limpar backups antigos
cleanup_backups() {
    step "Limpando backups antigos..."
    
    if [[ "$DRY_RUN" == true ]]; then
        info "DRY RUN: Backups antigos seriam removidos"
        return 0
    fi
    
    # Manter apenas os últimos 7 backups
    if ! cd "${BACKUP_DIR}" 2>/dev/null; then
        warning "Falha ao acessar diretório de backups: ${BACKUP_DIR}"
        return 0
    fi
    ls -t backup_*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm --
    
    local count=$(ls -1 backup_*.tar.gz 2>/dev/null | wc -l)
    success "Backups mantidos: ${count}"
}

# Rollback em caso de erro
rollback() {
    warning "Iniciando rollback..."
    
    if [[ "$SKIP_BACKUP" == true ]]; then
        error "Rollback impossível: backup foi pulado (--skip-backup)"
    fi
    
    if [[ ! -f "${BACKUP_FILE}" ]]; then
        error "Arquivo de backup não encontrado: ${BACKUP_FILE}"
        warning "Verifique backups anteriores em: ${BACKUP_DIR}"
        ls -lth "${BACKUP_DIR}" 2>/dev/null || true
        send_notification "failure" "❌ Rollback falhou: backup não encontrado"
        exit 1
    fi
    
    if ! cd "$APP_DIR" 2>/dev/null; then
        error "Falha ao acessar diretório durante rollback: $APP_DIR"
    fi
    
    # Limpar dist/ antes de restaurar
    info "Limpando diretório dist/ antes de restaurar..."
    rm -rf dist/
    
    # Restaurar backup
    if tar -xzf "${BACKUP_FILE}" 2>&1 | tee -a "${LOG_FILE}"; then
        success "Backup restaurado"
    else
        error "Falha ao restaurar backup"
    fi
    
    # Testar Nginx antes de recarregar
    if nginx -t 2>&1 | tee -a "${LOG_FILE}"; then
        systemctl reload nginx
        success "Nginx recarregado após rollback"
    else
        error "Configuração do Nginx inválida após rollback"
    fi
    
    send_notification "failure" "❌ Atualização falhou. Rollback executado para versão ${OLD_VERSION}"
    error "Rollback concluído. Sistema restaurado para versão anterior."
}

# Relatório final
generate_report() {
    local END_TIME=$(date +%s)
    local DURATION=$((END_TIME - START_TIME))
    local DURATION_MIN=$((DURATION / 60))
    local DURATION_SEC=$((DURATION % 60))
    
    local NEW_VERSION=$(get_current_version)
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}${BOLD}           ATUALIZAÇÃO CONCLUÍDA COM SUCESSO!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${WHITE}📊 Resumo:${NC}"
    echo -e "   ${CYAN}•${NC} Versão anterior: ${OLD_VERSION}"
    echo -e "   ${CYAN}•${NC} Versão atual: ${NEW_VERSION}"
    echo -e "   ${CYAN}•${NC} Tempo total: ${DURATION_MIN}m ${DURATION_SEC}s"
    echo -e "   ${CYAN}•${NC} Site: ${GREEN}https://${DOMAIN}${NC}"
    echo -e "   ${CYAN}•${NC} Log: ${LOG_FILE}"
    echo ""
    echo -e "${WHITE}Signed by Mr_Pink — Nosso Papo (nossopapo.net)${NC}"
    echo ""
}

# Enviar notificação via webhook (opcional)
send_notification() {
    local status=$1  # "success" ou "failure"
    local message=$2
    
    # Verificar se webhook está configurado
    if [[ -z "${WEBHOOK_URL:-}" ]]; then
        return 0
    fi
    
    local color="3066993"  # Verde
    [[ "$status" == "failure" ]] && color="15158332"  # Vermelho
    
    curl -X POST "${WEBHOOK_URL}" \
        -H "Content-Type: application/json" \
        -d "{
            \"embeds\": [{
                \"title\": \"Nosso Papo - Atualização\",
                \"description\": \"${message}\",
                \"color\": ${color},
                \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
                \"footer\": {
                    \"text\": \"${DOMAIN}\"
                }
            }]
        }" \
        --max-time 5 2>/dev/null || true
}

# Trap para cleanup (não para rollback automático)
trap cleanup_lock EXIT

################################################################################
# EXECUÇÃO PRINCIPAL
################################################################################

START_TIME=$(date +%s)

show_banner

# Validações iniciais (SEM rollback)
check_root
check_os
check_directory
check_lock
check_disk_space
setup_directories

# Corrigir Git antes de qualquer operação
fix_git_ownership

# Obter versão atual
OLD_VERSION=$(get_current_version)
info "Versão atual: ${OLD_VERSION}"

# Criar backup (sem rollback - não há backup para restaurar ainda)
create_backup
check_updates

# ✅ CHECKPOINT: A partir daqui, rollback está habilitado
ALLOW_ROLLBACK=true

# Processo de atualização (COM rollback em caso de falha)
safe_execute "Atualizar código" update_code
safe_execute "Instalar dependências" install_dependencies
safe_execute "Build do projeto" build_project
safe_execute "Validar build" validate_build
safe_execute "Testar Nginx" test_nginx
safe_execute "Recarregar Nginx" reload_nginx
safe_execute "Health check" health_check

# Limpeza (não crítico)
cleanup_backups

# Relatório final
generate_report

# Notificar sucesso
send_notification "success" "✅ Atualização concluída: ${OLD_VERSION} → $(get_current_version)"

exit 0
