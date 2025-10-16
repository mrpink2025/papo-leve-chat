-- Signed by Mr_Pink — Nosso Papo (nossopapo.net)
-- Configurar cron job para limpar chamadas em grupo

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar cron job para executar cleanup a cada 2 minutos
SELECT cron.schedule(
  'cleanup-group-calls-job',
  '*/2 * * * *', -- A cada 2 minutos
  $$
  SELECT
    net.http_post(
      url := 'https://valazbmgqazykdzcwfcs.supabase.co/functions/v1/cleanup-group-calls',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhbGF6Ym1ncWF6eWtkemN3ZmNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1ODI1OTIsImV4cCI6MjA3NjE1ODU5Mn0.BKwXC0ZnGz1F0W7uMoJQcaUvN5K6mNJk5fYdj1LukFI"}'::jsonb,
      body := concat('{"timestamp": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);