#!/usr/bin/env node

/**
 * Database Backup Script
 * Automated backup of PostgreSQL database
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

const DATABASE_URL = process.env.DATABASE_URL || '';
const BACKUP_DIR = process.env.BACKUP_DIR || './backups';
const MAX_BACKUPS = parseInt(process.env.MAX_BACKUPS || '7');

async function createBackup() {
  try {
    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.sql`);

    console.log(`Creating backup: ${backupFile}`);

    // Execute pg_dump
    const command = `pg_dump ${DATABASE_URL} > ${backupFile}`;
    await execAsync(command);

    console.log('✅ Backup created successfully');

    // Clean old backups
    await cleanOldBackups();

    return backupFile;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }
}

async function cleanOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('backup-'))
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    // Keep only MAX_BACKUPS most recent files
    if (files.length > MAX_BACKUPS) {
      const toDelete = files.slice(MAX_BACKUPS);

      for (const file of toDelete) {
        fs.unlinkSync(file.path);
        console.log(`Deleted old backup: ${file.name}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning old backups:', error);
  }
}

async function restoreBackup(backupFile: string) {
  try {
    if (!fs.existsSync(backupFile)) {
      throw new Error(`Backup file not found: ${backupFile}`);
    }

    console.log(`Restoring from backup: ${backupFile}`);

    const command = `psql ${DATABASE_URL} < ${backupFile}`;
    await execAsync(command);

    console.log('✅ Backup restored successfully');
  } catch (error) {
    console.error('❌ Restore failed:', error);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];

if (command === 'create') {
  createBackup();
} else if (command === 'restore' && args[1]) {
  restoreBackup(args[1]);
} else {
  console.log('Usage:');
  console.log('  npm run backup:create    - Create a new backup');
  console.log('  npm run backup:restore <file> - Restore from backup file');
  process.exit(1);
}

export { createBackup, restoreBackup };