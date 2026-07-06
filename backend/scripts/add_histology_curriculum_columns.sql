-- Temel histoloji müfredatı (Histology Guide tarzı) sütunları
-- Mevcut PostgreSQL kurulumunda bir kez çalıştırın.

ALTER TABLE histology_images ADD COLUMN IF NOT EXISTS curriculum_track VARCHAR;
ALTER TABLE histology_images ADD COLUMN IF NOT EXISTS science_unit VARCHAR;

CREATE INDEX IF NOT EXISTS ix_histology_images_curriculum_track ON histology_images (curriculum_track);
CREATE INDEX IF NOT EXISTS ix_histology_images_science_unit ON histology_images (science_unit);
