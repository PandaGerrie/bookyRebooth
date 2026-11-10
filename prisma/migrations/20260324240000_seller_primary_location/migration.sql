-- AlterTable
ALTER TABLE `Seller` ADD COLUMN `primaryLocationId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Seller_primaryLocationId_idx` ON `Seller`(`primaryLocationId`);

-- AddForeignKey
ALTER TABLE `Seller` ADD CONSTRAINT `Seller_primaryLocationId_fkey` FOREIGN KEY (`primaryLocationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
