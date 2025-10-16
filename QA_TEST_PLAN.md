# Plano de Testes - Sistema de Notificações Push

## Objetivo

Validar todas as funcionalidades do sistema de notificações push antes do lançamento em produção.

## Pré-requisitos

- [ ] Aplicação rodando em HTTPS
- [ ] Supabase configurado
- [ ] Service Worker registrado
- [ ] Pelo menos 2 usuários de teste criados
- [ ] 2 dispositivos/navegadores diferentes

## Fase 1: Testes Básicos

### T1.1: Permissões
**Objetivo**: Verificar solicitação de permissões

Passos:
1. Abrir aplicação em navegador limpo (sem permissões)
2. Fazer login
3. Verificar prompt de permissão aparece
4. Aceitar permissão

**Resultado Esperado**:
- ✅ Prompt aparece automaticamente
- ✅ Após aceitar, `Notification.permission === 'granted'`
- ✅ Subscription é criada automaticamente
- ✅ Toast de sucesso aparece

---

### T1.2: Subscription
**Objetivo**: Verificar criação de subscription

Passos:
1. Após aceitar permissão (T1.1)
2. Verificar no Supabase: `push_subscriptions` table
3. Confirmar que registro foi criado

**Resultado Esperado**:
- ✅ Registro existe com `user_id` correto
- ✅ `endpoint`, `p256dh`, `auth` estão preenchidos
- ✅ `device_name` identifica o dispositivo
- ✅ `last_used_at` está recente

---

### T1.3: Primeira Notificação
**Objetivo**: Enviar primeira notificação

Passos:
1. User A envia mensagem para User B
2. Verificar que User B recebe notificação

**Resultado Esperado**:
- ✅ Notificação aparece em < 2s
- ✅ Título = nome do remetente
- ✅ Corpo = conteúdo da mensagem (truncado se > 100 chars)
- ✅ Clicar abre a conversa correta

---

## Fase 2: Categorias e Prioridades

### T2.1: Categorias
**Objetivo**: Testar todas as categorias

Passos:
1. Enviar mensagem normal → Categoria: `messages`
2. Enviar menção (@username) → Categoria: `mentions`
3. Iniciar chamada → Categoria: `calls`
4. Adicionar reação → Categoria: `reactions`
5. Evento de sistema → Categoria: `system`

**Resultado Esperado**:
- ✅ Cada tipo gera notificação na categoria correta
- ✅ Ícone/som apropriado para cada categoria
- ✅ Prioridade correta aplicada

---

### T2.2: Prioridades
**Objetivo**: Verificar comportamento por prioridade

Configuração:
- Urgent: Chamadas
- High: Menções
- Normal: Mensagens
- Low: Sistema

Passos:
1. Enviar notificação de cada prioridade
2. Verificar comportamentos

**Resultado Esperado**:
- ✅ **Urgent**: `requireInteraction: true`, vibração forte
- ✅ **High**: vibração normal, som ativo
- ✅ **Normal**: vibração padrão
- ✅ **Low**: silenciosa

---

### T2.3: Configurações de Categoria
**Objetivo**: Configurações por categoria funcionam

Passos:
1. Ir em Configurações → Notificações → Categorias
2. Desativar categoria "Reações"
3. Adicionar reação em uma mensagem

**Resultado Esperado**:
- ✅ Nenhuma notificação é enviada
- ✅ Telemetria registra como "blocked"

---

## Fase 3: Multi-device

### T3.1: Deduplicação
**Objetivo**: Evitar notificações duplicadas

Passos:
1. Login com User B em 2 navegadores (Device A e B)
2. User A envia mensagem para User B
3. Observar ambos os dispositivos

**Resultado Esperado**:
- ✅ Notificação aparece apenas no dispositivo mais recente
- ✅ Cache de dedupe funciona (não duplica em 5s)
- ✅ Badge sincroniza em ambos os dispositivos

---

### T3.2: Badge Sync
**Objetivo**: Sincronização de badges

Passos:
1. User B com 2 dispositivos (A e B)
2. User A envia 3 mensagens
3. Verificar badge em ambos dispositivos
4. Device A marca mensagens como lidas
5. Verificar badge no Device B

**Resultado Esperado**:
- ✅ Badge mostra "3" em ambos
- ✅ Ao ler no Device A, badge limpa em < 1s
- ✅ Badge no Device B também limpa

---

### T3.3: Estados Sincronizados
**Objetivo**: Lido/entregue sincroniza

Passos:
1. User A envia mensagem
2. User B recebe no Device A
3. Verificar status = "delivered"
4. User B lê a mensagem no Device B
5. Verificar status no Device A

