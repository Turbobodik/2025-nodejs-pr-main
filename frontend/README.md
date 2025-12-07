# Student Management System - Frontend

React frontend application for the Student Management System.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## Backend Setup

Make sure the backend server is running on `http://localhost:3000`:

```bash
cd ../pr-3
node index.js
```

## Features

- View all students
- Add new students
- Edit existing students
- Delete students
- Filter students by group, age range
- View statistics (average age, total count)
- Real-time updates

## API Endpoints Used

- `GET /api/students` - Get all students
- `GET /api/students/:id` - Get student by ID
- `GET /api/students/group/:group` - Get students by group
- `POST /api/students` - Create new student
- `DELETE /api/students/:id` - Delete student
- `GET /api/students/stats/average-age` - Get statistics
