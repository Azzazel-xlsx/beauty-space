-- =============================================================================
-- BEAUTY SPACE — ESQUEMA DE BASE DE DATOS (PROPUESTO PARA SUPABASE / POSTGRESQL)
-- =============================================================================
-- Fecha: Septiembre 2026
-- Estado: Propuesta técnica para migración desde localStorage a Supabase
-- Nota: NO EJECUTAR AÚN. Este archivo sirve como especificación y referencia
--       para la fase de migración real de datos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- DECISIÓN ADOPTADA DE MODELO DE ACCESO Y SEGURIDAD:
-- -----------------------------------------------------------------------------
-- Arquitectura: Single-Tenant con autenticación real mediante Supabase Auth.
-- - Se utiliza Supabase Auth (ej. signInWithPassword) para autenticar a la administradora.
-- - Row Level Security (RLS) habilitado en TODAS las tablas.
-- - Políticas `FOR ALL` que otorgan acceso completo a usuarios con rol `authenticated`:
--     `USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated')`
-- - Al ser un esquema single-tenant para un solo salón, no se requiere filtrar por `user_id`.
-- - El PIN local puede reasignarse a función de bloqueo rápido de pantalla sobre una sesión viva.
-- -----------------------------------------------------------------------------

-- Habilitar extensión para generación de UUID v4
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. CLIENTAS (clients)
-- Equivalente a interfaz `Client` en src/types.ts
-- =============================================================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    photo_url TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_name ON clients (name);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients (phone);

-- =============================================================================
-- 2. SERVICIOS Y CATÁLOGO (services)
-- Equivalente a interfaz `Service` en src/types.ts
-- =============================================================================
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
    duration INTEGER NOT NULL DEFAULT 90 CHECK (duration > 0), -- Duración estimada en minutos
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Histórico de cambios de precio por servicio (embebido hoy en Service.priceHistory)
CREATE TABLE IF NOT EXISTS service_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    reason TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_price_history_service_id ON service_price_history (service_id);