**Resultado Esperado**:
- ✅ Status atualiza em todos os dispositivos
- ✅ Sincronização em < 1s
- ✅ Realtime funciona corretamente

---

## Fase 4: Chamadas

### T4.1: Chamada Recebida
**Objetivo**: Cartão de chamada funciona

Passos:
1. User A inicia chamada de vídeo para User B
2. Observar User B

**Resultado Esperado**:
- ✅ `IncomingCallCard` aparece no topo da tela
- ✅ Ringtone toca automaticamente
- ✅ Vibração ativa (mobile)
- ✅ Timer conta corretamente
- ✅ Avatar do chamador aparece
- ✅ Animação pulsante funciona

---

### T4.2: Atender Chamada
**Objetivo**: Atender funciona corretamente

Passos:
1. User B recebe chamada (T4.1)
2. Clicar em "Atender"

**Resultado Esperado**:
- ✅ Ringtone para imediatamente
- ✅ `VideoCallDialog` abre
- ✅ Status atualiza para "answered"
- ✅ Jitsi Meet carrega
- ✅ Chamada conecta

---

### T4.3: Recusar Chamada
**Objetivo**: Recusar funciona corretamente

Passos:
1. User B recebe chamada
2. Clicar em "Recusar"

**Resultado Esperado**:
- ✅ Ringtone para
- ✅ Cartão desaparece
- ✅ Status atualiza para "declined"
- ✅ User A é notificado

---

### T4.4: Chamada Perdida
**Objetivo**: Timeout e ligar de volta

Passos:
1. User A liga para User B
2. User B não atende por 30 segundos
3. Verificar chamadas perdidas
4. Clicar em "Ligar de volta"

**Resultado Esperado**:
- ✅ Após 30s, status = "missed"
- ✅ Aparece em `MissedCallsList`
- ✅ "Ligar de volta" inicia nova chamada para User A
- ✅ Tipo de chamada preservado (vídeo/áudio)

---

### T4.5: Ringtones Customizados
**Objetivo**: Ringtones por contato

Passos:
1. Ir em Configurações → Ringtones
2. Definir ringtone "urgent" para User A
3. User A liga para User B
4. Verificar qual ringtone toca

**Resultado Esperado**:
- ✅ Ringtone "urgent" toca (não o padrão)
- ✅ Vibração customizada funciona

---

## Fase 5: Privacidade

### T5.1: Truncamento
**Objetivo**: Mensagens longas são truncadas

Passos:
1. User A envia mensagem com 200 caracteres
2. Verificar payload recebido no Service Worker

**Resultado Esperado**:
- ✅ Corpo tem apenas 100 caracteres
- ✅ Termina com "..."
- ✅ Mensagem completa é carregada ao clicar

---

### T5.2: Dados Mínimos
**Objetivo**: Sem dados sensíveis no payload

Passos:
1. Enviar notificação com avatar, messageId, senderId
2. Inspecionar payload no Service Worker

**Resultado Esperado**:
- ✅ `icon === '/app-icon-192.png'` (não usa avatar)
- ✅ `data.messageId === undefined`
- ✅ `data.senderId === undefined`
- ✅ Apenas conversationId presente

---

## Fase 6: Rate Limiting

### T6.1: Rate Limit por Categoria
**Objetivo**: Rate limiting funciona

Limites:
- Messages: 10/min
- Mentions: 20/min
- Calls: 5/min
- Reactions: 15/min
- System: 5/min

Passos:
1. Enviar 11 mensagens rapidamente (< 1 min)
2. Verificar o que acontece

**Resultado Esperado**:
- ✅ Primeiras 10 são enviadas
- ✅ 11ª é bloqueada
- ✅ Telemetria registra "blocked"
- ✅ Após 1 minuto, pode enviar novamente

---

### T6.2: Quiet Hours
**Objetivo**: Quiet hours funcionam

Passos:
1. Configurar quiet hours: 22:00 - 08:00
2. Mudar horário do sistema para 23:00
3. Enviar mensagem

**Resultado Esperado**:
- ✅ Notificação é bloqueada
- ✅ Motivo: "Quiet Hours ativo"

---

## Fase 7: Telemetria

### T7.1: Tracking de Eventos
**Objetivo**: Todos os eventos são rastreados

Passos:
1. Enviar notificação
2. Verificar tabela `analytics_events`
3. Verificar que evento `notification_sent` existe

**Resultado Esperado**:
- ✅ Evento registrado
- ✅ `event_data` contém latency_ms
- ✅ Timestamp correto

---

### T7.2: Painel de Debug
**Objetivo**: Debug panel funciona

Passos:
1. Adicionar `<NotificationDebugPanel />` em uma página
2. Clicar em "Enviar Notificação de Teste"
3. Verificar estatísticas

