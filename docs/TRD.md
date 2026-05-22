# Technical Requirements Document

## Backend

- Node.js + Express for API server
- SQLite for local data storage
- bcryptjs for password hashing
- JSON Web Tokens for authentication
- CORS enabled for frontend access
- Environment variables for sensitive configuration

## Frontend

- Vanilla HTML, CSS, JavaScript
- Fetch API for backend communication
- LocalStorage to persist JWT and user details
- Responsive UI with animated gradients and glassmorphism

## API Endpoints

| Method | URL                | Auth | Description                 |
| ------ | ------------------ | ---- | --------------------------- |
| POST   | /api/auth/register | No   | Register a new user         |
| POST   | /api/auth/login    | No   | Login existing user         |
| GET    | /api/tasks         | Yes  | Retrieve current user tasks |
| POST   | /api/tasks         | Yes  | Create a new task           |
| PUT    | /api/tasks/:id     | Yes  | Update an existing task     |
| DELETE | /api/tasks/:id     | Yes  | Remove a task               |

## Security

- Passwords hashed with bcrypt
- Persistent JWT token stored in LocalStorage
- Protected task routes require valid token

## Deployment Notes

- SQLite database is created automatically in `backend/todo.db`
- Backend runs on port 5000 by default
- Frontend can be served from any static host or opened with a live server
