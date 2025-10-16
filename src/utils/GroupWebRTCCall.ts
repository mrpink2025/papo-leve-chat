// Signed by Mr_Pink — Nosso Papo (nossopapo.net)
// Sistema de chamadas em grupo WebRTC com arquitetura mesh

import { supabase } from '@/integrations/supabase/client';

export type GroupCallState = 'DIALING' | 'ACTIVE' | 'COOLDOWN' | 'ENDED';
export type ParticipantStatus = 'INVITED' | 'RINGING' | 'JOINED' | 'REJECTED' | 'TIMEOUT' | 'LEFT';
export type CallType = 'audio' | 'video';

export interface Participant {
  userId: string;
  username: string;
  avatar?: string;
  status: ParticipantStatus;
  stream?: MediaStream;
  peerConnection?: RTCPeerConnection;
}

// Configuração STUN/TURN servers (mesma do WebRTCCall.ts)
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
];

export class GroupWebRTCCall {
  private sessionId: string;
  private conversationId: string;
  private userId: string;
  private callType: CallType;
  private isHost: boolean;
  
  // Mesh: um RTCPeerConnection por participante remoto
  private peers: Map<string, Participant> = new Map();
  private localStream: MediaStream | null = null;
  
  private signalingChannel: any = null;
  private roomState: GroupCallState = 'DIALING';
  
  // Callbacks
  public onStateChange?: (state: GroupCallState) => void;
  public onParticipantJoined?: (participant: Participant) => void;
  public onParticipantLeft?: (userId: string) => void;
  public onLocalStream?: (stream: MediaStream) => void;
  public onRemoteStream?: (userId: string, stream: MediaStream) => void;
  public onError?: (error: Error) => void;
  
