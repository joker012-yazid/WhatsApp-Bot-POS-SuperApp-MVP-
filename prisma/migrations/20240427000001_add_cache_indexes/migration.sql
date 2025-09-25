CREATE INDEX IF NOT EXISTS "products_branch_name_idx" ON "products"("branchId", "name");
CREATE INDEX IF NOT EXISTS "tickets_status_created_idx" ON "tickets"("status", "createdAt" DESC);
