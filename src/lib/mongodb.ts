import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'sandbox_db';

let client: MongoClient;
let db: Db;

export async function connectToDatabase() {
  if (db) {
    return { client, db };
  }

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(MONGODB_DB);
    
    console.log('Connected to MongoDB successfully');
    return { client, db };
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function getDatabase(): Promise<Db> {
  if (!db) {
    await connectToDatabase();
  }
  return db;
}

// Collection names - please confirm these match your MongoDB collections
export const COLLECTIONS = {
  USERS: 'users',
  USER_ROLES: 'user_roles', 
  USER_PROFILES: 'user_profiles',
  CUSTOMER_ASSIGNMENTS: 'customer_assignments',
  PRODUCT_ASSIGNMENTS: 'user_product_assignments',
  COMPANY_CONFIG: 'company_config',
  SUPPLY_NETWORK_NODES: 'supply_network_nodes',
  SUPPLY_NETWORK_RELATIONSHIPS: 'supply_network_relationships',
  SUPPLY_NETWORK_RELATIONSHIP_TYPES: 'supply_network_relationship_types'
} as const;
