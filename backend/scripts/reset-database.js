"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetDatabase = resetDatabase;
const client_1 = require("@prisma/client");
const child_process_1 = require("child_process");
async function resetDatabase() {
    const prisma = new client_1.PrismaClient();
    try {
        // 1. Drop all connections
        await prisma.$executeRaw `
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = current_database()
        AND pid <> pg_backend_pid();
    `;
        // 2. Drop and recreate database
        await prisma.$executeRaw `
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO public;
    `;
        // 3. Push schema without migrations
        (0, child_process_1.execSync)('npx prisma db push --accept-data-loss --skip-generate', {
            stdio: 'inherit',
        });
        console.log('✅ Database reset successful');
    }
    catch (error) {
        console.error('❌ Database reset failed:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
