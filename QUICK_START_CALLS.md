# 🚀 Quick Start - Sistema de Chamadas Nativas
## Signed by Mr_Pink — Nosso Papo (nossopapo.net)

---

## 📞 Fazer uma Chamada

```tsx
import { useNativeVideoCall } from '@/hooks/useNativeVideoCall';

const { startCall } = useNativeVideoCall();

// Chamada de vídeo
startCall('conversation-id', 'video', {
  name: 'João Silva',
  avatar: '/avatar.jpg'
});

// Chamada de áudio
startCall('conversation-id', 'audio', {
  name: 'Maria Santos',
  avatar: '/avatar2.jpg'
});
```

---

## 📲 Receber Chamadas

```tsx
import { useIncomingCalls } from '@/hooks/useIncomingCalls';
import { IncomingNativeCallDialog } from '@/components/IncomingNativeCallDialog';

const { incomingCall, acceptCall, rejectCall } = useIncomingCalls(userId);

return (
  <>
    {incomingCall && (
      <IncomingNativeCallDialog
        open={true}
        callerName={incomingCall.callerName}
        callerAvatar={incomingCall.callerAvatar}
        callType={incomingCall.callType}
        onAccept={acceptCall}
        onReject={rejectCall}
      />
    )}
  </>
);
```

---

## 🎛️ Controles Durante a Chamada

```tsx
const { 
  toggleVideo,   // Liga/desliga câmera
  toggleAudio,   // Liga/desliga microfone
  switchCamera,  // Troca câmera (frontal/traseira)
  endCall        // Encerra chamada
} = useNativeVideoCall();
```

---

## 📊 Estados da Chamada

```tsx
const { callState } = useNativeVideoCall();

// callState contém:
{
  isInCall: boolean,              // Se está em chamada
  status: 'idle' | 'calling' | 'connecting' | 'connected' | 'reconnecting' | 'ended',
  localStream: MediaStream,       // Stream local (sua câmera/mic)
  remoteStream: MediaStream,      // Stream remoto (do outro usuário)
  isVideoEnabled: boolean,        // Câmera ligada?
  isAudioEnabled: boolean,        // Microfone ligado?
  connectionQuality: 'good' | 'medium' | 'poor',  // Qualidade
  duration: number                // Duração em segundos
}
```

---

## 🎨 Interface Pronta

```tsx
import { NativeCallDialog } from '@/components/NativeCallDialog';

<NativeCallDialog
  callState={callState}
  onEndCall={endCall}
  onToggleVideo={toggleVideo}
  onToggleAudio={toggleAudio}
  onSwitchCamera={switchCamera}
  formatDuration={formatDuration}
/>
```

---

## 🔧 Configuração STUN/TURN

Por padrão usa STUN servers do Google. Para produção, adicione TURN:

```typescript
// Em src/utils/WebRTCCall.ts, linha ~25
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { 
    urls: 'turn:seu-servidor.com:3478',
    username: 'usuario',
    credential: 'senha'
  }
];
```

---

## 🐛 Troubleshooting Rápido

### Chamada não conecta?
1. Verificar permissões do navegador
2. Testar conexão de rede
3. Adicionar servidor TURN

### Áudio/vídeo travando?
- Sistema faz fallback automático para áudio
- Verifique qualidade da conexão

### Não recebe chamadas?
1. Verificar Supabase Realtime ativo
2. Checar RLS policies
3. Confirmar userId correto

---

## 📖 Documentação Completa

Ver **NATIVE_CALLS_SYSTEM.md** para documentação detalhada.

---

## ✅ Checklist de Implementação

- [x] ~~Jitsi Meet removido~~
- [x] WebRTC nativo implementado
- [x] Interface WhatsApp/Telegram
- [x] Reconexão automática
- [x] Fallback para áudio
- [x] Chamadas recebidas
- [x] Ringtone
- [x] Notificações
- [x] Documentação completa

---

**Sistema 100% funcional! 🎉**

_Signed by Mr_Pink — Nosso Papo (nossopapo.net)_
