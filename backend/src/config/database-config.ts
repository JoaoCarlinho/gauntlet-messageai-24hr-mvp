export const getDatabaseConfig = () => {
  const isProd = process.env.NODE_ENV === 'production';
  
  return {
    skipMigrations: isProd,
    forceRecreate: isProd,
    connectionRetries: 5,
    connectionTimeout: 10000,
  };
};
