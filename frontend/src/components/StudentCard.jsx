import './StudentCard.css';

function StudentCard({ student, onDelete, onEdit }) {
  return (
    <div className="student-card">
      <div className="student-header">
        <h3>{student.name}</h3>
        <div className="student-id">ID: {student.id}</div>
      </div>
      <div className="student-details">
        <div className="detail-item">
          <span className="label">Age:</span>
          <span className="value">{student.age}</span>
        </div>
        <div className="detail-item">
          <span className="label">Group:</span>
          <span className="value">{student.group}</span>
        </div>
      </div>
      <div className="student-actions">
        <button 
          className="btn btn-edit"
          onClick={() => onEdit(student)}
        >
          Edit
        </button>
        <button 
          className="btn btn-delete"
          onClick={() => onDelete(student.id)}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default StudentCard;

