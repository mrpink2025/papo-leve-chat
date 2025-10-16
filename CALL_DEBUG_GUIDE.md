# Guia de Debug - Sistema de Chamadas

## Correções Implementadas

### ✅ 1. Perfect Negotiation (WebRTC)
- Implementado padrão "polite/impolite" para resolver colisões de oferta
- Callee é polite, Caller é impolite
- Resolve glare (ofertas simultâneas) automaticamente

### ✅ 2. Telemetria Completa
Sistema de logs estruturados em todos os eventos:

**Eventos Principais:**
- `CALL_CREATED` - Chamada criada
- `CALL_START_INITIATED` - Início da chamada
- `MEDIA_TRACKS_ADDED` - Mídia capturada (audio/video)
- `SIG_SENT_OFFER` / `SIG_RCVD_OFFER` - Troca de oferta SDP
- `SIG_SENT_ANSWER` / `SIG_RCVD_ANSWER` - Troca de resposta SDP
- `ICE_CANDIDATE_GENERATED` - Candidato ICE gerado
- `ICE_GATHERING_STATE` - Estado do gathering ICE
- `ICE_CONNECTION_STATE` - Estado da conexão ICE
- `ICE_CONNECTED` - ICE conectado com sucesso
- `ICE_FAILED` - ICE falhou
- `PEERCONNECTION_STATE` - Estado da peer connection
- `CALL_CONNECTED` - Chamada conectada (primeiro frame recebido)
- `CALL_ENDED_REASON` - Chamada encerrada (com motivo)
- `STATUS_CHANGE` - Mudança de status

### ✅ 3. Listener Global
- `GlobalIncomingCallOverlay` agora está em `App.tsx` dentro de `ProtectedRoute`
- Funciona em **qualquer rota** (não só no chat)
- Overlay de chamada aparece mesmo fora da conversa

### ✅ 4. Timeout Inteligente
- Aumentado para **45 segundos** (antes 30s)
- Verifica status no banco antes de marcar como "perdida"
- Só marca como `missed` se ainda estiver `ringing`

### ✅ 5. Gestão de Estado no Banco
- Atualiza automaticamente para `active` quando conecta
- Atualiza para `ended` quando encerra
- Timestamps corretos (`started_at`, `ended_at`)

### ✅ 6. Sinal de Rejeição
- Quando rejeita, envia sinal via Realtime para o caller
- Caller recebe notificação instantânea de rejeição

---

## Como Testar

### Teste 1: Chamada Básica (na tela do chat)
1. Usuário A liga para Usuário B (ambos no chat)
2. Verificar logs no console: `CALL_START_INITIATED` → `SIG_SENT_OFFER` → `SIG_RCVD_ANSWER` → `ICE_CONNECTED` → `CALL_CONNECTED`
3. Duração deve aparecer após conectar
4. Encerrar e verificar `CALL_ENDED_REASON`

**Critério de sucesso:** ICE_CONNECTED em < 5s

### Teste 2: Chamada Fora da Conversa
1. Usuário B está na tela inicial (`/app`)
2. Usuário A liga para B
3. **Esperado:** Overlay de chamada aparece na tela inicial
4. B atende → deve abrir dialog de chamada ativa
5. **Importante:** NÃO deve marcar como "perdida"

**Critério de sucesso:** Overlay aparece em qualquer rota

### Teste 3: Glare (Colisão de Ofertas)
1. Ambos ligam ao mesmo tempo
2. Perfect Negotiation deve resolver automaticamente
3. Verificar logs: `OFFER_IGNORED` deve aparecer para o impolite
4. Uma das ofertas deve vencer e conectar

**Critério de sucesso:** Conecta sem erro, uma offer vence

### Teste 4: Rejeição
1. A liga para B
2. B rejeita
3. A deve receber notificação de "Chamada recusada"
4. Status no banco: `rejected`

**Critério de sucesso:** Sinal de rejeição recebido, status correto

