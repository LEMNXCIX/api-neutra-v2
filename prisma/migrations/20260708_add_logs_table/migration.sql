CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL');

CREATE TABLE "logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "method" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "error" JSONB,
    "traceId" TEXT,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "logs_traceId_key" ON "logs"("traceId");
CREATE INDEX "logs_timestamp_idx" ON "logs"("timestamp");
CREATE INDEX "logs_level_idx" ON "logs"("level");
CREATE INDEX "logs_tenantId_idx" ON "logs"("tenantId");
CREATE INDEX "logs_traceId_idx" ON "logs"("traceId");
