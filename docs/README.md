# ScrumHub Mock API Documentation

## Overview

JSON Server mock API for ScrumHub frontend development. The server runs on **http://localhost:3001**.

## Architecture

```
mock/
├── db.json       # Database file (LowDB) - all mock data lives here
├── routes.json   # Custom route mappings (URL -> internal endpoint)
├── server.js     # Server configuration and middleware
└── docs/
    └── README.md  # This file
```

### How it works

1. **db.json** contains all mock data organized in collections (users, projects, tasks, etc.)
2. **routes.json** defines custom URL mappings that translate friendly URLs to LowDB queries
3. **server.js** sets up json-server with the router and rewriter

**Key concept**: `routes.json` maps your API URLs (e.g., `/api/projects/:id/members`) to actual db.json queries (e.g., `/project_members?project_id=:id`).

---

## Available Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/logout` | User logout |
| GET | `/api/auth/me` | Get current user |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| GET | `/api/users/:id` | Get user by ID |
| GET | `/api/users/:id/scrum-roles` | Get user's scrum roles |
| PUT | `/api/users/:id/scrum-roles/:roleId` | Update scrum role |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects |
| GET | `/api/projects/all` | List all projects (alias) |
| GET | `/api/projects/:id` | Get project by ID |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id/members` | List project members |
| GET | `/api/projects/:id/members/:userId` | Get specific member |
| GET | `/api/projects/:id/stats` | Get project statistics |
| GET | `/api/projects/:id/sprints` | List project sprints |
| GET | `/api/projects/:id/statuses` | List project statuses |
| GET | `/api/projects/:id/boards` | Get project board |
| GET | `/api/projects/:id/chatroom` | Get project chatroom |
| GET | `/api/projects/:id/daily-standups` | List daily standups |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List all tasks |
| GET | `/api/tasks/my-tasks` | Get current user's tasks |
| GET | `/api/tasks/:id` | Get task by ID |
| GET | `/api/tasks/:id/subtasks` | Get task subtasks |
| GET | `/api/tasks/:id/assignees` | Get task assignees |
| GET | `/api/tasks/:id/dependencies` | Get task dependencies |
| GET | `/api/tasks/:id/comments` | Get task comments |
| GET | `/api/tasks/:id/attachments` | Get task attachments |
| GET | `/api/tasks/:id/acceptance-criteria` | Get acceptance criteria |

### Sprints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sprints/:id` | Get sprint by ID |
| GET | `/api/sprints/:id/tasks` | Get sprint tasks |
| GET | `/api/sprints/:id/retrospective` | Get sprint retrospective |

### Retrospectives
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/retrospectives/:id` | Get retrospective by ID |

### Chatrooms & Channels
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chatrooms/:id/channels` | List chatroom channels |
| GET | `/api/channels/:id` | Get channel by ID |
| GET | `/api/channels/:id/messages` | Get channel messages |
| GET | `/api/channels/:id/voice-sessions` | Get channel voice sessions |

### Messages & Voice
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages/:id` | Get message by ID |
| GET | `/api/voice-sessions/:id` | Get voice session by ID |

### Daily Standups
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/daily-standups/:id` | Get standup by ID |
| POST | `/api/daily-standups/:id/transcribe` | Transcribe standup |

### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Get settings |
| GET | `/api/settings/:id` | Get settings by ID |

### Subscription
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/subscription` | Get subscription |
| GET | `/subscription/credits` | Get subscription credits |

### API Keys
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api-keys` | List user's API keys |
| GET | `/api-keys/:id` | Get API key by ID |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | List notifications |
| PATCH | `/notifications/:id/read` | Mark notification as read |
| PATCH | `/notifications/read-all` | Mark all as read |
| GET | `/notification-preferences` | Get notification preferences |

### AI Features
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ai/chat` | Chat with AI |
| GET | `/ai/sessions` | List AI chat sessions |
| GET | `/ai/sessions/:id` | Get AI session |
| GET | `/ai/sessions/:id/messages` | Get AI session messages |
| POST | `/ai/transcribe` | Transcribe audio |
| POST | `/ai/search` | AI search |

---

## Route Mapping Explained

### Simple 1:1 Mapping
```json
"/api/users": "/users"
```
Requesting `GET /api/users` returns `GET /users` result (all users from db.json).

### Nested Resource Mapping
```json
"/api/projects/:id/members": "/project_members?project_id=:id"
```
Requesting `GET /api/projects/1/members` queries `project_members` collection in db.json filtering by `project_id=1`.

### Multiple Filters
```json
"/api/projects/:id/members/:userId": "/project_members?project_id=:id&user_id=:userId"
```
Requesting `GET /api/projects/1/members/2` queries `project_members?project_id=1&user_id=2`.

### Sub-resources
```json
"/api/tasks/:id/subtasks": "/tasks?parent_id=:id"
```
Requesting `GET /api/tasks/5/subtasks` returns tasks where `parent_id=5`.

### Wildcard Catch-all
```json
"/api/*": "/$1"
```
Any `/api/xyz` request maps to `/xyz` in the database.

---

## Middleware Features

The server.js includes automatic timestamp handling:

- **POST requests**: Adds `created_at` and `updated_at` with current timestamp
- **PUT/PATCH requests**: Updates `updated_at` timestamp

---

## Running the Server

```bash
# Production mode
npm start

# Development mode (watches for changes)
npm run dev
```

Server runs on `http://localhost:3001` by default. Change `PORT` env variable to modify.