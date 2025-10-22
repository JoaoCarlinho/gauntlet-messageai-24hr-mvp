"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const reset_database_1 = require("./reset-database");
const database_config_1 = require("../src/config/database-config");
const metrics = {
    deploymentStart: Date.now(),
    databaseResetDuration: 0,
    errors: [],
};
async function deploy() {
    const config = (0, database_config_1.getDatabaseConfig)();
    try {
        console.log('🚀 Starting deployment...');
        if (config.forceRecreate) {
            console.log('💥 Resetting database...');
            const resetStart = Date.now();
            await (0, reset_database_1.resetDatabase)();
            metrics.databaseResetDuration = Date.now() - resetStart;
            // Set environment variable for health check
            process.env.LAST_DB_RESET = new Date().toISOString();
        }
        console.log('✅ Deployment successful');
        reportMetrics();
    }
    catch (error) {
        console.error('❌ Deployment failed:', error);
        metrics.errors.push(error);
        reportMetrics();
        process.exit(1);
    }
}
// Send metrics to your monitoring service
function reportMetrics() {
    const duration = Date.now() - metrics.deploymentStart;
    console.log(`
    Deployment completed in ${duration}ms
    Database reset: ${metrics.databaseResetDuration}ms
    Errors: ${metrics.errors.length}
  `);
}
deploy();
