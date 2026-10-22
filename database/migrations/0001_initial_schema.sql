-- ============================================================================
-- R-FIT V2 | MIGRAÇÃO INICIAL DO BANCO D1
-- 01. Controle de migrações
-- 02. Usuários e perfis
-- 03. Planos, assinaturas e pagamentos
-- 04. Convites e anamnese
-- 05. Treinos, sessões e exercícios
-- 06. Dietas e refeições
-- 07. Medidas, check-ins e fotos
-- 08. Notificações e auditoria
-- 09. Índices de consulta
-- 10. Catálogo inicial de planos
--
-- Banco alvo: rfit-v2-db (binding RFIT_DB).
-- Não executar contra rfit-db nem qualquer banco legado.
-- Alterações futuras devem entrar em nova migração numerada; não reescrever
-- uma migração que já tenha sido aplicada a um ambiente compartilhado.
-- ============================================================================

PRAGMA foreign_keys = ON;

/* 01. CONTROLE DE MIGRAÇÕES */
CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);

/* 02. USUÁRIOS E PERFIS */
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE COLLATE NOCASE,password_hash TEXT,google_subject TEXT UNIQUE,full_name TEXT NOT NULL,phone TEXT,avatar_url TEXT,role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student','professor','admin')),email_verified_at TEXT,status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','pending')),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS student_profiles (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,birth_date TEXT,sex TEXT,height_cm REAL,weight_kg REAL,goal TEXT,training_frequency INTEGER,experience_level TEXT,restrictions_json TEXT NOT NULL DEFAULT '{}',anamnesis_completed_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);

/* 03. PLANOS, ASSINATURAS E PAGAMENTOS */
CREATE TABLE IF NOT EXISTS plans (id TEXT PRIMARY KEY,code TEXT NOT NULL UNIQUE,name TEXT NOT NULL,description TEXT,price_cents INTEGER NOT NULL CHECK(price_cents >= 0),duration_days INTEGER,lifetime INTEGER NOT NULL DEFAULT 0 CHECK(lifetime IN (0,1)),includes_training INTEGER NOT NULL DEFAULT 0 CHECK(includes_training IN (0,1)),includes_nutrition INTEGER NOT NULL DEFAULT 0 CHECK(includes_nutrition IN (0,1)),is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS subscriptions (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),plan_id TEXT NOT NULL REFERENCES plans(id),status TEXT NOT NULL CHECK(status IN ('pending_payment','active','expired','cancelled','past_due')),starts_at TEXT,expires_at TEXT,lifetime INTEGER NOT NULL DEFAULT 0 CHECK(lifetime IN (0,1)),payment_provider TEXT,provider_subscription_id TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),subscription_id TEXT REFERENCES subscriptions(id),provider TEXT NOT NULL,provider_payment_id TEXT,amount_cents INTEGER NOT NULL CHECK(amount_cents >= 0),currency TEXT NOT NULL DEFAULT 'BRL',status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected','refunded','cancelled')),idempotency_key TEXT UNIQUE,paid_at TEXT,raw_event_json TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);

/* 04. CONVITES E ANAMNESE */
CREATE TABLE IF NOT EXISTS invite_tokens (id TEXT PRIMARY KEY,token_hash TEXT NOT NULL UNIQUE,created_by TEXT REFERENCES users(id),intended_email TEXT,expires_at TEXT NOT NULL,used_at TEXT,used_by TEXT REFERENCES users(id),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS anamneses (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),version INTEGER NOT NULL DEFAULT 1,answers_json TEXT NOT NULL,completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,reviewed_by TEXT REFERENCES users(id),reviewed_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);

