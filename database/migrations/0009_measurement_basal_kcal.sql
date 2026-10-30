-- Campo opcional para gasto calórico basal informado pelo professor em avaliações.
ALTER TABLE student_measurements ADD COLUMN basal_kcal REAL;
INSERT OR IGNORE INTO schema_migrations(version) VALUES ('0009_measurement_basal_kcal');
