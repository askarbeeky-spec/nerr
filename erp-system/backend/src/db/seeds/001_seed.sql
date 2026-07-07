-- ============================================================
-- ERP System — Seed Data (default admin user)
-- Password: Admin@12345  (bcrypt hash below)
-- ============================================================

INSERT INTO users (id, email, password_hash, role)
VALUES (
  uuid_generate_v4(),
  'admin@erp.local',
  '$2a$12$pKShYougkrNGYVuHDMiM1ePp06nem2gcp1iTRY2BBI.wmNscuQht6',
  'admin'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO departments (id, name, description)
VALUES
  (uuid_generate_v4(), 'Engineering', 'Software development and infrastructure'),
  (uuid_generate_v4(), 'HR', 'Human resources management'),
  (uuid_generate_v4(), 'Finance', 'Financial planning and accounting'),
  (uuid_generate_v4(), 'Sales', 'Sales and business development')
ON CONFLICT (name) DO NOTHING;
