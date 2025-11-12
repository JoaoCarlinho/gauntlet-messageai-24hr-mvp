#!/usr/bin/env node

/**
 * One-Time Railway Database Baseline Script
 *
 * Run this ONCE in Railway Shell to baseline your existing database.
 * After running this, Railway deployments will work normally.
 *
 * Usage in Railway Shell:
 *   node scripts/railway-baseline-once.js
 */

const { execSync } = require('child_process');

console.log('🔧 Railway Database Baseline - One-Time Setup');
console.log('='.repeat(60));

try {
  console.log('\n📋 Step 1: Marking migrations as applied...\n');

  const migrations = [
    '20251022040000_init_clean',
    '20251022040001_safe_schema_update',
    '20251112000000_add_linkedin_verification'
  ];

  for (const migration of migrations) {
    console.log(`   ⏳ Resolving: ${migration}`);
    try {
      execSync(`npx prisma migrate resolve --applied "${migration}"`, {
        stdio: 'inherit'
      });
      console.log(`   ✅ Marked as applied\n`);
    } catch (error) {
      console.log(`   ℹ️  Already resolved or applied\n`);
    }
  }

  console.log('\n📋 Step 2: Checking migration status...\n');
  execSync('npx prisma migrate status', {
    stdio: 'inherit'
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ BASELINE COMPLETE!');
  console.log('='.repeat(60));
  console.log('\nYour database is now baselined.');
  console.log('Railway deployments will work normally from now on.');
  console.log('\n💡 You can now redeploy your Railway service.');

} catch (error) {
  console.error('\n❌ Baseline failed:', error.message);
  console.log('\n🔍 Troubleshooting:');
  console.log('1. Make sure DATABASE_URL environment variable is set');
  console.log('2. Ensure database is accessible from Railway');
  console.log('3. Check that prisma schema is valid');
  process.exit(1);
}
