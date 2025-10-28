import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { MongoClient, ObjectId, UUID } from 'mongodb';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:060624@localhost:27017/sandbox_db?authSource=sandbox_db';
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
    console.log('Database:', MONGODB_DB);
    console.log('Auth Source: sandbox_db');
    console.log('User: admin');
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

// Auth endpoints
app.post('/api/auth/signin', ensureDbConnection, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user in MongoDB
    const user = await db.collection('users').findOne({ 
      email: email,
      active: true 
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.encrypted_password);
    if (!isValid) {
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

    res.json({
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
    res.status(500).json({ message: 'Internal server error' });
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

app.post('/api/company-config', ensureDbConnection, async (req, res) => {
  try {
    const { company_name, company_logo } = req.body;
    
    const configData = {
      company_name,
      company_logo,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Upsert - update if exists, create if not
    await db.collection('company_config').updateOne(
      {},
      { $set: configData },
      { upsert: true }
    );

    res.json({ message: 'Company configuration updated successfully' });
  } catch (error) {
    console.error('Update company config error:', error);
    res.status(500).json({ message: 'Failed to update company configuration' });
  }
});

app.delete('/api/company-config', ensureDbConnection, async (req, res) => {
  try {
    await db.collection('company_config').deleteMany({});
    res.json({ message: 'Company configuration deleted successfully' });
  } catch (error) {
    console.error('Delete company config error:', error);
    res.status(500).json({ message: 'Failed to delete company configuration' });
  }
});

// System configuration endpoints
app.get('/api/system-config', ensureDbConnection, async (req, res) => {
  try {
    const { key } = req.query;
    
    if (!key) {
      return res.status(400).json({ message: 'Key parameter is required' });
    }

    const config = await db.collection('system_config')
      .findOne({ key: key });

    if (!config) {
      return res.status(404).json({ message: 'Configuration not found' });
    }

    // Return the configuration based on the key
    if (key === 'system_date') {
      return res.json({ currentDate: config.system_date });
    }

    // For other keys, return the value directly
    res.json({ value: config.value });
  } catch (error) {
    console.error('Get system config error:', error);
    res.status(500).json({ message: 'Failed to fetch system configuration' });
  }
});

app.post('/api/system-config', ensureDbConnection, async (req, res) => {
  try {
    const { key, value, system_date } = req.body;
    
    if (!key) {
      return res.status(400).json({ message: 'Key is required' });
    }

    const configData = {
      key,
      updated_at: new Date()
    };

    // Handle different types of configuration
    if (key === 'system_date') {
      configData.system_date = system_date;
    } else {
      configData.value = value;
    }

    // Upsert the configuration
    await db.collection('system_config').updateOne(
      { key },
      { $set: configData },
      { upsert: true }
    );

    res.json({ message: 'System configuration updated successfully' });
  } catch (error) {
    console.error('Update system config error:', error);
    res.status(500).json({ message: 'Failed to update system configuration' });
  }
});

// Customers endpoints
app.get('/api/customers', ensureDbConnection, async (req, res) => {
  try {
    const { search, email } = req.query;
    let filter = {};
    
    // If email is provided (for non-admin users), filter by user assignments
    if (email && email !== 'undefined') {
      // For non-admin users, we need to check customer assignments
      const userAssignments = await db.collection('customer_assignments')
        .find({ email })
        .toArray();
      
      const assignedCustomerIds = userAssignments.map(assignment => assignment.customer_id);
      
      if (assignedCustomerIds.length > 0) {
        filter.customer_code = { $in: assignedCustomerIds };
      } else {
        // User has no assignments, return empty array
        return res.json([]);
      }
    }

    // Add search functionality
    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { customer_code: { $regex: search, $options: 'i' } }
      ];
    }

    const customers = await db.collection('v_customer_node')
      .find(filter)
      .sort({ description: 1 })
      .toArray();

    const formattedCustomers = customers.map(customer => ({
      id: customer.customer_id, // UUID from v_customer view
      customer_id: customer.customer_code, // Use customer_code as display ID
      customer_name: customer.description,
      customer_logo: null, // Not available in v_customer view
      level_1: null, // Not available in v_customer view
      level_1_name: null,
      level_2: null,
      level_2_name: null,
      status: customer.status,
      created_at: customer.created_at || new Date().toISOString(),
      updated_at: customer.updated_at || new Date().toISOString()
    }));

    res.json(formattedCustomers);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ message: 'Failed to fetch customers' });
  }
});

app.post('/api/customers', ensureDbConnection, async (req, res) => {
  try {
    const customerData = {
      id: new ObjectId().toString(),
      ...req.body,
      created_at: new Date(),
      updated_at: new Date()
    };

    await db.collection('customers').insertOne(customerData);
    res.status(201).json(customerData);
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ message: 'Failed to create customer' });
  }
});

app.put('/api/customers/:id', ensureDbConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date() };

    await db.collection('customers').updateOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] },
      { $set: updates }
    );

    const updatedCustomer = await db.collection('customers').findOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] }
    );

    res.json(updatedCustomer);
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ message: 'Failed to update customer' });
  }
});

app.delete('/api/customers/:id', ensureDbConnection, async (req, res) => {
  try {
    const { id } = req.params;

    await db.collection('customers').deleteOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] }
    );

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ message: 'Failed to delete customer' });
  }
});

// Get customer by node ID
app.get('/api/customers/by-node/:nodeId', ensureDbConnection, async (req, res) => {
  try {
    const { nodeId } = req.params;
    
    // Try to find customer by UUID or customer_node_id
    const customer = await db.collection('customers').findOne({
      $or: [
        { id: nodeId },
        { customer_node_id: nodeId }
      ]
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const formattedCustomer = {
      id: customer.id || customer._id.toString(),
      customer_id: customer.customer_id,
      customer_name: customer.customer_name,
      customer_logo: customer.customer_logo,
      level_1: customer.level_1,
      level_1_name: customer.level_1_name,
      level_2: customer.level_2,
      level_2_name: customer.level_2_name,
      created_at: customer.created_at,
      updated_at: customer.updated_at
    };

    res.json(formattedCustomer);
  } catch (error) {
    console.error('Get customer by node ID error:', error);
    res.status(500).json({ message: 'Failed to fetch customer' });
  }
});

// Locations endpoints
app.get('/api/locations', ensureDbConnection, async (req, res) => {
  try {
    const locations = await db.collection('locations')
      .find({})
      .sort({ location_name: 1 })
      .toArray();

    const formattedLocations = locations.map(location => ({
      id: location.id || location._id.toString(),
      location_id: location.location_id,
      location_name: location.location_name,
      country: location.country,
      region: location.region,
      city: location.city,
      address: location.address,
      created_at: location.created_at,
      updated_at: location.updated_at
    }));

    res.json(formattedLocations);
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ message: 'Failed to fetch locations' });
  }
});

app.post('/api/locations', ensureDbConnection, async (req, res) => {
  try {
    const locationData = {
      id: new ObjectId().toString(),
      ...req.body,
      created_at: new Date(),
      updated_at: new Date()
    };

    await db.collection('locations').insertOne(locationData);
    res.status(201).json(locationData);
  } catch (error) {
    console.error('Create location error:', error);
    res.status(500).json({ message: 'Failed to create location' });
  }
});

app.put('/api/locations/:id', ensureDbConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date() };

    await db.collection('locations').updateOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] },
      { $set: updates }
    );

    const updatedLocation = await db.collection('locations').findOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] }
    );

    res.json(updatedLocation);
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ message: 'Failed to update location' });
  }
});

app.delete('/api/locations/:id', ensureDbConnection, async (req, res) => {
  try {
    const { id } = req.params;

    await db.collection('locations').deleteOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] }
    );

    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Delete location error:', error);
    res.status(500).json({ message: 'Failed to delete location' });
  }
});

// Get location by location_node_id
app.get('/api/locations/by-node/:nodeId', ensureDbConnection, async (req, res) => {
  try {
    const { nodeId } = req.params;
    
    const location = await db.collection('locations').findOne({
      location_id: nodeId
    });

    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    const formattedLocation = {
      id: location.id || location._id.toString(),
      location_id: location.location_id,
      location_node_id: location.location_node_id,
      location_name: location.location_name,
      country: location.country,
      region: location.region,
      city: location.city,
      address: location.address,
      created_at: location.created_at,
      updated_at: location.updated_at
    };

    res.json(formattedLocation);
  } catch (error) {
    console.error('Get location by node ID error:', error);
    res.status(500).json({ message: 'Failed to fetch location' });
  }
});

// Products endpoints - enhanced to include category and subcategory data
app.get('/api/products', ensureDbConnection, async (req, res) => {
  try {
    const products = await db.collection('products')
      .find({})
      .sort({ product_name: 1 })
      .toArray();
    console.log('Fetched products:', products);  
    const formattedProducts = products.map(product => ({
      id: product.id || product._id.toString(),
      product_id: product.product_id,
      product_name: product.product_name,
      category_id: product.category_id,
      category_name: product.category_name,
      subcategory_id: product.subcategory_id,
      subcategory_name: product.subcategory_name,      
      brand: product.brand,
      description: product.description,
      unit_price: product.unit_price,
      currency: product.currency,
      created_at: product.created_at,
      updated_at: product.updated_at
    }));
    console.log('Formatted products:', formattedProducts);
    res.json(formattedProducts
      
    );
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

app.post('/api/products', ensureDbConnection, async (req, res) => {
  try {
    const productData = {
      id: new ObjectId().toString(),
      ...req.body,
      created_at: new Date(),
      updated_at: new Date()
    };

    await db.collection('products').insertOne(productData);
    res.status(201).json(productData);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Failed to create product' });
  }
});

app.put('/api/products/:id', ensureDbConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date() };

    await db.collection('products').updateOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] },
      { $set: updates }
    );

    const updatedProduct = await db.collection('products').findOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] }
    );

    res.json(updatedProduct);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Failed to update product' });
  }
});

app.delete('/api/products/:id', ensureDbConnection, async (req, res) => {
  try {
    const { id } = req.params;

    await db.collection('products').deleteOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] }
    );

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Failed to delete product' });
  }
});