-- =============================================================================
-- 3. EXTRAS Y DISEÑOS DE UÑA (extras)
-- Equivalente a interfaz `Extra` en src/types.ts
-- =============================================================================
CREATE TABLE IF NOT EXISTS extras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price_per_nail NUMERIC(10, 2) NOT NULL CHECK (price_per_nail >= 0),
    service_id UUID REFERENCES services(id) ON DELETE SET NULL, -- NULL = extra de catálogo global
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Histórico de tarifas por extra (embebido hoy en Extra.priceHistory)
CREATE TABLE IF NOT EXISTS extra_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extra_id UUID NOT NULL REFERENCES extras(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    reason TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extras_service_id ON extras (service_id);

-- =============================================================================
-- 4. CITAS Y AGENDA (appointments)
-- Equivalente a interfaz `Appointment` en src/types.ts
-- =============================================================================
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    time TEXT NOT NULL, -- Formato 'HH:MM' (ej: '09:30')
    duration INTEGER NOT NULL DEFAULT 90 CHECK (duration > 0),
    is_home_visit BOOLEAN NOT NULL DEFAULT FALSE,
    home_visit_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (home_visit_fee >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'reagendada')),
    base_price NUMERIC(10, 2) CHECK (base_price >= 0),
    price_charged NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price_charged >= 0),
    cancel_reason TEXT DEFAULT '',
    rescheduled_to_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (date);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments (client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service_id ON appointments (service_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments (status);

-- Extras aplicados a una cita específica (embebido hoy en Appointment.extras)
CREATE TABLE IF NOT EXISTS appointment_extras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    extra_id UUID REFERENCES extras(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    price_per_nail NUMERIC(10, 2) NOT NULL CHECK (price_per_nail >= 0),
    quantity INTEGER NOT NULL CHECK (quantity >= 0 AND quantity <= 10),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointment_extras_appointment_id ON appointment_extras (appointment_id);

-- =============================================================================
-- 5. MOVIMIENTOS FINANCIEROS (financial_movements)
-- Equivalente a interfaz `FinancialMovement` en src/types.ts
-- =============================================================================
CREATE TABLE IF NOT EXISTS financial_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL DEFAULT '',
    payment_method TEXT CHECK (payment_method IN ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA') OR payment_method IS NULL),
    client_name TEXT DEFAULT '',
    service_name TEXT DEFAULT '',
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    cost_of_supplies NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (cost_of_supplies >= 0),
    staff_commission NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (staff_commission >= 0),
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_movements_date ON financial_movements (date);
CREATE INDEX IF NOT EXISTS idx_financial_movements_type ON financial_movements (type);
CREATE INDEX IF NOT EXISTS idx_financial_movements_category ON financial_movements (category);

-- =============================================================================
-- 6. PRECIOS ESPECIALES POR CLIENTA (special_prices)
-- Equivalente a interfaz `SpecialPrice` en src/types.ts
-- =============================================================================
CREATE TABLE IF NOT EXISTS special_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    special_price NUMERIC(10, 2) NOT NULL CHECK (special_price >= 0),
    group_label TEXT NOT NULL DEFAULT 'CLIENTA REGULAR',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_client_service_special_price UNIQUE (client_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_special_prices_client_id ON special_prices (client_id);

-- =============================================================================
-- 7. EVENTOS DE AUDITORÍA DE PRECIOS (price_change_events)
-- Equivalente a interfaz `PriceChangeEvent` en src/types.ts
-- =============================================================================
CREATE TABLE IF NOT EXISTS price_change_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('catalog', 'special')),
    target_id UUID NOT NULL,
    name TEXT NOT NULL,
    old_price NUMERIC(10, 2) NOT NULL,
    new_price NUMERIC(10, 2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    changed_by TEXT NOT NULL DEFAULT 'Administradora',
    reason TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_change_events_date ON price_change_events (date);

-- =============================================================================
-- 8. CONFIGURACIÓN DEL SISTEMA (AJUSTES)
-- Equivalente a `bs_admin_profile`, `bs_categories`, `bs_payment_methods`
-- =============================================================================
CREATE TABLE IF NOT EXISTS admin_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Administradora',
    photo_url TEXT DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- VALORES INICIALES DE CONFIGURACIÓN BÁSICA
-- =============================================================================
INSERT INTO categories (name) VALUES
    ('Suministros & Esmaltes'),
    ('Mantenimiento Equipo'),
    ('Publicidad & RRSS'),
    ('Alquiler & Expensas'),
    ('Insumos Descartables')
ON CONFLICT (name) DO NOTHING;

INSERT INTO payment_methods (name) VALUES
    ('TRANSFERENCIA'),
    ('EFECTIVO'),
    ('TARJETA')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- 9. ROW LEVEL SECURITY (RLS) & POLÍTICAS DE ACCESO
-- =============================================================================
-- Esquema single-tenant protegido por Supabase Auth:
-- Todas las tablas tienen RLS habilitado.
-- El acceso completo (SELECT, INSERT, UPDATE, DELETE) se reserva a usuarios autenticados.

-- 1. clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users have full access to clients"
    ON clients FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 2. services
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users have full access to services"
    ON services FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 3. service_price_history
ALTER TABLE service_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users have full access to service_price_history"
    ON service_price_history FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 4. extras
ALTER TABLE extras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users have full access to extras"
    ON extras FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 5. extra_price_history
ALTER TABLE extra_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users have full access to extra_price_history"
    ON extra_price_history FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 6. appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users have full access to appointments"
    ON appointments FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 7. appointment_extras
ALTER TABLE appointment_extras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users have full access to appointment_extras"
    ON appointment_extras FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 8. financial_movements
ALTER TABLE financial_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users have full access to financial_movements"
    ON financial_movements FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 9. special_prices
ALTER TABLE special_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users have full access to special_prices"
    ON special_prices FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 10. price_change_events
ALTER TABLE price_change_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users have full access to price_change_events"
    ON price_change_events FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 11. admin_profile
ALTER TABLE admin_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users have full access to admin_profile"
    ON admin_profile FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 12. categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users have full access to categories"
    ON categories FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 13. payment_methods
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users have full access to payment_methods"
    ON payment_methods FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- =============================================================================
-- 10. VISTA PÚBLICA DE PERFIL DE ADMINISTRADORA (Login Preview)
-- Permite lectura pública exclusivamente de nombre y foto para la pantalla
-- de login, sin dar acceso a datos confidenciales ni tocar el resto de RLS.
-- =============================================================================
CREATE OR REPLACE VIEW public_admin_profile AS
  SELECT name, photo_url FROM admin_profile LIMIT 1;

GRANT SELECT ON public_admin_profile TO anon;
GRANT SELECT ON public_admin_profile TO authenticated;

-- =============================================================================
-- 11. SISTEMA DE NOTIFICACIONES PUSH EN SEGUNDO PLANO (Web Push + VAPID)
-- =============================================================================

-- Tabla de suscripciones Push por dispositivo y usuario
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    device_label TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subscriptions" ON push_subscriptions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Control de recordatorio de citas 1 hora antes
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_appointments_reminder ON appointments (date, status, reminder_sent_at);

-- Eventos de cambios en citas (cancelaciones y reprogramaciones)
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
CREATE POLICY "authenticated_access_change_events" ON appointment_change_events
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Trigger para detectar cancelaciones y reprogramaciones automáticamente
CREATE OR REPLACE FUNCTION fn_detect_appointment_change()
RETURNS TRIGGER AS $$
DECLARE
    v_client_name TEXT := '';
    v_service_name TEXT := '';
BEGIN
    SELECT COALESCE(name, 'Clienta') INTO v_client_name FROM clients WHERE id = NEW.client_id;
    SELECT COALESCE(name, 'Servicio') INTO v_service_name FROM services WHERE id = NEW.service_id;

    IF (NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status <> 'cancelled')) THEN
        INSERT INTO appointment_change_events (
            appointment_id, client_name, service_name, change_type, old_date, old_time
        ) VALUES (
            NEW.id, v_client_name, v_service_name, 'cancelled', OLD.date, OLD.time
        );
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



