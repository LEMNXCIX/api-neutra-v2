/*
  Warnings:

  - Added the required column `tenantId` to the `banners` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `categories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `coupons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `slideshows` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TenantType" AS ENUM ('STORE', 'BOOKING', 'HYBRID');

-- CreateTable (Create tenants table FIRST)
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "TenantType" NOT NULL DEFAULT 'STORE',
    "config" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- Insert Default Tenant (CRITICAL: Do this BEFORE altering tables)
INSERT INTO "tenants" ("id", "name", "slug", "type", "active", "createdAt", "updatedAt")
VALUES (
    'default-tenant-00000000-0000-0000-0000-000000000001',
    'Default Store',
    'default',
    'STORE',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- AlterTable (Now add columns WITH a default pointing to the tenant we just created)
ALTER TABLE "banners" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant-00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "categories" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant-00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "coupons" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant-00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant-00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "products" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant-00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "slideshows" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant-00000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "users" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant-00000000-0000-0000-0000-000000000001';

-- Remove defaults after backfilling (so future inserts require explicit tenantId)
ALTER TABLE "banners" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "categories" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "coupons" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "products" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "slideshows" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "tenantId" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "banners_tenantId_idx" ON "banners"("tenantId");

-- CreateIndex
CREATE INDEX "categories_tenantId_idx" ON "categories"("tenantId");

-- CreateIndex
CREATE INDEX "coupons_tenantId_idx" ON "coupons"("tenantId");

-- CreateIndex
CREATE INDEX "orders_tenantId_idx" ON "orders"("tenantId");

-- CreateIndex
CREATE INDEX "products_tenantId_idx" ON "products"("tenantId");

-- CreateIndex
CREATE INDEX "slideshows_tenantId_idx" ON "slideshows"("tenantId");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slideshows" ADD CONSTRAINT "slideshows_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