// Customer assignments endpoints
app.get('/api/customer-assignments', ensureDbConnection, async (req, res) => {
  try {
    console.log('Customer assignments endpoint called with query:', req.query);
    const { commercial_user_id, email } = req.query;
    let filter = {};
    
    if (commercial_user_id) {
      filter.commercial_user_id = commercial_user_id;
    }
    
    if (email) {
      filter.email = email;
    }

    console.log('Customer assignments filter:', filter);

    const assignments = await db.collection('customer_assignments')
      .find(filter)
      .sort({ created_at: -1 })
      .toArray();

    console.log('Found customer assignments:', assignments.length);

    res.json(assignments || []);
  } catch (error) {
    console.error('Get customer assignments error:', error);
    res.status(500).json({ message: 'Failed to fetch customer assignments' });
  }
});

app.post('/api/customer-assignments', ensureDbConnection, async (req, res) => {
  try {
    const assignmentData = {
      id: new ObjectId().toString(),
      ...req.body,
      created_at: new Date()
    };

    await db.collection('customer-assignments').insertOne(assignmentData);
    res.status(201).json(assignmentData);
  } catch (error) {
    console.error('Create customer assignment error:', error);
    res.status(500).json({ message: 'Failed to create customer assignment' });
  }
});

// Product assignments endpoints
app.get('/api/product-assignments', ensureDbConnection, async (req, res) => {
  try {
    const assignments = await db.collection('product_assignments')
      .find({})
      .sort({ created_at: -1 })
      .toArray();

    res.json(assignments);
  } catch (error) {
    console.error('Get product assignments error:', error);
    res.status(500).json({ message: 'Failed to fetch product assignments' });
  }
});

app.post('/api/product-assignments', ensureDbConnection, async (req, res) => {
  try {
    const assignmentData = {
      id: new ObjectId().toString(),
      ...req.body,
      created_at: new Date(),
      updated_at: new Date()
    };

    await db.collection('product_assignments').insertOne(assignmentData);
    res.status(201).json(assignmentData);
  } catch (error) {
    console.error('Create product assignment error:', error);
    res.status(500).json({ message: 'Failed to create product assignment' });
  }
});

// Customer assignments PATCH and DELETE endpoints
app.patch('/api/customer-assignments/:id', ensureDbConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date() };

    await db.collection('customer_assignments').updateOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] },
      { $set: updates }
    );

    const updatedAssignment = await db.collection('customer_assignments').findOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] }
    );

    res.json(updatedAssignment);
  } catch (error) {
    console.error('Update customer assignment error:', error);
    res.status(500).json({ message: 'Failed to update customer assignment' });
  }
});

app.delete('/api/customer-assignments/:id', ensureDbConnection, async (req, res) => {
  try {
    const { id } = req.params;

    await db.collection('customer_assignments').deleteOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] }
    );

    res.json({ message: 'Customer assignment deleted successfully' });
  } catch (error) {
    console.error('Delete customer assignment error:', error);
    res.status(500).json({ message: 'Failed to delete customer assignment' });
  }
});

// Product assignments PATCH and DELETE endpoints
app.patch('/api/product-assignments/:id', ensureDbConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date() };

    await db.collection('product_assignments').updateOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] },
      { $set: updates }
    );

    const updatedAssignment = await db.collection('product_assignments').findOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] }
    );

    res.json(updatedAssignment);
  } catch (error) {
    console.error('Update product assignment error:', error);
    res.status(500).json({ message: 'Failed to update product assignment' });
  }
});

app.delete('/api/product-assignments/:id', ensureDbConnection, async (req, res) => {
  try {
    const { id } = req.params;

    await db.collection('product_assignments').deleteOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] }
    );

    res.json({ message: 'Product assignment deleted successfully' });
  } catch (error) {
    console.error('Delete product assignment error:', error);
    res.status(500).json({ message: 'Failed to delete product assignment' });
  }
});

// User roles DELETE endpoint
app.delete('/api/user-roles/:userId/:role', ensureDbConnection, async (req, res) => {
  try {
    const { userId, role } = req.params;

    await db.collection('user_roles').deleteOne({
      user_id: userId,
      role: role
    });

    res.json({ message: 'User role deleted successfully' });
  } catch (error) {
    console.error('Delete user role error:', error);
    res.status(500).json({ message: 'Failed to delete user role' });
  }
});

// Forecast data endpoints - Fix to properly handle MongoDB structure
app.get('/api/forecast-data/category/:categoryId', ensureDbConnection, async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { location_node_id, customer_node_id } = req.query;

    console.log('Fetching forecast data for category:', categoryId, 'with filters:', { location_node_id, customer_node_id });

    // Convert categoryId to number if it's numeric
    let categoryIdValue = categoryId;
    const categoryIdNum = parseInt(categoryId);
    if (!isNaN(categoryIdNum)) {
      categoryIdValue = categoryIdNum;
    }

    // First, get all products in this category with flexible category matching
    const products = await db.collection('products').find({ 
      $or: [
        { category_id: categoryIdValue },    // Try as original type
        { category_id: categoryId },         // Try as string
        { category_id: categoryIdNum },      // Try as number
        { category: categoryIdValue },       // Alternative field name
        { category: categoryId },
        { category: categoryIdNum }
      ]
    }).toArray();

    console.log('Found products for category search:', products.length);
    console.log('Sample product:', products[0]);

    const productIds = products.map(p => {
      // Handle both string and number product_ids
      const productId = p.product_id;
      const productIdNum = parseInt(productId);
      return !isNaN(productIdNum) ? productIdNum : productId;
    });
    
    console.log('Found products in category:', productIds);

    if (productIds.length === 0) {
      return res.json([]);
    }

    // Build filter for forecast data
    const filter = { product_id: { $in: productIds } };
    
    // Convert string parameters to numbers if they exist
    if (location_node_id) {
      filter.location_node_id = location_node_id; // Use as string UUID
    }
    
    if (customer_node_id) {
      filter.customer_node_id = customer_node_id; // Use as string UUID
    }

    console.log('Forecast data filter with converted types:', filter);

    const forecastData = await db.collection('forecast_data')
      .find(filter)
      .sort({ postdate: -1 })
      .toArray();

    console.log('Found forecast data records:', forecastData.length);

    // Add product information to each record
    const enrichedData = forecastData.map(record => {
      const product = products.find(p => {
        const pId = p.product_id;
        const pIdNum = parseInt(pId);
        const rId = record.product_id;
        return pId === rId || (!isNaN(pIdNum) && pIdNum === rId);
      });
      return {
        ...record,
        products: product ? {
          category_id: product.category_id || product.category,
          category_name: product.category_name || product.category,
          subcategory_id: product.subcategory_id || product.subcategory,
          subcategory_name: product.subcategory_name || product.subcategory
        } : null
      };
    });

    res.json(enrichedData);
  } catch (error) {
    console.error('Get forecast data by category error:', error);
    res.status(500).json({ message: 'Failed to fetch forecast data by category' });
  }
});

app.get('/api/forecast-data/subcategory/:subcategoryId', ensureDbConnection, async (req, res) => {
  try {
    const { subcategoryId } = req.params;
    const { location_node_id, customer_node_id } = req.query;

    console.log('Fetching forecast data for subcategory:', subcategoryId, 'with filters:', { location_node_id, customer_node_id });

    // Convert subcategoryId to number if it's numeric
    let subcategoryIdValue = subcategoryId;
    const subcategoryIdNum = parseInt(subcategoryId);
    if (!isNaN(subcategoryIdNum)) {
      subcategoryIdValue = subcategoryIdNum;
    }

    // First, get all products in this subcategory with flexible subcategory matching
    const products = await db.collection('products').find({ 
      $or: [
        { subcategory_id: subcategoryIdValue },    // Try as original type
        { subcategory_id: subcategoryId },         // Try as string
        { subcategory_id: subcategoryIdNum },      // Try as number
        { subcategory: subcategoryIdValue },       // Alternative field name
        { subcategory: subcategoryId },
        { subcategory: subcategoryIdNum }
      ]
    }).toArray();

    console.log('Found products for subcategory search:', products.length);
    console.log('Sample product:', products[0]);

    const productIds = products.map(p => {
      // Handle both string and number product_ids
      const productId = p.product_id;
      const productIdNum = parseInt(productId);
      return !isNaN(productIdNum) ? productIdNum : productId;
    });
    
    console.log('Found products in subcategory:', productIds);

    if (productIds.length === 0) {
      return res.json([]);
    }

    // Build filter for forecast data
    const filter = { product_id: { $in: productIds } };
    
    // Convert string parameters to numbers if they exist
    if (location_node_id) {
      filter.location_node_id = location_node_id; // Use as string UUID
    }
    
    if (customer_node_id) {
      filter.customer_node_id = customer_node_id; // Use as string UUID
    }

    console.log('Forecast data filter with converted types:', filter);

    const forecastData = await db.collection('forecast_data')
      .find(filter)
      .sort({ postdate: -1 })
      .toArray();

    console.log('Found forecast data records:', forecastData.length);

    // Add product information to each record
    const enrichedData = forecastData.map(record => {
      const product = products.find(p => {
        const pId = p.product_id;
        const pIdNum = parseInt(pId);
        const rId = record.product_id;
        return pId === rId || (!isNaN(pIdNum) && pIdNum === rId);
      });
      return {
        ...record,
        products: product ? {
          category_id: product.category_id || product.category,
          category_name: product.category_name || product.category,
          subcategory_id: product.subcategory_id || product.subcategory,
          subcategory_name: product.subcategory_name || product.subcategory
        } : null
      };
    });

    res.json(enrichedData);
  } catch (error) {
    console.error('Get forecast data by subcategory error:', error);
    res.status(500).json({ message: 'Failed to fetch forecast data by subcategory' });
  }
});

