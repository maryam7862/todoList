# Backend Schema

## User Model

- id: Integer (primary key)
- name: String
- email: String (unique)
- password: String (hashed)
- createdAt: Text (ISO timestamp)

## Task Model

- id: Integer (primary key)
- title: String
- description: String
- completed: Boolean
- priority: String (low, medium, high)
- dueDate: Text (ISO date)
- userId: Integer (foreign key to User)
- createdAt: Text (ISO timestamp)

## Indexes

- Unique index on `email` in the users table
- `userId` field on tasks table for fast user-specific queries

## Relationships

- One user -> many tasks

## Example Task Document

```json
{
  "_id": "642b5c0a4f1a4b1d2e7e8c8a",
  "title": "Finish project plan",
  "description": "Write the PRD, wireframes, and backend schema.",
  "completed": false,
  "priority": "high",
  "dueDate": "2026-05-25T00:00:00.000Z",
  "user": "642b59f44f1a4b1d2e7e8c86",
  "createdAt": "2026-05-18T10:15:00.000Z"
}
```
