-- =============================================================================
-- BEAUTY SPACE — ESQUEMA DE BASE DE DATOS (PROPUESTO PARA SUPABASE / POSTGRESQL)
-- =============================================================================
-- Fecha: Septiembre 2026
-- Estado: Propuesta técnica para migración desde localStorage a Supabase
-- Nota: NO EJECUTAR AÚN. Este archivo sirve como especificación y referencia
--       para la fase de migración real de datos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- DECISIÓN ABIERTA DE MODELO DE ACCESO Y SEGURIDAD (PENDIENTE DE CONFIRMACIÓN):
-- -----------------------------------------------------------------------------
-- Actualmente, Beauty Space opera como una aplicación single-tenant para una sola
-- administradora/estudio, protegida mediante un hash de PIN local (SHA-256) en el cliente.
--
-- Al migrar a Supabase, se debe elegir entre dos modelos arquitectónicos:
--
-- OPCIÓN (A) — Single-Tenant con API Key protegida por la app:
--   - Se mantiene la base de datos exclusiva para un solo salón.
--   - Se configuran políticas RLS permisivas para `anon` o se accede mediante
--     un endpoint / service role autenticado tras validar el PIN.
--   - Ventaja: Cero fricción de registro, mantiene idéntico el flujo actual de PIN.
--   - Desventaja: No permite múltiples salones o múltiples cuentas aisladas en la misma BD.
--
-- OPCIÓN (B) — Multi-Tenant o Single-Tenant con Supabase Auth & RLS por usuario:
--   - Cada administradora o empleada se registra en `auth.users` con email/contraseña
--     o magic link.
--   - Cada tabla incluye una columna `user_id uuid references auth.users(id) not null default auth.uid()`.
--   - Se habilitan políticas RLS estrictas:
--     `CREATE POLICY "Users can only access their own data" ON ... FOR ALL USING (auth.uid() = user_id);`
--   - Ventaja: Seguridad de nivel bancario, multi-sucursal/multi-inquilino nativo.
--   - Desventaja: Requiere sustituir el login de PIN por login de usuario/contraseña
--     o implementar un custom auth provider con PIN.
--
-- [ESTA DECISIÓN QUEDA PENDIENTE PARA QUE EL PROPIETARIO DEL PRODUCTO LA DEFINA]
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
    price NUMERIC(10, 2) NOT NULL CHECK (price_per_nail >= 0),
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
