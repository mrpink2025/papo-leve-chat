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
  
  // Callbacks
  public onStatusChange?: (status: CallStatus) => void;
  public onRemoteStream?: (stream: MediaStream) => void;
  public onLocalStream?: (stream: MediaStream) => void;
  public onError?: (error: Error) => void;
  public onConnectionQuality?: (quality: 'good' | 'medium' | 'poor') => void;

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private connectionQualityInterval: NodeJS.Timeout | null = null;

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
  }

  // Iniciar chamada
  async start(): Promise<void> {
    try {
      console.log(`[WebRTC] Iniciando chamada ${this.callType}...`);
      this.updateStatus('calling');

      // Solicitar permissões e capturar mídia local
      await this.setupLocalMedia();

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
    } catch (error: any) {
      console.error('[WebRTC] Erro ao iniciar chamada:', error);
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

    // Adicionar tracks locais
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });
    }

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
        this.sendSignal({
          type: 'ice-candidate',
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Monitorar estado da conexão
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('[WebRTC] Connection state:', state);

      switch (state) {
        case 'connected':
          this.updateStatus('connected');
          this.reconnectAttempts = 0;
          break;
        case 'disconnected':
          this.handleDisconnection();
          break;
        case 'failed':
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
      console.log('[WebRTC] ICE connection state:', state);

      if (state === 'disconnected' || state === 'failed') {
        this.attemptReconnect();
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
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: this.callType === 'video',
      });

      await this.peerConnection.setLocalDescription(offer);

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
        case 'end-call':
          this.end();
          break;
      }
    } catch (error) {
      console.error('[WebRTC] Erro ao processar sinal:', error);
    }
  }

  // Processar oferta (receptor)
  private async handleOffer(signal: any): Promise<void> {
    if (!this.peerConnection) return;

    this.updateStatus('connecting');

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription({ type: 'offer', sdp: signal.sdp })
    );

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this.sendSignal({
      type: 'answer',
      sdp: answer.sdp,
    });

    console.log('[WebRTC] Resposta criada e enviada');
  }

  // Processar resposta (iniciador)
  private async handleAnswer(signal: any): Promise<void> {
    if (!this.peerConnection) return;

    this.updateStatus('connecting');

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription({ type: 'answer', sdp: signal.sdp })
    );

    console.log('[WebRTC] Resposta recebida e processada');
  }

  // Processar ICE candidate
  private async handleIceCandidate(signal: any): Promise<void> {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.addIceCandidate(
        new RTCIceCandidate(signal.candidate)
      );
    } catch (error) {
      console.error('[WebRTC] Erro ao adicionar ICE candidate:', error);
    }
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
      const sender = this.peerConnection
        ?.getSenders()
        .find(s => s.track?.kind === 'video');

      if (sender) {
        await sender.replaceTrack(newVideoTrack);
        videoTrack.stop();
        this.localStream.removeTrack(videoTrack);
        this.localStream.addTrack(newVideoTrack);

        if (this.onLocalStream) {
          this.onLocalStream(this.localStream);
        }
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

  // Encerrar chamada
  end(): void {
    console.log('[WebRTC] Encerrando chamada');

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

    // Desinscrever do canal
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }

    this.updateStatus('ended');

    // Notificar outros participantes
    this.sendSignal({ type: 'end-call' });
  }

  // Atualizar status
  private updateStatus(status: CallStatus): void {
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
