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

# Flags
FORCE_UPDATE=false
SKIP_BACKUP=false
DRY_RUN=false
VERBOSE=false

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
    
    cd "$APP_DIR"
    
    # Verificar se há erro de propriedade
    if ! git status &>/dev/null; then
        warning "Configurando repositório Git como diretório seguro..."
        git config --global --add safe.directory "$APP_DIR"
        success "Repositório Git configurado"
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

# Obter versão atual
get_current_version() {
    cd "$APP_DIR"
    
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
    
    cd "$APP_DIR"
    
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
    
    cd "$APP_DIR"
    
    # Garantir que o repositório Git está configurado corretamente
    if ! git status &>/dev/null; then
        warning "Corrigindo configuração do Git..."
        git config --global --add safe.directory "$APP_DIR"
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
    
    cd "$APP_DIR"
    
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
    
    cd "$APP_DIR"
    
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
    
    cd "$APP_DIR"
    
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
    
    if [[ ! -f "${APP_DIR}/dist/index.html" ]]; then
        error "Build inválido: dist/index.html não encontrado"
    fi
    
    if [[ ! -f "${APP_DIR}/dist/manifest.json" ]]; then
        warning "manifest.json não encontrado no build"
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
    
    sleep 2  # Aguardar Nginx processar
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN}" --max-time 10)
    
    if [[ "$response" == "200" ]]; then
        success "Health check: OK (HTTP ${response})"
    else
        error "Health check falhou (HTTP ${response})"
    fi
    
    # Verificar PWA
    local manifest_response=$(curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN}/manifest.json" --max-time 5)
    if [[ "$manifest_response" == "200" ]]; then
        success "PWA manifest: OK"
    else
        warning "PWA manifest não acessível (HTTP ${manifest_response})"
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
    cd "${BACKUP_DIR}"
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
        exit 1
    fi
    
    cd "$APP_DIR"
    
    # Restaurar backup
    tar -xzf "${BACKUP_FILE}" 2>&1 | tee -a "${LOG_FILE}"
    
    # Recarregar Nginx
    systemctl reload nginx
    
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

# Trap para capturar erros
trap 'rollback' ERR

################################################################################
# EXECUÇÃO PRINCIPAL
################################################################################

START_TIME=$(date +%s)

show_banner

# Validações iniciais
check_root
check_os
check_directory
setup_directories

# Corrigir Git antes de qualquer operação
fix_git_ownership

# Obter versão atual
OLD_VERSION=$(get_current_version)
info "Versão atual: ${OLD_VERSION}"

# Processo de atualização
create_backup
check_updates
update_code
install_dependencies
build_project
validate_build
test_nginx
reload_nginx
health_check
cleanup_backups

# Relatório final
generate_report

exit 0
