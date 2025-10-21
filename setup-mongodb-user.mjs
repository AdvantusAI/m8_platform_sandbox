import { MongoClient } from 'mongodb';

async function setupMongoDBUser() {
  console.log('🛠️  SETTING UP MONGODB USER...\n');
  
  try {
    // Connect without authentication first
    const client = new MongoClient('mongodb://localhost:27017', {
      serverSelectionTimeoutMS: 5000
    });
    
    await client.connect();
    console.log('✅ Connected to MongoDB (no auth)');
    
    const db = client.db('sandbox_db');
    
    // Create the admin user
    await db.command({
      createUser: "admin",
      pwd: "Loginto@020",
      roles: [
        { role: "dbOwner", db: "sandbox_db" }
      ]
    });
    
    console.log('✅ User "admin" created successfully!');
    console.log('   Username: admin');
    console.log('   Password: Loginto@020');
    console.log('   Database: sandbox_db');
    console.log('   Role: dbOwner');
    
    await client.close();
    
    console.log('\n🎉 Setup complete! You can now run the connection test.');
    console.log('Run: node test-mongodb-connection.mjs');
    
  } catch (error) {
    if (error.message.includes('User "admin@sandbox_db" already exists')) {
      console.log('✅ User "admin" already exists in sandbox_db');
      console.log('You can now run: node test-mongodb-connection.mjs');
    } else {
      console.error('❌ Setup failed:', error.message);
      console.log('\n💡 Try running MongoDB without authentication or check if it\'s running');
    }
  }
}

setupMongoDBUser();
