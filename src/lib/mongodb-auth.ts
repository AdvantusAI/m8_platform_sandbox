import { getDatabase } from './mongodb';
import { hashPassword, verifyPassword, generateToken, verifyToken } from './auth';
import { ObjectId } from 'mongodb';

export interface AuthUser {
  _id?: ObjectId;
  id: string;
  email: string;
  encrypted_password: string;
  full_name?: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
  last_sign_in_at?: Date;
  email_confirmed_at?: Date;
  confirmed_at?: Date;
  raw_app_meta_data?: object;
  raw_user_meta_data?: object;
}

export class MongoDBAuthService {
  private static instance: MongoDBAuthService;
  
  public static getInstance(): MongoDBAuthService {
    if (!MongoDBAuthService.instance) {
      MongoDBAuthService.instance = new MongoDBAuthService();
    }
    return MongoDBAuthService.instance;
  }

  // Check user credentials in MongoDB auth collection
  async authenticateUser(email: string, password: string): Promise<{ user?: AuthUser; error?: string }> {
    try {
      const db = await getDatabase();
      
      // Check in the users collection (auth table equivalent)
      const user = await db.collection('users').findOne({ 
        email: email,
        active: true 
      }) as AuthUser;

      if (!user) {
        return { error: 'Invalid credentials' };
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, user.encrypted_password);
      if (!isValidPassword) {
        return { error: 'Invalid credentials' };
      }

      // Update last sign in
      await db.collection('users').updateOne(
        { _id: user._id },
        { 
          $set: { 
            last_sign_in_at: new Date(),
            updated_at: new Date()
          } 
        }
      );

      // Remove sensitive data before returning
      const { encrypted_password, ...userWithoutPassword } = user;
      
      return { user: userWithoutPassword as AuthUser };
    } catch (error) {
      console.error('Authentication error:', error);
      return { error: 'Authentication failed' };
    }
  }

  // Create new user in MongoDB auth collection
  async createUser(email: string, password: string, firstName?: string, lastName?: string): Promise<{ user?: AuthUser; error?: string }> {
    try {
      const db = await getDatabase();

      // Check if user already exists
      const existingUser = await db.collection('users').findOne({ email });
      if (existingUser) {
        return { error: 'User already exists' };
      }

      const hashedPassword = await hashPassword(password);
      const userId = new ObjectId().toString();
      const fullName = firstName && lastName ? `${firstName} ${lastName}` : undefined;

      const newUser: AuthUser = {
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

      // Insert into users collection
      await db.collection('users').insertOne(newUser);

      // Also create user profile
      await db.collection('user_profiles').insertOne({
        id: userId,
        email,
        full_name: fullName,
        active: true,
        created_at: new Date(),
        updated_at: new Date()
      });

      // Remove sensitive data
      const { encrypted_password, ...userWithoutPassword } = newUser;
      return { user: userWithoutPassword as AuthUser };
    } catch (error) {
      console.error('User creation error:', error);
      return { error: 'Failed to create user' };
    }
  }

  // Verify JWT token and get user
  async verifyUserToken(token: string): Promise<{ user?: AuthUser; error?: string }> {
    try {
      const decoded = await verifyToken(token);
      const db = await getDatabase();

      const user = await db.collection('users').findOne({ 
        id: decoded.id,
        active: true 
      }) as AuthUser;

      if (!user) {
        return { error: 'User not found' };
      }

      // Remove sensitive data
      const { encrypted_password, ...userWithoutPassword } = user;
      return { user: userWithoutPassword as AuthUser };
    } catch (error) {
      return { error: 'Invalid token' };
    }
  }

  // Get user by ID
  async getUserById(userId: string): Promise<{ user?: AuthUser; error?: string }> {
    try {
      const db = await getDatabase();
      
      const user = await db.collection('users').findOne({ 
        id: userId,
        active: true 
      }) as AuthUser;

      if (!user) {
        return { error: 'User not found' };
      }

      // Remove sensitive data
      const { encrypted_password, ...userWithoutPassword } = user;
      return { user: userWithoutPassword as AuthUser };
    } catch (error) {
      console.error('Get user error:', error);
      return { error: 'Failed to get user' };
    }
  }

  // Update user
  async updateUser(userId: string, updates: Partial<AuthUser>): Promise<{ user?: AuthUser; error?: string }> {
    try {
      const db = await getDatabase();

      const updateData = {
        ...updates,
        updated_at: new Date()
      };

      await db.collection('users').updateOne(
        { id: userId },
        { $set: updateData }
      );

      // Also update user profile if full_name changed
      if (updates.full_name !== undefined) {
        await db.collection('user_profiles').updateOne(
          { id: userId },
          { 
            $set: { 
              full_name: updates.full_name,
              updated_at: new Date()
            } 
          }
        );
      }

      return this.getUserById(userId);
    } catch (error) {
      console.error('Update user error:', error);
      return { error: 'Failed to update user' };
    }
  }

  // Get all users (for admin)
  async getAllUsers(): Promise<{ users?: AuthUser[]; error?: string }> {
    try {
      const db = await getDatabase();
      
      const users = await db.collection('users')
        .find({}, { projection: { encrypted_password: 0 } })
        .sort({ email: 1 })
        .toArray() as AuthUser[];

      return { users };
    } catch (error) {
      console.error('Get all users error:', error);
      return { error: 'Failed to get users' };
    }
  }
}

export const mongoAuthService = MongoDBAuthService.getInstance();
