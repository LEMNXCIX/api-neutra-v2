-- AlterTable: add userId to staff
ALTER TABLE "staff" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE INDEX "staff_userId_idx" ON "staff"("userId");

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
