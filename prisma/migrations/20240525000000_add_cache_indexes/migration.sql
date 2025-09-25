CREATE INDEX IF NOT EXISTS "products_branchId_name_idx" ON "products"("branchId", "name");
CREATE INDEX IF NOT EXISTS "tickets_status_createdAt_idx" ON "tickets"("status", "createdAt" DESC);
