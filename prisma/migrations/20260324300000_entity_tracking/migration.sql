-- AlterTable
ALTER TABLE `Entity`
  ADD COLUMN `gtmId` VARCHAR(32) NULL,
  ADD COLUMN `headerScripts` LONGTEXT NULL,
  ADD COLUMN `footerScripts` LONGTEXT NULL;
