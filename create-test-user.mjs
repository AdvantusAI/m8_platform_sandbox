import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

const MONGODB_URI = 'mongodb://admin:Loginto%40020@localhost:27017/sandbox_db?authSource=sandbox_db';
const MONGODB_DB = 'sandbox_db';

async function createTestUser() {
  try {
    const client = new MongoClient(MONGODB_URI, {
      authSource: 'sandbox_db',
      authMechanism: 'SCRAM-SHA-1'
    });
    
    await client.connect();
    const db = client.db(MONGODB_DB);

    const email = 'test@example.com';
    const password = '123456';
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = new ObjectId().toString();

    // Create user
    const user = {
      id: userId,
      email,
      encrypted_password: hashedPassword,
      full_name: 'Test User',
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
      email_confirmed_at: new Date(),
      confirmed_at: new Date(),
      raw_app_meta_data: { provider: 'email', providers: ['email'] },
      raw_user_meta_data: { email_verified: true }
    };

    await db.collection('users').insertOne(user);

    // Create user profile
    await db.collection('user_profiles').insertOne({
      id: userId,
      email,
      full_name: 'Test User',
      active: true,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Create admin role
    await db.collection('user_roles').insertOne({
      id: new ObjectId().toString(),
      user_id: userId,
      role: 'administrator',
      assigned_by: userId,
      assigned_at: new Date(),
      created_at: new Date()
    });

    console.log('Test user created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    
    await client.close();
  } catch (error) {
    console.error('Error creating test user:', error);
  }
}

createTestUser();
