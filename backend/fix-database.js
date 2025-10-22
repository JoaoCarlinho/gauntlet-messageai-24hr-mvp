#!/usr/bin/env node

/**
 * Database Fix Script for Railway Deployment
 * 
 * This script ensures the database schema is properly set up
 * by running migrations and handling any schema mismatches.
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function fixDatabase() {
  console.log('🔧 Starting database fix process...');
  
  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Check if User table exists
    console.log('🔍 Checking if User table exists...');
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'User'
      );
    `;
    
    if (!tableExists[0].exists) {
      console.log('⚠️  User table does not exist, creating it...');
      // Create the User table with all required columns
      await prisma.$executeRaw`
        CREATE TABLE "User" (
          "id" TEXT NOT NULL,
          "email" TEXT NOT NULL,
          "phoneNumber" TEXT,
          "password" TEXT NOT NULL,
          "displayName" TEXT NOT NULL,
          "avatarUrl" TEXT,
          "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "isOnline" BOOLEAN NOT NULL DEFAULT false,
          "pushTokens" TEXT[] DEFAULT ARRAY[]::TEXT[],
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "User_pkey" PRIMARY KEY ("id")
        );
      `;
      
      // Create unique indexes
      await prisma.$executeRaw`CREATE UNIQUE INDEX "User_email_key" ON "User"("email");`;
      await prisma.$executeRaw`CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");`;
      
      console.log('✅ User table created successfully');
    } else {
      console.log('✅ User table exists');
      
      // Check if pushTokens column exists
      console.log('🔍 Checking for pushTokens column...');
      const columnExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'User' AND column_name = 'pushTokens'
        );
      `;
      
      if (!columnExists[0].exists) {
        console.log('⚠️  pushTokens column missing, adding it...');
        await prisma.$executeRaw`
          ALTER TABLE "User" ADD COLUMN "pushTokens" TEXT[] DEFAULT ARRAY[]::TEXT[]
        `;
        console.log('✅ pushTokens column added successfully');
      } else {
        console.log('✅ pushTokens column already exists');
      }
    }
    
    // Check and create other tables if needed
    console.log('🔍 Checking other tables...');
    
    // Conversation table
    const conversationExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Conversation'
      );
    `;
    
    if (!conversationExists[0].exists) {
      console.log('⚠️  Conversation table missing, creating it...');
      await prisma.$executeRaw`
        CREATE TABLE "Conversation" (
          "id" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "name" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
        );
      `;
      console.log('✅ Conversation table created');
    }
    
    // Message table
    const messageExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Message'
      );
    `;
    
    if (!messageExists[0].exists) {
      console.log('⚠️  Message table missing, creating it...');
      await prisma.$executeRaw`
        CREATE TABLE "Message" (
          "id" TEXT NOT NULL,
          "conversationId" TEXT NOT NULL,
          "senderId" TEXT NOT NULL,
          "content" TEXT NOT NULL,
          "type" TEXT NOT NULL DEFAULT 'text',
          "mediaUrl" TEXT,
          "status" TEXT NOT NULL DEFAULT 'sent',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
        );
      `;
      console.log('✅ Message table created');
    }
    
    // Run Prisma migrations
    console.log('🔄 Running Prisma migrations...');
    try {
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('✅ Migrations completed successfully');
    } catch (error) {
      console.log('⚠️  Migration failed, but continuing...');
    }
    
    // Generate Prisma client
    console.log('🔨 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma client generated successfully');
    
    // Test a simple query
    console.log('🧪 Testing database operations...');
    const userCount = await prisma.user.count();
    console.log(`✅ Database test successful - found ${userCount} users`);
    
    console.log('🎉 Database fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Database fix failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixDatabase().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});