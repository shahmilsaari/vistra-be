/*
  Warnings:

  - You are about to drop the column `pathId` on the `attachments` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `attachments` DROP FOREIGN KEY `attachments_pathId_fkey`;

-- AlterTable
ALTER TABLE `attachments` DROP COLUMN `pathId`,
    ADD COLUMN `path` VARCHAR(191) NOT NULL DEFAULT '/';
