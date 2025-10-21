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

    const { id } = req.query;

    switch (req.method) {
      case 'GET':
        return handleGetUser(req, res, id);
      case 'PUT':
        return handleUpdateUser(req, res, id);
      case 'DELETE':
        return handleDeleteUser(req, res, id);
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('User API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleGetUser(req, res, userId) {
  try {
    const { user, error } = await mongoAuthService.getUserById(userId);

    if (error) {
      return res.status(404).json({ message: error });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
}

async function handleUpdateUser(req, res, userId) {
  try {
    const updates = req.body;
    const { user, error } = await mongoAuthService.updateUser(userId, updates);

    if (error) {
      return res.status(400).json({ message: error });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
}

async function handleDeleteUser(req, res, userId) {
  try {
    const db = await getDatabase();

    // Soft delete by setting active to false
    await db.collection('users').updateOne(
      { id: userId },
      { $set: { active: false, updated_at: new Date() } }
    );

    await db.collection('user_profiles').updateOne(
      { id: userId },
      { $set: { active: false, updated_at: new Date() } }
    );

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
}
