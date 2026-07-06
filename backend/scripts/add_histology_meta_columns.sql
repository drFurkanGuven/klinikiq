-- Mevcut PostgreSQL kurulumunda histoloji tablosuna metadata sütunları eklemek için
-- (yeni kurulumlarda SQLAlchemy create_all ile oluşur.)
-- psql veya admin aracıyla bir kez çalıştırın.

ALTER TABLE histology_images ADD COLUMN IF NOT EXISTS stain VARCHAR;
ALTER TABLE histology_images ADD COLUMN IF NOT EXISTS organ VARCHAR;
ALTER TABLE histology_images ADD COLUMN IF NOT EXISTS asset_source VARCHAR;

CREATE INDEX IF NOT EXISTS ix_histology_images_stain ON histology_images (stain);
CREATE INDEX IF NOT EXISTS ix_histology_images_organ ON histology_images (organ);
CREATE INDEX IF NOT EXISTS ix_histology_images_asset_source ON histology_images (asset_source);
