# Setup Instructions for PR-4

## Prerequisites

1. **Node.js** (v14 or higher)
2. **PostgreSQL** (v12 or higher)
3. **npm** or **yarn**

## Database Setup

1. Make sure PostgreSQL is running on your system.

2. Create the database for the application:

   **Option A: Using the automated script (Recommended for Windows):**
   ```bash
   npm run create-db
   ```

   **Option B: Using psql command line (if psql is in your PATH):**
   ```bash
   psql -U postgres
   ```
   Then in the psql prompt:
   ```sql
   CREATE DATABASE students_db;
   \q
   ```

   **Option C: Using pgAdmin (GUI tool):**
   - Open pgAdmin
   - Right-click on "Databases" → "Create" → "Database"
   - Name it `students_db`
   - Click "Save"

3. (Optional) Create a user for the application:
   ```sql
   CREATE USER student_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE students_db TO student_user;
   ```

## Environment Variables (Optional)

You can configure the database connection using environment variables. Create a `.env` file in the project root:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=students_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_LOGGING=false
```

If these are not set, the default values from `config/database.js` will be used.

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create the database (if not already created):
   ```bash
   npm run create-db
   ```

3. Run the database migration to create the necessary tables:
   ```bash
   npm run migrate
   ```

   This will create the `students` table in your PostgreSQL database.

   **Or use the combined setup command:**
   ```bash
   npm run setup
   ```
   This will create the database and run migrations in one step.

## Running the Application

Start the server:
```bash
npm start
```

The server will start on `http://localhost:3000`

- CV page: `http://localhost:3000/`
- API: `http://localhost:3000/api/`

## API Endpoints

All endpoints from PR-3 are available with the same interface, but now backed by PostgreSQL:

- `GET /api/students` - Get all students
- `GET /api/students/:id` - Get student by ID
- `POST /api/students` - Add new student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student
- `PUT /api/students` - Replace all students
- `GET /api/students/group/:id` - Get students by group
- `GET /api/students/average-age` - Get average age
- And more...

All endpoints now include proper data validation using `express-validator`.
