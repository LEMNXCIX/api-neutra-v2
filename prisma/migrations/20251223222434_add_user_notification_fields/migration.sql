/*
  Warnings:

  - You are about to drop the column `category` on the `services` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tenantId,name,type]` on the table `categories` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('PRODUCT', 'SERVICE');

-- DropIndex
DROP INDEX "categories_name_key";

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "type" "CategoryType" NOT NULL DEFAULT 'PRODUCT';

-- AlterTable
ALTER TABLE "services" DROP COLUMN "category",
ADD COLUMN     "categoryId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "pushToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "categories_tenantId_name_type_key" ON "categories"("tenantId", "name", "type");

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
