const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Pre-compute hashed password outside of mock factory
const mockHashedPassword = bcrypt.hashSync('password123', 10);

// Mock the database and models
jest.mock('../../config/database', () => ({
  sequelize: {
    authenticate: jest.fn(),
    close: jest.fn(),
  },
  testConnection: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('../../models', () => {
  // We'll set the password hash after the mock is created
  // using the pre-computed mockHashedPassword from outside
  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'John',
    surname: 'Doe',
    email: 'john.doe@example.com',
    password: '', // Will be set below using require
    role_id: '550e8400-e29b-41d4-a716-446655440001',
  };

  const mockRole = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    role_name: 'student',
  };

  const mockStudentObject = {
    id: 1,
    user_id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'John',
    age: 20,
    group: 1,
    user: {
      id: mockUser.id,
      name: mockUser.name,
      surname: mockUser.surname,
      email: mockUser.email,
    },
  };

  const mockStudent = {
    ...mockStudentObject,
    save: jest.fn().mockResolvedValue(mockStudentObject),
    reload: jest.fn().mockResolvedValue(mockStudentObject),
    destroy: jest.fn().mockResolvedValue(true),
    toJSON: jest.fn().mockReturnValue(mockStudentObject),
  };

  return {
    User: {
      findOne: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
    },
    Role: {
      findOne: jest.fn(),
      findByPk: jest.fn(),
    },
    Student: {
      findAll: jest.fn(),
      findByPk: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
    },
    mockUser,
    mockRole,
    mockStudent,
    mockStudentObject,
  };
});

const { mockUser, mockRole, mockStudent, mockStudentObject, User, Role, Student } = require('../../models');
const { generateToken } = require('../../middleware/auth');

// Set the password hash after mocking (needed for bcrypt.compare to work)
mockUser.password = mockHashedPassword;

// Set NODE_ENV to test to avoid file logging
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

// Mock logger before importing app
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  stream: {
    write: jest.fn(),
  },
}));

// Mock swagger and status monitor
jest.mock('swagger-ui-express', () => ({
  serve: [jest.fn((req, res, next) => next())],
  setup: jest.fn(() => jest.fn((req, res, next) => next())),
}));

jest.mock('express-status-monitor', () => jest.fn(() => (req, res, next) => next()));

// Import app after mocks are set up
const app = require('../../index');

