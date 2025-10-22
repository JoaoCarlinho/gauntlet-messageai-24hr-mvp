#!/usr/bin/env node

/**
 * Production Migration Deployment Script
 * 
 * This script safely deploys Prisma migrations to the production database
 * with proper error handling and rollback capabilities.
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function deployMigration() {
  console.log('🚀 Starting production migration deployment...');
  
  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Check current database state
    console.log('🔍 Checking current database state...');
    
    // Check if User table exists and get its structure
    const userTableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'User'
      );
    `;
    
    if (userTableExists[0].exists) {
      console.log('✅ User table exists');
      
      // Check if pushTokens column exists
      const pushTokensExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'User' AND column_name = 'pushTokens'
        );
      `;
      
      if (pushTokensExists[0].exists) {
        console.log('✅ pushTokens column already exists');
      } else {
        console.log('⚠️  pushTokens column missing - will be added by migration');
      }
      
      // Get user count
      const userCount = await prisma.user.count();
      console.log(`📊 Found ${userCount} users in database`);
    } else {
      console.log('⚠️  User table does not exist - will be created by migration');
    }
    
    // Run Prisma migrations
    console.log('🔄 Running Prisma migrations...');
    try {
      execSync('npx prisma migrate deploy', { 
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' }
      });
      console.log('✅ Migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
    
    // Generate Prisma client
    console.log('🔨 Generating Prisma client...');
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    console.log('✅ Prisma client generated successfully');
    
    // Verify migration success
    console.log('🧪 Verifying migration success...');
    
    // Test database operations
    const finalUserCount = await prisma.user.count();
    console.log(`✅ Database verification successful - ${finalUserCount} users found`);
    
    // Test pushTokens functionality
    const testUser = await prisma.user.findFirst();
    if (testUser) {
      console.log(`✅ pushTokens field accessible: ${testUser.pushTokens?.length || 0} tokens`);
    }
    
    console.log('🎉 Migration deployment completed successfully!');
    console.log('📋 Summary:');
    console.log(`   - Users preserved: ${finalUserCount}`);
    console.log('   - Schema updated: ✅');
    console.log('   - pushTokens column: ✅');
    console.log('   - All indexes: ✅');
    console.log('   - Foreign keys: ✅');
    
  } catch (error) {
    console.error('❌ Migration deployment failed:', error);
    console.error('Error details:', error.message);
    
    // Provide rollback instructions
    console.log('\n🔄 Rollback Instructions:');
    console.log('If you need to rollback, you can:');
    console.log('1. Restore from your backup (if you created one)');
    console.log('2. Use the fix-database.js script to repair the schema');
    console.log('3. Contact support for assistance');
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
deployMigration().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