app.get('/api/forecast-data/product/:productId', ensureDbConnection, async (req, res) => {
  try {
    const { productId } = req.params;
    const { location_node_id, customer_node_id } = req.query;

    console.log('=== FORECAST DATA DEBUG ===');
    console.log('Raw parameters:', { productId, location_node_id, customer_node_id });
    console.log('Parameter types:', { 
      productId: typeof productId, 
      location_node_id: typeof location_node_id, 
      customer_node_id: typeof customer_node_id 
    });

    // Try multiple query strategies
    const queries = [];
    
    // Strategy 1: Product as number, UUIDs as UUID objects
    const productIdNum = parseInt(productId);
    const customerNodeId = customer_node_id ? customer_node_id : undefined;
    console.log('Converted parameters:', { productIdNum, location_node_id, customerNodeId });
    if (!isNaN(productIdNum)) {
      const query1 = { product_id: productIdNum };
      if (location_node_id) {
        try {
          query1.location_node_id = new UUID(location_node_id);
        } catch (error) {
          query1.location_node_id = location_node_id; // Fallback to string
        }
      }
      if (customerNodeId) {
        try {
          query1.customer_node_id = new UUID(customerNodeId);
        } catch (error) {
          query1.customer_node_id = customerNodeId; // Fallback to string
        }
      }
      queries.push({ name: 'Product Number, UUIDs as Objects', query: query1 });
    }

    // Strategy 2: All as strings
    const query2 = { product_id: productId };
    if (location_node_id) query2.location_node_id = location_node_id;
    if (customer_node_id) query2.customer_node_id = customer_node_id;
    queries.push({ name: 'All Strings', query: query2 });

    // Strategy 3: Mixed types (product as number, others as strings)
    if (!isNaN(productIdNum)) {
      const query3 = { product_id: productIdNum };
      if (location_node_id) query3.location_node_id = location_node_id;
      if (customer_node_id) query3.customer_node_id = customer_node_id;
      queries.push({ name: 'Product Number, Others String', query: query3 });
    }

    // Strategy 4: $or query with multiple type combinations
    const orConditions = [];
    
    // Add UUID object combination
    if (!isNaN(productIdNum)) {
      const uuidCondition = { product_id: productIdNum };
      if (location_node_id) {
        try {
          uuidCondition.location_node_id = new UUID(location_node_id);
        } catch (error) {
          uuidCondition.location_node_id = location_node_id;
        }
      }
      if (customerNodeId) {
        try {
          uuidCondition.customer_node_id = new UUID(customerNodeId);
        } catch (error) {
          uuidCondition.customer_node_id = customerNodeId;
        }
      }
      orConditions.push(uuidCondition);
    }
    
    // Add string combination
    const strCondition = { product_id: productIdNum || productId };
    if (location_node_id) strCondition.location_node_id = location_node_id;
    if (customer_node_id) strCondition.customer_node_id = customer_node_id;
    orConditions.push(strCondition);

    if (orConditions.length > 0) {
      queries.push({ name: 'OR Query', query: { $or: orConditions } });
    }

    // Try each query strategy
    let forecastData = [];
    let successfulQuery = null;

    for (const { name, query } of queries) {
      console.log(`Trying ${name}:`, JSON.stringify(query, null, 2));
      
      try {
        const result = await db.collection('forecast_data')
          .find(query)
          .sort({ postdate: -1 })
          .toArray();
        
        console.log(`${name} returned ${result.length} records`);
        
        if (result.length > 0) {
          forecastData = result;
          successfulQuery = name;
          break;
        }
      } catch (error) {
        console.error(`Error with ${name}:`, error);
      }
    }

    // If no results, let's check what data actually exists
    if (forecastData.length === 0) {
      console.log('No results found. Checking what data exists...');
      
      // Check if product exists at all
      const productCheck = await db.collection('forecast_data')
        .findOne({ product_id: productIdNum });
      
      if (productCheck) {
        console.log('Found product data with numeric ID:', productCheck);
      } else {
        const productCheckStr = await db.collection('forecast_data')
          .findOne({ product_id: productId });
        console.log('Found product data with string ID:', productCheckStr);
      }
      
      // Get a sample of all records to see data structure
      const sampleData = await db.collection('forecast_data')
        .find({})
        .limit(3)
        .toArray();
      
      console.log('Sample records from forecast_data:');
      sampleData.forEach((record, index) => {
        console.log(`Record ${index + 1}:`, {
          id: record.id,
          product_id: record.product_id,
          product_id_type: typeof record.product_id,
          location_id: record.location_id,
          location_id_type: typeof record.location_id,
          customer_id: record.customer_id,
          customer_id_type: typeof record.customer_id,
          postdate: record.postdate
        });
      });
    } else {
      console.log(`SUCCESS: Found ${forecastData.length} records using ${successfulQuery}`);
    }

    // Get product information
    const product = await db.collection('products').findOne({ 
      $or: [
        { product_id: productIdNum },
        { product_id: productId }
      ]
    });

    console.log('Product info found:', product ? 'yes' : 'no');

    // Add product information to each record
    const enrichedData = forecastData.map(record => ({
      ...record,
      products: product ? {
        category_id: product.category_id || product.category,
        category_name: product.category_name || product.category,
        subcategory_id: product.subcategory_id || product.subcategory,
        subcategory_name: product.subcategory_name || product.subcategory
      } : null
    }));

    console.log('=== END DEBUG ===');
    res.json(enrichedData);
  } catch (error) {
    console.error('Get forecast data by product error:', error);
    res.status(500).json({ message: 'Failed to fetch forecast data by product' });
  }
});

app.post('/api/forecast-data/by-products', ensureDbConnection, async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds)) {
      return res.status(400).json({ message: 'Product IDs array is required' });
    }

    const forecastData = await db.collection('forecast_data')
      .find({ product_id: { $in: productIds } })
      .sort({ postdate: -1 })
      .toArray();

    res.json(forecastData);
  } catch (error) {
    console.error('Get forecast data by product IDs error:', error);
    res.status(500).json({ message: 'Failed to fetch forecast data by product IDs' });
  }
});

app.put('/api/forecast-data/:id', ensureDbConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date() };

    await db.collection('forecast_data').updateOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] },
      { $set: updates }
    );

    const updatedForecast = await db.collection('forecast_data').findOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] }
    );

    res.json(updatedForecast);
  } catch (error) {
    console.error('Update forecast data error:', error);
    res.status(500).json({ message: 'Failed to update forecast data' });
  }
});

// General forecast data endpoint with optional filtering
app.get('/api/forecast-data', ensureDbConnection, async (req, res) => {
  try {
    const { location_node_id, customer_node_id, limit = 1000 } = req.query;

    console.log('=== GENERAL FORECAST DATA DEBUG ===');
    console.log('Query parameters:', { location_node_id, customer_node_id, limit });

    // Build query with optional filters
    const query = {};
    
    if (location_node_id) {
      try {
        query.location_node_id = new UUID(location_node_id);
        console.log('Added location filter with UUID:', location_node_id);
      } catch (error) {
        query.location_node_id = location_node_id;
        console.log('Added location filter as string:', location_node_id);
      }
    }
    
    if (customer_node_id) {
      try {
        query.customer_node_id = new UUID(customer_node_id);
        console.log('Added customer filter with UUID:', customer_node_id);
      } catch (error) {
        query.customer_node_id = customer_node_id;
        console.log('Added customer filter as string:', customer_node_id);
      }
    }

    console.log('Final query:', JSON.stringify(query, null, 2));

    const forecastData = await db.collection('forecast_data')
      .find(query)
      .sort({ postdate: -1 })
      .limit(parseInt(limit))
      .toArray();

    console.log(`Found ${forecastData.length} records`);

    // Get product information for all records
    const productIds = [...new Set(forecastData.map(record => record.product_id))];
    const products = await db.collection('products')
      .find({ 
        $or: [
          { product_id: { $in: productIds } },
          { product_id: { $in: productIds.map(id => parseInt(id)).filter(id => !isNaN(id)) } }
        ]
      })
      .toArray();

    const productMap = new Map();
    products.forEach(product => {
      productMap.set(product.product_id, {
        category_id: product.category_id || product.category,
        category_name: product.category_name || product.category,
        subcategory_id: product.subcategory_id || product.subcategory,
        subcategory_name: product.subcategory_name || product.subcategory
      });
    });

    // Add product information to each record
    const enrichedData = forecastData.map(record => ({
      ...record,
      products: productMap.get(record.product_id) || null
    }));

    console.log('=== END GENERAL FORECAST DEBUG ===');
    res.json(enrichedData);
  } catch (error) {
    console.error('Get general forecast data error:', error);
    res.status(500).json({ message: 'Failed to fetch forecast data' });
  }
});

// Save commercial collaboration data
app.post('/api/forecast-data/save', ensureDbConnection, async (req, res) => {
  try {
    const { product_id, customer_id, location_id, postdate, commercial_input } = req.body;
    
    console.log('Saving commercial collaboration data:', {
      product_id,
      customer_id,
      location_id,
      postdate,
      commercial_input
    });

    // Convert postdate to Date object
    const postdateObj = new Date(postdate);
    
    // Create the document to upsert - use customer_node_id if UUID format
    const collaborationData = {
      product_id,
      customer_node_id: customer_id, // Store as customer_node_id for MongoDB
      ...(location_id && { location_node_id: location_id }), // Store as location_node_id for MongoDB
      postdate: postdateObj,
      commercial_input: parseFloat(commercial_input) || 0,
      updated_at: new Date()
    };

    // Upsert the document (update if exists, insert if not)
    const result = await db.collection('commercial_collaboration').updateOne(
      {
        product_id,
        customer_node_id: customer_id,
        postdate: postdateObj,
        ...(location_id && { location_node_id: location_id })
      },
      {
        $set: collaborationData,
        $setOnInsert: { created_at: new Date() }
      },
      { upsert: true }
    );

    console.log('Save result:', result);
    
    res.json({ success: true, result });
  } catch (error) {
    console.error('Save commercial collaboration error:', error);
    res.status(500).json({ message: 'Failed to save commercial collaboration data' });
  }
});

