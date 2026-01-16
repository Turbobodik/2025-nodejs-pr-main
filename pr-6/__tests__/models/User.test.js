const { sequelize } = require('../../config/database');
const User = require('../../models/User');

describe('User Model', () => {
  beforeAll(async () => {
    // Sync database before tests
    try {
      await sequelize.authenticate();
    } catch (error) {
      console.warn('Database connection not available for tests:', error.message);
    }
  });

  afterAll(async () => {
    // Close database connection
    await sequelize.close();
  });

  describe('Model Definition', () => {
    it('should have correct table name', () => {
      expect(User.tableName).toBe('users');
    });

    it('should have correct attributes defined', () => {
      const attributes = User.rawAttributes;
      
      expect(attributes).toHaveProperty('id');
      expect(attributes).toHaveProperty('name');
      expect(attributes).toHaveProperty('surname');
      expect(attributes).toHaveProperty('email');
      expect(attributes).toHaveProperty('password');
      expect(attributes).toHaveProperty('role_id');
    });

    it('should have id as UUID primary key', () => {
      const idAttribute = User.rawAttributes.id;
      expect(idAttribute.primaryKey).toBe(true);
      expect(idAttribute.type.constructor.name).toBe('UUID');
      expect(idAttribute.defaultValue).toBeDefined();
      expect(idAttribute.allowNull).toBe(false);
    });

    it('should have name validation', () => {
      const nameAttribute = User.rawAttributes.name;
      expect(nameAttribute.allowNull).toBe(false);
      expect(nameAttribute.validate).toBeDefined();
      expect(nameAttribute.validate.notEmpty).toBe(true);
      expect(nameAttribute.validate.len).toEqual([1, 255]);
    });

    it('should have surname validation', () => {
      const surnameAttribute = User.rawAttributes.surname;
      expect(surnameAttribute.allowNull).toBe(false);
      expect(surnameAttribute.validate).toBeDefined();
      expect(surnameAttribute.validate.notEmpty).toBe(true);
      expect(surnameAttribute.validate.len).toEqual([1, 255]);
    });

    it('should have email validation', () => {
      const emailAttribute = User.rawAttributes.email;
      expect(emailAttribute.allowNull).toBe(false);
      expect(emailAttribute.unique).toBe(true);
      expect(emailAttribute.validate).toBeDefined();
      expect(emailAttribute.validate.isEmail).toBe(true);
      expect(emailAttribute.validate.notEmpty).toBe(true);
    });

    it('should have password validation', () => {
      const passwordAttribute = User.rawAttributes.password;
      expect(passwordAttribute.allowNull).toBe(false);
      expect(passwordAttribute.validate).toBeDefined();
      expect(passwordAttribute.validate.notEmpty).toBe(true);
    });

    it('should have role_id as UUID', () => {
      const roleIdAttribute = User.rawAttributes.role_id;
      expect(roleIdAttribute.type.constructor.name).toBe('UUID');
      expect(roleIdAttribute.allowNull).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should validate name length', async () => {
      const longName = 'a'.repeat(256); // 256 characters, exceeds max
      const user = User.build({
        name: longName,
        surname: 'Doe',
        email: 'test@example.com',
        password: 'password123',
        role_id: '550e8400-e29b-41d4-a716-446655440000',
      });

      await expect(user.validate()).rejects.toThrow();
    });

    it('should validate surname length', async () => {
      const longSurname = 'a'.repeat(256); // 256 characters, exceeds max
      const user = User.build({
        name: 'John',
        surname: longSurname,
        email: 'test@example.com',
        password: 'password123',
        role_id: '550e8400-e29b-41d4-a716-446655440000',
      });

      await expect(user.validate()).rejects.toThrow();
    });

    it('should validate email format', async () => {
      const user = User.build({
        name: 'John',
        surname: 'Doe',
        email: 'invalid-email',
        password: 'password123',
        role_id: '550e8400-e29b-41d4-a716-446655440000',
      });

      await expect(user.validate()).rejects.toThrow();
    });
  });
});