  constructor(
    conversationId: string,
    userId: string,
    callType: CallType,
    isHost: boolean,
    sessionId?: string
  ) {
    this.conversationId = conversationId;
    this.userId = userId;
    this.callType = callType;
    this.isHost = isHost;
    this.sessionId = sessionId || `group_call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('[GroupWebRTCCall] Criado:', { sessionId: this.sessionId, isHost, callType });
  }
  
  // Iniciar chamada (host) ou entrar (participante)
  async start(participantIds?: string[]): Promise<void> {
    console.log('[GroupWebRTCCall] Iniciando...', { isHost: this.isHost, participantIds });
    
    try {
      // 1. Capturar mídia local
      await this.setupLocalMedia();
      
      // 2. Configurar canal de sinalização
      await this.setupSignalingChannel();
      
      // 3. Se host: criar sessão + convidar participantes
      if (this.isHost && participantIds) {
        await this.createSession(participantIds);
      } else {
        // Participante entrando: buscar sessão existente
        await this.joinSession();
      }
    } catch (error) {
      console.error('[GroupWebRTCCall] Erro ao iniciar:', error);
      if (this.onError) this.onError(error as Error);
      throw error;
    }
  }
  
  private async setupLocalMedia(): Promise<void> {
    console.log('[GroupWebRTCCall] Configurando mídia local...');
    
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: this.callType === 'video' ? {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
        facingMode: 'user',
      } : false,
    };
    
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('[GroupWebRTCCall] Mídia local capturada:', {
        audio: this.localStream.getAudioTracks().length,
        video: this.localStream.getVideoTracks().length,
      });
      
      if (this.onLocalStream) {
        this.onLocalStream(this.localStream);
      }
    } catch (error) {
      console.error('[GroupWebRTCCall] Erro ao capturar mídia:', error);
      throw new Error('Não foi possível acessar câmera/microfone');
    }
  }
  
  private async createSession(participantIds: string[]): Promise<void> {
    console.log('[GroupWebRTCCall] Criando sessão...', { participantIds });
    
    try {
      // Inserir sessão no banco
      const { data: session, error: sessionError } = await supabase
        .from('group_call_sessions')
        .insert({
          id: this.sessionId,
          conversation_id: this.conversationId,
          call_type: this.callType,
          created_by: this.userId,
          state: 'DIALING'
        })
        .select()
        .single();
      
      if (sessionError) throw sessionError;
      
      // Inserir host como JOINED
      await supabase.from('group_call_participants').insert({
        session_id: this.sessionId,
        user_id: this.userId,
        status: 'JOINED',
        is_host: true,
        joined_at: new Date().toISOString()
      });
      
      // Convidar participantes (status INVITED)
      const invites = participantIds.map(uid => ({
        session_id: this.sessionId,
        user_id: uid,
        status: 'INVITED' as ParticipantStatus
      }));
      
      if (invites.length > 0) {
        await supabase.from('group_call_participants').insert(invites);
      }
      
      // Enviar broadcast para cada participante
      for (const uid of participantIds) {
        await this.sendInvite(uid);
      }
      
      console.log('[GroupWebRTCCall] Sessão criada, convites enviados');
    } catch (error) {
      console.error('[GroupWebRTCCall] Erro ao criar sessão:', error);
      throw error;
    }
  }
  
  private async sendInvite(recipientId: string): Promise<void> {
    try {
      // Buscar perfil do recipient
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, full_name, avatar_url')
        .eq('id', recipientId)
        .single();
      
      // Buscar nome do grupo
      const { data: conversation } = await supabase
        .from('conversations')
        .select('name, avatar_url')
        .eq('id', this.conversationId)
        .single();
      
      // Broadcast para canal do usuário
      const userChannel = supabase.channel(`user:${recipientId}:calls`);
      
      await userChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await userChannel.send({
            type: 'broadcast',
            event: 'group-call-invite',
            payload: {
              sessionId: this.sessionId,
              conversationId: this.conversationId,
              callType: this.callType,
              groupName: conversation?.name || 'Grupo',
              groupAvatar: conversation?.avatar_url,
              hostId: this.userId,
              invitedUserId: recipientId
            }
          });
          
          // Desinscrever após enviar
          await supabase.removeChannel(userChannel);
        }
      });
      
      // Atualizar status para RINGING
      await supabase
        .from('group_call_participants')
        .update({ status: 'RINGING' })
        .eq('session_id', this.sessionId)
        .eq('user_id', recipientId);
      
      console.log(`[GroupWebRTCCall] Convite enviado para ${recipientId}`);
    } catch (error) {
      console.error('[GroupWebRTCCall] Erro ao enviar convite:', error);
    }
  }
  
  private async createPeerConnection(remoteUserId: string): Promise<RTCPeerConnection> {
    console.log(`[GroupWebRTCCall] Criando peer connection para ${remoteUserId}`);
    
    const pc = new RTCPeerConnection({
      iceServers: DEFAULT_ICE_SERVERS,
      iceCandidatePoolSize: 10
    });
    
    // Adicionar tracks locais
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }
    
    // Receber tracks remotos
    pc.ontrack = (event) => {
      console.log(`[GroupWebRTCCall] Track recebido de ${remoteUserId}:`, event.track.kind);
      
      const peer = this.peers.get(remoteUserId);
      if (!peer) return;
      
      if (!peer.stream) {
        peer.stream = new MediaStream();
      }
      
      peer.stream.addTrack(event.track);
      
      if (this.onRemoteStream) {
        this.onRemoteStream(remoteUserId, peer.stream);
      }
    };
    
    // ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await this.sendSignal({
          type: 'ice-candidate',
          to: remoteUserId,
          candidate: event.candidate.toJSON()
        });
      }
    };
    
    // Connection state
    pc.onconnectionstatechange = () => {
      console.log(`[GroupWebRTCCall] Peer ${remoteUserId} connection state:`, pc.connectionState);
      
      if (pc.connectionState === 'connected') {
        const peer = this.peers.get(remoteUserId);
        if (peer) {
          peer.status = 'JOINED';
          // Atualizar no banco
          supabase
            .from('group_call_participants')
            .update({ status: 'JOINED', joined_at: new Date().toISOString() })
            .eq('session_id', this.sessionId)
            .eq('user_id', remoteUserId)
            .then(() => {
              if (this.onParticipantJoined) {
                this.onParticipantJoined(peer);
              }
            });
        }
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.handlePeerDisconnection(remoteUserId);
      }
    };
    
    return pc;
  }
  
  private async offerToPeer(remoteUserId: string): Promise<void> {
    console.log(`[GroupWebRTCCall] Enviando oferta para ${remoteUserId}`);
    
    const peer = this.peers.get(remoteUserId);
    if (!peer) return;
    
    try {
      if (!peer.peerConnection) {
        peer.peerConnection = await this.createPeerConnection(remoteUserId);
      }
      
      const offer = await peer.peerConnection.createOffer();
      await peer.peerConnection.setLocalDescription(offer);
      
      await this.sendSignal({
        type: 'offer',
        to: remoteUserId,
        sdp: offer.sdp
      });
      
      console.log(`[GroupWebRTCCall] Oferta enviada para ${remoteUserId}`);
    } catch (error) {
      console.error(`[GroupWebRTCCall] Erro ao enviar oferta para ${remoteUserId}:`, error);
    }
  }
  
  private async handleSignal(signal: any): Promise<void> {
    const { type, from, to, sdp, candidate, username } = signal;
    
    // Ignorar sinais não destinados a mim
    if (to && to !== this.userId) return;
    
    let peer = this.peers.get(from);
    
    try {
      switch (type) {
        case 'offer':
          // Criar peer connection se não existir
          if (!peer) {
            peer = {
              userId: from,
              username: username || 'Unknown',
              status: 'INVITED',
            };
            this.peers.set(from, peer);
          }
          
          if (!peer.peerConnection) {
            peer.peerConnection = await this.createPeerConnection(from);
          }
          
          await peer.peerConnection.setRemoteDescription({ type: 'offer', sdp });
          
          const answer = await peer.peerConnection.createAnswer();
          await peer.peerConnection.setLocalDescription(answer);
          
          await this.sendSignal({
            type: 'answer',
            to: from,
            sdp: answer.sdp
          });
          break;
          
        case 'answer':
          if (peer && peer.peerConnection) {
            await peer.peerConnection.setRemoteDescription({ type: 'answer', sdp });
          }
          break;
          
        case 'ice-candidate':
          if (peer && peer.peerConnection && candidate) {
            await peer.peerConnection.addIceCandidate(candidate);
          }
          break;
          
        case 'participant-joined':
          // Novo participante entrou: oferecer conexão
          if (!peer) {
            peer = {
              userId: from,
              username: username || 'Unknown',
              status: 'JOINED',
            };
            this.peers.set(from, peer);
          }
          await this.offerToPeer(from);
          break;
          
        case 'participant-left':
          this.handlePeerDisconnection(from);
          break;
      }
    } catch (error) {
      console.error('[GroupWebRTCCall] Erro ao processar sinal:', error);
    }
  }
  
  private async setupSignalingChannel(): Promise<void> {
    const channelName = `group_call:${this.sessionId}`;
    
    this.signalingChannel = supabase.channel(channelName, {
      config: { broadcast: { self: false, ack: true } }
    });
    
    await new Promise<void>((resolve, reject) => {
      this.signalingChannel!
        .on('broadcast', { event: 'signal' }, (payload: any) => {
          this.handleSignal(payload.payload);
        })
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log('[GroupWebRTCCall] Canal de sinalização conectado:', channelName);
            resolve();
          } else if (status === 'CHANNEL_ERROR') {
            reject(new Error('Falha no canal de sinalização'));
          }
        });
      
      setTimeout(() => reject(new Error('Timeout no canal')), 5000);
    });
  }
  
  private async sendSignal(signal: any): Promise<void> {
    if (!this.signalingChannel) return;
    
    // Buscar username do usuário atual
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, full_name')
      .eq('id', this.userId)
      .single();
    
    await this.signalingChannel.send({
      type: 'broadcast',
      event: 'signal',
      payload: {
        ...signal,
        from: this.userId,
        username: profile?.username || profile?.full_name || 'Unknown',
        timestamp: Date.now()
      }
    });
  }
  
  async joinSession(): Promise<void> {
    console.log(`[GroupWebRTCCall] Entrando em sessão existente: ${this.sessionId}`);
    
    try {
      // Atualizar status no banco
      await supabase
        .from('group_call_participants')
        .update({ 
          status: 'JOINED', 
          joined_at: new Date().toISOString() 
        })
        .eq('session_id', this.sessionId)
        .eq('user_id', this.userId);
      
      // Buscar participantes já conectados
      const { data: participants } = await supabase
        .from('group_call_participants')
        .select(`
          user_id,
          status,
          profiles:user_id (username, full_name, avatar_url)
        `)
        .eq('session_id', this.sessionId)
        .eq('status', 'JOINED')
        .neq('user_id', this.userId);
      
      if (participants && participants.length > 0) {
        // Adicionar aos peers
        for (const p of participants) {
          const profile = (p.profiles as any);
          this.peers.set(p.user_id, {
            userId: p.user_id,
            username: profile?.username || profile?.full_name || 'Unknown',
            status: 'JOINED',
          });
        }
      }
      
      // Avisar todos que entrei
      await this.sendSignal({
        type: 'participant-joined'
      });
      
      console.log(`[GroupWebRTCCall] Participantes na sala: ${participants?.length || 0}`);
    } catch (error) {
      console.error('[GroupWebRTCCall] Erro ao entrar na sessão:', error);
      throw error;
    }
  }
  
  private handlePeerDisconnection(userId: string): void {
    console.log(`[GroupWebRTCCall] Peer desconectado: ${userId}`);
    
    const peer = this.peers.get(userId);
    if (peer) {
      if (peer.peerConnection) {
        peer.peerConnection.close();
      }
      this.peers.delete(userId);
      
      if (this.onParticipantLeft) {
        this.onParticipantLeft(userId);
      }
    }
  }
  
  // Controles de mídia
  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
      console.log('[GroupWebRTCCall] Vídeo:', enabled ? 'ligado' : 'desligado');
    }
  }
  
  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
      console.log('[GroupWebRTCCall] Áudio:', enabled ? 'ligado' : 'desligado');
    }
  }
  
  async switchCamera(): Promise<void> {
    if (!this.localStream || this.callType !== 'video') return;
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return;
    
    try {
      const currentFacingMode = videoTrack.getSettings().facingMode;
      const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
      
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode }
      });
      
      const newVideoTrack = newStream.getVideoTracks()[0];
      
      // Substituir track em todas as peer connections
      this.peers.forEach(peer => {
        if (peer.peerConnection) {
          const sender = peer.peerConnection.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(newVideoTrack);
          }
        }
      });
      
      videoTrack.stop();
      this.localStream.removeTrack(videoTrack);
      this.localStream.addTrack(newVideoTrack);
      
      if (this.onLocalStream) {
        this.onLocalStream(this.localStream);
      }
      
      console.log('[GroupWebRTCCall] Câmera alternada para:', newFacingMode);
    } catch (error) {
      console.error('[GroupWebRTCCall] Erro ao alternar câmera:', error);
    }
  }
  
  // Encerrar chamada
  async end(): Promise<void> {
    console.log('[GroupWebRTCCall] Encerrando chamada em grupo');
    
    try {
      // Atualizar status no banco
      await supabase
        .from('group_call_participants')
        .update({ 
          status: 'LEFT', 
          left_at: new Date().toISOString() 
        })
        .eq('session_id', this.sessionId)
        .eq('user_id', this.userId);
      
      // Avisar outros participantes
      await this.sendSignal({ type: 'participant-left' });
      
      // Fechar todas as peer connections
      this.peers.forEach((peer) => {
        if (peer.peerConnection) {
          peer.peerConnection.close();
        }
      });
      
      // Parar mídia local
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
      }
      
      // Fechar canal
      if (this.signalingChannel) {
        await supabase.removeChannel(this.signalingChannel);
      }
      
      this.peers.clear();
      this.localStream = null;
    } catch (error) {
      console.error('[GroupWebRTCCall] Erro ao encerrar:', error);
    }
  }
  
  // Getters
  getSessionId(): string {
    return this.sessionId;
  }
  
  getPeers(): Map<string, Participant> {
    return this.peers;
  }
  
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }
}