// Inventory projections endpoint
app.get('/api/inventory-projections', ensureDbConnection, async (req, res) => {
  try {
    const { product_id, location_id, limit = '100' } = req.query;
    
    console.log('Fetching inventory projections with filters:', {
      product_id,
      location_id,
      limit
    });

    // Build query
    const query = {};
    
    if (product_id) {
      // Try both string and number formats
      const productIdNum = parseInt(product_id);
      if (!isNaN(productIdNum)) {
        query.product_id = { $in: [product_id, productIdNum] };
      } else {
        query.product_id = product_id;
      }
    }
    
    if (location_id) {
      query.location_node_id = location_id;
    }

    console.log('Inventory projections query:', JSON.stringify(query, null, 2));

    // Get forecast data and transform it to inventory projections format
    const forecastData = await db.collection('forecast_data')
      .find(query)
      .sort({ postdate: 1 })
      .limit(parseInt(limit))
      .toArray();

    console.log(`Found ${forecastData.length} forecast records for inventory projections`);

    // Transform forecast data to inventory projection format
    // Group by month and aggregate the data
    const projectionMap = new Map();
    
    forecastData.forEach(record => {
      const date = new Date(record.postdate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!projectionMap.has(monthKey)) {
        projectionMap.set(monthKey, {
          projection_month: monthKey,
          forecasted_demand: 0,
          projected_ending_inventory: 0
        });
      }
      
      const projection = projectionMap.get(monthKey);
      projection.forecasted_demand += record.forecast || 0;
      
      // Simulate ending inventory calculation
      // This is a simple approximation - in real scenario this would be more complex
      projection.projected_ending_inventory += (record.forecast || 0) * 0.8; // Assume 80% conversion to inventory
    });

    // Convert map to array and sort by month
    const projections = Array.from(projectionMap.values()).sort((a, b) => 
      a.projection_month.localeCompare(b.projection_month)
    );

    console.log('Generated inventory projections:', projections.length);
    res.json(projections);
  } catch (error) {
    console.error('Get inventory projections error:', error);
    res.status(500).json({ message: 'Failed to fetch inventory projections' });
  }
});

// Forecast collaboration comments endpoints
app.post('/api/forecast-collaboration-comments', ensureDbConnection, async (req, res) => {
  try {
    const commentData = {
      id: new ObjectId().toString(),
      ...req.body,
      created_at: new Date(),
      updated_at: new Date()
    };

    await db.collection('forecast_collaboration_comments').insertOne(commentData);
    res.status(201).json(commentData);
  } catch (error) {
    console.error('Create forecast collaboration comment error:', error);
    res.status(500).json({ message: 'Failed to create forecast collaboration comment' });
  }
});

app.get('/api/forecast-collaboration-comments/:forecastId', ensureDbConnection, async (req, res) => {
  try {
    const { forecastId } = req.params;

    const comments = await db.collection('forecast_collaboration_comments')
      .find({ forecast_data_id: forecastId })
      .sort({ created_at: -1 })
      .toArray();

    res.json(comments);
  } catch (error) {
    console.error('Get forecast collaboration comments error:', error);
    res.status(500).json({ message: 'Failed to fetch forecast collaboration comments' });
  }
});

// Auth user endpoint for MongoDB
app.get('/api/auth/user', ensureDbConnection, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
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
      user: {
        id: user.id || user._id.toString(),
        email: user.email,
        full_name: user.full_name,
        active: user.active
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Commercial profiles endpoints - fix to return empty profile instead of 404
app.get('/api/commercial-profiles/:userId', ensureDbConnection, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Fetching commercial profile for user:', userId);

    const profile = await db.collection('commercial_team_profiles')
      .findOne({ user_id: userId });

    console.log('Found profile:', profile ? 'yes' : 'no');

    if (!profile) {
      // Return empty profile instead of 404 to avoid errors
      const emptyProfile = {
        user_id: userId,
        territory: '',
        customer_segments: [],
        specialization: '',
        phone: '',
        region: '',
        manager_level: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      console.log('Returning empty profile:', emptyProfile);
      return res.json(emptyProfile);
    }

    console.log('Returning existing profile:', profile);
    res.json(profile);
  } catch (error) {
    console.error('Get commercial profile error:', error);
    res.status(500).json({ message: 'Failed to fetch commercial profile', error: error.message });
  }
});

app.put('/api/commercial-profiles/:userId', ensureDbConnection, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Updating commercial profile for user:', userId);
    console.log('Update data:', req.body);

    // Validate manager_level if provided
    if (req.body.manager_level && !['junior', 'senior', 'director'].includes(req.body.manager_level)) {
      return res.status(400).json({ message: 'Invalid manager_level. Must be: junior, senior, or director' });
    }

    const updates = { 
      ...req.body, 
      user_id: userId,
      updated_at: new Date() 
    };

    console.log('Performing upsert with data:', updates);

    const result = await db.collection('commercial_team_profiles').updateOne(
      { user_id: userId },
      { $set: updates },
      { upsert: true }
    );

    console.log('Upsert result:', result);

    const updatedProfile = await db.collection('commercial_team_profiles')
      .findOne({ user_id: userId });

    console.log('Updated profile:', updatedProfile);
    res.json(updatedProfile);
  } catch (error) {
    console.error('Update commercial profile error:', error);
    res.status(500).json({ message: 'Failed to update commercial profile', error: error.message });
  }
});

// Market intelligence endpoints - ensure they're working properly
app.get('/api/market-intelligence', ensureDbConnection, async (req, res) => {
  try {
    console.log('Market intelligence endpoint called with query:', req.query);
    
    const { commercial_user_id } = req.query;
    let filter = {};
    
    if (commercial_user_id) {
      filter.commercial_user_id = commercial_user_id;
    }
    
    const intelligence = await db.collection('market_intelligence').find(filter).toArray();
    console.log(`Found ${intelligence.length} market intelligence records`);

    // Always return an array, even if empty
    res.json(intelligence || []);
  } catch (error) {
    console.error('Get market intelligence error:', error);
    res.status(500).json({ message: 'Failed to fetch market intelligence', error: error.message });
  }
});

app.post('/api/market-intelligence', ensureDbConnection, async (req, res) => {
  try {
    console.log('Creating market intelligence with data:', req.body);
    
    const intelligenceData = {
      id: new ObjectId().toString(),
      ...req.body,
      created_at: new Date(),
      updated_at: new Date()
    };

    console.log('Inserting intelligence data:', intelligenceData);

    await db.collection('market_intelligence').insertOne(intelligenceData);
    
    console.log('Market intelligence created successfully');
    res.status(201).json(intelligenceData);
  } catch (error) {
    console.error('Create market intelligence error:', error);
    res.status(500).json({ message: 'Failed to create market intelligence', error: error.message });
  }
});

// Initialize MongoDB collections and indexes
async function initializeCollections() {
  try {
    console.log('Initializing MongoDB collections...');

    // Create commercial_team_profiles collection with validation
    try {
      await db.createCollection('commercial_team_profiles', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['user_id'],
            properties: {
              id: { bsonType: 'string' },
              user_id: { bsonType: 'string' },
              territory: { bsonType: ['string', 'null'] },
              customer_segments: { bsonType: ['array', 'null'] },
              specialization: { bsonType: ['string', 'null'] },
              phone: { bsonType: ['string', 'null'] },
              region: { bsonType: ['string', 'null'] },
              manager_level: { 
                bsonType: ['string', 'null'],
                enum: ['junior', 'senior', 'director', null]
              },
              created_at: { bsonType: ['date', 'string'] },
              updated_at: { bsonType: ['date', 'string'] }
            }
          }
        }
      });
      console.log('Created commercial_team_profiles collection');
    } catch (error) {
      if (error.code !== 48) { // Collection already exists
        console.error('Error creating commercial_team_profiles:', error);
      } else {
        console.log('commercial_team_profiles collection already exists');
      }
    }

    // Create unique index on user_id
    try {
      await db.collection('commercial_team_profiles').createIndex(
        { user_id: 1 }, 
        { unique: true }
      );
      console.log('Created unique index on commercial_team_profiles.user_id');
    } catch (error) {
      if (error.code !== 85) { // Index already exists
        console.error('Error creating index on commercial_team_profiles:', error);
      }
    }

    // Create other collections if they don't exist
    const collections = [
      'market_intelligence',
      'customer_assignments',
      'forecast_collaboration_comments'
    ];

    for (const collectionName of collections) {
      try {
        await db.createCollection(collectionName);
        console.log(`Created collection: ${collectionName}`);
      } catch (error) {
        if (error.code !== 48) { // Collection already exists
          console.error(`Error creating collection ${collectionName}:`, error);
        }
      }
    }

    console.log('MongoDB collections initialized successfully');
  } catch (error) {
    console.error('Error initializing collections:', error);
  }
}

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Supply Network Endpoints

