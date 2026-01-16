const express = require('express');
const request = require('supertest');
const {
  validateRegister,
  validateLogin,
  validateCreateStudent,
  validateUpdateStudent,
  validateStudentId,
  validateGroupId,
} = require('../../middleware/validation');

// Helper function to create test app with validation middleware
const createTestApp = (validationMiddleware) => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.post('/test', validationMiddleware, (req, res) => {
    res.status(200).json({ success: true });
  });
  return app;
};

describe('Validation Middleware', () => {
  describe('validateRegister', () => {
    it('should accept valid registration data', async () => {
      const app = createTestApp(validateRegister);
      const validData = {
        name: 'John',
        surname: 'Doe',
        email: 'john.doe@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/test')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject missing name', async () => {
      const app = createTestApp(validateRegister);
      const invalidData = {
        surname: 'Doe',
        email: 'john.doe@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject invalid email', async () => {
      const app = createTestApp(validateRegister);
      const invalidData = {
        name: 'John',
        surname: 'Doe',
        email: 'invalid-email',
        password: 'password123',
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject short password', async () => {
      const app = createTestApp(validateRegister);
      const invalidData = {
        name: 'John',
        surname: 'Doe',
        email: 'john.doe@example.com',
        password: '12345', // Less than 6 characters
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should accept optional valid role_id', async () => {
      const app = createTestApp(validateRegister);
      const validData = {
        name: 'John',
        surname: 'Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        role_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const response = await request(app)
        .post('/test')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('validateLogin', () => {
    it('should accept valid login data', async () => {
      const app = createTestApp(validateLogin);
      const validData = {
        email: 'john.doe@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/test')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject missing email', async () => {
      const app = createTestApp(validateLogin);
      const invalidData = {
        password: 'password123',
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject missing password', async () => {
      const app = createTestApp(validateLogin);
      const invalidData = {
        email: 'john.doe@example.com',
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('validateCreateStudent', () => {
    it('should accept valid student data', async () => {
      const app = createTestApp(validateCreateStudent);
      const validData = {
        name: 'John',
        age: 20,
        group: 1,
        user_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const response = await request(app)
        .post('/test')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject negative age', async () => {
      const app = createTestApp(validateCreateStudent);
      const invalidData = {
        name: 'John',
        age: -1,
        group: 1,
        user_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid user_id', async () => {
      const app = createTestApp(validateCreateStudent);
      const invalidData = {
        name: 'John',
        age: 20,
        group: 1,
        user_id: 'invalid-uuid',
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('validateStudentId', () => {
    const createTestAppWithParam = () => {
      const app = express();
      app.use(express.json());
      app.get('/test/:id', validateStudentId, (req, res) => {
        res.status(200).json({ success: true, id: req.params.id });
      });
      return app;
    };

    it('should accept valid student ID', async () => {
      const app = createTestAppWithParam();
      const response = await request(app).get('/test/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject non-numeric student ID', async () => {
      const app = createTestAppWithParam();
      const response = await request(app).get('/test/abc');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject zero as student ID', async () => {
      const app = createTestAppWithParam();
      const response = await request(app).get('/test/0');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('validateGroupId', () => {
    const createTestAppWithParam = () => {
      const app = express();
      app.use(express.json());
      app.get('/test/:id', validateGroupId, (req, res) => {
        res.status(200).json({ success: true, id: req.params.id });
      });
      return app;
    };

    it('should accept valid group ID', async () => {
      const app = createTestAppWithParam();
      const response = await request(app).get('/test/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should accept zero as group ID', async () => {
      const app = createTestAppWithParam();
      const response = await request(app).get('/test/0');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject non-numeric group ID', async () => {
      const app = createTestAppWithParam();
      const response = await request(app).get('/test/abc');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