describe('Server Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      User.findOne.mockResolvedValue(null);
      Role.findOne.mockResolvedValue(mockRole);
      User.create.mockResolvedValue(mockUser);
      Role.findByPk.mockResolvedValue(mockRole);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John',
          surname: 'Doe',
          email: 'john.doe@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('john.doe@example.com');
    });

    it('should reject registration with existing email', async () => {
      User.findOne.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John',
          surname: 'Doe',
          email: 'john.doe@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User with this email already exists');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John',
          surname: 'Doe',
          email: 'invalid-email',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John',
          surname: 'Doe',
          email: 'john.doe@example.com',
          password: '12345',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      User.findOne.mockResolvedValue({
        ...mockUser,
        role: mockRole,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john.doe@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.token).toBeDefined();
    });

    it('should reject login with invalid email', async () => {
      User.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('should reject login with invalid password', async () => {
      User.findOne.mockResolvedValue({
        ...mockUser,
        role: mockRole,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john.doe@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid email or password');
    });
  });

  describe('GET /api/students', () => {
    it('should get all students with valid token', async () => {
      const token = generateToken({
        id: mockUser.id,
        email: mockUser.email,
        role: 'student',
        name: mockUser.name,
        surname: mockUser.surname,
      });

      Student.findAll.mockResolvedValue([mockStudent]);

      const response = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.students).toBeDefined();
      expect(Array.isArray(response.body.students)).toBe(true);
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/students');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/students')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/students/:id', () => {
    it('should get student by id with valid token', async () => {
      const token = generateToken({
        id: mockUser.id,
        email: mockUser.email,
        role: 'student',
        name: mockUser.name,
        surname: mockUser.surname,
      });

      Student.findByPk.mockResolvedValue(mockStudent);

      const response = await request(app)
        .get('/api/students/1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.student).toBeDefined();
    });

    it('should return 404 for non-existent student', async () => {
      const token = generateToken({
        id: mockUser.id,
        email: mockUser.email,
        role: 'student',
        name: mockUser.name,
        surname: mockUser.surname,
      });

      Student.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/students/999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/students', () => {
    it('should create student with admin token', async () => {
      const token = generateToken({
        id: mockUser.id,
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin',
        surname: 'User',
      });

      User.findByPk.mockResolvedValue(mockUser);
      Student.findOne.mockResolvedValue(null);
      Student.create.mockResolvedValue(mockStudent);

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'John',
          age: 20,
          group: 1,
          user_id: mockUser.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Student added successfully');
    });

    it('should reject creation with student token', async () => {
      const token = generateToken({
        id: mockUser.id,
        email: mockUser.email,
        role: 'student',
        name: mockUser.name,
        surname: mockUser.surname,
      });

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'John',
          age: 20,
          group: 1,
          user_id: mockUser.id,
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/students/:id', () => {
    it('should update student with admin token', async () => {
      const token = generateToken({
        id: mockUser.id,
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin',
        surname: 'User',
      });

      const updatedStudent = {
        ...mockStudentObject,
        name: 'Jane',
        age: 21,
        group: 2,
      };

      Student.findByPk.mockResolvedValue({
        ...mockStudent,
        name: 'Jane',
        age: 21,
        group: 2,
        save: jest.fn().mockResolvedValue(updatedStudent),
      });

      const response = await request(app)
        .put('/api/students/1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Jane',
          age: 21,
          group: 2,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Student updated successfully');
      expect(response.body.student).toBeDefined();
    });

    it('should reject update with student token', async () => {
      const token = generateToken({
        id: mockUser.id,
        email: mockUser.email,
        role: 'student',
        name: mockUser.name,
        surname: mockUser.surname,
      });

      const response = await request(app)
        .put('/api/students/1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Jane',
          age: 21,
          group: 2,
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent student on update', async () => {
      const token = generateToken({
        id: mockUser.id,
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin',
        surname: 'User',
      });

      Student.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/students/999')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Jane',
          age: 21,
          group: 2,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should reject update with invalid data', async () => {
      const token = generateToken({
        id: mockUser.id,
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin',
        surname: 'User',
      });

      const response = await request(app)
        .put('/api/students/1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '',
          age: -1,
          group: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/students/:id', () => {
    it('should delete student with admin token', async () => {
      const token = generateToken({
        id: mockUser.id,
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin',
        surname: 'User',
      });

      Student.findByPk.mockResolvedValue(mockStudent);

      const response = await request(app)
        .delete('/api/students/1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Student deleted successfully');
    });

    it('should reject deletion with teacher token', async () => {
      const token = generateToken({
        id: mockUser.id,
        email: 'teacher@example.com',
        role: 'teacher',
        name: 'Teacher',
        surname: 'User',
      });

      const response = await request(app)
        .delete('/api/students/1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent student on delete', async () => {
      const token = generateToken({
        id: mockUser.id,
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin',
        surname: 'User',
      });

      Student.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/students/999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/students/group/:id', () => {
    it('should get students by group number with valid token', async () => {
      const token = generateToken({
        id: mockUser.id,
        email: mockUser.email,
        role: 'student',
        name: mockUser.name,
        surname: mockUser.surname,
      });

      const groupStudents = [
        { ...mockStudentObject, group: 1, toJSON: jest.fn().mockReturnValue({ ...mockStudentObject, group: 1 }) },
        { ...mockStudentObject, id: 2, name: 'Jane', group: 1, toJSON: jest.fn().mockReturnValue({ ...mockStudentObject, id: 2, name: 'Jane', group: 1 }) },
      ];

      Student.findAll.mockResolvedValue(groupStudents);

      const response = await request(app)
        .get('/api/students/group/1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.group).toBe(1);
      expect(response.body.count).toBe(2);
      expect(Array.isArray(response.body.students)).toBe(true);
    });

    it('should return empty array for group with no students', async () => {
      const token = generateToken({
        id: mockUser.id,
        email: mockUser.email,
        role: 'student',
        name: mockUser.name,
        surname: mockUser.surname,
      });

      Student.findAll.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/students/group/999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(0);
      expect(Array.isArray(response.body.students)).toBe(true);
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/students/group/1');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid group ID format', async () => {
      const token = generateToken({
        id: mockUser.id,
        email: mockUser.email,
        role: 'student',
        name: mockUser.name,
        surname: mockUser.surname,
      });

      const response = await request(app)
        .get('/api/students/group/invalid')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/students - edge cases', () => {
    it('should reject creation when user does not exist', async () => {
      const token = generateToken({
        id: mockUser.id,
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin',
        surname: 'User',
      });

      const nonExistentUserId = '550e8400-e29b-41d4-a716-446655440999';
      User.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'John',
          age: 20,
          group: 1,
          user_id: nonExistentUserId,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });

    it('should reject creation when student already exists for user', async () => {
      const token = generateToken({
        id: mockUser.id,
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin',
        surname: 'User',
      });

      User.findByPk.mockResolvedValue(mockUser);
      Student.findOne.mockResolvedValue(mockStudent);

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'John',
          age: 20,
          group: 1,
          user_id: mockUser.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Student record already exists for this user');
    });

    it('should allow teacher to create student', async () => {
      const token = generateToken({
        id: mockUser.id,
        email: 'teacher@example.com',
        role: 'teacher',
        name: 'Teacher',
        surname: 'User',
      });

      User.findByPk.mockResolvedValue(mockUser);
      Student.findOne.mockResolvedValue(null);
      Student.create.mockResolvedValue(mockStudent);

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'John',
          age: 20,
          group: 1,
          user_id: mockUser.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /status - Status Monitor', () => {
    it('should allow admin to access status monitor', async () => {
      const token = generateToken({
        id: mockUser.id,
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin',
        surname: 'User',
      });

      const response = await request(app)
        .get('/status')
        .set('Authorization', `Bearer ${token}`);

      // Status monitor middleware should pass through
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('should allow teacher to access status monitor', async () => {
      const token = generateToken({
        id: mockUser.id,
        email: 'teacher@example.com',
        role: 'teacher',
        name: 'Teacher',
        surname: 'User',
      });

      const response = await request(app)
        .get('/status')
        .set('Authorization', `Bearer ${token}`);

      // Status monitor middleware should pass through
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('should reject student access to status monitor', async () => {
      const token = generateToken({
        id: mockUser.id,
        email: mockUser.email,
        role: 'student',
        name: mockUser.name,
        surname: mockUser.surname,
      });

      const response = await request(app)
        .get('/status')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should reject unauthenticated access to status monitor', async () => {
      const response = await request(app)
        .get('/status');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for non-existent API endpoint', async () => {
      const token = generateToken({
        id: mockUser.id,
        email: mockUser.email,
        role: 'student',
        name: mockUser.name,
        surname: mockUser.surname,
      });

      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('API endpoint not found');
    });
  });
});

