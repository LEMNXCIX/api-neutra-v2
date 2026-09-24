-- AlterEnum
ALTER TYPE "AppointmentStatus" ADD VALUE 'NEEDS_REVIEW';

-- AlterTable
ALTER TABLE "appointments"
ADD COLUMN "statusChangedAt" TIMESTAMP(3),
ADD COLUMN "statusChangeReason" TEXT,
ADD COLUMN "statusChangedById" TEXT;
