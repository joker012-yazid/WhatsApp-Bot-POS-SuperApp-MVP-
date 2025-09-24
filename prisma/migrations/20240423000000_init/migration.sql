-- Create enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role') THEN
    CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'AGENT', 'CASHIER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticketstatus') THEN
    CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'paymentmethod') THEN
    CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'EWALLET');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wamessagedirection') THEN
    CREATE TYPE "WaMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wasessionstatus') THEN
    CREATE TYPE "WaSessionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISCONNECTED');
  END IF;
END $$;

-- users
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'AGENT',
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "totpSecret" TEXT,
  "totpEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- branches
CREATE TABLE IF NOT EXISTS "branches" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Kuala_Lumpur',
  "operatingHours" JSONB,
  "selfSignupEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- customers
CREATE TABLE IF NOT EXISTS "customers" (
  "id" TEXT PRIMARY KEY,
  "fullName" TEXT NOT NULL,
  "phone" TEXT NOT NULL UNIQUE,
  "email" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT '{}'::text[],
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "customers_phone_idx" ON "customers"("phone");

-- products
CREATE TABLE IF NOT EXISTS "products" (
  "id" TEXT PRIMARY KEY,
  "branchId" TEXT NOT NULL REFERENCES "branches"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "stockQty" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("branchId", "sku")
);

-- sales
CREATE TABLE IF NOT EXISTS "sales" (
  "id" TEXT PRIMARY KEY,
  "branchId" TEXT NOT NULL REFERENCES "branches"("id") ON DELETE RESTRICT,
  "customerId" TEXT REFERENCES "customers"("id"),
  "paymentMethod" "PaymentMethod" NOT NULL,
  "subtotalCents" INTEGER NOT NULL,
  "discountCents" INTEGER NOT NULL DEFAULT 0,
  "taxCents" INTEGER NOT NULL,
  "totalCents" INTEGER NOT NULL,
  "receiptNo" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "sales_branch_created_idx" ON "sales"("branchId", "createdAt" DESC);

-- sale items
CREATE TABLE IF NOT EXISTS "sale_items" (
  "id" TEXT PRIMARY KEY,
  "saleId" TEXT NOT NULL REFERENCES "sales"("id") ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "products"("id"),
  "quantity" INTEGER NOT NULL,
  "unitPrice" INTEGER NOT NULL,
  "discountCents" INTEGER NOT NULL DEFAULT 0,
  "totalCents" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- wa sessions
CREATE TABLE IF NOT EXISTS "wa_sessions" (
  "id" TEXT PRIMARY KEY,
  "branchId" TEXT REFERENCES "branches"("id"),
  "label" TEXT NOT NULL,
  "status" "WaSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "lastConnectedAt" TIMESTAMPTZ,
  "isPaused" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- wa messages
CREATE TABLE IF NOT EXISTS "wa_messages" (
  "id" TEXT PRIMARY KEY,
  "sessionId" TEXT NOT NULL REFERENCES "wa_sessions"("id") ON DELETE CASCADE,
  "direction" "WaMessageDirection" NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "wa_messages_session_created_idx" ON "wa_messages"("sessionId", "createdAt" DESC);

-- tickets
CREATE TABLE IF NOT EXISTS "tickets" (
  "id" TEXT PRIMARY KEY,
  "customerId" TEXT REFERENCES "customers"("id"),
  "waSessionId" TEXT REFERENCES "wa_sessions"("id"),
  "subject" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
  "priority" INTEGER NOT NULL DEFAULT 3,
  "assigneeId" TEXT REFERENCES "users"("id"),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "tickets_customer_status_idx" ON "tickets"("customerId", "status");

-- crm interactions
CREATE TABLE IF NOT EXISTS "crm_interactions" (
  "id" TEXT PRIMARY KEY,
  "customerId" TEXT REFERENCES "customers"("id"),
  "ticketId" TEXT REFERENCES "tickets"("id"),
  "channel" TEXT NOT NULL,
  "summary" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- forms
CREATE TABLE IF NOT EXISTS "forms" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- form submissions
CREATE TABLE IF NOT EXISTS "form_submissions" (
  "id" TEXT PRIMARY KEY,
  "formId" TEXT NOT NULL REFERENCES "forms"("id") ON DELETE CASCADE,
  "customerId" TEXT REFERENCES "customers"("id"),
  "payload" JSONB NOT NULL,
  "submittedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ai suggestions
CREATE TABLE IF NOT EXISTS "ai_suggestions" (
  "id" TEXT PRIMARY KEY,
  "ticketId" TEXT REFERENCES "tickets"("id"),
  "interactionId" TEXT REFERENCES "crm_interactions"("id"),
  "suggestion" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- audit logs
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" TEXT PRIMARY KEY,
  "actorId" TEXT REFERENCES "users"("id"),
  "ticketId" TEXT REFERENCES "tickets"("id"),
  "saleId" TEXT REFERENCES "sales"("id"),
  "action" TEXT NOT NULL,
  "details" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to update updatedAt
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users
BEFORE UPDATE ON "users"
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER set_updated_at_branches
BEFORE UPDATE ON "branches"
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER set_updated_at_customers
BEFORE UPDATE ON "customers"
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER set_updated_at_products
BEFORE UPDATE ON "products"
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER set_updated_at_sales
BEFORE UPDATE ON "sales"
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER set_updated_at_wa_sessions
BEFORE UPDATE ON "wa_sessions"
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER set_updated_at_tickets
BEFORE UPDATE ON "tickets"
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER set_updated_at_crm_interactions
BEFORE UPDATE ON "crm_interactions"
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER set_updated_at_forms
BEFORE UPDATE ON "forms"
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER set_updated_at_form_submissions
BEFORE UPDATE ON "form_submissions"
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER set_updated_at_ai_suggestions
BEFORE UPDATE ON "ai_suggestions"
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
