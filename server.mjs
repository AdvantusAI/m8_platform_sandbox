import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { MongoClient, ObjectId } from 'mongodb';

const app = express();
const PORT = process.env.PORT || 8080; // Changed from 3001 to 8080

app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:Loginto%40020@localhost:27017/sandbox_db?authSource=sandbox_db';
const MONGODB_DB = process.env.MONGODB_DB || 'sandbox_db';
const JWT_SECRET = process.env.JWT_SECRET || 'sb_publishable_JtRi9l_JtwYWLdjJ_pkl0g_yN8g32LZ';

let db;

// Connect to MongoDB
async function connectToDatabase() {
  try {
    const client = new MongoClient(MONGODB_URI, {
      authSource: 'sandbox_db',
      authMechanism: 'SCRAM-SHA-1'
    });
    await client.connect();
    db = client.db(MONGODB_DB);
    console.log('Connected to MongoDB successfully');
    console.log(`Using database: ${MONGODB_DB} with user: admin`);
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// Middleware to ensure database connection
const ensureDbConnection = (req, res, next) => {
  if (!db) {
    return res.status(500).json({ message: 'Database not connected' });
  }
  next();
};

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Add a test endpoint to verify server is running
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running', timestamp: new Date().toISOString() });
});

// Auth endpoints
app.post('/api/auth/signin', ensureDbConnection, async (req, res) => {
  try {
    console.log('Sign-in attempt:', { email: req.body.email, hasPassword: !!req.body.password });
    
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user in MongoDB
    console.log('Searching for user with email:', email);
    const user = await db.collection('users').findOne({ 
      email: email
    });

    console.log('User found:', user ? 'Yes' : 'No');
    console.log('User active:', user ? user.active : 'N/A');

    if (!user) {
      console.log('User not found in database');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.active) {
      console.log('User account is inactive');
      return res.status(401).json({ message: 'Account is disabled' });
    }

    // Verify password
    console.log('Verifying password...');
    const isValid = await bcrypt.compare(password, user.encrypted_password);
    console.log('Password valid:', isValid);

    if (!isValid) {
      console.log('Password verification failed');
      return res.status(401).json({ message: 'Invalid credentials' });
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

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id || user._id.toString(),
        email: user.email,
        full_name: user.full_name 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('Sign-in successful for user:', email);

    return res.status(200).json({
      token,
      user: {
        id: user.id || user._id.toString(),
        email: user.email,
        full_name: user.full_name,
        active: user.active
      }
    });
  } catch (error) {
    console.error('Sign-in error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/auth/signup', ensureDbConnection, async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = new ObjectId().toString();
    const fullName = firstName && lastName ? `${firstName} ${lastName}` : undefined;

    // Create new user
    const newUser = {
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

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: userId,
        email,
        full_name: fullName,
        active: true
      }
    });
  } catch (error) {
    console.error('Sign-up error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/auth/me', ensureDbConnection, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user in MongoDB
    const user = await db.collection('users').findOne({ 
      $or: [
        { id: decoded.id },
        { _id: new ObjectId(decoded.id) }
      ],
      active: true 
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user.id || user._id.toString(),
      email: user.email,
      full_name: user.full_name,
      active: user.active
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

// User management endpoints
app.get('/api/users', ensureDbConnection, async (req, res) => {
  try {
    const { active } = req.query;
    const filter = {};
    
    if (active === 'true') {
      filter.active = true;
    }

    const users = await db.collection('user_profiles')
      .find(filter)
      .sort({ email: 1 })
      .toArray();

    const formattedUsers = users.map(user => ({
      id: user.id || user._id.toString(),
      email: user.email,
      full_name: user.full_name,
      active: user.active,
      created_at: user.created_at,
      updated_at: user.updated_at
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

app.get('/api/users/:id/role', ensureDbConnection, async (req, res) => {
  try {
    const { id } = req.params;
    
    const userRole = await db.collection('user_roles').findOne({ user_id: id });
    
    res.json({ role: userRole ? userRole.role : 'user' });
  } catch (error) {
    console.error('Get user role error:', error);
    res.status(500).json({ message: 'Failed to fetch user role' });
  }
});

app.put('/api/users/:id', ensureDbConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updateData = {
      ...updates,
      updated_at: new Date()
    };

    // Update user
    await db.collection('users').updateOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] },
      { $set: updateData }
    );

    // Update user profile
    await db.collection('user_profiles').updateOne(
      { id },
      { $set: updateData }
    );

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

app.delete('/api/users/:id', ensureDbConnection, async (req, res) => {
  try {
    const { id } = req.params;

    // Soft delete by setting active to false
    await db.collection('users').updateOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] },
      { $set: { active: false, updated_at: new Date() } }
    );

    await db.collection('user_profiles').updateOne(
      { id },
      { $set: { active: false, updated_at: new Date() } }
    );

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// User roles endpoints
app.get('/api/users-with-roles', ensureDbConnection, async (req, res) => {
  try {
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
        .filter(role => role.user_id === (user.id || user._id.toString()))
        .map(role => role.role);

      return {
        id: user.id || user._id.toString(),
        email: user.email,
        full_name: user.full_name,
        active: user.active,
        created_at: user.created_at,
        updated_at: user.updated_at,
        roles,
        primary_role: roles.length > 0 ? roles[0] : null
      };
    });

    res.json(usersWithRoles);
  } catch (error) {
    console.error('Get users with roles error:', error);
    res.status(500).json({ message: 'Failed to fetch users with roles' });
  }
});

app.post('/api/user-roles', ensureDbConnection, async (req, res) => {
  try {
    const { user_id, role } = req.body;

    if (!user_id || !role) {
      return res.status(400).json({ message: 'User ID and role are required' });
    }

    // Check if user role already exists
    const existingRole = await db.collection('user_roles').findOne({ user_id, role });
    if (existingRole) {
      return res.status(400).json({ message: 'User already has this role' });
    }

    // Get current user from token for assigned_by
    const authHeader = req.headers.authorization;
    let assignedBy = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        assignedBy = decoded.id;
      } catch (err) {
        // Continue without assigned_by if token is invalid
      }
    }

    const newRole = {
      id: new ObjectId().toString(),
      user_id,
      role,
      assigned_by: assignedBy,
      assigned_at: new Date(),
      created_at: new Date()
    };

    await db.collection('user_roles').insertOne(newRole);

    res.status(201).json(newRole);
  } catch (error) {
    console.error('Create user role error:', error);
    res.status(500).json({ message: 'Failed to create user role' });
  }
});

// Company configuration endpoint
app.get('/api/company-config', ensureDbConnection, async (req, res) => {
  try {
    const config = await db.collection('company_config')
      .findOne({}, { sort: { created_at: -1 } });

    if (!config) {
      return res.json({
        company_name: 'M8 Platform',
        company_logo: ''
      });
    }

    res.json({
      company_name: config.company_name || 'M8 Platform',
      company_logo: config.company_logo || ''
    });
  } catch (error) {
    console.error('Get company config error:', error);
    res.status(500).json({ message: 'Failed to fetch company configuration' });
  }
});

// Initialize database connection and start server
async function startServer() {
  await connectToDatabase();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`MongoDB connected to: mongodb://admin:***@localhost:27017/sandbox_db`);
    console.log(`Using database: ${MONGODB_DB}`);
  });
}

startServer().catch(console.error);