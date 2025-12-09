-- DropForeignKey
ALTER TABLE `attachments` DROP FOREIGN KEY `Attachment_createdById_fkey`;

-- DropForeignKey
ALTER TABLE `attachments` DROP FOREIGN KEY `Attachment_pathId_fkey`;

-- DropForeignKey
ALTER TABLE `attachments` DROP FOREIGN KEY `Attachment_updatedById_fkey`;

-- DropForeignKey
ALTER TABLE `attachments` DROP FOREIGN KEY `Attachment_userId_fkey`;

-- DropForeignKey
ALTER TABLE `logs` DROP FOREIGN KEY `Log_attachmentId_fkey`;

-- DropForeignKey
ALTER TABLE `logs` DROP FOREIGN KEY `Log_createdById_fkey`;

-- DropForeignKey
ALTER TABLE `logs` DROP FOREIGN KEY `Log_updatedById_fkey`;

-- DropForeignKey
ALTER TABLE `paths` DROP FOREIGN KEY `Path_ownerId_fkey`;

-- DropForeignKey
ALTER TABLE `paths` DROP FOREIGN KEY `Path_parentId_fkey`;

-- AddForeignKey
ALTER TABLE `paths` ADD CONSTRAINT `paths_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `paths` ADD CONSTRAINT `paths_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `paths`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_pathId_fkey` FOREIGN KEY (`pathId`) REFERENCES `paths`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `logs` ADD CONSTRAINT `logs_attachmentId_fkey` FOREIGN KEY (`attachmentId`) REFERENCES `attachments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `logs` ADD CONSTRAINT `logs_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `logs` ADD CONSTRAINT `logs_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `paths` RENAME INDEX `Path_ownerId_name_key` TO `paths_ownerId_name_key`;

-- RenameIndex
ALTER TABLE `users` RENAME INDEX `User_email_key` TO `users_email_key`;
