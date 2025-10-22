#!/usr/bin/env node

/**
 * Migration Verification Script
 * 
 * This script verifies that the migration files are properly structured
 * and ready for production deployment.
 */

const fs = require('fs');
const path = require('path');

function verifyMigration() {
  console.log('🔍 Verifying migration files...');
  
  const migrationsDir = path.join(__dirname, 'prisma', 'migrations');
  
  try {
    // Check if migrations directory exists
    if (!fs.existsSync(migrationsDir)) {
      throw new Error('Migrations directory does not exist');
    }
    
    // List all migration directories
    const migrationDirs = fs.readdirSync(migrationsDir)
      .filter(item => fs.statSync(path.join(migrationsDir, item)).isDirectory())
      .sort();
    
    console.log(`📁 Found ${migrationDirs.length} migration(s):`);
    migrationDirs.forEach(dir => {
      console.log(`   - ${dir}`);
    });
    
    // Verify each migration has a migration.sql file
    migrationDirs.forEach(dir => {
      const migrationFile = path.join(migrationsDir, dir, 'migration.sql');
      if (!fs.existsSync(migrationFile)) {
        throw new Error(`Migration ${dir} is missing migration.sql file`);
      }
      
      const content = fs.readFileSync(migrationFile, 'utf8');
      if (content.trim().length === 0) {
        throw new Error(`Migration ${dir} has empty migration.sql file`);
      }
      
      console.log(`   ✅ ${dir}/migration.sql - OK`);
    });
    
    // Check for migration_lock.toml
    const lockFile = path.join(migrationsDir, 'migration_lock.toml');
    if (!fs.existsSync(lockFile)) {
      throw new Error('migration_lock.toml file is missing');
    }
    
    const lockContent = fs.readFileSync(lockFile, 'utf8');
    if (!lockContent.includes('provider = "postgresql"')) {
      throw new Error('migration_lock.toml has incorrect provider');
    }
    
    console.log('   ✅ migration_lock.toml - OK');
    
    // Verify schema.prisma exists
    const schemaFile = path.join(__dirname, 'prisma', 'schema.prisma');
    if (!fs.existsSync(schemaFile)) {
      throw new Error('schema.prisma file is missing');
    }
    
    const schemaContent = fs.readFileSync(schemaFile, 'utf8');
    if (!schemaContent.includes('pushTokens')) {
      throw new Error('schema.prisma does not include pushTokens field');
    }
    
    console.log('   ✅ schema.prisma - OK (includes pushTokens)');
    
    // Check deployment script
    const deployScript = path.join(__dirname, 'deploy-migration.js');
    if (!fs.existsSync(deployScript)) {
      throw new Error('deploy-migration.js script is missing');
    }
    
    console.log('   ✅ deploy-migration.js - OK');
    
    // Check package.json has the new script
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    if (!packageJson.scripts['migrate:deploy']) {
      throw new Error('package.json missing migrate:deploy script');
    }
    
    console.log('   ✅ package.json - OK (has migrate:deploy script)');
    
    console.log('\n🎉 Migration verification completed successfully!');
    console.log('📋 Summary:');
    console.log(`   - Migration files: ${migrationDirs.length} found`);
    console.log('   - All files present and valid');
    console.log('   - Schema includes pushTokens field');
    console.log('   - Deployment script ready');
    console.log('   - Package.json updated');
    console.log('\n✅ Ready for production deployment!');
    
  } catch (error) {
    console.error('❌ Migration verification failed:', error.message);
    process.exit(1);
  }
}

verifyMigration();
