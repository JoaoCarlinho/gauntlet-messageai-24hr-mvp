const { PrismaClient } = require('@prisma/client');

async function fixDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Fixing database schema...');
    
    // Check if pushTokens column exists
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' AND column_name = 'pushTokens'
    `;
    
    if (result.length === 0) {
      console.log('➕ Adding pushTokens column to User table...');
      await prisma.$executeRaw`
        ALTER TABLE "User" ADD COLUMN "pushTokens" TEXT[] DEFAULT ARRAY[]::TEXT[]
      `;
      console.log('✅ pushTokens column added successfully');
    } else {
      console.log('✅ pushTokens column already exists');
    }
    
    // Verify the fix
    const userCount = await prisma.user.count();
    console.log(`📊 User table is accessible, contains ${userCount} users`);
    
    console.log('🎉 Database fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixDatabase().catch(console.error);