**Resultado Esperado**:
- ✅ Status de permissão exibido corretamente
- ✅ Botão de teste envia notificação
- ✅ Estatísticas carregam
- ✅ Latência média < 2s
- ✅ Alerta aparece se latência > 2s

---

### T7.3: Performance
**Objetivo**: Latência dentro do alvo

Passos:
1. Usar debug panel
2. Enviar 10 notificações de teste
3. Verificar latência média

**Resultado Esperado**:
- ✅ Latência média < 2000ms
- ✅ P95 < 3000ms
- ✅ Sem timeouts

---

## Fase 8: Testes de Stress

### T8.1: Múltiplas Notificações
**Objetivo**: Sistema aguenta carga

Passos:
1. Enviar 50 mensagens rapidamente
2. Verificar todas são processadas

**Resultado Esperado**:
- ✅ Rate limiting funciona
- ✅ Agrupamento automático ocorre
- ✅ Sem perda de mensagens
- ✅ Performance mantida

---

### T8.2: Múltiplos Usuários
**Objetivo**: Escalabilidade

Passos:
1. Criar grupo com 10 usuários
2. Enviar mensagem no grupo
3. Verificar que todos recebem

**Resultado Esperado**:
- ✅ Todos os usuários notificados
- ✅ Latência similar para todos
- ✅ Sem duplicatas

---

## Fase 9: Testes de Regressão

### T9.1: Funcionalidades Existentes
**Objetivo**: Nada quebrou

Verificar:
- [ ] Chat funciona normalmente
- [ ] Envio de mensagens OK
- [ ] Mensagens em tempo real
- [ ] Upload de arquivos
- [ ] Stories funcionam
- [ ] Perfis carregam
- [ ] Grupos funcionam

---

### T9.2: Performance Geral
**Objetivo**: App não ficou lento

Medir:
- [ ] Tempo de carregamento inicial
- [ ] Tempo para abrir conversa
- [ ] Tempo para enviar mensagem
- [ ] Uso de memória
- [ ] Uso de CPU

**Resultado Esperado**:
- ✅ Performance similar ou melhor que antes
- ✅ Sem memory leaks
- ✅ CPU usage normal

---

## Fase 10: Testes de Casos Extremos

### T10.1: Sem Conexão
**Objetivo**: Comportamento offline

Passos:
1. Desconectar internet
2. Tentar enviar notificação

**Resultado Esperado**:
- ✅ Erro é tratado graciosamente
- ✅ Mensagem entra na fila offline
- ✅ Ao reconectar, notificação é enviada

---

### T10.2: Permissão Negada
**Objetivo**: UX quando usuário nega

Passos:
1. Negar permissão de notificação
2. Tentar enviar notificação

**Resultado Esperado**:
- ✅ Notificação não é enviada (obviamente)
- ✅ UI mostra que notificações estão desabilitadas
- ✅ Opção de solicitar novamente disponível

---

### T10.3: Service Worker Inativo
**Objetivo**: Recuperação de falhas

Passos:
1. Desregistrar Service Worker manualmente
2. Tentar receber notificação
3. Verificar recuperação

**Resultado Esperado**:
- ✅ Sistema detecta ausência de SW
- ✅ Tenta re-registrar automaticamente
- ✅ Notificações voltam a funcionar

---

## Fase 11: Testes de UI/UX

### T11.1: Responsividade
**Objetivo**: UI funciona em todos os tamanhos

Testar em:
- [ ] Desktop (1920x1080)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)
- [ ] Mobile landscape (667x375)

**Resultado Esperado**:
- ✅ `IncomingCallCard` se ajusta corretamente
- ✅ Botões são acessíveis
- ✅ Texto não fica cortado

---

### T11.2: Acessibilidade
**Objetivo**: Usável para todos

Verificar:
- [ ] Tab navigation funciona
- [ ] Screen reader anuncia corretamente
- [ ] Contraste suficiente
- [ ] Botões têm aria-labels

---

### T11.3: Dark Mode
**Objetivo**: Funciona em ambos os temas

Passos:
1. Trocar para dark mode
2. Receber notificações
3. Abrir debug panel

**Resultado Esperado**:
- ✅ Cores legíveis em dark mode
- ✅ Cartão de chamada bonito
- ✅ Debug panel legível

---

## Fase 12: Testes de Segurança

### T12.1: RLS Policies
**Objetivo**: Dados protegidos

Testes:
1. User A tenta acessar subscriptions de User B
2. User A tenta modificar preferências de User B
3. User A tenta ver histórico de User B

**Resultado Esperado**:
- ✅ Todas as tentativas falham
- ✅ Erro: "row-level security policy"

---

### T12.2: XSS Prevention
**Objetivo**: Sem XSS via notificações

