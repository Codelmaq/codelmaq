-- Add missing columns to machines table
ALTER TABLE machines ADD COLUMN IF NOT EXISTS "implementValue" NUMERIC DEFAULT 0;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS "image" TEXT;
