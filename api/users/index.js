import { mongoAuthService } from '../../src/lib/mongodb-auth';
import { getDatabase } from '../../src/lib/mongodb';

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
        return handleGetUsers(req, res);
      case 'POST':
        return handleCreateUser(req, res);
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Users API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleGetUsers(req, res) {
  try {
    const { active } = req.query;
    const db = await getDatabase();

    const filter = {};
    if (active === 'true') {
      filter.active = true;
    }

    const users = await db.collection('user_profiles')
      .find(filter)
      .sort({ email: 1 })
      .toArray();

    res.status(200).json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
}

async function handleCreateUser(req, res) {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const { user, error } = await mongoAuthService.createUser(email, password, firstName, lastName);

    if (error) {
      return res.status(400).json({ message: error });
    }

    res.status(201).json(user);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
}
