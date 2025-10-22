import { resetDatabase } from './reset-database';
import { getDatabaseConfig } from '../src/config/database-config';

const metrics = {
  deploymentStart: Date.now(),
  databaseResetDuration: 0,
  errors: [] as Error[],
};

async function deploy() {
  const config = getDatabaseConfig();
  
  try {
    console.log('🚀 Starting deployment...');
    
    if (config.forceRecreate) {
      console.log('💥 Resetting database...');
      const resetStart = Date.now();
      await resetDatabase();
      metrics.databaseResetDuration = Date.now() - resetStart;
      
      // Set environment variable for health check
      process.env.LAST_DB_RESET = new Date().toISOString();
    }
    
    console.log('✅ Deployment successful');
    reportMetrics();
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    metrics.errors.push(error instanceof Error ? error : new Error(String(error)));
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
