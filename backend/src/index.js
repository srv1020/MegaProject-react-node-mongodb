const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// ======================
// Configuration
// ======================
const config = {
  // Server
  port: process.env.PORT || 5001,

  // MongoDB
  mongo: {
    host: process.env.MONGO_HOST || 'mongo-service',
    port: process.env.MONGO_PORT || 27017,
    dbName: process.env.MONGO_DB_NAME || 'userdb',
    authSource: process.env.MONGO_AUTH_SOURCE || 'admin',
    user: process.env.MONGO_USER,
    password: process.env.MONGO_PASSWORD
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
  },

  // CORS
  cors: {
    origins: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : [
          'http://localhost:3000',
          'http://thedeva.space'
        ]
  }
};

// ======================
// Validation
// ======================
const requiredEnvVars = [
  'MONGO_USER',
  'MONGO_PASSWORD',
  'JWT_SECRET'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(
      `❌ Missing required environment variable: ${varName}`
    );
    process.exit(1);
  }
});

// ======================
// MongoDB Connection
// ======================
const mongoURI = `mongodb://${encodeURIComponent(
  config.mongo.user
)}:${encodeURIComponent(
  config.mongo.password
)}@${config.mongo.host}:${
  config.mongo.port
}/${config.mongo.dbName}?authSource=${
  config.mongo.authSource
}&retryWrites=true&w=majority`;

if (config.mongo.host.includes('://')) {
  console.error(
    '❌ Invalid MongoDB host format. Use only service name'
  );
  process.exit(1);
}

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000
});

mongoose.connection.on('connected', () => {
  console.log(
    `✅ MongoDB connected: ${mongoose.connection.host}`
  );
});

mongoose.connection.on('error', err => {
  console.error('❌ MongoDB connection error:', err);
});

// ======================
// Middleware
// ======================
app.use(express.json());

app.use(
  cors({
    origin: config.cors.origins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Request Logger
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.path}`
  );
  next();
});

// ======================
// User Model
// ======================
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-zA-Z0-9_]+$/
  },

  password: {
    type: String,
    required: true,
    minlength: 6
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', UserSchema);

// ======================
// Routes
// ======================

// Root Route
app.get('/', (req, res) => {
  res.json({
    message: 'Backend API running',
    status: 'ok'
  });
});

// ======================
// Health Check
// IMPORTANT FIX
// ======================
app.get('/api/healthz', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();

    res.json({
      status: 'ok',
      dbStatus: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(error);

    res.status(503).json({
      status: 'error',
      error: 'Database connection failed'
    });
  }
});

// ======================
// Register
// ======================
app.post('/api/register', async (req, res) => {
  try {
    console.log('Registration request:', req.body);

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password required'
      });
    }

    const existingUser = await User.findOne({
      username
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'Username already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const user = new User({
      username,
      password: hashedPassword
    });

    await user.save();

    console.log(`✅ User created: ${username}`);

    res.status(201).json({
      message: 'User registered successfully'
    });
  } catch (error) {
    console.error('❌ Registration error:', error);

    res.status(500).json({
      error: 'Registration failed'
    });
  }
});

// ======================
// Login
// ======================
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (
      !user ||
      !(await bcrypt.compare(password, user.password))
    ) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      { id: user._id },
      config.jwt.secret,
      {
        expiresIn: config.jwt.expiresIn
      }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);

    res.status(500).json({
      error: 'Login failed'
    });
  }
});

// ======================
// Protected Users Route
// ======================
app.get('/api/users', async (req, res) => {
  try {
    const authHeader =
      req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'No authorization header'
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Token missing'
      });
    }

    jwt.verify(token, config.jwt.secret);

    const users = await User.find(
      {},
      'username createdAt'
    );

    res.json(users);
  } catch (error) {
    console.error('❌ Auth error:', error);

    res.status(401).json({
      error: 'Unauthorized'
    });
  }
});

// ======================
// Graceful Shutdown
// ======================
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
  console.log('🛑 Shutdown initiated');

  server.close(async () => {
    console.log('🔒 HTTP server closed');

    await mongoose.connection.close();

    console.log('🔒 MongoDB connection closed');

    process.exit(0);
  });
}

// ======================
// Start Server
// ======================
const server = app.listen(
  config.port,
  '0.0.0.0',
  () => {
    console.log(`
🚀 Backend running successfully
🌍 Port: ${config.port}
📦 Environment: ${
      process.env.NODE_ENV || 'development'
    }
🗄 MongoDB: ${config.mongo.host}:${config.mongo.port}
🔐 CORS Allowed: ${config.cors.origins.join(', ')}
`);
  }
);