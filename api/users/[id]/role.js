import { mongoAuthService } from '../../../src/lib/mongodb-auth';
import { getDatabase } from '../../../src/lib/mongodb';

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
        return handleGetUserRole(req, res, id);
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('User role API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleGetUserRole(req, res, userId) {
  try {
    const db = await getDatabase();

    const userRole = await db.collection('user_roles').findOne({ user_id: userId });

    if (!userRole) {
      return res.status(200).json({ role: 'user' }); // Default role
    }

    res.status(200).json({ role: userRole.role });
  } catch (error) {
    console.error('Get user role error:', error);
    res.status(500).json({ message: 'Failed to fetch user role' });
  }
}
