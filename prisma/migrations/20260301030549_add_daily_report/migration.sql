-- CreateTable
CREATE TABLE "daily_reports" (
    "id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "totalIncidents" INTEGER NOT NULL,
    "criticalAlerts" INTEGER NOT NULL,
    "peakActivityHour" INTEGER NOT NULL,
    "averageThreatLevel" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_reports_userId_idx" ON "daily_reports"("userId");

-- CreateIndex
CREATE INDEX "daily_reports_createdAt_idx" ON "daily_reports"("createdAt");

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
