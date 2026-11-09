-- AlterTable
ALTER TABLE `Flow` ADD COLUMN `name` VARCHAR(191) NOT NULL DEFAULT 'Nieuwe flow';

-- Recreate entityId index without unique constraint (MySQL FK depends on existing index)
ALTER TABLE `Flow` DROP FOREIGN KEY `Flow_entityId_fkey`;
DROP INDEX `Flow_entityId_key` ON `Flow`;
CREATE INDEX `Flow_entityId_idx` ON `Flow`(`entityId`);
ALTER TABLE `Flow` ADD CONSTRAINT `Flow_entityId_fkey` FOREIGN KEY (`entityId`) REFERENCES `Entity`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
