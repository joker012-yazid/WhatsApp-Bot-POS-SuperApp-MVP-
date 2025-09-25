DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quotestatus') THEN
    CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'EXPIRED', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoicestatus') THEN
    CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'VOID');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'creditnotestatus') THEN
    CREATE TYPE "CreditNoteStatus" AS ENUM ('ISSUED', 'VOID');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'einvoicesubmissionstatus') THEN
    CREATE TYPE "EinvoiceSubmissionStatus" AS ENUM ('PENDING', 'SENT', 'ACCEPTED', 'REJECTED', 'FAILED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'einvoiceprovider') THEN
    CREATE TYPE "EinvoiceProvider" AS ENUM ('MOCK', 'MYINVOIS', 'PEPPOL');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'paymentmethod' AND e.enumlabel = 'BANK'
  ) THEN
    ALTER TYPE "PaymentMethod" ADD VALUE 'BANK';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "quotes" (
  "id" TEXT PRIMARY KEY,
  "quoteNo" TEXT NOT NULL,
  "branchId" TEXT NOT NULL REFERENCES "branches"("id") ON DELETE RESTRICT,
  "customerId" TEXT REFERENCES "customers"("id") ON DELETE SET NULL,
  "itemsTotal" NUMERIC(12, 2) NOT NULL,
  "discountTotal" NUMERIC(12, 2) NOT NULL DEFAULT 0,
  "taxableSubtotal" NUMERIC(12, 2) NOT NULL,
  "sst" NUMERIC(12, 2) NOT NULL,
  "grandTotal" NUMERIC(12, 2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MYR',
  "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
  "validUntil" TIMESTAMPTZ,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "quotes_branchId_quoteNo_key" ON "quotes"("branchId", "quoteNo");
CREATE INDEX IF NOT EXISTS "quotes_customerId_status_idx" ON "quotes"("customerId", "status");

CREATE TABLE IF NOT EXISTS "quote_items" (
  "id" TEXT PRIMARY KEY,
  "quoteId" TEXT NOT NULL REFERENCES "quotes"("id") ON DELETE CASCADE,
  "productId" TEXT REFERENCES "products"("id") ON DELETE SET NULL,
  "description" TEXT NOT NULL,
  "qty" NUMERIC(12, 2) NOT NULL CHECK ("qty" > 0),
  "unitPrice" NUMERIC(12, 2) NOT NULL,
  "lineDiscount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
  "lineTotal" NUMERIC(12, 2) NOT NULL,
  "taxCode" TEXT
);

CREATE TABLE IF NOT EXISTS "invoices" (
  "id" TEXT PRIMARY KEY,
  "invoiceNo" TEXT NOT NULL,
  "branchId" TEXT NOT NULL REFERENCES "branches"("id") ON DELETE RESTRICT,
  "customerId" TEXT REFERENCES "customers"("id") ON DELETE SET NULL,
  "quoteId" TEXT REFERENCES "quotes"("id") ON DELETE SET NULL,
  "issueDate" TIMESTAMPTZ NOT NULL,
  "dueDate" TIMESTAMPTZ,
  "itemsTotal" NUMERIC(12, 2) NOT NULL,
  "discountTotal" NUMERIC(12, 2) NOT NULL DEFAULT 0,
  "taxableSubtotal" NUMERIC(12, 2) NOT NULL,
  "sst" NUMERIC(12, 2) NOT NULL,
  "grandTotal" NUMERIC(12, 2) NOT NULL,
  "paidTotal" NUMERIC(12, 2) NOT NULL DEFAULT 0,
  "balanceDue" NUMERIC(12, 2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MYR',
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "posSaleId" TEXT REFERENCES "sales"("id") ON DELETE SET NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_branchId_invoiceNo_key" ON "invoices"("branchId", "invoiceNo");
CREATE INDEX IF NOT EXISTS "invoices_customerId_status_idx" ON "invoices"("customerId", "status");

CREATE TABLE IF NOT EXISTS "invoice_items" (
  "id" TEXT PRIMARY KEY,
  "invoiceId" TEXT NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
  "productId" TEXT REFERENCES "products"("id") ON DELETE SET NULL,
  "description" TEXT NOT NULL,
  "qty" NUMERIC(12, 2) NOT NULL CHECK ("qty" > 0),
  "unitPrice" NUMERIC(12, 2) NOT NULL,
  "lineDiscount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
  "lineTotal" NUMERIC(12, 2) NOT NULL,
  "taxCode" TEXT
);

CREATE TABLE IF NOT EXISTS "invoice_payments" (
  "id" TEXT PRIMARY KEY,
  "invoiceId" TEXT NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
  "method" "PaymentMethod" NOT NULL,
  "amount" NUMERIC(12, 2) NOT NULL CHECK ("amount" > 0),
  "reference" TEXT,
  "paidAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "credit_notes" (
  "id" TEXT PRIMARY KEY,
  "creditNoteNo" TEXT NOT NULL,
  "branchId" TEXT NOT NULL REFERENCES "branches"("id") ON DELETE RESTRICT,
  "invoiceId" TEXT NOT NULL REFERENCES "invoices"("id") ON DELETE RESTRICT,
  "reason" TEXT NOT NULL,
  "itemsTotal" NUMERIC(12, 2) NOT NULL,
  "discountTotal" NUMERIC(12, 2) NOT NULL DEFAULT 0,
  "taxableSubtotal" NUMERIC(12, 2) NOT NULL,
  "sst" NUMERIC(12, 2) NOT NULL,
  "grandTotal" NUMERIC(12, 2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MYR',
  "status" "CreditNoteStatus" NOT NULL DEFAULT 'ISSUED',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "credit_notes_branchId_creditNoteNo_key" ON "credit_notes"("branchId", "creditNoteNo");

CREATE TABLE IF NOT EXISTS "credit_note_items" (
  "id" TEXT PRIMARY KEY,
  "creditNoteId" TEXT NOT NULL REFERENCES "credit_notes"("id") ON DELETE CASCADE,
  "invoiceItemId" TEXT REFERENCES "invoice_items"("id") ON DELETE SET NULL,
  "description" TEXT NOT NULL,
  "qty" NUMERIC(12, 2) NOT NULL CHECK ("qty" > 0),
  "unitPrice" NUMERIC(12, 2) NOT NULL,
  "lineDiscount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
  "lineTotal" NUMERIC(12, 2) NOT NULL,
  "taxCode" TEXT,
  "productId" TEXT REFERENCES "products"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "einvoice_submissions" (
  "id" TEXT PRIMARY KEY,
  "invoiceId" TEXT NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
  "provider" "EinvoiceProvider" NOT NULL DEFAULT 'MOCK',
  "payload" JSONB NOT NULL,
  "submissionId" TEXT,
  "status" "EinvoiceSubmissionStatus" NOT NULL DEFAULT 'PENDING',
  "lastError" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastPolledAt" TIMESTAMPTZ,
  "timeoutAt" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "einvoice_submissions_invoiceId_idx" ON "einvoice_submissions"("invoiceId");
