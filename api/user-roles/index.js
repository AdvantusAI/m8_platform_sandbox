import { mongoAuthService } from '../../src/lib/mongodb-auth';
import { getDatabase } from '../../src/lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const { user: currentUser, error: authError } = await mongoAuthService.verifyUserToken(token);

    if (authError) {
      return res.status(401).json({ message: authError });
    }

    switch (req.method) {
      case 'GET':
        return handleGetUserRoles(req, res);
      case 'POST':
        return handleCreateUserRole(req, res, currentUser);
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('User roles API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleGetUserRoles(req, res) {
  try {
    const db = await getDatabase();
    const userRoles = await db.collection('user_roles').find({}).toArray();
    res.status(200).json(userRoles);
  } catch (error) {
    console.error('Get user roles error:', error);
    res.status(500).json({ message: 'Failed to fetch user roles' });
  }
}

async function handleCreateUserRole(req, res, currentUser) {
  try {
    const { user_id, role } = req.body;

    if (!user_id || !role) {
      return res.status(400).json({ message: 'User ID and role are required' });
    }

    const db = await getDatabase();

    // Check if user role already exists
    const existingRole = await db.collection('user_roles').findOne({ user_id, role });
    if (existingRole) {
      return res.status(400).json({ message: 'User already has this role' });
    }

    const newRole = {
      id: new ObjectId().toString(),
      user_id,
      role,
      assigned_by: currentUser.id,
      assigned_at: new Date(),
      created_at: new Date()
    };

    await db.collection('user_roles').insertOne(newRole);

    res.status(201).json(newRole);
  } catch (error) {
    console.error('Create user role error:', error);
    res.status(500).json({ message: 'Failed to create user role' });
  }
}
