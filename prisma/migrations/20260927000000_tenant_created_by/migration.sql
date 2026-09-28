-- AlterTable: add creator to tenant
ALTER TABLE "tenants" ADD COLUMN "createdById" TEXT;

-- CreateIndex
CREATE INDEX "tenants_createdById_idx" ON "tenants"("createdById");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: only this tenant was created through the app, so only it gets a creator.
-- The three seed tenants (default, superadmin, book) have no human creator: the
-- level-100 member in them is whoever was granted ADMIN later, not necessarily
-- the person who made them. Attributing them would be a false claim, so they
-- stay NULL and belong to nobody.
UPDATE "tenants" SET "createdById" = '5b653379-de4d-4e59-99ee-59cf976a6b25' WHERE id = '81315364-707e-47c7-8dda-da9c6f30425a' AND "createdById" IS NULL;
