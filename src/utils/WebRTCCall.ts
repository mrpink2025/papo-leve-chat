// Signed by Mr_Pink — Nosso Papo (nossopapo.net)
// Sistema nativo de chamadas WebRTC com sinalização via Supabase Realtime

import { supabase } from '@/integrations/supabase/client';

export type CallStatus = 'idle' | 'calling' | 'connecting' | 'connected' | 'reconnecting' | 'ended' | 'failed';
export type CallType = 'audio' | 'video';

interface CallConfig {
  iceServers: RTCIceServer[];
}

// Configuração STUN/TURN servers
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export class WebRTCCall {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private channel: any = null;
  private callId: string;
  private userId: string;
  private conversationId: string;
  private callType: CallType;
  private isInitiator: boolean;
  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  private currentStatus: CallStatus = 'idle';
  
  // ✅ Transceivers estáveis (ordem fixa dos m-lines)
  private audioTransceiver?: RTCRtpTransceiver;
  private videoTransceiver?: RTCRtpTransceiver;
  
  // Perfect Negotiation
  private polite: boolean;
  private makingOffer = false;
  private ignoreOffer = false;
  
  // Callbacks
  public onStatusChange?: (status: CallStatus) => void;
  public onRemoteStream?: (stream: MediaStream) => void;
  public onLocalStream?: (stream: MediaStream) => void;
  public onError?: (error: Error) => void;
  public onConnectionQuality?: (quality: 'good' | 'medium' | 'poor') => void;

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private connectionQualityInterval: NodeJS.Timeout | null = null;
  
  // Telemetria
  private eventLog: Array<{ timestamp: number; event: string; data?: any }> = [];

  constructor(
    conversationId: string,
    userId: string,
    callType: CallType,
    isInitiator: boolean,
    callId?: string
  ) {
    this.conversationId = conversationId;
    this.userId = userId;
    this.callType = callType;
    this.isInitiator = isInitiator;
    this.callId = callId || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Perfect Negotiation: callee é polite, caller é impolite
    this.polite = !isInitiator;
    
    this.logEvent('CALL_CREATED', {
      callId: this.callId,
      isInitiator,
      polite: this.polite,
      callType
    });
  }

  // Iniciar chamada
  async start(): Promise<void> {
    try {
    this.logEvent('CALL_START_INITIATED', { 
      route: window.location.pathname,
      role: this.isInitiator ? 'caller' : 'callee',
      initialStatus: this.isInitiator ? 'calling' : 'connecting'
    });
    console.log(`[WebRTC] Iniciando chamada ${this.callType}...`);
    this.updateStatus(this.isInitiator ? 'calling' : 'connecting');

      // Solicitar permissões e capturar mídia local
      await this.setupLocalMedia();
      this.logEvent('MEDIA_TRACKS_ADDED', {
        audio: !!this.localStream?.getAudioTracks().length,
        video: !!this.localStream?.getVideoTracks().length
      });

      // Criar peer connection
      await this.createPeerConnection();

      // Configurar canal de sinalização
      await this.setupSignalingChannel();

      if (this.isInitiator) {
        // Criar oferta
        await this.createOffer();
      }

      // Monitorar qualidade da conexão
      this.startConnectionQualityMonitor();

    console.log('[WebRTC] Chamada iniciada com sucesso');
    this.logEvent('CALL_START_SUCCESS', {
      role: this.isInitiator ? 'caller' : 'callee',
      currentStatus: this.currentStatus,
      hasLocalStream: !!this.localStream,
      hasRemoteStream: !!this.remoteStream
    });
    } catch (error: any) {
      console.error('[WebRTC] Erro ao iniciar chamada:', error);
      this.logEvent('CALL_START_FAILED', { error: error.message });
      this.handleError(error);
    }
  }

  // Configurar mídia local (câmera/microfone)
  private async setupLocalMedia(): Promise<void> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: this.callType === 'video' ? {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'user',
        } : false,
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (this.onLocalStream) {
        this.onLocalStream(this.localStream);
      }

      console.log('[WebRTC] Mídia local capturada');
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        throw new Error('Permissão negada para acessar câmera/microfone');
      } else if (error.name === 'NotFoundError') {
        throw new Error('Dispositivo de mídia não encontrado');
      }
      throw error;
    }
  }

  // Criar conexão peer-to-peer
  private async createPeerConnection(): Promise<void> {
    const config: RTCConfiguration = {
      iceServers: DEFAULT_ICE_SERVERS,
      iceCandidatePoolSize: 10,
    };

    this.peerConnection = new RTCPeerConnection(config);

    // ✅ FASE 1: Criar transceivers SEMPRE na mesma ordem (audio → video)
    this.audioTransceiver = this.peerConnection.addTransceiver('audio', {
      direction: 'sendrecv'
    });
    
    this.videoTransceiver = this.peerConnection.addTransceiver('video', {
      direction: this.callType === 'video' ? 'sendrecv' : 'recvonly'
    });

    // ✅ FASE 2: Anexar tracks aos senders (em vez de addTrack)
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      const videoTrack = this.localStream.getVideoTracks()[0];
      
      if (audioTrack) {
        await this.audioTransceiver.sender.replaceTrack(audioTrack);
      }
      
      if (videoTrack && this.callType === 'video') {
        await this.videoTransceiver.sender.replaceTrack(videoTrack);
      }
    }

    this.logEvent('TRANSCEIVERS_CREATED', {
      audio: { mid: this.audioTransceiver.mid, direction: this.audioTransceiver.direction },
      video: { mid: this.videoTransceiver.mid, direction: this.videoTransceiver.direction }
    });

    // Receber tracks remotos
    this.remoteStream = new MediaStream();
    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC] Track remoto recebido:', event.track.kind);
      event.streams[0].getTracks().forEach(track => {
        this.remoteStream!.addTrack(track);
      });
      
      if (this.onRemoteStream) {
        this.onRemoteStream(this.remoteStream);
      }
    };

    // Monitorar ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.logEvent('ICE_CANDIDATE_GENERATED', { candidate: event.candidate.candidate });
        this.sendSignal({
          type: 'ice-candidate',
          candidate: event.candidate.toJSON(),
        });
      }
    };
    
    // Monitorar gathering state
    this.peerConnection.onicegatheringstatechange = () => {
      const state = this.peerConnection?.iceGatheringState;
      this.logEvent('ICE_GATHERING_STATE', { state });
      console.log('[WebRTC] ICE gathering state:', state);
    };

    // Monitorar estado da conexão
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      this.logEvent('PEERCONNECTION_STATE', { state });
      console.log('[WebRTC] Connection state:', state);

      switch (state) {
        case 'connected':
          this.logEvent('CALL_CONNECTED');
          this.updateStatus('connected');
          this.reconnectAttempts = 0;
          break;
        case 'disconnected':
          this.handleDisconnection();
          break;
        case 'failed':
          this.logEvent('CALL_FAILED', { reason: 'peer_connection_failed' });
          this.updateStatus('failed');
          this.attemptReconnect();
          break;
        case 'closed':
          this.updateStatus('ended');
          break;
      }
    };

    // Monitorar estado do ICE
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      this.logEvent('ICE_CONNECTION_STATE', { state });
      console.log('[WebRTC] ICE connection state:', state);

      if (state === 'connected') {
        this.logEvent('ICE_CONNECTED');
      } else if (state === 'failed') {
        this.logEvent('ICE_FAILED', { reason: 'ice_connection_failed' });
        this.attemptReconnect();
      } else if (state === 'disconnected') {
        this.attemptReconnect();
      }
    };
    
    // Perfect Negotiation: onnegotiationneeded com rollback
    this.peerConnection.onnegotiationneeded = async () => {
      try {
        // ✅ Guardar contra renegociação durante estado instável
        if (this.peerConnection!.signalingState !== 'stable') {
          this.logEvent('NEGOTIATION_SKIPPED', { reason: 'unstable_signaling_state' });
          return;
        }
        
        this.logEvent('NEGOTIATION_NEEDED');
        console.log('[WebRTC] Negotiation needed, making offer...');
        this.makingOffer = true;
        
        const offer = await this.peerConnection!.createOffer();
        await this.peerConnection!.setLocalDescription(offer);
        
        // ✅ Logar ordem dos transceivers após setLocalDescription
        this.logTransceiverOrder('after_setLocalDescription');
        
        this.sendSignal({
          type: 'offer',
          sdp: this.peerConnection!.localDescription?.sdp,
        });
      } catch (err: any) {
        console.error('[WebRTC] Error during negotiation:', err);
        this.logEvent('NEGOTIATION_FAILED', { error: err.message });
        
        // ✅ Rollback se houver erro de m-line order
        if (err.message?.includes('order of m-lines') && 
            this.peerConnection?.signalingState === 'have-local-offer') {
          try {
            await this.peerConnection.setLocalDescription({ type: 'rollback' } as any);
            this.logEvent('NEGOTIATION_ROLLBACK', { reason: 'm-line_order_error' });
            console.log('[WebRTC] Rollback executado devido a erro de m-line order');
          } catch (rollbackErr) {
            console.error('[WebRTC] Erro ao fazer rollback:', rollbackErr);
          }
        }
      } finally {
        this.makingOffer = false;
      }
    };

    console.log('[WebRTC] Peer connection criada');
  }

  // Configurar canal de sinalização (Supabase Realtime)
  private async setupSignalingChannel(): Promise<void> {
    const channelName = `call:${this.callId}`;
    
    this.channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'signal' }, async ({ payload }) => {
        await this.handleSignal(payload);
      })
      .subscribe();

    console.log('[WebRTC] Canal de sinalização configurado:', channelName);
  }

  // Criar oferta (iniciador)
  private async createOffer(): Promise<void> {
    if (!this.peerConnection) return;

    try {
      // ✅ Remover offerToReceiveAudio/Video - transceivers já definem isso
      const offer = await this.peerConnection.createOffer();

      await this.peerConnection.setLocalDescription(offer);
      
      // ✅ Logar ordem dos transceivers
      this.logTransceiverOrder('after_createOffer');

      this.sendSignal({
        type: 'offer',
        sdp: offer.sdp,
      });

      console.log('[WebRTC] Oferta criada e enviada');
    } catch (error) {
      console.error('[WebRTC] Erro ao criar oferta:', error);
      throw error;
    }
  }

  // Processar sinal recebido
  private async handleSignal(signal: any): Promise<void> {
    if (!this.peerConnection) return;

    // ✅ Ignorar sinais do próprio usuário
    if (signal.from === this.userId) {
      console.log('[WebRTC] Ignorando sinal do próprio usuário');
      return;
    }

    console.log('[WebRTC] Sinal recebido:', signal.type, 'de:', signal.from);

    try {
      switch (signal.type) {
        case 'offer':
          await this.handleOffer(signal);
          break;
        case 'answer':
          await this.handleAnswer(signal);
          break;
        case 'ice-candidate':
          await this.handleIceCandidate(signal);
          break;
        case 'call-rejected':
          this.logEvent('CALL_ENDED_REASON', { reason: 'rejected' });
          this.updateStatus('ended');
          this.end();
          break;
        case 'end-call':
          this.end();
          break;
      }
    } catch (error) {
      console.error('[WebRTC] Erro ao processar sinal:', error);
    }
  }

  // Processar oferta (receptor) - Perfect Negotiation
  private async handleOffer(signal: any): Promise<void> {
    if (!this.peerConnection) return;

    this.logEvent('SIG_RCVD_OFFER', { from: signal.from });
    this.updateStatus('connecting');

    const offerCollision = (signal.type === 'offer') &&
      (this.makingOffer || this.peerConnection.signalingState !== 'stable');
    
    this.ignoreOffer = !this.polite && offerCollision;
    
    if (this.ignoreOffer) {
      this.logEvent('OFFER_IGNORED', { reason: 'collision_impolite' });
      console.log('[WebRTC] Ignorando oferta (impolite durante colisão)');
      return;
    }

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription({ type: 'offer', sdp: signal.sdp })
    );
    
    // ✅ Logar ordem dos transceivers após setRemoteDescription
    this.logTransceiverOrder('after_setRemoteDescription_offer');

    // Processar ICE candidates pendentes
    await this.processPendingIceCandidates();

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    
    // ✅ Logar ordem após setLocalDescription da resposta
    this.logTransceiverOrder('after_setLocalDescription_answer');

    this.sendSignal({
      type: 'answer',
      sdp: answer.sdp,
    });

    this.logEvent('SIG_SENT_ANSWER');
    console.log('[WebRTC] Resposta criada e enviada');
  }

  // Processar resposta (iniciador)
  private async handleAnswer(signal: any): Promise<void> {
    if (!this.peerConnection) return;

    this.logEvent('SIG_RCVD_ANSWER', { from: signal.from });
    this.updateStatus('connecting');

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription({ type: 'answer', sdp: signal.sdp })
    );

    // Processar ICE candidates pendentes
    await this.processPendingIceCandidates();

    console.log('[WebRTC] Resposta recebida e processada');
  }

  // Processar ICE candidate
  private async handleIceCandidate(signal: any): Promise<void> {
    if (!this.peerConnection) return;

    try {
      // Se não há remote description ainda, adicionar à fila
      if (!this.peerConnection.remoteDescription) {
        console.log('[WebRTC] Remote description não definida, adicionando ICE candidate à fila');
        this.pendingIceCandidates.push(signal.candidate);
        return;
      }

      await this.peerConnection.addIceCandidate(
        new RTCIceCandidate(signal.candidate)
      );
    } catch (error) {
      console.error('[WebRTC] Erro ao adicionar ICE candidate:', error);
    }
  }

  // Processar candidatos ICE pendentes
  private async processPendingIceCandidates(): Promise<void> {
    if (!this.peerConnection || this.pendingIceCandidates.length === 0) return;

    console.log(`[WebRTC] Processando ${this.pendingIceCandidates.length} ICE candidates pendentes`);

    for (const candidate of this.pendingIceCandidates) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('[WebRTC] Erro ao adicionar ICE candidate pendente:', error);
      }
    }

    this.pendingIceCandidates = [];
  }

  // Enviar sinal via Supabase Realtime
  private sendSignal(signal: any): void {
    if (!this.channel) return;

    this.channel.send({
      type: 'broadcast',
      event: 'signal',
      payload: {
        ...signal,
        from: this.userId,
        callId: this.callId,
      },
    });
  }

  // Alternar entre áudio e vídeo
  async toggleVideo(): Promise<boolean> {
    if (!this.localStream) return false;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      return videoTrack.enabled;
    }

    return false;
  }

  // Alternar mudo
  async toggleAudio(): Promise<boolean> {
    if (!this.localStream) return false;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return audioTrack.enabled;
    }

    return false;
  }

  // Alternar câmera (frontal/traseira)
  async switchCamera(): Promise<void> {
    if (!this.localStream || this.callType !== 'video') return;

    const videoTrack = this.localStream.getVideoTracks()[0];
    const currentFacingMode = videoTrack.getSettings().facingMode;
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: false,
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      
      // ✅ Usar transceiver direto para manter ordem estável
      if (this.videoTransceiver?.sender) {
        await this.videoTransceiver.sender.replaceTrack(newVideoTrack);
        videoTrack.stop();
        this.localStream.removeTrack(videoTrack);
        this.localStream.addTrack(newVideoTrack);

        if (this.onLocalStream) {
          this.onLocalStream(this.localStream);
        }
        
        this.logEvent('CAMERA_SWITCHED', { facingMode: newFacingMode });
      }
    } catch (error) {
      console.error('[WebRTC] Erro ao alternar câmera:', error);
    }
  }

  // Fallback para apenas áudio
  async fallbackToAudioOnly(): Promise<void> {
    if (!this.localStream || this.callType === 'audio') return;

    console.log('[WebRTC] Fallback para apenas áudio');
    this.callType = 'audio';

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.stop();
      this.localStream.removeTrack(videoTrack);
    }
    
    // ✅ Não remover transceiver - apenas definir como recvonly e replaceTrack(null)
    if (this.videoTransceiver?.sender) {
      await this.videoTransceiver.sender.replaceTrack(null);
      this.videoTransceiver.direction = 'recvonly';
      this.logEvent('FALLBACK_TO_AUDIO', { videoTransceiverDirection: 'recvonly' });
    }
  }

  // Monitorar qualidade da conexão
  private startConnectionQualityMonitor(): void {
    this.connectionQualityInterval = setInterval(async () => {
      if (!this.peerConnection) return;

      const stats = await this.peerConnection.getStats();
      let qualityLevel: 'good' | 'medium' | 'poor' = 'good';
      
      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          const packetsLost = report.packetsLost || 0;
          const packetsReceived = report.packetsReceived || 1;
          const lossRate = packetsLost / (packetsLost + packetsReceived);

          if (lossRate > 0.1) {
            qualityLevel = 'poor';
          } else if (lossRate > 0.05) {
            qualityLevel = 'medium';
          }
        }
      });

      if (this.onConnectionQuality) {
        this.onConnectionQuality(qualityLevel);
      }
    }, 3000);
  }

  // Tentar reconectar
  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WebRTC] Máximo de tentativas de reconexão atingido');
      this.updateStatus('failed');
      return;
    }

    this.reconnectAttempts++;
    this.updateStatus('reconnecting');

    console.log(`[WebRTC] Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    // Aguardar antes de reconectar
    await new Promise(resolve => setTimeout(resolve, 2000 * this.reconnectAttempts));

    try {
      // Recriar peer connection
      await this.createPeerConnection();

      if (this.isInitiator) {
        await this.createOffer();
      }
    } catch (error) {
      console.error('[WebRTC] Erro ao reconectar:', error);
      this.attemptReconnect();
    }
  }

  // Lidar com desconexão
  private handleDisconnection(): void {
    console.log('[WebRTC] Desconectado');
    this.updateStatus('reconnecting');
  }

  // Método para exportar logs de telemetria
  public getEventLog(): Array<{ timestamp: number; event: string; data?: any }> {
    return this.eventLog;
  }
  
  // Log interno de eventos
  private logEvent(event: string, data?: any): void {
    const logEntry = {
      timestamp: Date.now(),
      event,
      data,
      callId: this.callId
    };
    this.eventLog.push(logEntry);
    
    // Manter apenas últimos 100 eventos
    if (this.eventLog.length > 100) {
      this.eventLog = this.eventLog.slice(-100);
    }
    
    // Log detalhado no console
    console.log(`[WebRTC Event] ${event}`, data || '');
  }
  
  // ✅ Logar ordem dos transceivers para debug de m-line
  private logTransceiverOrder(context: string): void {
    if (!this.peerConnection) return;
    
    const transceivers = this.peerConnection.getTransceivers().map(t => ({
      mid: t.mid,
      kind: t.receiver.track?.kind || 'unknown',
      direction: t.direction
    }));
    
    this.logEvent('TRANSCEIVER_ORDER', { context, transceivers });
  }

  // Encerrar chamada
  end(): void {
    this.logEvent('CALL_ENDED_REASON', { reason: 'user_hangup' });
    console.log('[WebRTC] Encerrando chamada');

    // ✅ 1. PRIMEIRO enviar sinal de encerramento (antes de fechar canal)
    this.sendSignal({ type: 'end-call' });
    
    // ✅ 2. Atualizar banco de dados imediatamente
    this.updateCallStatusInDatabase('ended');

    // ✅ 3. Aguardar um pouco para sinal ser entregue (100ms)
    setTimeout(() => {
      // Parar monitor de qualidade
      if (this.connectionQualityInterval) {
        clearInterval(this.connectionQualityInterval);
      }

      // Parar tracks locais
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      // Fechar peer connection
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      // Desinscrever do canal (por último)
      if (this.channel) {
        this.channel.unsubscribe();
        this.channel = null;
      }

      this.updateStatus('ended');
    }, 100);
  }

  // Atualizar status da chamada no banco de dados
  private async updateCallStatusInDatabase(status: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('call_notifications')
        .update({ 
          status, 
          ended_at: new Date().toISOString() 
        })
        .eq('conversation_id', this.conversationId)
        .in('status', ['ringing', 'active']);
      
      if (error) {
        console.error('[WebRTC] Erro ao atualizar status no banco:', error);
      } else {
        console.log('[WebRTC] Status atualizado no banco:', status);
      }
    } catch (error) {
      console.error('[WebRTC] Erro ao atualizar status no banco:', error);
    }
  }

  // Atualizar status
  private updateStatus(status: CallStatus): void {
    this.currentStatus = status;
    this.logEvent('STATUS_CHANGE', { status });
    
    // Atualizar status no banco de dados
    if (this.callId && status === 'connected') {
      supabase
        .from('call_notifications')
        .update({ status: 'active', started_at: new Date().toISOString() })
        .eq('id', this.callId)
        .then(({ error }) => {
          if (error) console.error('[WebRTC] Erro ao atualizar status no banco:', error);
        });
    } else if (this.callId && status === 'ended') {
      supabase
        .from('call_notifications')
        .update({ 
          status: 'ended', 
          ended_at: new Date().toISOString()
        })
        .eq('id', this.callId)
        .then(({ error }) => {
          if (error) console.error('[WebRTC] Erro ao atualizar status no banco:', error);
        });
    }
    
    if (this.onStatusChange) {
      this.onStatusChange(status);
    }
  }

  // Tratar erro
  private handleError(error: Error): void {
    this.updateStatus('failed');
    if (this.onError) {
      this.onError(error);
    }
  }

  // Getters
  getCallId(): string {
    return this.callId;
  }

  getCallType(): CallType {
    return this.callType;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }
}
