-- Add LinkedIn Email Verification Support
-- This migration adds the linkedin_verification_sessions table for 2FA email verification

-- Create linkedin_verification_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS "linkedin_verification_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountEmail" VARCHAR(255) NOT NULL,
    "profileUrl" VARCHAR(500) NOT NULL,
    "browserSessionData" TEXT NOT NULL,
    "encryptionIv" TEXT NOT NULL,
    "encryptionAuthTag" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attemptsRemaining" INTEGER NOT NULL DEFAULT 3,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "linkedin_verification_sessions_pkey" PRIMARY KEY ("id")
);

-- Create indexes for linkedin_verification_sessions if they don't exist
CREATE INDEX IF NOT EXISTS "linkedin_verification_sessions_userId_status_expiresAt_idx"
ON "linkedin_verification_sessions"("userId", "status", "expiresAt");

CREATE INDEX IF NOT EXISTS "linkedin_verification_sessions_status_expiresAt_idx"
ON "linkedin_verification_sessions"("status", "expiresAt");