// Get all supply network relationship types
app.get('/api/supply-network-relationship-types', ensureDbConnection, async (req, res) => {
  try {
    // Check if relationship types collection exists and has data
    let relationshipTypes = await db.collection('supply_network_relationship_types')
      .find({})
      .sort({ type_name: 1 })
      .toArray();

    // If no relationship types exist, create default ones
    if (relationshipTypes.length === 0) {
      const defaultRelationshipTypes = [
        {
          id: 'supply-001',
          type_code: 'SUPPLY',
          type_name: 'Suministro',
          description: 'Relación de suministro de materiales o productos',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'transport-001',
          type_code: 'TRANSPORT',
          type_name: 'Transporte',
          description: 'Relación de transporte entre nodos',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'distribution-001',
          type_code: 'DISTRIBUTION',
          type_name: 'Distribución',
          description: 'Relación de distribución de productos',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      await db.collection('supply_network_relationship_types').insertMany(defaultRelationshipTypes);
      relationshipTypes = defaultRelationshipTypes;
    }

    res.json(relationshipTypes);
  } catch (error) {
    console.error('Get supply network relationship types error:', error);
    res.status(500).json({ message: 'Failed to fetch supply network relationship types' });
  }
});

// Get all supply network node types
app.get('/api/supply-network-node-types', ensureDbConnection, async (req, res) => {
  try {
    // Check if node types collection exists and has data
    let nodeTypes = await db.collection('supply_network_node_types')
      .find({})
      .sort({ type_name: 1 })
      .toArray();

    // If no node types exist, create default ones
    if (nodeTypes.length === 0) {
      const defaultNodeTypes = [
        {
          id: 'ee213c66-adab-47f3-b065-91e1b52719dc',
          type_code: 'SUPPLIER',
          type_name: 'Proveedor',
          description: 'Nodo de proveedor en la red de suministro',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'a82cf8ff-5bd2-4a9e-8fbb-df86db10abff',
          type_code: 'WAREHOUSE',
          type_name: 'Almacén',
          description: 'Centro de distribución o almacén',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: '57c0f6f1-fed9-4a64-a123-9d855194ded9',
          type_code: 'CUSTOMER',
          type_name: 'Cliente',
          description: 'Nodo de cliente en la red de suministro',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      await db.collection('supply_network_node_types').insertMany(defaultNodeTypes);
      nodeTypes = defaultNodeTypes;
    }

    res.json(nodeTypes);
  } catch (error) {
    console.error('Get supply network node types error:', error);
    res.status(500).json({ message: 'Failed to fetch supply network node types' });
  }
});

// Get all supply network nodes
app.get('/api/supply-network-nodes', ensureDbConnection, async (req, res) => {
  try {
    const nodes = await db.collection('supply_network_nodes')
      .find({})
      .sort({ created_at: 1 })
      .toArray();

    res.json(nodes);
  } catch (error) {
    console.error('Get supply network nodes error:', error);
    res.status(500).json({ message: 'Failed to fetch supply network nodes' });
  }
});

// Create a new supply network node
app.post('/api/supply-network-nodes', ensureDbConnection, async (req, res) => {
  try {
    const nodeData = {
      id: new ObjectId().toString(),
      ...req.body,
      created_at: new Date(),
      updated_at: new Date()
    };

    await db.collection('supply_network_nodes').insertOne(nodeData);
    res.status(201).json(nodeData);
  } catch (error) {
    console.error('Create supply network node error:', error);
    res.status(500).json({ message: 'Failed to create supply network node' });
  }
});

// Update a supply network node
app.put('/api/supply-network-nodes/:id', ensureDbConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date() };

    await db.collection('supply_network_nodes').updateOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] },
      { $set: updates }
    );

    const updatedNode = await db.collection('supply_network_nodes').findOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] }
    );

    res.json(updatedNode);
  } catch (error) {
    console.error('Update supply network node error:', error);
    res.status(500).json({ message: 'Failed to update supply network node' });
  }
});

// Delete a supply network node
app.delete('/api/supply-network-nodes/:id', ensureDbConnection, async (req, res) => {
  try {
    const { id } = req.params;

    await db.collection('supply_network_nodes').deleteOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] }
    );

    res.json({ message: 'Supply network node deleted successfully' });
  } catch (error) {
    console.error('Delete supply network node error:', error);
    res.status(500).json({ message: 'Failed to delete supply network node' });
  }
});

// Get all supply network relationships
app.get('/api/supply-network-relationships', ensureDbConnection, async (req, res) => {
  try {
    const relationships = await db.collection('supply_network_relationships')
      .find({})
      .sort({ created_at: 1 })
      .toArray();

    res.json(relationships);
  } catch (error) {
    console.error('Get supply network relationships error:', error);
    res.status(500).json({ message: 'Failed to fetch supply network relationships' });
  }
});

// Create a new supply network relationship
app.post('/api/supply-network-relationships', ensureDbConnection, async (req, res) => {
  try {
    const relationshipData = {
      id: new ObjectId().toString(),
      ...req.body,
      created_at: new Date(),
      updated_at: new Date()
    };

    await db.collection('supply_network_relationships').insertOne(relationshipData);
    res.status(201).json(relationshipData);
  } catch (error) {
    console.error('Create supply network relationship error:', error);
    res.status(500).json({ message: 'Failed to create supply network relationship' });
  }
});

// Update a supply network relationship
app.put('/api/supply-network-relationships/:id', ensureDbConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date() };

    await db.collection('supply_network_relationships').updateOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] },
      { $set: updates }
    );

    const updatedRelationship = await db.collection('supply_network_relationships').findOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] }
    );

    res.json(updatedRelationship);
  } catch (error) {
    console.error('Update supply network relationship error:', error);
    res.status(500).json({ message: 'Failed to update supply network relationship' });
  }
});

// Delete a supply network relationship
app.delete('/api/supply-network-relationships/:id', ensureDbConnection, async (req, res) => {
  try {
    const { id } = req.params;

    await db.collection('supply_network_relationships').deleteOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] }
    );

    res.json({ message: 'Supply network relationship deleted successfully' });
  } catch (error) {
    console.error('Delete supply network relationship error:', error);
    res.status(500).json({ message: 'Failed to delete supply network relationship' });
  }
});

// Add a health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'MongoDB server is running', 
    timestamp: new Date().toISOString(),
    database: MONGODB_DB
  });
});

// Purchase Order Endpoints

// Get all purchase order suggestions
app.get('/api/purchase-order-suggestions', ensureDbConnection, async (req, res) => {
  try {
    let suggestions = [];
    
    // Try to get data from the view first
    try {
      suggestions = await db.collection('v_purchase_order_recommendations')
        .find({})
        .sort({ recommended_order_date: -1 })
        .toArray();
      
      console.log(`Found ${suggestions.length} records from v_purchase_order_recommendations view`);
    } catch (viewError) {
      console.log('View v_purchase_order_recommendations not available, trying fallback collection');
    }
    
    // If no data from view, fallback to the old collection for backward compatibility
    if (suggestions.length === 0) {
      suggestions = await db.collection('purchase_order_suggestions')
        .find({})
        .sort({ order_date: -1 })
        .toArray();
      
      console.log(`Found ${suggestions.length} records from purchase_order_suggestions fallback`);
      
      // Return fallback data in original format
      return res.json(suggestions);
    }

    // Transform the view data to match the expected format
    const transformedSuggestions = suggestions.map(suggestion => ({
      _id: suggestion._id,
      id: suggestion._id.toString(),
      product_id: suggestion.product_id,
      product_name: suggestion.product_name,
      vendor_id: suggestion.vendor_id,
      vendor_name: suggestion.vendor_name,
      node_id: suggestion.node_id,
      node_name: suggestion.node_name,
      location_code: suggestion.location_code,
      recommended_quantity: suggestion.recommended_quantity || suggestion.suggested_quantity,
      unit_cost: suggestion.unit_cost,
      total_cost: suggestion.total_cost,
      lead_time_days: suggestion.lead_time_days,
      node_lead_time: suggestion.node_lead_time,
      reasoning: suggestion.reasoning || suggestion.reason,
      status: suggestion.status,
      required_delivery_date: suggestion.required_delivery_date,
      recommended_order_date: suggestion.recommended_order_date,
      urgency: suggestion.urgency,
      order_multiple: suggestion.order_multiple,
      minimum_order_quantity: suggestion.minimum_order_quantity,
      maximum_order_quantity: suggestion.maximum_order_quantity,
      created_at: suggestion.recommended_order_date || suggestion.created_at,
      updated_at: suggestion.recommended_order_date || suggestion.updated_at
    }));

    res.json(transformedSuggestions);
  } catch (error) {
    console.error('Get purchase order suggestions error:', error);
    res.status(500).json({ message: 'Failed to fetch purchase order suggestions' });
  }
});

// Get purchase order calculations
app.get('/api/purchase-order-calculations/:suggestionId', ensureDbConnection, async (req, res) => {
  try {
    const { suggestionId } = req.params;
    const calculations = await db.collection('purchase_order_calculations')
      .find({ purchase_order_suggestion_id: suggestionId })
      .sort({ step_order: 1 })
      .toArray();

    res.json(calculations);
  } catch (error) {
    console.error('Get purchase order calculations error:', error);
    res.status(500).json({ message: 'Failed to fetch purchase order calculations' });
  }
});

// Create sample purchase order data (using actual view data)
app.post('/api/purchase-order-suggestions/sample', ensureDbConnection, async (req, res) => {
  try {
    // Check if the view has data
    const existingData = await db.collection('v_purchase_order_recommendations')
      .countDocuments({});

    if (existingData > 0) {
      return res.json({ 
        message: 'Sample data already exists in view', 
        count: existingData,
        note: 'Data is available from v_purchase_order_recommendations view'
      });
    }

    // If no data exists, return message about the view
    res.json({ 
      message: 'No sample data to create', 
      note: 'This endpoint uses the v_purchase_order_recommendations view which should be populated by your data pipeline',
      viewName: 'v_purchase_order_recommendations'
    });
  } catch (error) {
    console.error('Check sample purchase order data error:', error);
    res.status(500).json({ message: 'Failed to check sample data' });
  }
});

// Create a new purchase order suggestion
app.post('/api/purchase-order-suggestions', ensureDbConnection, async (req, res) => {
  try {
    const suggestionData = {
      id: new ObjectId().toString(),
      ...req.body,
      created_at: new Date(),
      updated_at: new Date()
    };

    await db.collection('purchase_order_suggestions').insertOne(suggestionData);
    res.status(201).json(suggestionData);
  } catch (error) {
    console.error('Create purchase order suggestion error:', error);
    res.status(500).json({ message: 'Failed to create purchase order suggestion' });
  }
});

// Update purchase order suggestion
app.put('/api/purchase-order-suggestions/:id', ensureDbConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date() };

    await db.collection('purchase_order_suggestions').updateOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] },
      { $set: updates }
    );

    const updatedSuggestion = await db.collection('purchase_order_suggestions').findOne(
      { $or: [{ id }, { _id: new ObjectId(id) }] }
    );

    res.json(updatedSuggestion);
  } catch (error) {
    console.error('Update purchase order suggestion error:', error);
    res.status(500).json({ message: 'Failed to update purchase order suggestion' });
  }
});

// Sell-Through Analytics Endpoints

