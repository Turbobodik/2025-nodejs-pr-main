const { sequelize } = require('../../config/database');
const Student = require('../../models/Student');

describe('Student Model', () => {
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
      expect(Student.tableName).toBe('students');
    });

    it('should have correct attributes defined', () => {
      const attributes = Student.rawAttributes;
      
      expect(attributes).toHaveProperty('id');
      expect(attributes).toHaveProperty('user_id');
      expect(attributes).toHaveProperty('name');
      expect(attributes).toHaveProperty('age');
      expect(attributes).toHaveProperty('group');
    });

    it('should have id as primary key with auto increment', () => {
      const idAttribute = Student.rawAttributes.id;
      expect(idAttribute.primaryKey).toBe(true);
      expect(idAttribute.autoIncrement).toBe(true);
      expect(idAttribute.allowNull).toBe(false);
    });

    it('should have user_id as UUID and unique', () => {
      const userIdAttribute = Student.rawAttributes.user_id;
      expect(userIdAttribute.type.constructor.name).toBe('UUID');
      expect(userIdAttribute.unique).toBe(true);
      expect(userIdAttribute.allowNull).toBe(false);
    });

    it('should have name validation', () => {
      const nameAttribute = Student.rawAttributes.name;
      expect(nameAttribute.allowNull).toBe(false);
      expect(nameAttribute.validate).toBeDefined();
      expect(nameAttribute.validate.notEmpty).toBe(true);
      expect(nameAttribute.validate.len).toEqual([1, 255]);
    });

    it('should have age validation', () => {
      const ageAttribute = Student.rawAttributes.age;
      expect(ageAttribute.allowNull).toBe(false);
      expect(ageAttribute.validate).toBeDefined();
      expect(ageAttribute.validate.isInt).toBe(true);
      expect(ageAttribute.validate.min).toBe(0);
    });

    it('should have group validation', () => {
      const groupAttribute = Student.rawAttributes.group;
      expect(groupAttribute.allowNull).toBe(false);
      expect(groupAttribute.validate).toBeDefined();
      expect(groupAttribute.validate.isInt).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should validate name length', async () => {
      const longName = 'a'.repeat(256); // 256 characters, exceeds max
      const student = Student.build({
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        name: longName,
        age: 20,
        group: 1,
      });

      await expect(student.validate()).rejects.toThrow();
    });

    it('should validate age is integer', async () => {
      const student = Student.build({
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test',
        age: 'not-a-number',
        group: 1,
      });

      await expect(student.validate()).rejects.toThrow();
    });

    it('should validate age is non-negative', async () => {
      const student = Student.build({
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test',
        age: -1,
        group: 1,
      });

      await expect(student.validate()).rejects.toThrow();
    });

    it('should validate group is integer', async () => {
      const student = Student.build({
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test',
        age: 20,
        group: 'not-a-number',
      });

      await expect(student.validate()).rejects.toThrow();
    });
  });
});

