import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

const MONGODB_URI = 'mongodb://admin:060624@localhost:27017/sandbox_db?authSource=sandbox_db';
const MONGODB_DB = 'sandbox_db';

async function registerNewUser() {
  try {
    console.log('=== NEW USER REGISTRATION EXAMPLE ===\n');
    
    // Add connection test first
    console.log('🔌 TESTING MONGODB CONNECTION...');
    const client = new MongoClient(MONGODB_URI, {
      authSource: 'sandbox_db',
      authMechanism: 'SCRAM-SHA-1',
      serverSelectionTimeoutMS: 5000
    });
    
    await client.connect();
    console.log('✅ MongoDB connection successful!');
    
    const db = client.db(MONGODB_DB);
    
    // Test database ping
    await db.admin().ping();
    console.log('✅ Database ping successful!');
    console.log('');

    // User data
    const email = 'admin@m8solutions.com.mx';
    const password = '060624';
    const firstName = 'Demo';
    const lastName = 'user';
    
    console.log('📝 USER INPUT DATA:');
    console.log('Email:', email);
    console.log('Password (raw):', password);
    console.log('First Name:', firstName);
    console.log('Last Name:', lastName);
    console.log('');

    // Show different encoding methods
    console.log('🔐 PASSWORD ENCODING EXAMPLES:');
    console.log('1. Base64 encoded:', btoa(password));
    console.log('2. URL encoded:', encodeURIComponent(password));
    console.log('3. MongoDB connection format:', `mongodb://admin:${encodeURIComponent(password)}@localhost:27017/sandbox_db`);
    console.log('');

    // Hash password with bcrypt
    console.log('🔒 BCRYPT HASHING PROCESS:');
    const saltRounds = 10;
    console.log('Salt rounds:', saltRounds);
    
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('Bcrypt hash result:', hashedPassword);
    console.log('Hash length:', hashedPassword.length);
    console.log('');

    // Verify the hash works
    const isValidHash = await bcrypt.compare(password, hashedPassword);
    console.log('✅ Hash verification test:', isValidHash ? 'PASSED' : 'FAILED');
    console.log('');

    // Create user object
    const userId = new ObjectId().toString();
    const fullName = `${firstName} ${lastName}`;
    
    const newUser = {
      id: userId,
      email,
      encrypted_password: hashedPassword,
      full_name: fullName,
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
      email_confirmed_at: new Date(),
      confirmed_at: new Date(),
      raw_app_meta_data: { provider: 'email', providers: ['email'] },
      raw_user_meta_data: { email_verified: true }
    };

    console.log('👤 FINAL USER OBJECT TO STORE:');
    console.log('User ID:', newUser.id);
    console.log('Email:', newUser.email);
    console.log('Full Name:', newUser.full_name);
    console.log('Encrypted Password:', newUser.encrypted_password);
    console.log('Active:', newUser.active);
    console.log('Created At:', newUser.created_at);
    console.log('');

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      console.log('⚠️  USER ALREADY EXISTS - Skipping insertion');
      console.log('Existing user ID:', existingUser.id || existingUser._id);
    } else {
      // Insert into users collection
      console.log('📁 INSERTING INTO MONGODB...');
      await db.collection('users').insertOne(newUser);
      console.log('✅ User inserted into "users" collection');

      // Also create user profile
      const userProfile = {
        id: userId,
        email,
        full_name: fullName,
        active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      await db.collection('user_profiles').insertOne(userProfile);
      console.log('✅ User profile inserted into "user_profiles" collection');

      // Create default user role
      const userRole = {
        id: new ObjectId().toString(),
        user_id: userId,
        role: 'administrator',
        assigned_by: userId,
        assigned_at: new Date(),
        created_at: new Date()
      };

      await db.collection('user_roles').insertOne(userRole);
      console.log('✅ User role inserted into "user_roles" collection');
    }

    console.log('');
    console.log('🧪 TESTING AUTHENTICATION...');
    
    // Test authentication with the stored user
    const storedUser = await db.collection('users').findOne({ email });
    if (storedUser) {
      const authTest = await bcrypt.compare(password, storedUser.encrypted_password);
      console.log('Authentication test result:', authTest ? '✅ SUCCESS' : '❌ FAILED');
      
      if (authTest) {
        console.log('🎉 You can now login with:');
        console.log('   Email:', email);
        console.log('   Password:', password);
      }
    }

    console.log('');
    console.log('📊 COLLECTIONS SUMMARY:');
    const usersCount = await db.collection('users').countDocuments();
    const profilesCount = await db.collection('user_profiles').countDocuments();
    const rolesCount = await db.collection('user_roles').countDocuments();
    
    console.log(`Total users: ${usersCount}`);
    console.log(`Total profiles: ${profilesCount}`);
    console.log(`Total roles: ${rolesCount}`);
    
    await client.close();
    console.log('\n✅ Registration example completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during registration:', error);
    
    // Add specific error handling
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 MongoDB server is not running. Start it with:');
      console.log('   - Docker: docker run -p 27017:27017 mongo');
      console.log('   - Local: mongod');
    }
  }
}

// Run the example
registerNewUser();
