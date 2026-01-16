const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide a valid token.',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Attach user info to request
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        name: decoded.name,
        surname: decoded.surname,
      };

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token.',
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
};

// Middleware to check if user has required role
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Insufficient permissions.',
      });
    }

    next();
  };
};

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      surname: user.surname,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

module.exports = {
  authenticate,
  authorize,
  generateToken,
  JWT_SECRET,
};