/* 05. TREINOS, SESSÕES E EXERCÍCIOS */
CREATE TABLE IF NOT EXISTS workouts (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),subscription_id TEXT REFERENCES subscriptions(id),title TEXT NOT NULL,goal TEXT,weekly_frequency INTEGER NOT NULL DEFAULT 3,source TEXT NOT NULL DEFAULT 'template' CHECK(source IN ('template','personalized','professor')),status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('draft','active','archived')),created_by TEXT REFERENCES users(id),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS workout_sessions (id TEXT PRIMARY KEY,workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,day_number INTEGER NOT NULL,title TEXT NOT NULL,notes TEXT,UNIQUE(workout_id,day_number));
CREATE TABLE IF NOT EXISTS workout_exercises (id TEXT PRIMARY KEY,session_id TEXT NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,exercise_name TEXT NOT NULL,sets INTEGER,reps TEXT,rest_seconds INTEGER,order_index INTEGER NOT NULL DEFAULT 0,notes TEXT);

/* 06. DIETAS E REFEIÇÕES */
CREATE TABLE IF NOT EXISTS diets (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),subscription_id TEXT REFERENCES subscriptions(id),title TEXT NOT NULL,goal TEXT,calories_target INTEGER,source TEXT NOT NULL DEFAULT 'template' CHECK(source IN ('template','personalized','professor')),status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('draft','active','archived')),created_by TEXT REFERENCES users(id),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS diet_meals (id TEXT PRIMARY KEY,diet_id TEXT NOT NULL REFERENCES diets(id) ON DELETE CASCADE,meal_order INTEGER NOT NULL,meal_name TEXT NOT NULL,items_json TEXT NOT NULL DEFAULT '[]',notes TEXT,UNIQUE(diet_id,meal_order));

/* 07. MEDIDAS, CHECK-INS E FOTOS */
CREATE TABLE IF NOT EXISTS student_measurements (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),weight_kg REAL,height_cm REAL,body_fat_pct REAL,waist_cm REAL,hip_cm REAL,chest_cm REAL,arm_cm REAL,thigh_cm REAL,notes TEXT,measured_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,created_by TEXT REFERENCES users(id));
CREATE TABLE IF NOT EXISTS weekly_checkins (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),week_start TEXT NOT NULL,answers_json TEXT NOT NULL DEFAULT '{}',notes TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(user_id,week_start));
CREATE TABLE IF NOT EXISTS progress_photos (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),object_key TEXT NOT NULL,photo_type TEXT,taken_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,consent_confirmed INTEGER NOT NULL DEFAULT 0 CHECK(consent_confirmed IN (0,1)));

/* 08. NOTIFICAÇÕES E AUDITORIA */
CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),channel TEXT NOT NULL CHECK(channel IN ('in_app','whatsapp','email')),template_code TEXT NOT NULL,payload_json TEXT NOT NULL DEFAULT '{}',scheduled_at TEXT,sent_at TEXT,status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','failed','cancelled')),provider_message_id TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY,actor_user_id TEXT REFERENCES users(id),action TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id TEXT,metadata_json TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);

/* 09. ÍNDICES DE CONSULTA */
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id,status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expiration ON subscriptions(status,expires_at);
CREATE INDEX IF NOT EXISTS idx_payments_user_created ON payments(user_id,created_at);
CREATE INDEX IF NOT EXISTS idx_workouts_user_status ON workouts(user_id,status);
CREATE INDEX IF NOT EXISTS idx_diets_user_status ON diets(user_id,status);
CREATE INDEX IF NOT EXISTS idx_measurements_user_date ON student_measurements(user_id,measured_at);
CREATE INDEX IF NOT EXISTS idx_notifications_due ON notifications(status,scheduled_at);

/* 10. CATÁLOGO INICIAL DE PLANOS
   Preços em zero são placeholders, não preços comerciais aprovados. */
INSERT OR IGNORE INTO plans (id,code,name,description,price_cents,duration_days,lifetime,includes_training,includes_nutrition) VALUES
('plan-nutrition','nutrition','Plano Nutrição','Acesso à dieta e funcionalidades nutricionais',0,30,0,0,1),
('plan-training','training','Plano Treino','Acesso às fichas de treino',0,30,0,1,0),
('plan-combo','combo','Plano Combo','Acesso a treino e nutrição',0,30,0,1,1),
('plan-premium-lifetime','premium_lifetime','Premium Vitalício','Acesso vitalício ao portal',0,NULL,1,1,1);

INSERT OR IGNORE INTO schema_migrations(version) VALUES ('0001_initial_schema');
