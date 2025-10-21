import { mongoAuthService } from '../../src/lib/mongodb-auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const { user, error } = await mongoAuthService.verifyUserToken(token);

    if (error) {
      return res.status(401).json({ message: error });
    }

    res.status(200).json({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      active: user.active
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