// Sell-In Data Endpoints
app.get('/api/sell-in-data', ensureDbConnection, async (req, res) => {
  try {
    const { product_id, location_id, customer_id, start_date, end_date } = req.query;
    
    console.log('Fetching sell-in data with filters:', { product_id, location_id, customer_id, start_date, end_date });

    // Build query filter
    const filter = {};
    
    if (product_id && product_id !== 'all') {
      const productIdNum = parseInt(product_id);
      filter.product_id = !isNaN(productIdNum) ? productIdNum : product_id;
    }
    
    if (location_id && location_id !== 'all') {
      filter.location_id = location_id;
    }
    
    if (customer_id && customer_id !== 'all') {
      filter.channel_partner_id = customer_id;
    }
    
    if (start_date) {
      filter.transaction_date = { $gte: new Date(start_date) };
    }
    
    if (end_date) {
      if (filter.transaction_date) {
        filter.transaction_date.$lte = new Date(end_date);
      } else {
        filter.transaction_date = { $lte: new Date(end_date) };
      }
    }

    console.log('MongoDB query filter:', JSON.stringify(filter, null, 2));

    const sellInData = await db.collection('sell_through_metrics')
      .find(filter)
      .sort({ transaction_date: -1 })
      .toArray();

    console.log(`Found ${sellInData.length} sell-in records`);

    res.json(sellInData);
  } catch (error) {
    console.error('Get sell-in data error:', error);
    res.status(500).json({ message: 'Failed to fetch sell-in data' });
  }
});

app.post('/api/sell-in-data', ensureDbConnection, async (req, res) => {
  try {
    console.log('Creating sell-in record with data:', req.body);
    
    const sellInData = {
      id: new ObjectId().toString(),
      ...req.body,
      created_at: new Date(),
      updated_at: new Date()
    };

    await db.collection('sell_through_metrics').insertOne(sellInData);
    
    console.log('Sell-in record created successfully');
    res.status(201).json(sellInData);
  } catch (error) {
    console.error('Create sell-in record error:', error);
    res.status(500).json({ message: 'Failed to create sell-in record' });
  }
});

// Sell-Out Data Endpoints
app.get('/api/sell-out-data', ensureDbConnection, async (req, res) => {
  try {
    const { product_id, location_id, channel_partner_id, start_date, end_date } = req.query;
    
    console.log('Fetching sell-out data with filters:', { product_id, location_id, channel_partner_id, start_date, end_date });

    // Build query filter
    const filter = {};
    
    if (product_id && product_id !== 'all') {
      const productIdNum = parseInt(product_id);
      filter.product_id = !isNaN(productIdNum) ? productIdNum : product_id;
    }
    
    if (location_id && location_id !== 'all') {
      filter.location_id = location_id;
    }
    
    if (channel_partner_id && channel_partner_id !== 'all') {
      // Enhanced customer lookup: Handle both UUID and numeric customer IDs
      try {
        const customer = await db.collection('customers').findOne({
          $or: [
            { id: channel_partner_id },
            { _id: new ObjectId(channel_partner_id) },
            { customer_id: channel_partner_id },
            { customer_id: parseInt(channel_partner_id) || null }
          ]
        });

        if (customer) {
          // Use flexible matching for sell_through_metrics collection
          filter.$or = [
            { channel_partner_id: channel_partner_id },
            { channel_partner_id: customer.customer_id },
            { channel_partner_id: customer.id },
            { customer_id: customer.customer_id },
            { customer_id: customer.id },
            { customer_id: channel_partner_id }
          ];
          console.log(`Found customer: ${customer.customer_name} (ID: ${customer.customer_id}, UUID: ${customer.id})`);
        } else {
          // Fallback: try multiple field combinations
          filter.$or = [
            { channel_partner_id: channel_partner_id },
            { customer_id: channel_partner_id },
            { customer_id: parseInt(channel_partner_id) || null }
          ];
          console.log(`Customer not found, using fallback filters for: ${channel_partner_id}`);
        }
      } catch (error) {
        console.error('Error looking up customer in sell-out data:', error);
        filter.channel_partner_id = channel_partner_id;
      }
    }
    
    if (start_date) {
      filter.transaction_date = { $gte: new Date(start_date) };
    }
    
    if (end_date) {
      if (filter.transaction_date) {
        filter.transaction_date.$lte = new Date(end_date);
      } else {
        filter.transaction_date = { $lte: new Date(end_date) };
      }
    }

    console.log('MongoDB query filter:', JSON.stringify(filter, null, 2));

    const sellOutData = await db.collection('sell_through_metrics')
      .find(filter)
      .sort({ transaction_date: -1 })
      .toArray();

    console.log(`Found ${sellOutData.length} sell-out records`);

    res.json(sellOutData);
  } catch (error) {
    console.error('Get sell-out data error:', error);
    res.status(500).json({ message: 'Failed to fetch sell-out data' });
  }
});

app.post('/api/sell-out-data', ensureDbConnection, async (req, res) => {
  try {
    console.log('Creating sell-out record with data:', req.body);
    
    const sellOutData = {
      id: new ObjectId().toString(),
      ...req.body,
      created_at: new Date(),
      updated_at: new Date()
    };

    await db.collection('sell_through_metrics').insertOne(sellOutData);
    
    console.log('Sell-out record created successfully');
    res.status(201).json(sellOutData);
  } catch (error) {
    console.error('Create sell-out record error:', error);
    res.status(500).json({ message: 'Failed to create sell-out record' });
  }
});

// Get sell-through metrics
app.get('/api/sell-through-metrics', ensureDbConnection, async (req, res) => {
  try {
    const { product_id, channel_partner_id, period_start, period_end } = req.query;
    
    console.log('Fetching sell-through metrics with filters:', { product_id, channel_partner_id, period_start, period_end });

    // Build query filter
    const filter = {};
    
    if (product_id && product_id !== 'all') {
      const productIdNum = parseInt(product_id);
      filter.product_id = !isNaN(productIdNum) ? productIdNum : product_id;
    }
    
    if (channel_partner_id && channel_partner_id !== 'all') {
      // Enhanced customer lookup: Handle both UUID and numeric customer IDs
      // First, try to find the customer to get both UUID and numeric IDs
      try {
        const customer = await db.collection('customers').findOne({
          $or: [
            { id: channel_partner_id },
            { _id: new ObjectId(channel_partner_id) },
            { customer_id: channel_partner_id },
            { customer_id: parseInt(channel_partner_id) || null }
          ]
        });

        if (customer) {
          // Use flexible matching for sell_through_metrics collection
          filter.$or = [
            { channel_partner_id: channel_partner_id },
            { channel_partner_id: customer.customer_id },
            { channel_partner_id: customer.id },
            { customer_id: customer.customer_id },
            { customer_id: customer.id },
            { customer_id: channel_partner_id }
          ];
          console.log(`Found customer: ${customer.customer_name} (ID: ${customer.customer_id}, UUID: ${customer.id})`);
        } else {
          // Fallback: try multiple field combinations without customer lookup
          filter.$or = [
            { channel_partner_id: channel_partner_id },
            { customer_id: channel_partner_id },
            { customer_id: parseInt(channel_partner_id) || null }
          ];
          console.log(`Customer not found, using fallback filters for: ${channel_partner_id}`);
        }
      } catch (error) {
        console.error('Error looking up customer:', error);
        // Simple fallback
        filter.channel_partner_id = channel_partner_id;
      }
    }
    
    if (period_start) {
      filter.calculation_period = { $gte: new Date(period_start) };
    }
    
    if (period_end) {
      if (filter.calculation_period) {
        filter.calculation_period.$lte = new Date(period_end);
      } else {
        filter.calculation_period = { $lte: new Date(period_end) };
      }
    }

    console.log('MongoDB query filter:', JSON.stringify(filter, null, 2));

    // Get data from sell_through_metrics collection
    const metrics = await db.collection('sell_through_metrics')
      .find(filter)
      .sort({ calculation_period: -1 })
      .toArray();

    console.log(`Found ${metrics.length} sell-through metrics`);

    res.json(metrics);
  } catch (error) {
    console.error('Get sell-through metrics error:', error);
    res.status(500).json({ message: 'Failed to fetch sell-through metrics' });
  }
});

// Refresh sell-through rates
app.post('/api/sell-through-metrics/refresh', ensureDbConnection, async (req, res) => {
  try {
    console.log('Refreshing sell-through rates...');
    
    // This endpoint would trigger a recalculation process
    // For now, we just return existing data count
    const existingCount = await db.collection('sell_through_metrics').countDocuments({});
    
    console.log(`Found ${existingCount} existing sell-through metrics`);
    
    res.json({ 
      message: 'Sell-through data refreshed',
      existing_count: existingCount,
      note: 'This endpoint queries existing data only. No sample data is created.'
    });
  } catch (error) {
    console.error('Refresh sell-through rates error:', error);
    res.status(500).json({ message: 'Failed to refresh sell-through rates' });
  }
});


// KPI Dashboard endpoints
app.get('/api/kpi/low-accuracy-products', ensureDbConnection, async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 75;
    
    // Get forecast data for products with interpretability_score
    const forecastData = await db.collection('forecast_data')
      .find({ 
        product_id: { $exists: true, $ne: null },
        interpretability_score: { $exists: true }
      })
      .sort({ created_at: -1 })
      .limit(500)
      .toArray();

    // Get unique product IDs
    const productIds = [...new Set(forecastData.map(d => d.product_id).filter(Boolean))];
    
    // Get product details
    const products = await db.collection('products')
      .find({ product_id: { $in: productIds } })
      .toArray();

    // Create product lookup
    const productLookup = new Map();
    products.forEach(product => {
      productLookup.set(product.product_id, product);
    });

    // Aggregate by product
    const productMap = new Map();
    forecastData.forEach(item => {
      if (!item.product_id) return;
      
      if (!productMap.has(item.product_id)) {
        const productInfo = productLookup.get(item.product_id);
        productMap.set(item.product_id, {
          product_id: item.product_id,
          product_name: productInfo?.product_name || `Product ${item.product_id}`,
          category_name: productInfo?.category_name || 'Sin categoría',
          accuracy_scores: [],
          forecast_count: 0,
          last_forecast_date: item.created_at
        });
      }
      
      const product = productMap.get(item.product_id);
      if (item.interpretability_score !== null && item.interpretability_score !== undefined) {
        product.accuracy_scores.push(item.interpretability_score);
      }
      product.forecast_count++;
      
      if (new Date(item.created_at) > new Date(product.last_forecast_date)) {
        product.last_forecast_date = item.created_at;
      }
    });

    // Calculate averages and filter
    const results = Array.from(productMap.values())
      .map(product => {
        const avgAccuracy = product.accuracy_scores.length > 0 
          ? product.accuracy_scores.reduce((sum, score) => sum + score, 0) / product.accuracy_scores.length
          : 0;
        const errorPercentage = 100 - avgAccuracy;
        const trend = avgAccuracy < 60 ? 'declining' : avgAccuracy > 80 ? 'improving' : 'stable';
        
        return {
          product_id: product.product_id,
          product_name: product.product_name,
          category_name: product.category_name,
          accuracy_score: Math.round(avgAccuracy),
          forecast_count: product.forecast_count,
          last_forecast_date: product.last_forecast_date,
          avg_error_percentage: Math.round(errorPercentage),
          trend
        };
      })
      .filter(product => product.accuracy_score < threshold)
      .sort((a, b) => a.accuracy_score - b.accuracy_score);

    res.json(results);
  } catch (error) {
    console.error('KPI low accuracy products error:', error);
    res.status(500).json({ message: 'Failed to fetch low accuracy products' });
  }
});

