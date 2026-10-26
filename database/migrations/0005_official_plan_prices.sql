-- R-FIT V2 | Valores comerciais aprovados para o catálogo inicial.
-- Preços em centavos: Nutrição R$ 75/mês, Treino R$ 95/mês,
-- Completo R$ 149/mês, Premium Vitalício R$ 199 pagamento único.
UPDATE plans SET price_cents=7500,updated_at=CURRENT_TIMESTAMP WHERE code='nutrition';
UPDATE plans SET price_cents=9500,updated_at=CURRENT_TIMESTAMP WHERE code='training';
UPDATE plans SET price_cents=14900,updated_at=CURRENT_TIMESTAMP WHERE code='combo';
UPDATE plans SET price_cents=19900,updated_at=CURRENT_TIMESTAMP WHERE code='premium_lifetime';
INSERT OR IGNORE INTO schema_migrations(version) VALUES ('0005_official_plan_prices');
