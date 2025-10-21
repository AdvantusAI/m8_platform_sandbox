import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getDatabase, COLLECTIONS } from './mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'sb_publishable_JtRi9l_JtwYWLdjJ_pkl0g_yN8g32LZ';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface User {
  _id: ObjectId;
  id: string;
  email: string;
  encrypted_password: string;
  full_name?: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(user: User): string {
  return jwt.sign(
    { 
      id: user.id,
      email: user.email,
      full_name: user.full_name 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export async function verifyToken(token: string): Promise<any> {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export async function createUser(email: string, password: string, firstName: string, lastName: string) {
  const db = await getDatabase();
  
  // Check if user already exists
  const existingUser = await db.collection(COLLECTIONS.USERS).findOne({ email });
  if (existingUser) {
    throw new Error('User already exists');
  }

  const hashedPassword = await hashPassword(password);
  const userId = new ObjectId().toString();
  
  const user = {
    id: userId,
    email,
    encrypted_password: hashedPassword,
    full_name: `${firstName} ${lastName}`,
    active: true,
    created_at: new Date(),
    updated_at: new Date()
  };

  await db.collection(COLLECTIONS.USERS).insertOne(user);
  
  // Also create user profile
  await db.collection(COLLECTIONS.USER_PROFILES).insertOne({
    id: userId,
    email,
    full_name: `${firstName} ${lastName}`,
    active: true,
    created_at: new Date(),
    updated_at: new Date()
  });

  return { ...user, _id: undefined };
}

export async function authenticateUser(email: string, password: string): Promise<User> {
  const db = await getDatabase();
  
  const user = await db.collection(COLLECTIONS.USERS).findOne({ email }) as User;
  if (!user) {
    throw new Error('Invalid credentials');
  }

  if (!user.active) {
    throw new Error('Account is disabled');
  }

  const isValid = await verifyPassword(password, user.encrypted_password);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  return user;
}
