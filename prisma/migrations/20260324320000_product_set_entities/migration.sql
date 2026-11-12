-- CreateTable
CREATE TABLE `_ProductSetEntities` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_ProductSetEntities_AB_unique`(`A`, `B`),
    INDEX `_ProductSetEntities_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_ProductSetEntities` ADD CONSTRAINT `_ProductSetEntities_A_fkey` FOREIGN KEY (`A`) REFERENCES `Entity`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ProductSetEntities` ADD CONSTRAINT `_ProductSetEntities_B_fkey` FOREIGN KEY (`B`) REFERENCES `ProductSet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
