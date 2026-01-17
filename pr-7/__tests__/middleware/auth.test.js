const jwt = require('jsonwebtoken');
const { authenticate, authorize, generateToken, JWT_SECRET } = require('../../middleware/auth');

describe('Auth Middleware', () => {
  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const user = {
        id: '123',
        email: 'test@example.com',
        role: 'student',
        name: 'Test',
        surname: 'User',
      };

      const token = generateToken(user);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verify token can be decoded
      const decoded = jwt.verify(token, JWT_SECRET);
      expect(decoded.id).toBe(user.id);
      expect(decoded.email).toBe(user.email);
      expect(decoded.role).toBe(user.role);
    });

    it('should include all user fields in token', () => {
      const user = {
        id: '456',
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin',
        surname: 'User',
      };

      const token = generateToken(user);
      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded).toHaveProperty('id', user.id);
      expect(decoded).toHaveProperty('email', user.email);
      expect(decoded).toHaveProperty('role', user.role);
      expect(decoded).toHaveProperty('name', user.name);
      expect(decoded).toHaveProperty('surname', user.surname);
    });
  });

  describe('authenticate', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        headers: {},
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      next = jest.fn();
    });

    it('should return 401 if authorization header is missing', async () => {
      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required. Please provide a valid token.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header does not start with Bearer', async () => {
      req.headers.authorization = 'Invalid token';

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required. Please provide a valid token.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', async () => {
      req.headers.authorization = 'Bearer invalid-token';

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should attach user to request and call next if token is valid', async () => {
      const user = {
        id: '123',
        email: 'test@example.com',
        role: 'student',
        name: 'Test',
        surname: 'User',
      };
      const token = generateToken(user);
      req.headers.authorization = `Bearer ${token}`;

      await authenticate(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(user.id);
      expect(req.user.email).toBe(user.email);
      expect(req.user.role).toBe(user.role);
      expect(req.user.name).toBe(user.name);
      expect(req.user.surname).toBe(user.surname);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('authorize', () => {
    let req, res, next;

    beforeEach(() => {
      req = {};
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      next = jest.fn();
    });

    it('should return 401 if user is not authenticated', () => {
      const middleware = authorize('admin');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if user role is not allowed', () => {
      req.user = {
        id: '123',
        role: 'student',
      };
      const middleware = authorize('admin', 'teacher');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied. Insufficient permissions.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next if user role is allowed', () => {
      req.user = {
        id: '123',
        role: 'admin',
      };
      const middleware = authorize('admin', 'teacher');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow multiple roles', () => {
      req.user = {
        id: '123',
        role: 'teacher',
      };
      const middleware = authorize('admin', 'teacher');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
