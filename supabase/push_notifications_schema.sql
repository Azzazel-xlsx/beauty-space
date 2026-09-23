-- =============================================================================
-- BEAUTY SPACE — SISTEMA DE NOTIFICACIONES PUSH EN SEGUNDO PLANO (SUPABASE)
-- =============================================================================
-- Cubre: Citas próximas (1h antes) y cancelaciones / reprogramaciones en vivo
-- Protocolo: Web Push (Service Worker + VAPID)
-- =============================================================================

-- 1. TABLA: push_subscriptions (Dispositivos suscritos para Web Push)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    device_label TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS y políticas
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own subscriptions" ON push_subscriptions;
CREATE POLICY "own subscriptions" ON push_subscriptions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 2. ALTER TABLE: appointments (Columna de control de recordatorio de 1h)
-- -----------------------------------------------------------------------------
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- Índice para optimizar la consulta periódica de citas próximas
CREATE INDEX IF NOT EXISTS idx_appointments_reminder_lookup 
    ON appointments (date, status, reminder_sent_at);

-- 3. TABLA: appointment_change_events (Eventos de cambio para disparar Web Push)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointment_change_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
    client_name TEXT NOT NULL DEFAULT '',
    service_name TEXT NOT NULL DEFAULT '',
    change_type TEXT NOT NULL CHECK (change_type IN ('cancelled', 'rescheduled')),
    old_date DATE,
    old_time TEXT,
    new_date DATE,
    new_time TEXT,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE appointment_change_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_access_change_events" ON appointment_change_events;
CREATE POLICY "authenticated_access_change_events" ON appointment_change_events
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 4. FUNCIÓN Y TRIGGER: Detección automática de cancelación y reprogramación
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_detect_appointment_change()
RETURNS TRIGGER AS $$
DECLARE
    v_client_name TEXT := '';
    v_service_name TEXT := '';
BEGIN
    -- Obtener nombre de clienta y servicio para notificaciones enriquecidas
    SELECT COALESCE(name, 'Clienta') INTO v_client_name FROM clients WHERE id = NEW.client_id;
    SELECT COALESCE(name, 'Servicio') INTO v_service_name FROM services WHERE id = NEW.service_id;

    -- Caso A: Cita Cancelada
    IF (NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status <> 'cancelled')) THEN
        INSERT INTO appointment_change_events (
            appointment_id, client_name, service_name, change_type, old_date, old_time
        ) VALUES (
            NEW.id, v_client_name, v_service_name, 'cancelled', OLD.date, OLD.time
        );

    -- Caso B: Cita Reprogramada (cambio de fecha u hora sin ser cancelación)
    ELSIF (NEW.status <> 'cancelled') AND (NEW.date <> OLD.date OR NEW.time <> OLD.time) THEN
        INSERT INTO appointment_change_events (
            appointment_id, client_name, service_name, change_type, old_date, old_time, new_date, new_time
        ) VALUES (
            NEW.id, v_client_name, v_service_name, 'rescheduled', OLD.date, OLD.time, NEW.date, NEW.time
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_appointment_change ON appointments;
CREATE TRIGGER trg_appointment_change
AFTER UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION fn_detect_appointment_change();

-- =============================================================================
-- 5. AUTOMATIZACIÓN EN SUPABASE (pg_cron y Database Webhook)
-- =============================================================================
-- A. Configurar cron cada 5 minutos para citas próximas (1 hora antes):
--    En Supabase -> SQL Editor (si la extensión pg_cron está habilitada):
--
--    SELECT cron.schedule(
--      'check-upcoming-appointments-every-5-min',
--      '*/5 * * * *',
--      $$
--      SELECT net.http_post(
--          url := 'https://tijfqgswytvsjsbevquu.supabase.co/functions/v1/check-upcoming-appointments',
--          headers := jsonb_build_object(
--              'Content-Type', 'application/json',
--              'Authorization', 'Bearer TU_SERVICE_ROLE_KEY'
--          ),
--          body := '{}'::jsonb
--      );
--      $$
--    );
--
-- B. Database Webhook para notificaciones de cambio inmediatas:
--    En Supabase Dashboard -> Database -> Webhooks -> Create Webhook:
--    - Name: notify_appointment_change
--    - Table: appointment_change_events
--    - Events: INSERT
--    - Webhook Type: Supabase Edge Functions
--    - Edge Function: notify-appointment-change
-- =============================================================================