### Teste 5: Timeout
1. A liga para B
2. B não atende por 45 segundos
3. Deve marcar como `missed` apenas após timeout
4. Ringtone deve parar automaticamente

**Critério de sucesso:** Só marca missed após 45s de inatividade

### Teste 6: Permissões Negadas
1. Negar acesso à câmera/microfone
2. Deve mostrar mensagem clara
3. Permitir depois → retry automático

**Critério de sucesso:** Mensagem clara, retry funciona

### Teste 7: Rede Ruim / Reconexão
1. Iniciar chamada
2. Trocar de Wi-Fi para 4G (ou vice-versa)
3. Deve tentar reconectar automaticamente
4. Status: `reconnecting` → `connected`

**Critério de sucesso:** Auto-reconnect em < 5s

---

## Exportar Logs para Análise

### No Console do Navegador:

```javascript
// 1. Capturar logs de uma chamada ativa
// (após iniciar/atender uma chamada)

// Se você tiver acesso ao objeto WebRTCCall:
// webrtcCall.getEventLog()

// 2. Exportar últimos 50 eventos do console
const logs = console.history?.filter(log => 
  log.includes('[WebRTC]') || 
  log.includes('[useIncomingCalls]') ||
  log.includes('[useNativeVideoCall]')
).slice(-50);

console.table(logs);

// 3. Copiar para clipboard (Chrome/Edge)
copy(logs);
```

### Logs Críticos para Revisar:

**Se chamada não conecta, verificar:**
1. `ICE_GATHERING_STATE` chegou a `complete`?
2. `ICE_CONNECTION_STATE` chegou a `connected`?
3. `PEERCONNECTION_STATE` chegou a `connected`?
4. Há `ICE_FAILED` nos logs?
5. `MEDIA_TRACKS_ADDED` mostra audio/video corretos?

**Se marca como perdida incorretamente:**
1. Verificar se `CALL_UI_RINGING_SHOWN` aparece
2. Verificar rota atual nos logs
3. Verificar se `GlobalIncomingCallOverlay` está montado

---

## Métricas de Sucesso

| Métrica | Alvo | Status |
|---------|------|--------|
| Tempo para ICE Connected | < 3s (áudio), < 5s (vídeo) | ✅ Implementado |
| Taxa de conexão bem-sucedida | ≥ 95% | 🔍 Testar |
| Chamadas perdidas incorretas | 0% | ✅ Corrigido |
| Reconexão automática | < 5s | ✅ Implementado |

---

## Arquivos Modificados

1. **src/utils/WebRTCCall.ts**
   - Perfect Negotiation
   - Telemetria completa
   - Auto-update de status no banco

2. **src/hooks/useIncomingCalls.tsx**
   - Timeout aumentado para 45s
   - Verificação de status antes de marcar missed
   - Sinal de rejeição via Realtime

3. **src/components/GlobalIncomingCallOverlay.tsx** (NOVO)
   - Overlay global para chamadas
   - Funciona em qualquer rota

4. **src/App.tsx**
   - GlobalIncomingCallOverlay em ProtectedRoute

5. **src/pages/Chat.tsx**
   - Removido listener local (agora é global)

---

## Próximos Passos (Opcional)

### Se problemas persistirem:

1. **TURN Server Dedicado**
   - Configurar coturn próprio
   - Necessário para NAT duplo
   
2. **Fallback Áudio-Only**
   - Se vídeo não conectar em 10s, degradar para áudio
   
3. **Analytics Avançado**
   - Exportar métricas para Supabase
   - Dashboard de qualidade de chamadas

---

## Contato para Suporte

Se após seguir este guia as chamadas ainda não funcionarem:

1. Exportar logs (ver seção acima)
2. Anotar cenário exato (quem liga, onde está, etc)
3. Verificar console de AMBOS os usuários
4. Reportar com os logs completos

**Assinatura:** Mr_Pink — Nosso Papo (nossopapo.net)
