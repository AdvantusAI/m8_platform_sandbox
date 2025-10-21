import { getDatabase } from '../src/lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const db = await getDatabase();
    
    const config = await db.collection('company_config')
      .findOne({}, { sort: { created_at: -1 } });

    if (!config) {
      // Return default config if none found
      return res.status(200).json({
        company_name: 'M8 Platform',
        company_logo: ''
      });
    }

    res.status(200).json({
      company_name: config.company_name || 'M8 Platform',
      company_logo: config.company_logo || ''
    });
  } catch (error) {
    console.error('Get company config error:', error);
    res.status(500).json({ message: 'Failed to fetch company configuration' });
  }
}
