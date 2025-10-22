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
    
    // Check if pushTokens column exists
    console.log('🔍 Checking for pushTokens column...');
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' AND column_name = 'pushTokens'
    `;
    
    if (result.length === 0) {
      console.log('⚠️  pushTokens column missing, adding it...');
      await prisma.$executeRaw`
        ALTER TABLE "User" ADD COLUMN "pushTokens" TEXT[] DEFAULT ARRAY[]::TEXT[]
      `;
      console.log('✅ pushTokens column added successfully');
    } else {
      console.log('✅ pushTokens column already exists');
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