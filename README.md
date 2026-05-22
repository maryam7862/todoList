# TaskFlow

A complete authentication-based to-do application with a frontend built in HTML/CSS/JS and a backend powered by Node.js, Express, and SQLite.

## Run the Backend

1. Open a terminal in `backend`
2. Install dependencies:
   ```bash
   npm install
   ```
3. SQLite is created automatically in `backend/todo.db`.
4. Start the backend:
   ```bash
   npm run dev
   ```

## Run the Frontend

- Open `frontend/index.html` in a browser, or serve it with a local server such as VS Code Live Server.
- The frontend communicates with the backend at `http://localhost:5000/api`.

## Project Structure

- `backend/` — server, routes, models, auth middleware
- `frontend/` — UI markup, animated CSS, full task functionality
- `docs/` — PRD, TRD, UI/UX, app flow, backend schema
