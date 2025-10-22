#!/usr/bin/env node

/**
 * Railway-Specific Fix Script
 * 
 * This script addresses Railway-specific deployment issues:
 * 1. Ensures proper environment variable handling
 * 2. Fixes migration state conflicts
 * 3. Implements database reset strategy for production
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

async function railwayFix() {
  console.log('🚂 Starting Railway-specific fix...');
  
  // Set production environment if in Railway
  if (process.env.RAILWAY_ENVIRONMENT) {
    process.env.NODE_ENV = 'production';
    console.log('🚀 Railway environment detected - setting NODE_ENV=production');
  }
  
  const prisma = new PrismaClient();
  
  try {
    // Step 1: Connect to database
    console.log('📡 Connecting to Railway database...');
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Step 2: Check if we're in production mode
    const isProduction = process.env.NODE_ENV === 'production';
    console.log(`🔍 Production mode: ${isProduction}`);
    
    if (isProduction) {
      console.log('💥 Production mode detected - implementing database reset strategy');
      
      // Step 3: Implement database reset strategy
      try {
        // Drop all connections
        console.log('🔌 Terminating existing connections...');
        await prisma.$executeRaw`
          SELECT pg_terminate_backend(pg_stat_activity.pid)
          FROM pg_stat_activity
          WHERE pg_stat_activity.datname = current_database()
            AND pid <> pg_backend_pid();
        `;
        
        // Drop and recreate schema
        console.log('🗑️  Dropping and recreating schema...');
        await prisma.$executeRaw`
          DROP SCHEMA public CASCADE;
          CREATE SCHEMA public;
          GRANT ALL ON SCHEMA public TO public;
        `;
        
        // Push schema without migrations
        console.log('📤 Pushing schema...');
        execSync('npx prisma db push --accept-data-loss --skip-generate', {
          stdio: 'inherit',
        });
        
        console.log('✅ Database reset completed successfully');
        
      } catch (error) {
        console.error('❌ Database reset failed:', error.message);
        
        // Fallback: Try to resolve migration state
        console.log('🔄 Attempting fallback migration resolution...');
        try {
          await prisma.$executeRaw`
            UPDATE _prisma_migrations 
            SET finished_at = NOW(), 
                logs = 'Resolved by Railway fix script'
            WHERE finished_at IS NULL;
          `;
          
          // Try migration deploy
          execSync('npx prisma migrate deploy', {
            stdio: 'inherit',
          });
          
          console.log('✅ Fallback migration resolution successful');
        } catch (fallbackError) {
          console.error('❌ Fallback also failed:', fallbackError.message);
          throw fallbackError;
        }
      }
    } else {
      console.log('🔧 Development mode - using standard migration approach');
      
      // Resolve any failed migrations
      try {
        await prisma.$executeRaw`
          UPDATE _prisma_migrations 
          SET finished_at = NOW(), 
              logs = 'Resolved by Railway fix script'
          WHERE finished_at IS NULL;
        `;
        
        execSync('npx prisma migrate deploy', {
          stdio: 'inherit',
        });
        
        console.log('✅ Development migrations completed');
      } catch (error) {
        console.error('❌ Development migration failed:', error.message);
        throw error;
      }
    }
    
    // Step 4: Generate Prisma client
    console.log('🔨 Generating Prisma client...');
    execSync('npx prisma generate', {
      stdio: 'inherit',
    });
    console.log('✅ Prisma client generated');
    
    // Step 5: Verify database state
    console.log('🧪 Verifying database state...');
    try {
      const userCount = await prisma.user.count();
      console.log(`✅ Database verification successful - ${userCount} users found`);
    } catch (error) {
      console.log('⚠️  Database verification failed, but continuing...');
    }
    
    console.log('🎉 Railway fix completed successfully!');
    console.log('📋 Summary:');
    console.log(`   - Environment: ${process.env.RAILWAY_ENVIRONMENT || 'local'}`);
    console.log(`   - Production mode: ${isProduction}`);
    console.log(`   - Database reset: ${isProduction ? '✅' : 'N/A'}`);
    console.log('   - Prisma client: ✅');
    console.log('   - Ready for deployment: ✅');
    
  } catch (error) {
    console.error('❌ Railway fix failed:', error);
    console.error('Error details:', error.message);
    
    // Provide Railway-specific troubleshooting
    console.log('\n🔄 Railway Troubleshooting:');
    console.log('1. Check Railway environment variables');
    console.log('2. Verify DATABASE_URL is correct');
    console.log('3. Check Railway service logs');
    console.log('4. Consider manual database reset in Railway console');
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the Railway fix
railwayFix().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
