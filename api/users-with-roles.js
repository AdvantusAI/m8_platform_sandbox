import { mongoAuthService } from '../src/lib/mongodb-auth';
import { getDatabase } from '../src/lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

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

    const db = await getDatabase();

    // Fetch users
    const users = await db.collection('user_profiles')
      .find({})
      .sort({ email: 1 })
      .toArray();

    // Fetch all user roles
    const userRoles = await db.collection('user_roles').find({}).toArray();

    // Combine users with their roles
    const usersWithRoles = users.map(user => {
      const roles = userRoles
        .filter(role => role.user_id === user.id)
        .map(role => role.role);

      return {
        ...user,
        roles,
        primary_role: roles.length > 0 ? roles[0] : null
      };
    });

    res.status(200).json(usersWithRoles);
  } catch (error) {
    console.error('Get users with roles error:', error);
    res.status(500).json({ message: 'Failed to fetch users with roles' });
  }
}
