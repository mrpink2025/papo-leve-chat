# Sistema Nativo de Chamadas WebRTC - Nosso Papo
## Signed by Mr_Pink — https://nossopapo.net

---

## 🎯 Visão Geral

Sistema de chamadas de áudio e vídeo **nativo** e **integrado**, substituindo completamente o Jitsi Meet por uma solução **WebRTC pura** com sinalização via **Supabase Realtime**.

### Características principais:
- ✅ **WebRTC Nativo** - Sem dependências externas
- ✅ **P2P Direto** - Conexão peer-to-peer sem intermediários
- ✅ **Supabase Realtime** - Sinalização em tempo real
- ✅ **Reconexão Inteligente** - Até 3 tentativas automáticas
- ✅ **Fallback Automático** - Vídeo → Áudio em conexões ruins
- ✅ **Interface WhatsApp/Telegram** - UX moderna e familiar
- ✅ **Criptografia E2EE** - SRTP + DTLS
- ✅ **Baixo Consumo** - Otimizado para mobile

---

## 📁 Estrutura de Arquivos

### Arquivos Principais

#### `src/utils/WebRTCCall.ts`
Classe principal que gerencia toda a lógica WebRTC:
- Criação e gerenciamento de `RTCPeerConnection`
- Captura de mídia local (câmera/microfone)
- Sinalização via Supabase Realtime
- Troca de ICE candidates
- Reconexão automática
- Monitor de qualidade de conexão
- Fallback para apenas áudio

**Métodos principais:**
```typescript
start() - Iniciar chamada
end() - Encerrar chamada
toggleVideo() - Alternar câmera
toggleAudio() - Alternar microfone
switchCamera() - Trocar câmera (frontal/traseira)
```

#### `src/hooks/useNativeVideoCall.tsx`
Hook React que facilita o uso do WebRTC:
- Gerenciamento de estados
- Callbacks de eventos
- Contador de duração
- Registro no banco de dados
- Notificações toast

**Estados retornados:**
```typescript
{
  isInCall: boolean
  callId: string | null
  status: CallStatus
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  connectionQuality: 'good' | 'medium' | 'poor'
  duration: number
}
```

#### `src/hooks/useIncomingCalls.tsx`
Hook para receber chamadas:
- Listener de chamadas via Supabase Realtime
- Ringtone automático
- Busca informações do chamador
- Aceitar/Rejeitar chamadas

#### `src/components/NativeCallDialog.tsx`
Interface principal de chamada ativa:
- Vídeo remoto em tela cheia
- Preview local (mini)
- Controles de mídia
- Indicadores de status e qualidade
- Animações fluidas

#### `src/components/IncomingNativeCallDialog.tsx`
Interface de chamadas recebidas:
- Avatar com animação de pulso
- Ondas de chamada
- Botões Aceitar/Recusar
- Estilo WhatsApp/Telegram

---

## 🔧 Como Usar

### 1. Iniciar uma chamada

```tsx
import { useNativeVideoCall } from '@/hooks/useNativeVideoCall';

const MyComponent = () => {
  const { startCall, callState } = useNativeVideoCall();

  const handleCallClick = () => {
    startCall(
      'conversation-id',
      'video', // ou 'audio'
      {
        name: 'Nome do Contato',
        avatar: 'url-do-avatar'
      }
    );
  };

  return (
    <button onClick={handleCallClick}>
      Ligar
    </button>
  );
};
```

### 2. Receber chamadas

```tsx
import { useIncomingCalls } from '@/hooks/useIncomingCalls';
import { IncomingNativeCallDialog } from '@/components/IncomingNativeCallDialog';

const MyComponent = () => {
  const { incomingCall, acceptCall, rejectCall } = useIncomingCalls(userId);

  return (
    <>
      {incomingCall && (
        <IncomingNativeCallDialog
          open={true}
          callerName={incomingCall.callerName}
          callerAvatar={incomingCall.callerAvatar}
          callType={incomingCall.callType}
          onAccept={() => {
            acceptCall();
            // Iniciar chamada localmente
          }}
          onReject={rejectCall}
        />
      )}
    </>
  );
};
```

### 3. Controles durante a chamada

```tsx
const { 
  toggleVideo, 
  toggleAudio, 
  switchCamera, 
  endCall 
} = useNativeVideoCall();

<button onClick={toggleVideo}>Câmera</button>
<button onClick={toggleAudio}>Microfone</button>
<button onClick={switchCamera}>Trocar Câmera</button>
<button onClick={endCall}>Encerrar</button>
```

---

## 🔄 Fluxo de Sinalização

### Iniciador (quem liga)
```
1. startCall() → Captura mídia local
2. Cria RTCPeerConnection
3. Cria oferta SDP
4. Envia oferta via Supabase Realtime
5. Recebe resposta SDP
6. Troca ICE candidates
7. Conexão estabelecida ✅
```

