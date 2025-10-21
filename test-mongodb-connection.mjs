import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb://admin:Loginto%40020@localhost:27017/sandbox_db?authSource=sandbox_db';
const MONGODB_DB = 'sandbox_db';

async function testMongoDBConnection() {
  console.log('🔌 TESTING MONGODB CONNECTION...\n');
  
  try {
    console.log('📡 Connection Details:');
    console.log('Username: admin');
    console.log('Password: Loginto@020');
    console.log('Database:', MONGODB_DB);
    console.log('Auth Source: sandbox_db');
    console.log('URI (masked):', MONGODB_URI.replace(/\/\/.*@/, '//admin:***@'));
    console.log('');

    // Test 1: Basic Connection
    console.log('1️⃣ Testing basic connection...');
    const client = new MongoClient(MONGODB_URI, {
      authSource: 'sandbox_db',
      authMechanism: 'SCRAM-SHA-1',
      serverSelectionTimeoutMS: 5000 // 5 second timeout
    });
    
    await client.connect();
    console.log('✅ Successfully connected to MongoDB!');
    console.log('   ✓ User: admin');
    console.log('   ✓ Password: Loginto@020');
    console.log('   ✓ Database: sandbox_db');
    
    // Test 2: Database Access
    console.log('\n2️⃣ Testing database access...');
    const db = client.db(MONGODB_DB);
    const adminResult = await db.admin().ping();
    console.log('✅ Database ping successful:', adminResult);
    
    // Test 3: List Collections
    console.log('\n3️⃣ Listing collections...');
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections:`);
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    // Test 4: Test Read/Write Operations
    console.log('\n4️⃣ Testing read/write operations...');
    const testCollection = db.collection('connection_test');
    
    // Insert test document
    const testDoc = {
      test: true,
      timestamp: new Date(),
      message: 'Connection test successful'
    };
    
    const insertResult = await testCollection.insertOne(testDoc);
    console.log('✅ Test document inserted:', insertResult.insertedId);
    
    // Read test document
    const foundDoc = await testCollection.findOne({ _id: insertResult.insertedId });
    console.log('✅ Test document retrieved:', foundDoc ? 'Success' : 'Failed');
    
    // Delete test document
    await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log('✅ Test document cleaned up');
    
    // Test 5: Check User Collections
    console.log('\n5️⃣ Checking main application collections...');
    const requiredCollections = ['users', 'user_profiles', 'user_roles', 'company_config'];
    
    for (const collectionName of requiredCollections) {
      const count = await db.collection(collectionName).countDocuments();
      console.log(`  - ${collectionName}: ${count} documents`);
    }
    
    // Test 6: Server Status
    console.log('\n6️⃣ MongoDB server information...');
    try {
      const serverStatus = await db.admin().serverStatus();
      console.log(`MongoDB Version: ${serverStatus.version}`);
      console.log(`Uptime: ${Math.round(serverStatus.uptime / 3600)} hours`);
      console.log(`Connections: ${serverStatus.connections.current}/${serverStatus.connections.available}`);
    } catch (err) {
      console.log('⚠️  Could not get server status (might need admin privileges)');
    }
    
    await client.close();
    console.log('\n🎉 ALL TESTS PASSED! MongoDB connection is working correctly.');
    
  } catch (error) {
    console.error('\n❌ CONNECTION TEST FAILED:');
    console.error('Error:', error.message);
    
    // Provide specific troubleshooting advice
    console.log('\n🔧 TROUBLESHOOTING:');
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('- MongoDB server is not running on localhost:27017');
      console.log('- Start MongoDB with: mongod or docker run -p 27017:27017 mongo');
    }
    
    if (error.message.includes('Authentication failed')) {
      console.log('- The user "admin" with password "Loginto@020" does not exist');
      console.log('- You need to create the user first');
      console.log('\n📝 CREATE USER MANUALLY:');
      console.log('1. Connect to MongoDB without auth: mongosh');
      console.log('2. Switch to sandbox_db: use sandbox_db');
      console.log('3. Create the user:');
      console.log('   db.createUser({');
      console.log('     user: "admin",');
      console.log('     pwd: "Loginto@020",');
      console.log('     roles: [{ role: "dbOwner", db: "sandbox_db" }]');
      console.log('   })');
      console.log('\n🐳 OR CREATE WITH DOCKER:');
      console.log('docker exec -it <container_name> mongosh --eval "');
      console.log('use sandbox_db');
      console.log('db.createUser({user: \\"admin\\", pwd: \\"Loginto@020\\", roles: [{role: \\"dbOwner\\", db: \\"sandbox_db\\"}]})');
      console.log('"');
    }
    
    if (error.message.includes('authSource')) {
      console.log('- Authentication source should be: sandbox_db');
      console.log('- User should be created in sandbox_db database');
    }
    
    console.log('\n📋 Quick verification commands:');
    console.log('1. Check if MongoDB is running: ps aux | grep mongod');
    console.log('2. Connect with mongo shell: mongosh "mongodb://admin:Loginto@020@localhost:27017/sandbox_db?authSource=sandbox_db"');
    console.log('3. List databases: show dbs');
    console.log('4. Check users: db.getUsers()');
    console.log('5. Create user if needed:');
    console.log('   use sandbox_db');
    console.log('   db.createUser({user: "admin", pwd: "Loginto@020", roles: [{role: "dbOwner", db: "sandbox_db"}]})');
  }
}

// Run the test
testMongoDBConnection();
