import { useState } from 'react';
import './AddStudentForm.css';

function AddStudentForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    group: '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.name || !formData.age || !formData.group) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name: formData.name,
        age: parseInt(formData.age),
        group: parseInt(formData.group),
      });
      setFormData({ name: '', age: '', group: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-student-form">
      <h2>Add New Student</h2>
      <form onSubmit={handleSubmit}>
        {error && <div className="error-message">{error}</div>}
        <div className="form-group">
          <label htmlFor="name">Name:</label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter student name"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="age">Age:</label>
          <input
            id="age"
            type="number"
            value={formData.age}
            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            placeholder="Enter age"
            min="0"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="group">Group:</label>
          <input
            id="group"
            type="number"
            value={formData.group}
            onChange={(e) => setFormData({ ...formData, group: e.target.value })}
            placeholder="Enter group number"
            min="1"
            required
          />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Adding...' : 'Add Student'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddStudentForm;

