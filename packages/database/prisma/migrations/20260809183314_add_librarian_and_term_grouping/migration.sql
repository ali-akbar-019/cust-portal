-- AlterTable
ALTER TABLE `user` MODIFY `role` ENUM('STUDENT', 'TEACHER', 'ADMIN', 'LIBRARIAN') NOT NULL;

-- CreateTable
CREATE TABLE `Librarian` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Librarian_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Librarian` ADD CONSTRAINT `Librarian_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
