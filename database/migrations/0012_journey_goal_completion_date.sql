-- Store the actual date when a student reaches a journey goal.
ALTER TABLE student_journey_goals ADD COLUMN completed_at TEXT;
INSERT OR IGNORE INTO schema_migrations(version) VALUES ('0012_journey_goal_completion_date');
