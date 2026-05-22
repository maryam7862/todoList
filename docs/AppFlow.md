# Application Flow

## 1. Entry

- User loads the application in the browser.
- If a saved token exists, the app attempts to restore the session.
- If no token exists, the Login/Register view is shown.

## 2. Authentication

- User selects Login or Register.
- Registration saves new user data and returns a JWT.
- Login validates credentials and returns a JWT.
- The token and user profile are stored in LocalStorage.

## 3. Task Dashboard

- After authentication, the user sees the dashboard.
- The app fetches tasks belonging to the logged-in user.
- The sidebar shows total tasks and completed count.

## 4. Task Actions

- Add task: creates a new task on the backend and refreshes the list.
- Edit task: opens a modal, saves changes to backend, and refreshes.
- Delete task: removes the task after confirmation.
- Mark complete: toggles completion status.
- Filter tasks: All, Active, Completed.

## 5. Logout

- Logout clears token and returns to auth screen.
- User must log in again to access private task routes.
