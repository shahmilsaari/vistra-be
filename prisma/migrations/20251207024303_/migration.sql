-- AlterTable
ALTER TABLE `attachments` ADD COLUMN `pathId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_pathId_fkey` FOREIGN KEY (`pathId`) REFERENCES `paths`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
