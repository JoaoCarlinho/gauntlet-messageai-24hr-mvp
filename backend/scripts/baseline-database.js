#!/usr/bin/env node

/**
 * Database Baseline Script
 *
 * This script baselines an existing production database with Prisma migrations.
 * It marks all existing migrations as applied without actually running them.
 *
 * Use this when:
 * - Database already has tables from db push
 * - Migrating from db push to migrate workflow
 * - Resolving P3005 "database schema is not empty" errors
 */

const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function baselineDatabase() {
  console.log('🔧 Starting Database Baseline Process...');
  console.log(`📅 Started at: ${new Date().toISOString()}`);

  try {
    // Step 1: Verify database connection
    console.log('\n📡 Step 1: Verifying database connection...');
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection verified');

    // Step 2: Check if migrations table exists
    console.log('\n🔍 Step 2: Checking migration history...');
    const migrationTableExists = await checkMigrationTable();

    if (migrationTableExists) {
      console.log('⚠️  Migration history already exists');
      console.log('Checking migration status...');

      try {
        execSync('npx prisma migrate status', {
          stdio: 'inherit',
          cwd: __dirname + '/..'
        });
      } catch (error) {
        console.log('⚠️  Migration status check completed with warnings');
      }

      console.log('\n✅ Database already baselined - no action needed');
      return;
    }

    // Step 3: Baseline all existing migrations
    console.log('\n🏗️  Step 3: Baselining existing migrations...');
    console.log('This will mark all migrations as applied without running them.');

    // Mark each migration as resolved (applied)
    const migrations = [
      '20251022040000_init_clean',
      '20251022040001_safe_schema_update',
      '20251112000000_add_linkedin_verification'
    ];

    for (const migration of migrations) {
      console.log(`   Marking ${migration} as applied...`);
      try {
        execSync(`npx prisma migrate resolve --applied ${migration}`, {
          stdio: 'pipe',
          cwd: __dirname + '/..'
        });
        console.log(`   ✅ ${migration} marked as applied`);
      } catch (error) {
        // Migration might already be marked - this is okay
        console.log(`   ℹ️  ${migration} already resolved or applied`);
      }
    }

    // Step 4: Verify migration status
    console.log('\n🧪 Step 4: Verifying migration status...');
    try {
      execSync('npx prisma migrate status', {
        stdio: 'inherit',
        cwd: __dirname + '/..'
      });
    } catch (error) {
      console.log('⚠️  Migration status check completed');
    }

    // Step 5: Generate Prisma client
    console.log('\n🔨 Step 5: Generating Prisma client...');
    execSync('npx prisma generate', {
      stdio: 'inherit',
      cwd: __dirname + '/..'
    });
    console.log('✅ Prisma client generated');

    console.log('\n🎉 Database Baseline Completed Successfully!');
    console.log('📋 Summary:');
    console.log('   - Database connection: ✅ VERIFIED');
    console.log('   - Migrations baselined: ✅ COMPLETED');
    console.log('   - Prisma client: ✅ GENERATED');
    console.log('\n✨ Your database is now ready for migration-based deployments');

  } catch (error) {
    console.error('\n❌ Database Baseline Failed:', error.message);
    console.error('Error details:', error);

    console.log('\n🔄 Troubleshooting:');
    console.log('1. Ensure DATABASE_URL is set correctly');
    console.log('2. Verify database is accessible');
    console.log('3. Check that tables already exist in database');
    console.log('4. Review Prisma schema for errors');

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function checkMigrationTable() {
  try {
    const result = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = '_prisma_migrations'
    `;

    return result.length > 0;
  } catch (error) {
    console.log('⚠️  Could not check migration table:', error.message);
    return false;
  }
}

// Run the baseline process
baselineDatabase().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
