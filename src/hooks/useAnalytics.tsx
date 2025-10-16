import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useAnalytics = () => {
  const { user } = useAuth();

  const trackEvent = useMutation({
    mutationFn: async ({
      eventType,
      eventData,
    }: {
      eventType: string;
      eventData?: Record<string, any>;
    }) => {
      if (!user?.id) return;

      const { error } = await supabase.from('analytics_events').insert({
        user_id: user.id,
        event_type: eventType,
        event_data: eventData,
      });

      if (error) console.error('Analytics error:', error);
    },
  });

  return {
    trackEvent: trackEvent.mutate,
  };
};
