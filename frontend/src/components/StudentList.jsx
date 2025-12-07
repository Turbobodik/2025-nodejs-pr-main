import { useState, useEffect } from 'react';
import { studentAPI } from '../services/api';
import StudentCard from './StudentCard';
import AddStudentForm from './AddStudentForm';
import Statistics from './Statistics';
import './StudentList.css';

function StudentList() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  const loadStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await studentAPI.getAll(filters);
      setStudents(data.students || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load students');
      console.error('Error loading students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [filters]);

  const handleAddStudent = async (studentData) => {
    try {
      await studentAPI.create(studentData);
      setShowAddForm(false);
      await loadStudents();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add student');
      throw err;
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student?')) {
      return;
    }
    try {
      await studentAPI.delete(id);
      await loadStudents();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete student');
    }
  };

  const handleEditStudent = (student) => {
    setEditingStudent(student);
  };

  const handleUpdateStudent = () => {
    setEditingStudent(null);
    loadStudents();
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      if (value === '' || value === null || value === undefined) {
        delete newFilters[key];
      } else {
        newFilters[key] = value;
      }
      return newFilters;
    });
  };

  return (
    <div className="student-list-container">
      <div className="header-section">
        <h1>Student Management System</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : '+ Add Student'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="filters-section">
        <div className="filter-group">
          <label>Filter by Group:</label>
          <input
            type="number"
            placeholder="Group number"
            value={filters.group || ''}
            onChange={(e) => handleFilterChange('group', e.target.value ? parseInt(e.target.value) : '')}
          />
        </div>
        <div className="filter-group">
          <label>Min Age:</label>
          <input
            type="number"
            placeholder="Minimum age"
            value={filters.minAge || ''}
            onChange={(e) => handleFilterChange('minAge', e.target.value ? parseInt(e.target.value) : '')}
          />
        </div>
        <div className="filter-group">
          <label>Max Age:</label>
          <input
            type="number"
            placeholder="Maximum age"
            value={filters.maxAge || ''}
            onChange={(e) => handleFilterChange('maxAge', e.target.value ? parseInt(e.target.value) : '')}
          />
        </div>
        <button 
          className="btn btn-secondary"
          onClick={() => setFilters({})}
        >
          Clear Filters
        </button>
      </div>

      {showAddForm && (
        <AddStudentForm
          onSubmit={handleAddStudent}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          onUpdate={handleUpdateStudent}
          onClose={() => setEditingStudent(null)}
        />
      )}

      <Statistics />

      <div className="students-section">
        {loading ? (
          <div className="loading">Loading students...</div>
        ) : students.length === 0 ? (
          <div className="empty-state">No students found</div>
        ) : (
          <div className="students-grid">
            {students.map(student => (
              <StudentCard
                key={student.id}
                student={student}
                onDelete={handleDeleteStudent}
                onEdit={handleEditStudent}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EditStudentModal({ student, onUpdate, onClose }) {
  const [formData, setFormData] = useState({
    name: student.name,
    age: student.age,
    group: student.group,
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await studentAPI.update(student.id, formData);
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Student</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <label>Name:</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Age:</label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
              required
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Group:</label>
            <input
              type="number"
              value={formData.group}
              onChange={(e) => setFormData({ ...formData, group: parseInt(e.target.value) })}
              required
              min="1"
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Updating...' : 'Update Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StudentList;

