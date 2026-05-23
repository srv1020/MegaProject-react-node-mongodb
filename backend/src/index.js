const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const client = require('prom-client');

const app = express();

// ======================
// Prometheus Metrics
// ======================
const register = new client.Registry();

client.collectDefaultMetrics({
  register,
  prefix: 'nodejs_'
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status']
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5]
});

const httpActiveRequests = new client.Gauge({
  name: 'http_active_requests',
  help: 'Current active HTTP requests'
});

const mongodbUp = new client.Gauge({
  name: 'mongodb_up',
  help: 'MongoDB status. 1 = up, 0 = down'
});

const userRegistrationsTotal = new client.Counter({
  name: 'user_registrations_total',
  help: 'Total user registration attempts',
  labelNames: ['status']
});

const loginAttemptsTotal = new client.Counter({
  name: 'login_attempts_total',
  help: 'Total login attempts',
  labelNames: ['status']
});

register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDuration);
register.registerMetric(httpActiveRequests);
register.registerMetric(mongodbUp);
register.registerMetric(userRegistrationsTotal);
register.registerMetric(loginAttemptsTotal);

// ======================
// Configuration
// ======================
const config = {
  port: process.env.PORT || 5001,

  mongo: {
    host: process.env.MONGO_HOST || 'mongo-service',
    port: process.env.MONGO_PORT || 27017,
    dbName: process.env.MONGO_DB_NAME || 'userdb',
    authSource: process.env.MONGO_AUTH_SOURCE || 'admin',
    user: process.env.MONGO_USER,
    password: process.env.MONGO_PASSWORD
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
  },

  cors: {
    origins: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:3000', 'http://thedeva.space']
  }
};

// ======================
// Validation
// ======================
['MONGO_USER', 'MONGO_PASSWORD', 'JWT_SECRET'].forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
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
)}@${config.mongo.host}:${config.mongo.port}/${config.mongo.dbName}?authSource=${config.mongo.authSource}&retryWrites=true&w=majority`;

if (config.mongo.host.includes('://')) {
  console.error('❌ Invalid MongoDB host format. Use only service name');
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
  mongodbUp.set(1);
  console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);
});

mongoose.connection.on('disconnected', () => {
  mongodbUp.set(0);
  console.error('❌ MongoDB disconnected');
});

mongoose.connection.on('error', err => {
  mongodbUp.set(0);
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

// Metrics middleware
app.use((req, res, next) => {
  if (req.path === '/metrics') {
    return next();
  }

  httpActiveRequests.inc();

  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    const route = req.route?.path || req.path || 'unknown';

    httpRequestsTotal.inc({
      method: req.method,
      route,
      status: String(res.statusCode)
    });

    end({
      method: req.method,
      route,
      status: String(res.statusCode)
    });

    httpActiveRequests.dec();
  });

  next();
});

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
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
app.get('/', (req, res) => {
  res.json({
    message: 'Backend API running',
    status: 'ok'
  });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/api/healthz', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();

    mongodbUp.set(1);

    res.json({
      status: 'ok',
      dbStatus: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    mongodbUp.set(0);
    console.error(error);

    res.status(503).json({
      status: 'error',
      error: 'Database connection failed'
    });
  }
});

app.post('/api/register', async (req, res) => {
  try {
    console.log('Registration request:', req.body);

    const { username, password } = req.body;

    if (!username || !password) {
      userRegistrationsTotal.inc({ status: 'bad_request' });

      return res.status(400).json({
        error: 'Username and password required'
      });
    }

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      userRegistrationsTotal.inc({ status: 'duplicate' });

      return res.status(409).json({
        error: 'Username already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      password: hashedPassword
    });

    await user.save();

    userRegistrationsTotal.inc({ status: 'success' });

    console.log(`✅ User created: ${username}`);

    res.status(201).json({
      message: 'User registered successfully'
    });
  } catch (error) {
    userRegistrationsTotal.inc({ status: 'error' });

    console.error('❌ Registration error:', error);

    res.status(500).json({
      error: 'Registration failed'
    });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      loginAttemptsTotal.inc({ status: 'failed' });

      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    const token = jwt.sign({ id: user._id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });

    loginAttemptsTotal.inc({ status: 'success' });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    loginAttemptsTotal.inc({ status: 'error' });

    console.error('❌ Login error:', error);

    res.status(500).json({
      error: 'Login failed'
    });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

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

    const users = await User.find({}, 'username createdAt');

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
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`
🚀 Backend running successfully
🌍 Port: ${config.port}
📦 Environment: ${process.env.NODE_ENV || 'development'}
🗄 MongoDB: ${config.mongo.host}:${config.mongo.port}
🔐 CORS Allowed: ${config.cors.origins.join(', ')}
📊 Metrics: /metrics
`);
});