import express from 'express';
import { MongoClient } from 'mongodb';

console.log('Starting test server...');

const app = express();
const PORT = 3001;

// MongoDB connection
const MONGODB_URI = 'mongodb://admin:060624@localhost:27017/sandbox_db?authSource=sandbox_db';

async function testConnection() {
  try {
    console.log('Attempting to connect to MongoDB...');
    const client = new MongoClient(MONGODB_URI, {
      authSource: 'sandbox_db',
      authMechanism: 'SCRAM-SHA-1'
    });
    
    await client.connect();
    console.log('Connected to MongoDB successfully');
    
    const db = client.db('sandbox_db');
    console.log('Database selected:', db.databaseName);
    
    app.get('/test', (req, res) => {
      res.json({ message: 'Test server running' });
    });
    
    app.listen(PORT, () => {
      console.log(`Test server running on port ${PORT}`);
    });
    
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

testConnection();
