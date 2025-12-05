-- CreateTable
CREATE TABLE "AppConfig" (
  "key" TEXT PRIMARY KEY,
  "value" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to auto-update updatedAt on update (for SQLite)
CREATE TRIGGER IF NOT EXISTS appconfig_updated_at
AFTER UPDATE ON "AppConfig"
FOR EACH ROW BEGIN
  UPDATE "AppConfig" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "key" = OLD."key";
END;
