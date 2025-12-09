-- Add sequential orderNumber with unique index (idempotent for SQLite 3.35+)
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "orderNumber" INTEGER;

-- initialize existing rows with a sequence based on createdAt, falling back to rowid
WITH ordered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS seq
  FROM "Order"
)
UPDATE "Order" AS o
SET "orderNumber" = ordered.seq
FROM ordered
WHERE ordered.id = o.id;

-- enforce uniqueness (non-null enforced at app layer)
CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNumber_key" ON "Order"("orderNumber");
