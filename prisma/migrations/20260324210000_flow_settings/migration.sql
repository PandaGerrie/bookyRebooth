ALTER TABLE `Flow` ADD COLUMN `slug` VARCHAR(191) NOT NULL DEFAULT '';
ALTER TABLE `Flow` ADD COLUMN `featuredImage` TEXT NULL;

-- Backfill slugs for existing flows from name/id
UPDATE `Flow`
SET `slug` = CONCAT('flow-', `id`)
WHERE `slug` = '';

CREATE UNIQUE INDEX `Flow_entityId_slug_key` ON `Flow`(`entityId`, `slug`);
