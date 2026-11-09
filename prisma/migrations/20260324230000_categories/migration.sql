-- AlterEnum
ALTER TABLE `FlowStep` MODIFY `type` ENUM('FREE_CHOICE', 'PRODUCT_SET', 'LOCATIONS', 'CATEGORIES', 'SELLERS_AGENDA') NOT NULL;

-- CreateTable
CREATE TABLE `Category` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `imageUrl` TEXT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Category_entityId_idx`(`entityId`),
    UNIQUE INDEX `Category_entityId_slug_key`(`entityId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_SellerToCategory` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_SellerToCategory_AB_unique`(`A`, `B`),
    INDEX `_SellerToCategory_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Category` ADD CONSTRAINT `Category_entityId_fkey` FOREIGN KEY (`entityId`) REFERENCES `Entity`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_SellerToCategory` ADD CONSTRAINT `_SellerToCategory_A_fkey` FOREIGN KEY (`A`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_SellerToCategory` ADD CONSTRAINT `_SellerToCategory_B_fkey` FOREIGN KEY (`B`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
