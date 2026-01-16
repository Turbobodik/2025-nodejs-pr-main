# Student Management API

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up database:**
   ```bash
   # Default: localhost:5432, user: postgres, password: postgres, db: students_db
   # Or set environment variables: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
   ```

3. **Create database and run migrations:**
   ```bash
   npm run setup
   ```

4. **Start server:**
   ```bash
   # Development
   NODE_ENV=development npm start

   # Production
   NODE_ENV=production npm start
   ```

Server runs on `http://localhost:3000` (or `PORT` env variable).

## Testing

```bash
# Run unit tests
npm test

# Test API endpoints
.\test-api.ps1              # PowerShell
./test-api.sh               # Bash
```

## API Endpoints

- **Auth:** `POST /api/auth/register`, `POST /api/auth/login`
- **Students:** `GET /api/students`, `GET /api/students/:id`, `POST /api/students`, `PUT /api/students/:id`, `DELETE /api/students/:id`
- **Docs:** `GET /api-docs` (Swagger UI)
- **Monitor:** `GET /status` (Status monitor)

## Get JWT Token

Login to get your token:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

## Logs

Logs are stored in `logs/` directory:
- `combined-*.log` - All logs
- `error-*.log` - Error logs only
