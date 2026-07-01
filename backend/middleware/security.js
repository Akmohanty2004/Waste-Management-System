const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');

// ============================================
// HELMET - Security Headers Configuration
// ============================================
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://maps.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://maps.googleapis.com", "http://localhost:5000", "ws://localhost:5000"],
      frameSrc: ["'self'", "https://www.google.com"],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: "deny" },
  noSniff: true,
  xssFilter: true,
});

// ============================================
// RATE LIMITING - Prevent Brute Force Attacks
// ============================================

// Global rate limiter for all API routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count successful requests too
});

// Strict rate limiter for authentication routes (login/register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  skipSuccessfulRequests: true, // Don't count successful logins
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Password reset rate limiter
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 requests per hour
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again after 1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// API endpoint specific rate limiters
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each user to 20 reports per hour
  message: {
    success: false,
    message: 'Too many reports created, please slow down'
  },
  keyGenerator: (req) => {
    return req.user ? req.user.id : req.ip;
  },
});

const jobAcceptLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each cleaner to 10 job acceptances per hour
  message: {
    success: false,
    message: 'Too many job acceptances, please slow down'
  },
  keyGenerator: (req) => {
    return req.user ? req.user.id : req.ip;
  },
});

// ============================================
// DATA SANITIZATION
// ============================================

// Prevent MongoDB Operator Injection
// Replaces any keys that start with $ with a different character
const sanitizeData = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Attempted to inject MongoDB operator: ${key}`);
  },
});

// Prevent XSS (Cross-Site Scripting) Attacks
const sanitizeXSS = xss();

// Prevent HTTP Parameter Pollution
const preventHPP = hpp();

// ============================================
// COMPRESSION
// ============================================
const compress = compression({
  level: 6, // Compression level (0-9)
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
});

// ============================================
// CORS CONFIGURATION
// ============================================
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',') 
      : ['http://localhost:3000', 'http://127.0.0.1:3000'];
    
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`Blocked CORS request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies to be sent
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // Cache preflight requests for 24 hours
};

// ============================================
// REQUEST LOGGER
// ============================================
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.url} - IP: ${req.ip}`);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const statusColor = statusCode >= 400 ? '❌' : '✅';
    console.log(`${statusColor} ${new Date().toISOString()} - ${req.method} ${req.url} - ${statusCode} - ${duration}ms`);
  });
  
  next();
};

// ============================================
// ERROR HANDLER
// ============================================
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  
  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: errors,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }
  
  // MongoDB Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `Duplicate value for ${field}. This ${field} is already taken.`,
      field: field,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }
  
  // JWT Authentication Error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token',
      reason: 'Token validation failed'
    });
  }
  
  // JWT Token Expired Error
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication token expired',
      reason: 'Please login again'
    });
  }
  
  // Mongoose Cast Error (Invalid ID format)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value}`,
      reason: 'Invalid data format'
    });
  }
  
  // Rate Limit Error
  if (err.name === 'RateLimitError') {
    return res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later',
      retryAfter: Math.ceil(err.resetTime / 1000)
    });
  }
  
  // CORS Error
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation',
      reason: 'Origin not allowed'
    });
  }
  
  // Default Server Error
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(status).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err.details
    })
  });
};

// ============================================
// REQUEST SIZE LIMITER
// ============================================
const requestSizeLimiter = (req, res, next) => {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB default
  
  if (contentLength > maxSize) {
    return res.status(413).json({
      success: false,
      message: `Request entity too large. Maximum size is ${maxSize / (1024 * 1024)}MB`,
      maxSize: maxSize
    });
  }
  
  next();
};

// ============================================
// SECURITY HEADERS ADDITIONAL
// ============================================
const additionalSecurityHeaders = (req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // HSTS (HTTP Strict Transport Security)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

// ============================================
// EXPORT ALL MIDDLEWARES
// ============================================
module.exports = {
  // Main security middlewares
  securityHeaders,
  limiter,
  authLimiter,
  passwordResetLimiter,
  reportLimiter,
  jobAcceptLimiter,
  sanitizeData,
  sanitizeXSS,
  preventHPP,
  compress,
  corsOptions,
  requestLogger,
  errorHandler,
  requestSizeLimiter,
  additionalSecurityHeaders,
};