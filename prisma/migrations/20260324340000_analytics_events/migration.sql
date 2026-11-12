-- CreateTable
CREATE TABLE `AnalyticsEvent` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('NOT_FOUND_404', 'FORM_SUBMIT_ERROR', 'EMAIL_ERROR', 'MAKE_ERROR', 'FORM_SUBMIT_SUCCESS') NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `sellerId` VARCHAR(191) NULL,
    `locationId` VARCHAR(191) NULL,
    `categoryId` VARCHAR(191) NULL,
    `message` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AnalyticsEvent_type_createdAt_idx`(`type`, `createdAt`),
    INDEX `AnalyticsEvent_entityId_createdAt_idx`(`entityId`, `createdAt`),
    INDEX `AnalyticsEvent_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AnalyticsEvent` ADD CONSTRAINT `AnalyticsEvent_entityId_fkey` FOREIGN KEY (`entityId`) REFERENCES `Entity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