### Receptor (quem recebe)
```
1. Listener detecta nova chamada
2. Exibe IncomingNativeCallDialog
3. acceptCall() → Captura mídia local
4. Cria RTCPeerConnection
5. Recebe oferta SDP
6. Cria resposta SDP
7. Envia resposta via Supabase Realtime
8. Troca ICE candidates
9. Conexão estabelecida ✅
```

---

## 📊 Monitoramento de Qualidade

O sistema monitora automaticamente a qualidade da conexão a cada 3 segundos:

### Métricas avaliadas:
- **Taxa de perda de pacotes**
  - `< 5%` → Boa (🟢)
  - `5-10%` → Média (🟡)
  - `> 10%` → Ruim (🔴)

### Ações automáticas:
- **Conexão ruim** → Fallback para apenas áudio
- **Desconexão** → Reconexão automática (até 3 tentativas)
- **Falha total** → Encerramento com notificação

---

## 🔐 Segurança

### Criptografia
- **SRTP** - Criptografia de mídia em tempo real
- **DTLS** - Protocolo de transporte seguro
- **Supabase RLS** - Políticas de acesso ao banco

### Permissões
- Verificação de permissões antes de acessar mídia
- Mensagens claras ao usuário
- Tratamento de negação

### STUN/TURN Servers
```typescript
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];
```

Para produção, recomenda-se adicionar servidor TURN próprio.

---

## 🗄️ Banco de Dados

### Tabela: `call_notifications`

Registra histórico de chamadas:

```sql
id: uuid (PK)
conversation_id: uuid (FK)
caller_id: uuid (FK)
user_id: uuid (FK)
call_type: text ('audio' | 'video')
status: text ('ringing' | 'accepted' | 'rejected' | 'missed' | 'ended')
started_at: timestamp
ended_at: timestamp
duration_seconds: integer
```

### Realtime Channel

Canal de sinalização: `call:{callId}`

**Eventos:**
- `offer` - Oferta SDP
- `answer` - Resposta SDP
- `ice-candidate` - ICE candidate
- `end-call` - Encerrar chamada

---

## 🎨 Customização de UI

### Cores e Temas
O sistema usa as cores do design system do Tailwind:
- `primary` - Botões de ação
- `destructive` - Botão de encerrar
- `secondary` - Controles secundários

### Animações
Todas as animações usam `framer-motion`:
- Pulsação do avatar
- Ondas de chamada
- Transições suaves
- Scale ao clicar

---

## 📱 Suporte Mobile

### Recursos móveis:
- ✅ Troca de câmera (frontal/traseira)
- ✅ Orientação automática
- ✅ Ringtone nativo
- ✅ Notificações push (via WebPush)
- ✅ Chamadas em segundo plano

### Otimizações:
- Resolução adaptativa
- Codec otimizado
- Baixo consumo de bateria

---

## 🐛 Troubleshooting

### Problemas comuns:

#### 1. "Permissão negada"
**Solução:** Verificar permissões do navegador

#### 2. "Falha na conexão"
**Possíveis causas:**
- Firewall bloqueando WebRTC
- NAT muito restritivo
- Falta de servidor TURN

**Solução:** Configurar servidor TURN próprio

#### 3. "Áudio/vídeo travando"
**Causas:**
- Conexão fraca
- CPU sobrecarregada

**Solução:** Sistema já faz fallback automático

#### 4. "Chamada não recebida"
**Verificar:**
- Listener de Realtime ativo
- Políticas RLS corretas
- Permissões push

---

## 🚀 Roadmap

### Futuras melhorias:
- [ ] Chamadas em grupo (multi-peer)
- [ ] Gravação de chamadas (com consentimento)
- [ ] Compartilhamento de tela
- [ ] Filtros e efeitos de vídeo
- [ ] Legendas em tempo real
- [ ] Estatísticas detalhadas

---

## 📝 Notas de Desenvolvimento

### Remoções:
- ❌ `@jitsi/react-sdk` - Removido
- ❌ `VideoCallDialog` - Deletado
- ❌ `useVideoCall` - Substituído por `useNativeVideoCall`

### Adições:
- ✅ `WebRTCCall` - Nova classe WebRTC
- ✅ `useNativeVideoCall` - Novo hook
- ✅ `useIncomingCalls` - Listener de chamadas
- ✅ `NativeCallDialog` - Nova interface
- ✅ `IncomingNativeCallDialog` - Tela de recebimento

---

## 📄 Licença e Créditos

**Projeto:** Nosso Papo  
**Domínio:** https://nossopapo.net  
**Autor:** Mr_Pink  
**Data:** 2025-01-XX  

Todos os arquivos do sistema de chamadas contêm:
```typescript
// Signed by Mr_Pink — Nosso Papo (nossopapo.net)
```

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar console do navegador
2. Checar logs do Supabase Realtime
3. Validar permissões de mídia
4. Consultar esta documentação

**Sistema 100% funcional e integrado ao Nosso Papo! 🎉**
