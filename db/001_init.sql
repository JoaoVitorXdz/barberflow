-- BarberFlow - schema inicial (PostgreSQL 15+)
-- Todos os instantes são guardados em UTC (timestamptz).
-- O fuso de exibição vem de tenants.timezone.

CREATE EXTENSION IF NOT EXISTS btree_gist;  -- necessário para a exclusion constraint
CREATE EXTENSION IF NOT EXISTS citext;      -- e-mail case-insensitive

CREATE TYPE user_role AS ENUM ('owner', 'barber', 'receptionist', 'customer');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');
CREATE TYPE notification_channel AS ENUM ('email', 'whatsapp', 'sms');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed');

-- ---------------------------------------------------------------
-- Tenants (cada barbearia)
-- ---------------------------------------------------------------
CREATE TABLE tenants (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    slug        text NOT NULL UNIQUE,
    timezone    text NOT NULL DEFAULT 'America/Recife',
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------
-- Usuários (donos, barbeiros, recepção e clientes)
-- ---------------------------------------------------------------
CREATE TABLE users (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name           text NOT NULL,
    email          citext NOT NULL,
    phone          text,
    password_hash  text NOT NULL,
    role           user_role NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, email)
);
CREATE INDEX idx_users_tenant ON users(tenant_id);

-- ---------------------------------------------------------------
-- Barbeiros (perfil profissional ligado a um usuário)
-- ---------------------------------------------------------------
CREATE TABLE barbers (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name  text NOT NULL,
    active        boolean NOT NULL DEFAULT true,
    UNIQUE (user_id)
);
CREATE INDEX idx_barbers_tenant ON barbers(tenant_id);

-- ---------------------------------------------------------------
-- Serviços (corte, barba, combo...)
-- ---------------------------------------------------------------
CREATE TABLE services (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name              text NOT NULL,
    duration_minutes  integer NOT NULL CHECK (duration_minutes > 0),
    price_cents       integer NOT NULL CHECK (price_cents >= 0),
    active            boolean NOT NULL DEFAULT true
);
CREATE INDEX idx_services_tenant ON services(tenant_id);

-- Quais serviços cada barbeiro realiza
CREATE TABLE barber_services (
    barber_id   uuid NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    service_id  uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    PRIMARY KEY (barber_id, service_id)
);

-- ---------------------------------------------------------------
-- Jornada semanal do barbeiro (hora local do tenant)
-- weekday: 0 = domingo ... 6 = sábado
-- ---------------------------------------------------------------
CREATE TABLE working_hours (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    barber_id   uuid NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    weekday     smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    start_time  time NOT NULL,
    end_time    time NOT NULL,
    CHECK (end_time > start_time)
);
CREATE INDEX idx_working_hours_barber ON working_hours(barber_id, weekday);

-- ---------------------------------------------------------------
-- Bloqueios pontuais (folga, almoço, atestado)
-- ---------------------------------------------------------------
CREATE TABLE time_blocks (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    barber_id  uuid NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    period     tstzrange NOT NULL,
    reason     text,
    CHECK (NOT isempty(period))
);
CREATE INDEX idx_time_blocks_period ON time_blocks USING gist (barber_id, period);

-- ---------------------------------------------------------------
-- Agendamentos
-- A exclusion constraint impede, no próprio banco, dois agendamentos
-- ativos sobrepostos para o mesmo barbeiro (resolve a concorrência).
-- ---------------------------------------------------------------
CREATE TABLE appointments (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    barber_id    uuid NOT NULL REFERENCES barbers(id),
    customer_id  uuid NOT NULL REFERENCES users(id),
    service_id   uuid NOT NULL REFERENCES services(id),
    period       tstzrange NOT NULL,
    status       appointment_status NOT NULL DEFAULT 'scheduled',
    price_cents  integer NOT NULL CHECK (price_cents >= 0), -- preço no momento da reserva
    created_at   timestamptz NOT NULL DEFAULT now(),
    CHECK (NOT isempty(period)),
    CONSTRAINT no_overlapping_appointments
        EXCLUDE USING gist (barber_id WITH =, period WITH &&)
        WHERE (status = 'scheduled')
);
CREATE INDEX idx_appointments_tenant_period ON appointments USING gist (tenant_id, period);
CREATE INDEX idx_appointments_customer ON appointments(customer_id);

-- ---------------------------------------------------------------
-- Notificações (processadas de forma assíncrona por uma fila)
-- ---------------------------------------------------------------
CREATE TABLE notifications (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    appointment_id  uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    channel         notification_channel NOT NULL,
    kind            text NOT NULL,            -- 'confirmation', 'reminder', 'cancellation'
    status          notification_status NOT NULL DEFAULT 'pending',
    scheduled_for   timestamptz NOT NULL,
    sent_at         timestamptz,
    attempts        integer NOT NULL DEFAULT 0
);
CREATE INDEX idx_notifications_pending ON notifications(scheduled_for) WHERE status = 'pending';