app.get('/api/kpi/low-accuracy-customers', ensureDbConnection, async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 75;
    
    // Get forecast data for customers with interpretability_score
    const forecastData = await db.collection('forecast_data')
      .find({ 
        customer_id: { $exists: true, $ne: null },
        interpretability_score: { $exists: true }
      })
      .sort({ created_at: -1 })
      .limit(500)
      .toArray();

    // Get unique customer IDs (handle both string and UUID formats)
    const customerIds = [...new Set(forecastData.map(d => d.customer_id).filter(Boolean))];
    
    // Get customer details with UUID handling
    const customers = await db.collection('customers')
      .find({ 
        $or: [
          { customer_id: { $in: customerIds } },
          { _id: { $in: customerIds.map(id => {
            try { return new ObjectId(id); } catch { return null; }
          }).filter(Boolean) } }
        ]
      })
      .toArray();

    // Create customer lookup
    const customerLookup = new Map();
    customers.forEach(customer => {
      const customerId = customer.customer_id || customer._id.toString();
      customerLookup.set(customerId, customer);
    });

    // Aggregate by customer
    const customerMap = new Map();
    forecastData.forEach(item => {
      if (!item.customer_id) return;
      
      if (!customerMap.has(item.customer_id)) {
        const customerInfo = customerLookup.get(item.customer_id);
        customerMap.set(item.customer_id, {
          customer_id: item.customer_id,
          customer_name: customerInfo?.customer_name || `Customer ${item.customer_id}`,
          accuracy_scores: [],
          forecast_count: 0,
          last_forecast_date: item.created_at
        });
      }
      
      const customer = customerMap.get(item.customer_id);
      if (item.interpretability_score !== null && item.interpretability_score !== undefined) {
        customer.accuracy_scores.push(item.interpretability_score);
      }
      customer.forecast_count++;
      
      if (new Date(item.created_at) > new Date(customer.last_forecast_date)) {
        customer.last_forecast_date = item.created_at;
      }
    });

    // Calculate averages and filter
    const results = Array.from(customerMap.values())
      .map(customer => {
        const avgAccuracy = customer.accuracy_scores.length > 0 
          ? customer.accuracy_scores.reduce((sum, score) => sum + score, 0) / customer.accuracy_scores.length
          : 0;
        const errorPercentage = 100 - avgAccuracy;
        const trend = avgAccuracy < 60 ? 'declining' : avgAccuracy > 80 ? 'improving' : 'stable';
        
        return {
          customer_id: customer.customer_id,
          customer_name: customer.customer_name,
          accuracy_score: Math.round(avgAccuracy),
          forecast_count: customer.forecast_count,
          last_forecast_date: customer.last_forecast_date,
          avg_error_percentage: Math.round(errorPercentage),
          trend
        };
      })
      .filter(customer => customer.accuracy_score < threshold)
      .sort((a, b) => a.accuracy_score - b.accuracy_score);

    res.json(results);
  } catch (error) {
    console.error('KPI low accuracy customers error:', error);
    res.status(500).json({ message: 'Failed to fetch low accuracy customers' });
  }
});

app.get('/api/kpi/customer-product-combinations', ensureDbConnection, async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 75;
    
    // Get forecast data with both customer and product IDs
    const forecastData = await db.collection('forecast_data')
      .find({ 
        customer_id: { $exists: true, $ne: null },
        product_id: { $exists: true, $ne: null },
        interpretability_score: { $exists: true }
      })
      .sort({ created_at: -1 })
      .limit(1000)
      .toArray();

    // Get unique IDs
    const customerIds = [...new Set(forecastData.map(d => d.customer_id).filter(Boolean))];
    const productIds = [...new Set(forecastData.map(d => d.product_id).filter(Boolean))];
    
    // Get customer and product details in parallel
    const [customers, products] = await Promise.all([
      db.collection('customers')
        .find({ 
          $or: [
            { customer_id: { $in: customerIds } },
            { _id: { $in: customerIds.map(id => {
              try { return new ObjectId(id); } catch { return null; }
            }).filter(Boolean) } }
          ]
        })
        .toArray(),
      db.collection('products')
        .find({ product_id: { $in: productIds } })
        .toArray()
    ]);

    // Create lookup maps
    const customerLookup = new Map();
    customers.forEach(customer => {
      const customerId = customer.customer_id || customer._id.toString();
      customerLookup.set(customerId, customer);
    });

    const productLookup = new Map();
    products.forEach(product => {
      productLookup.set(product.product_id, product);
    });

    // Aggregate by customer-product combination
    const combinationMap = new Map();
    forecastData.forEach(item => {
      const key = `${item.customer_id}_${item.product_id}`;
      
      if (!combinationMap.has(key)) {
        const customerInfo = customerLookup.get(item.customer_id);
        const productInfo = productLookup.get(item.product_id);
        
        combinationMap.set(key, {
          customer_id: item.customer_id,
          customer_name: customerInfo?.customer_name || `Customer ${item.customer_id}`,
          product_id: item.product_id,
          product_name: productInfo?.product_name || `Product ${item.product_id}`,
          category_name: productInfo?.category_name || 'Sin categoría',
          accuracy_scores: [],
          forecast_count: 0,
          last_forecast_date: item.created_at
        });
      }
      
      const combination = combinationMap.get(key);
      if (item.interpretability_score !== null && item.interpretability_score !== undefined) {
        combination.accuracy_scores.push(item.interpretability_score);
      }
      combination.forecast_count++;
      
      if (new Date(item.created_at) > new Date(combination.last_forecast_date)) {
        combination.last_forecast_date = item.created_at;
      }
    });

    // Calculate averages and filter
    const results = Array.from(combinationMap.values())
      .map(combination => {
        const avgAccuracy = combination.accuracy_scores.length > 0 
          ? combination.accuracy_scores.reduce((sum, score) => sum + score, 0) / combination.accuracy_scores.length
          : 0;
        const errorPercentage = 100 - avgAccuracy;
        const trend = avgAccuracy < 60 ? 'declining' : avgAccuracy > 80 ? 'improving' : 'stable';
        
        return {
          customer_id: combination.customer_id,
          customer_name: combination.customer_name,
          product_id: combination.product_id,
          product_name: combination.product_name,
          category_name: combination.category_name,
          accuracy_score: Math.round(avgAccuracy),
          forecast_count: combination.forecast_count,
          last_forecast_date: combination.last_forecast_date,
          avg_error_percentage: Math.round(errorPercentage),
          trend,
          forecast_bias: 0 // Default value since we don't have this field yet
        };
      })
      .filter(combination => combination.accuracy_score < threshold)
      .sort((a, b) => a.accuracy_score - b.accuracy_score);

    res.json(results);
  } catch (error) {
    console.error('KPI customer-product combinations error:', error);
    res.status(500).json({ message: 'Failed to fetch customer-product combinations' });
  }
});

app.get('/api/kpi/summary', ensureDbConnection, async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 75;
    
    // Get all forecast data for summary calculation
    const allData = await db.collection('forecast_data')
      .find({ interpretability_score: { $exists: true } })
      .sort({ created_at: -1 })
      .limit(1000)
      .toArray();

    const uniqueProducts = new Set(allData.map(d => d.product_id).filter(Boolean));
    const uniqueCustomers = new Set(allData.map(d => d.customer_id).filter(Boolean));
    
    const lowAccuracyProducts = allData.filter(d => 
      d.interpretability_score < threshold && d.product_id
    );
    const lowAccuracyCustomers = allData.filter(d => 
      d.interpretability_score < threshold && d.customer_id
    );
    
    const overallAccuracy = allData.length > 0 
      ? allData.reduce((sum, d) => sum + d.interpretability_score, 0) / allData.length
      : 0;
    
    const summary = {
      total_products: uniqueProducts.size,
      low_accuracy_products: new Set(lowAccuracyProducts.map(d => d.product_id)).size,
      total_customers: uniqueCustomers.size,
      low_accuracy_customers: new Set(lowAccuracyCustomers.map(d => d.customer_id)).size,
      overall_accuracy: Math.round(overallAccuracy),
      accuracy_trend: overallAccuracy > 75 ? 'improving' : overallAccuracy < 60 ? 'declining' : 'stable'
    };

    res.json(summary);
  } catch (error) {
    console.error('KPI summary error:', error);
    res.status(500).json({ message: 'Failed to fetch KPI summary' });
  }
});

