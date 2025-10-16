import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface RingtoneSettings {
  default_ringtone: string;
  contact_ringtones: Record<string, string>;
  vibration_enabled: boolean;
  flash_enabled: boolean;
}

const DEFAULT_RINGTONES = {
  default: '/ringtones/default.mp3',
  classic: '/ringtones/classic.mp3',
  modern: '/ringtones/modern.mp3',
  gentle: '/ringtones/gentle.mp3',
  urgent: '/ringtones/urgent.mp3',
};

/**
 * Hook para gerenciar ringtones customizados
 * - Toca ringtone para chamadas recebidas
 * - Suporta vibração
 * - Suporta flash (se disponível)
 * - Configurações por contato
 */
export const useRingtone = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const vibrateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Buscar configurações do usuário
  const { data: settings } = useQuery({
    queryKey: ['ringtone-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_ringtones')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Se não existir, criar com defaults
      if (!data) {
        const { data: newSettings } = await supabase
          .from('user_ringtones')
          .insert({
            user_id: user.id,
            default_ringtone: 'default',
            contact_ringtones: {},
            vibration_enabled: true,
            flash_enabled: false,
          })
          .select()
          .single();

        return newSettings as RingtoneSettings;
      }

      return data as RingtoneSettings;
    },
    enabled: !!user?.id,
  });

  // Atualizar configurações
  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<RingtoneSettings>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_ringtones')
        .update(newSettings)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ringtone-settings'] });
    },
  });

  // Obter ringtone para um contato específico
  const getRingtoneForContact = useCallback(
    (contactId: string): string => {
      if (!settings) return DEFAULT_RINGTONES.default;

      const contactRingtone = settings.contact_ringtones[contactId];
      if (contactRingtone && DEFAULT_RINGTONES[contactRingtone as keyof typeof DEFAULT_RINGTONES]) {
        return DEFAULT_RINGTONES[contactRingtone as keyof typeof DEFAULT_RINGTONES];
      }

      return DEFAULT_RINGTONES[settings.default_ringtone as keyof typeof DEFAULT_RINGTONES] || DEFAULT_RINGTONES.default;
    },
    [settings]
  );

  // Iniciar vibração
  const startVibration = useCallback(() => {
    if (!settings?.vibration_enabled || !navigator.vibrate) return;

    // Padrão de vibração: vibra 500ms, pausa 300ms, repete
    const vibratePattern = () => {
      navigator.vibrate([500, 300, 500, 300]);
    };

    vibratePattern();
    vibrateIntervalRef.current = setInterval(vibratePattern, 1600);
  }, [settings?.vibration_enabled]);

  // Parar vibração
  const stopVibration = useCallback(() => {
    if (vibrateIntervalRef.current) {
      clearInterval(vibrateIntervalRef.current);
      vibrateIntervalRef.current = null;
    }
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }
  }, []);

  // Iniciar flash (se suportado)
  const startFlash = useCallback(async () => {
    if (!settings?.flash_enabled) return;

    try {
      // @ts-ignore - API experimental
      if (navigator.mediaDevices?.getSupportedConstraints()?.torch) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        const track = stream.getVideoTracks()[0];
        // @ts-ignore
        await track.applyConstraints({ advanced: [{ torch: true }] });

        // Piscar 3 vezes
        setTimeout(async () => {
          // @ts-ignore
          await track.applyConstraints({ advanced: [{ torch: false }] });
          stream.getTracks().forEach(t => t.stop());
        }, 3000);
      }
    } catch (error) {
      console.log('Flash não suportado neste dispositivo');
    }
  }, [settings?.flash_enabled]);

  // Tocar ringtone
  const playRingtone = useCallback(
    async (contactId?: string) => {
      if (isPlaying) return;

      const ringtoneUrl = contactId
        ? getRingtoneForContact(contactId)
        : DEFAULT_RINGTONES[settings?.default_ringtone as keyof typeof DEFAULT_RINGTONES] || DEFAULT_RINGTONES.default;

      try {
        if (!audioRef.current) {
          audioRef.current = new Audio(ringtoneUrl);
          audioRef.current.loop = true;
        } else {
          audioRef.current.src = ringtoneUrl;
        }

        await audioRef.current.play();
        setIsPlaying(true);

        // Iniciar vibração e flash
        startVibration();
        startFlash();
      } catch (error) {
        console.error('Erro ao tocar ringtone:', error);
      }
    },
    [isPlaying, settings?.default_ringtone, getRingtoneForContact, startVibration, startFlash]
  );

  // Parar ringtone
  const stopRingtone = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    stopVibration();
  }, [stopVibration]);

  // Limpar ao desmontar
  useEffect(() => {
    return () => {
      stopRingtone();
      if (audioRef.current) {
        audioRef.current = null;
      }
    };
  }, [stopRingtone]);

  return {
    settings,
    isPlaying,
    playRingtone,
    stopRingtone,
    updateSettings: updateSettings.mutate,
    isUpdating: updateSettings.isPending,
    getRingtoneForContact,
    availableRingtones: Object.keys(DEFAULT_RINGTONES),
  };
};
