const { Sequelize } = require('sequelize');
require('dotenv').config();

async function verifyDatabase() {
  console.log('🔍 Verifying database connection...');

  const sequelize = new Sequelize(
    process.env.DB_NAME || 'feastfrenzy',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      logging: false,
    },
  );

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection verified successfully');

    // Check if tables exist
    const [results] = await sequelize.query('SHOW TABLES');
    console.log(`📊 Found ${results.length} tables in database`);

    if (results.length > 0) {
      console.log('📋 Tables:', results.map(r => Object.values(r)[0]).join(', '));
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
    process.exit(1);
  }
}

verifyDatabase();
