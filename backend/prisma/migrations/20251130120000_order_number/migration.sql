-- Add sequential orderNumber with unique index
ALTER TABLE "Order" ADD COLUMN "orderNumber" INTEGER;

-- initialize existing rows with a sequence based on createdAt, falling back to rowid
WITH ordered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS seq
  FROM "Order"
)
UPDATE "Order" AS o
SET "orderNumber" = ordered.seq
FROM ordered
WHERE ordered.id = o.id;

-- enforce uniqueness and non-null constraint going forward
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
ALTER TABLE "Order" ALTER COLUMN "orderNumber" SET NOT NULL;
