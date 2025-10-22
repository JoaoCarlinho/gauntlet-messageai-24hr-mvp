-- Fix User table schema to match Prisma schema
-- Add pushTokens column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'pushTokens') THEN
        ALTER TABLE "User" ADD COLUMN "pushTokens" TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;
END $$;
