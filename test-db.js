require('dotenv').config();
const { sequelize, Student, Attendance, User } = require('./models');

async function testConnection() {
  console.log('\n🔍 Starting Database Connection Test...\n');
  
  try {
    // Step 1: Test connection
    console.log('📡 Step 1: Testing connection to Supabase...');
    await sequelize.authenticate();
    console.log('✅ Connection successful!\n');
    
    // Step 2: Sync models
    console.log('🔄 Step 2: Syncing database models...');
    await sequelize.sync({ alter: true });
    console.log('✅ Models synced successfully!\n');
    
    // Step 3: Check tables exist
    console.log('📊 Step 3: Checking database tables...');
    const tables = await sequelize.showAllSchemas();
    console.log('✅ Database tables created\n');
    
    // Step 4: Test create operations
    console.log('✍️  Step 4: Testing create operations...');
    
    // Test Student creation
    const testStudent = await Student.create({
      name: 'Test Student',
      rollNumber: `TEST${Date.now()}`,
      class: 'TEST-A',
      course: 'B.Tech',
      year: 'III',
      branch: 'CSE'
    });
    console.log('✅ Student created:', testStudent.toJSON());
    
    // Test User creation
    const testUser = await User.create({
      name: 'Test Teacher',
      email: `test${Date.now()}@pgp.com`,
      password: 'hashed_password',
      role: 'teacher',
      staffId: `STAFF${Date.now()}`
    });
    console.log('✅ User created:', { name: testUser.name, email: testUser.email });
    
    // Step 5: Test read operations
    console.log('\n📖 Step 5: Testing read operations...');
    const students = await Student.findAll();
    console.log(`✅ Found ${students.length} students in database`);
    
    const users = await User.findAll();
    console.log(`✅ Found ${users.length} users in database\n`);
    
    // Step 6: Cleanup test data
    console.log('🧹 Step 6: Cleaning up test data...');
    await testStudent.destroy();
    await testUser.destroy();
    console.log('✅ Test data cleaned up\n');
    
    console.log('═══════════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED!');
    console.log('═══════════════════════════════════════════');
    console.log('\n📝 Database Information:');
    console.log(`   Host: ${sequelize.config.host || 'From DATABASE_URL'}`);
    console.log(`   Port: ${sequelize.config.port || 5432}`);
    console.log(`   Database: ${sequelize.config.database}`);
    console.log(`   Dialect: ${sequelize.config.dialect}`);
    console.log('\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST FAILED!\n');
    console.error('Error Type:', error.name);
    console.error('Error Message:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Tip: Connection refused. Check if:');
      console.error('   - You have internet connection');
      console.error('   - DATABASE_URL is correct in .env');
      console.error('   - Supabase project is active');
    } else if (error.message.includes('authentication failed')) {
      console.error('\n💡 Tip: Authentication failed. Check:');
      console.error('   - Database credentials in .env');
      console.error('   - Username and password are correct');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.error('\n💡 Tip: Database doesn\'t exist. Check:');
      console.error('   - DATABASE_URL points to correct Supabase database');
    }
    
    console.error('\n🔍 Full Error Details:');
    console.error(error);
    console.error('\n');
    
    process.exit(1);
  }
}

testConnection();