// ForecastDataTable endpoint - supports filtering by product, location, and customer with aggregation
app.get('/api/forecast-data-table', ensureDbConnection, async (req, res) => {
  try {
    const { product_id, location_id, customer_id } = req.query;
    
    console.log('ForecastDataTable endpoint called with:', { product_id, location_id, customer_id });

    if (!product_id) {
      return res.status(400).json({ message: 'product_id is required' });
    }

    // Build query for forecast_data
    const query = { product_id: parseInt(product_id) };
    
    // Add location filter if provided (UUID)
    if (location_id) {
      try {
        query.location_node_id = new UUID(location_id);
      } catch (error) {
        query.location_node_id = location_id;
      }
    }
    
    // Add customer filter if provided (UUID)
    if (customer_id) {
      try {
        query.customer_node_id = new UUID(customer_id);
      } catch (error) {
        query.customer_node_id = customer_id;
      }
    }

    console.log('Forecast data query:', JSON.stringify(query, null, 2));

    // Get forecast data
    const forecastData = await db.collection('forecast_data')
      .find(query)
      .sort({ postdate: 1 })
      .toArray();

    console.log(`Found ${forecastData.length} forecast records`);

    // Group and aggregate by postdate for ForecastDataTable
    const aggregatedData = new Map();
    
    forecastData.forEach(item => {
      const postdate = new Date(item.postdate);
      const monthKey = `${postdate.getFullYear()}-${String(postdate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!aggregatedData.has(monthKey)) {
        aggregatedData.set(monthKey, {
          postdate: monthKey,
          forecast: 0,
          actual: 0,
          sales_plan:   0,
          demand_planner: 0,
          forecast_ly: 0,
          upper_bound: 0,
          lower_bound: 0,
          commercial_input: 0,
          fitted_history: 0
        });
      }
      
      const existing = aggregatedData.get(monthKey);
      
      // Sum the numerical values (handle null values)
      existing.forecast = (existing.forecast || 0) + (item.forecast || 0);
      existing.actual = (existing.actual || 0) + (item.actual || 0);
      existing.sales_plan = (existing.sales_plan || 0) + (item.sales_plan || 0);
      existing.demand_planner = (existing.demand_planner || 0) + (item.demand_planner || 0);
      existing.forecast_ly = (existing.forecast_ly || 0) + (item.forecast_ly || 0);
      existing.upper_bound = (existing.upper_bound || 0) + (item.upper_bound || 0);
      existing.lower_bound = (existing.lower_bound || 0) + (item.lower_bound || 0);
      existing.commercial_input = (existing.commercial_input || 0) + (item.commercial_input || 0);
      existing.fitted_history = (existing.fitted_history || 0) + (item.fitted_history || 0);
    });
    
    // Convert to array and sort by postdate
    const result = Array.from(aggregatedData.values()).sort((a, b) => 
      new Date(a.postdate).getTime() - new Date(b.postdate).getTime()
    );

    console.log(`Returning ${result.length} aggregated records`);
    res.json(result);
  } catch (error) {
    console.error('Get forecast data table error:', error);
    res.status(500).json({ message: 'Failed to fetch forecast data table' });
  }
});

// Update demand_planner value endpoint
app.put('/api/forecast-data-table/demand-planner', ensureDbConnection, async (req, res) => {
  try {
    const { product_id, customer_id, location_id, postdate, demand_planner } = req.body;
    
    console.log('Updating demand_planner:', { product_id, customer_id, postdate, demand_planner });

    if (!product_id || !customer_id || !postdate) {
      return res.status(400).json({ message: 'product_id, customer_id, and postdate are required' });
    }

    // Build query to find the specific forecast record
    const query = { 
      product_id: parseInt(product_id),
      postdate: new Date(postdate)
    };
    
    // Add customer filter (UUID)
    try {
      query.customer_node_id = new UUID(customer_id);
    } catch (error) {
      query.customer_node_id = customer_id;
    }
    
    // Add location filter if provided (UUID)
    if (location_id) {
      try {
        query.location_node_id = new UUID(location_id);
      } catch (error) {
        query.location_node_id = location_id;
      }
    }

    console.log('Update query:', JSON.stringify(query, null, 2));

    // Update the demand_planner field
    const result = await db.collection('forecast_data').updateMany(
      query,
      { 
        $set: { 
          demand_planner: parseFloat(demand_planner) || 0,
          updated_at: new Date()
        }
      }
    );

    console.log('Update result:', result);

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'No forecast records found to update' });
    }

    res.json({ 
      success: true, 
      message: `Updated ${result.modifiedCount} records`,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Update demand planner error:', error);
    res.status(500).json({ message: 'Failed to update demand planner value' });
  }
});

// Get location details from v_warehouse_node
app.get('/api/locations/details/:locationId', ensureDbConnection, async (req, res) => {
  try {
    const { locationId } = req.params;
    
    console.log('Getting location details for:', locationId);

    let locationQuery;
    try {
      locationQuery = { location_id: new UUID(locationId) };
    } catch (error) {
      locationQuery = { location_id: locationId };
    }

    const location = await db.collection('v_warehouse_node').findOne(locationQuery);
    
    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    const formattedLocation = {
      location_id: location.location_id,
      description: location.description,
      location_code: location.location_code
    };

    res.json(formattedLocation);
  } catch (error) {
    console.error('Get location details error:', error);
    res.status(500).json({ message: 'Failed to fetch location details' });
  }
});

// Get customer details from v_customer_node
app.get('/api/customers/details/:customerId', ensureDbConnection, async (req, res) => {
  try {
    const { customerId } = req.params;
    
    console.log('Getting customer details for:', customerId);

    let customerQuery;
    try {
      customerQuery = { customer_id: new UUID(customerId) };
    } catch (error) {
      customerQuery = { customer_id: customerId };
    }

    const customer = await db.collection('v_customer_node').findOne(customerQuery);
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const formattedCustomer = {
      customer_id: customer.customer_id,
      description: customer.description,
      customer_code: customer.customer_code,
      status: customer.status
    };

    res.json(formattedCustomer);
  } catch (error) {
    console.error('Get customer details error:', error);
    res.status(500).json({ message: 'Failed to fetch customer details' });
  }
});

// History data endpoint
app.get('/api/history', ensureDbConnection, async (req, res) => {
  try {
    const { limit = 100, offset = 0, searchTerm } = req.query;
    
    let matchStage = {};
    if (searchTerm) {
      matchStage = {
        $or: [
          { product_id: { $regex: searchTerm, $options: 'i' } },
          { location_id: { $regex: searchTerm, $options: 'i' } },
          { customer_id: { $regex: searchTerm, $options: 'i' } }
        ]
      };
    }

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'customers',
          localField: 'customer_id',
          foreignField: 'customer_id',
          as: 'customers'
        }
      },
      {
        $addFields: {
          customers: { $arrayElemAt: ['$customers', 0] }
        }
      },
      { $sort: { postdate: -1 } },
      { $limit: parseInt(limit) },
      { $skip: parseInt(offset) }
    ];

    const history = await db.collection('history').aggregate(pipeline).toArray();
    
    console.log(`Found ${history.length} history records`);
    res.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history data' });
  }
});

// Scenarios endpoints
app.get('/api/scenarios', ensureDbConnection, async (req, res) => {
  try {
    const scenarios = await db.collection('what_if_scenarios')
      .find({})
      .sort({ created_at: -1 })
      .toArray();
    
    const formattedScenarios = scenarios.map(scenario => ({
      id: scenario.id || scenario._id.toString(),
      scenario_name: scenario.scenario_name,
      scenario_type: scenario.scenario_type,
      created_by: scenario.created_by,
      created_at: scenario.created_at,
      updated_at: scenario.updated_at,
      parameters: scenario.parameters,
      product_id: scenario.product_id,
      customer_id: scenario.customer_id,
      location_id: scenario.location_id,
      description: scenario.description,
      status: scenario.status,
      results: scenario.results
    }));
    
    res.json(formattedScenarios);
  } catch (error) {
    console.error('Get scenarios error:', error);
    res.status(500).json({ message: 'Failed to fetch scenarios' });
  }
});

app.get('/api/scenarios/:id', ensureDbConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const scenario = await db.collection('what_if_scenarios').findOne(
      { $or: [{ id: id }, { _id: new ObjectId(id) }] }
    );
    
    if (!scenario) {
      return res.status(404).json({ message: 'Scenario not found' });
    }
    
    const formattedScenario = {
      id: scenario.id || scenario._id.toString(),
      scenario_name: scenario.scenario_name,
      scenario_type: scenario.scenario_type,
      created_by: scenario.created_by,
      created_at: scenario.created_at,
      updated_at: scenario.updated_at,
      parameters: scenario.parameters,
      product_id: scenario.product_id,
      customer_id: scenario.customer_id,
      location_id: scenario.location_id,
      description: scenario.description,
      status: scenario.status,
      results: scenario.results
    };
    
    res.json(formattedScenario);
  } catch (error) {
    console.error('Get scenario error:', error);
    res.status(500).json({ message: 'Failed to fetch scenario' });
  }
});

app.post('/api/scenarios', ensureDbConnection, async (req, res) => {
  try {
    const scenarioData = {
      ...req.body,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await db.collection('what_if_scenarios').insertOne(scenarioData);
    res.status(201).json(scenarioData);
  } catch (error) {
    console.error('Create scenario error:', error);
    res.status(500).json({ message: 'Failed to create scenario' });
  }
});

app.put('/api/scenarios/:id', ensureDbConnection, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString()
    };
    
    await db.collection('what_if_scenarios').updateOne(
      { $or: [{ id: id }, { _id: new ObjectId(id) }] },
      { $set: updateData }
    );
    
    const updatedScenario = await db.collection('what_if_scenarios').findOne(
      { $or: [{ id: id }, { _id: new ObjectId(id) }] }
    );
    
    res.json(updatedScenario);
  } catch (error) {
    console.error('Update scenario error:', error);
    res.status(500).json({ message: 'Failed to update scenario' });
  }
});

app.delete('/api/scenarios/:id', ensureDbConnection, async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('what_if_scenarios').deleteOne(
      { $or: [{ id: id }, { _id: new ObjectId(id) }] }
    );
    res.json({ message: 'Scenario deleted successfully' });
  } catch (error) {
    console.error('Delete scenario error:', error);
    res.status(500).json({ message: 'Failed to delete scenario' });
  }
});



// Initialize database connection and start server
async function startServer() {
  await connectToDatabase();
  await initializeCollections();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`MongoDB connected to: mongodb://admin:***@localhost:27017/sandbox_db`);
  });
}

startServer().catch(console.error);


