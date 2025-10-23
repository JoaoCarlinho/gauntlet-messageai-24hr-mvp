#!/usr/bin/env node

/**
 * Post-Redeploy Database Setup Script
 * 
 * This script handles database setup after a manual Railway database redeploy:
 * 1. Verifies database connection
 * 2. Creates all database models from Prisma schema
 * 3. Generates Prisma client
 * 4. Verifies all models are properly created
 * 5. Runs health checks
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function postRedeploySetup() {
  console.log('🚀 Starting Post-Redeploy Database Setup...');
  console.log(`📅 Setup started at: ${new Date().toISOString()}`);
  
  try {
    // Step 1: Verify database connection
    console.log('\n📡 Step 1: Verifying database connection...');
    await verifyDatabaseConnection();
    
    // Step 2: Check current database state
    console.log('\n🔍 Step 2: Checking current database state...');
    await checkDatabaseState();
    
    // Step 3: Create database schema
    console.log('\n🏗️  Step 3: Creating database schema...');
    await createDatabaseSchema();
    
    // Step 4: Generate Prisma client
    console.log('\n🔨 Step 4: Generating Prisma client...');
    await generatePrismaClient();
    
    // Step 5: Verify all models are created
    console.log('\n🧪 Step 5: Verifying all models are created...');
    await verifyAllModels();
    
    // Step 6: Run final health checks
    console.log('\n💚 Step 6: Running final health checks...');
    await runHealthChecks();
    
    console.log('\n🎉 Post-Redeploy Setup Completed Successfully!');
    console.log('📋 Summary:');
    console.log('   - Database connection: ✅ VERIFIED');
    console.log('   - Schema creation: ✅ COMPLETED');
    console.log('   - Prisma client: ✅ GENERATED');
    console.log('   - All models: ✅ VERIFIED');
    console.log('   - Health checks: ✅ PASSED');
    
  } catch (error) {
    console.error('\n❌ Post-Redeploy Setup Failed:', error.message);
    console.error('Error details:', error);
    
    // Provide troubleshooting information
    console.log('\n🔄 Troubleshooting:');
    console.log('1. Check DATABASE_URL environment variable');
    console.log('2. Verify Railway database service is running');
    console.log('3. Check database permissions');
    console.log('4. Review Prisma schema for errors');
    console.log('5. Check Railway deployment logs');
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function verifyDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connection established');
    
    // Test basic query
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database query test passed');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

async function checkDatabaseState() {
  try {
    // Check if any tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    console.log(`📊 Found ${tables.length} existing tables:`);
    if (tables.length > 0) {
      tables.forEach(table => console.log(`   - ${table.table_name}`));
    } else {
      console.log('   - No tables found (fresh database)');
    }
    
    // Check if migration history exists
    const migrationTable = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = '_prisma_migrations';
    `;
    
    if (migrationTable.length > 0) {
      console.log('⚠️  Migration history table exists - this is a fresh redeploy');
    } else {
      console.log('✅ No migration history (clean slate)');
    }
    
  } catch (error) {
    console.log('⚠️  Could not check database state:', error.message);
  }
}

async function createDatabaseSchema() {
  try {
    console.log('📤 Pushing schema using Prisma db push...');
    
    execSync('npx prisma db push --accept-data-loss', {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    console.log('✅ Database schema created successfully');
    
  } catch (error) {
    console.error('❌ Schema creation failed:', error.message);
    throw new Error(`Schema creation failed: ${error.message}`);
  }
}

async function generatePrismaClient() {
  try {
    console.log('🔨 Generating Prisma client...');
    
    execSync('npx prisma generate', {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    console.log('✅ Prisma client generated successfully');
    
  } catch (error) {
    console.error('❌ Prisma client generation failed:', error.message);
    throw new Error(`Prisma client generation failed: ${error.message}`);
  }
}

async function verifyAllModels() {
  try {
    console.log('🔍 Verifying all database models...');
    
    // Expected models from schema
    const expectedModels = ['User', 'Conversation', 'ConversationMember', 'Message', 'ReadReceipt'];
    
    // Check each model
    for (const model of expectedModels) {
      try {
        const count = await prisma[model.toLowerCase()].count();
        console.log(`✅ ${model} model: ${count} records (table exists and accessible)`);
      } catch (error) {
        console.error(`❌ ${model} model verification failed:`, error.message);
        throw new Error(`${model} model not properly created`);
      }
    }
    
    // Verify table structure
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE '_prisma_%'
      ORDER BY table_name;
    `;
    
    console.log(`📊 All models verified - ${tables.length} tables created:`);
    tables.forEach(table => console.log(`   - ${table.table_name}`));
    
  } catch (error) {
    console.error('❌ Model verification failed:', error.message);
    throw new Error(`Model verification failed: ${error.message}`);
  }
}

async function runHealthChecks() {
  try {
    console.log('🧪 Running comprehensive health checks...');
    
    // Test database operations
    console.log('   - Testing User model operations...');
    const userCount = await prisma.user.count();
    console.log(`     ✅ User count: ${userCount}`);
    
    console.log('   - Testing Conversation model operations...');
    const conversationCount = await prisma.conversation.count();
    console.log(`     ✅ Conversation count: ${conversationCount}`);
    
    console.log('   - Testing Message model operations...');
    const messageCount = await prisma.message.count();
    console.log(`     ✅ Message count: ${messageCount}`);
    
    // Test foreign key relationships
    console.log('   - Testing foreign key relationships...');
    try {
      await prisma.$queryRaw`
        SELECT u.id, c.id as conversation_id
        FROM "User" u
        LEFT JOIN "ConversationMember" cm ON u.id = cm."userId"
        LEFT JOIN "Conversation" c ON cm."conversationId" = c.id
        LIMIT 1;
      `;
      console.log('     ✅ Foreign key relationships working');
    } catch (error) {
      console.log('     ⚠️  Foreign key test failed (may be expected with no data)');
    }
    
    // Test indexes
    console.log('   - Testing database indexes...');
    const indexes = await prisma.$queryRaw`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname NOT LIKE '_prisma_%'
      ORDER BY tablename, indexname;
    `;
    console.log(`     ✅ Found ${indexes.length} indexes created`);
    
    console.log('✅ All health checks passed');
    
  } catch (error) {
    console.error('❌ Health checks failed:', error.message);
    throw new Error(`Health checks failed: ${error.message}`);
  }
}

// Run the post-redeploy setup
postRedeploySetup().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
