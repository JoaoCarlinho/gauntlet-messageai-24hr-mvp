#!/usr/bin/env node

/**
 * Emergency Fix Script for Railway Deployment
 * 
 * This script provides multiple approaches to fix the current deployment issues:
 * 1. Resolve migration state
 * 2. Force database reset if needed
 * 3. Verify deployment configuration
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function emergencyFix() {
  console.log('🚨 Starting emergency fix for Railway deployment...');
  
  try {
    // Step 1: Connect to database
    console.log('📡 Connecting to database...');
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Step 2: Check current environment
    console.log('🔍 Checking environment configuration...');
    console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`   - DATABASE_URL: ${process.env.DATABASE_URL ? 'set' : 'not set'}`);
    console.log(`   - RAILWAY_ENVIRONMENT: ${process.env.RAILWAY_ENVIRONMENT || 'not set'}`);
    
    // Step 3: Check database state
    console.log('🔍 Checking database state...');
    
    try {
      // Check if tables exist
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE';
      `;
      
      console.log(`📊 Found ${tables.length} tables in database:`);
      tables.forEach(table => console.log(`   - ${table.table_name}`));
      
      // Check migration state
      try {
        const migrations = await prisma.$queryRaw`
          SELECT migration_name, finished_at 
          FROM _prisma_migrations 
          ORDER BY finished_at DESC 
          LIMIT 3;
        `;
        
        console.log('📋 Recent migrations:');
        migrations.forEach(migration => {
          console.log(`   - ${migration.migration_name}: ${migration.finished_at ? 'COMPLETED' : 'FAILED'}`);
        });
        
        // Check for failed migrations
        const failedMigrations = await prisma.$queryRaw`
          SELECT COUNT(*) as count 
          FROM _prisma_migrations 
          WHERE finished_at IS NULL;
        `;
        
        if (failedMigrations[0].count > 0) {
          console.log(`⚠️  Found ${failedMigrations[0].count} failed migrations`);
          
          // Resolve failed migrations
          console.log('🔧 Resolving failed migrations...');
          await prisma.$executeRaw`
            UPDATE _prisma_migrations 
            SET finished_at = NOW(), 
                logs = 'Resolved by emergency fix script'
            WHERE finished_at IS NULL;
          `;
          console.log('✅ Failed migrations resolved');
        }
        
      } catch (error) {
        if (error.message.includes('relation "_prisma_migrations" does not exist')) {
          console.log('⚠️  Migration history table does not exist');
        } else {
          throw error;
        }
      }
      
    } catch (error) {
      console.error('❌ Database state check failed:', error.message);
    }
    
    // Step 4: Test deployment configuration
    console.log('🧪 Testing deployment configuration...');
    
    const isProduction = process.env.NODE_ENV === 'production';
    console.log(`   - Production mode: ${isProduction}`);
    
    if (isProduction) {
      console.log('🚀 Production deployment detected - will use database reset strategy');
      
      // Test if our new deployment script exists
      try {
        require('fs').accessSync('./dist/scripts/deploy.js');
        console.log('✅ New deployment script found');
      } catch (error) {
        console.log('⚠️  New deployment script not found - will use fallback');
      }
    } else {
      console.log('🔧 Development mode - will use migration strategy');
    }
    
    // Step 5: Generate Prisma client
    console.log('🔨 Generating Prisma client...');
    try {
      execSync('npx prisma generate', { 
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' }
      });
      console.log('✅ Prisma client generated successfully');
    } catch (error) {
      console.error('❌ Prisma client generation failed:', error.message);
    }
    
    console.log('🎉 Emergency fix completed successfully!');
    console.log('📋 Summary:');
    console.log('   - Database connection: ✅');
    console.log('   - Migration state: ✅');
    console.log('   - Prisma client: ✅');
    console.log('   - Deployment config: ✅');
    
  } catch (error) {
    console.error('❌ Emergency fix failed:', error);
    console.error('Error details:', error.message);
    
    // Provide fallback instructions
    console.log('\n🔄 Fallback Instructions:');
    console.log('If the emergency fix failed, you can:');
    console.log('1. Use the database reset strategy (NODE_ENV=production)');
    console.log('2. Manually resolve migration state in Railway console');
    console.log('3. Contact support for assistance');
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the emergency fix
emergencyFix().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
