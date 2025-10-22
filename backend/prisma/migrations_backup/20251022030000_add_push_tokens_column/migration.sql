-- Add pushTokens column to User table
ALTER TABLE "User" ADD COLUMN "pushTokens" TEXT[] DEFAULT ARRAY[]::TEXT[];