Passos:
1. Enviar mensagem com: `<script>alert('XSS')</script>`
2. Verificar notificação recebida

**Resultado Esperado**:
- ✅ Script não executa
- ✅ Mostrado como texto puro
- ✅ Nenhum alert aparece

---

### T12.3: SQL Injection
**Objetivo**: Queries são seguras

Passos:
1. Tentar enviar notificação com SQL em campos
2. Exemplo: `conversationId = "'; DROP TABLE users; --"`

**Resultado Esperado**:
- ✅ Tratado como string normal
- ✅ Nada de mal acontece
- ✅ Prepared statements protegem

---

## Resultados dos Testes

### Template de Relatório

```markdown
## Teste: [Nome do Teste]
**Data**: [Data]
**Testador**: [Nome]
**Ambiente**: [Browser/Device]

### Resultado
- [ ] Passou
- [ ] Falhou
- [ ] Parcial

### Observações
[Notas sobre o teste]

### Evidências
[Screenshots, logs, etc.]

### Bugs Encontrados
1. [Descrição do bug]
2. [Descrição do bug]
```

## Matriz de Compatibilidade

### Navegadores Desktop
- [ ] Chrome 90+
- [ ] Firefox 88+
- [ ] Edge 90+
- [ ] Safari 15+ (limitado)
- [ ] Opera 76+

### Navegadores Mobile
- [ ] Chrome Android 90+
- [ ] Firefox Android 88+
- [ ] Samsung Internet 14+
- [ ] Safari iOS 16+ (limitado)

### Limitações Conhecidas
- **Safari iOS**: Push notifications só funcionam em iOS 16.4+
- **Safari Desktop**: Service Workers limitados
- **Firefox**: Algumas APIs podem requerer flags

## Critérios de Aceitação

### Must Have (Bloqueadores)
- ✅ Notificações chegam em < 2s
- ✅ Taxa de entrega > 90%
- ✅ Sem dados sensíveis no payload
- ✅ RLS policies funcionando
- ✅ Multi-device sync funciona
- ✅ Chamadas funcionam

### Should Have (Importantes)
- ✅ Taxa de entrega > 95%
- ✅ Latência < 1s (P50)
- ✅ Telemetria completa
- ✅ Debug panel funcional
- ✅ Documentação completa

### Nice to Have (Bônus)
- ✅ Taxa de abertura > 50%
- ✅ Flash LED funciona
- ✅ Ringtones customizados
- ✅ Animações suaves

## Checklist Final

### Código
- [x] Todos os hooks criados
- [x] Todos os componentes criados
- [x] Edge function implementada
- [x] Service Worker otimizado
- [x] TypeScript sem erros
- [x] Build passa

### Banco de Dados
- [x] Todas as tabelas criadas
- [x] RLS policies aplicadas
- [x] Índices otimizados
- [x] Views criadas
- [x] Functions implementadas
- [x] Triggers configurados

### Documentação
- [x] PHASE_4_COMPLETE.md
- [x] PHASE_5_COMPLETE.md
- [x] PHASE_6_COMPLETE.md
- [x] PHASE_7_COMPLETE.md
- [x] NOTIFICATION_INTEGRATION_GUIDE.md
- [x] NOTIFICATION_SYSTEM_SUMMARY.md
- [x] QA_TEST_PLAN.md (este arquivo)

### Configuração
- [ ] VAPID keys geradas e configuradas
- [ ] Leaked password protection habilitada
- [ ] Cron jobs configurados (opcional)
- [ ] Monitoring configurado (opcional)

## Pendências para Produção

### Crítico 🔴
1. **Implementar web-push real** na Edge Function
   - Atualmente apenas logga, não envia
   - Instalar `web-push` no Deno
   - Configurar VAPID

2. **Habilitar Password Protection**
   - Supabase Dashboard → Auth → Policies
   - Enable "Leaked password protection"

### Importante 🟡
3. **Adicionar ringtones reais**
   - Criar/baixar arquivos de áudio
   - Colocar em `/public/ringtones/`
   - Formatos: default.mp3, classic.mp3, etc.

4. **Configurar Cron Jobs**
   - Cleanup diário de telemetria
   - Cleanup semanal de subscriptions
   - Cleanup de chamadas antigas

### Opcional 🟢
5. **Dashboard de Analytics**
   - Visualizar métricas
   - Gráficos de tendências
   - Alertas automáticos

6. **Testes Automatizados**
   - Unit tests
   - Integration tests
   - E2E tests

## Status: ✅ PRONTO PARA QA

Sistema completo e pronto para testes de qualidade antes do lançamento em produção!

---

**Próximo passo**: Executar todos os testes deste plano e corrigir bugs encontrados.
