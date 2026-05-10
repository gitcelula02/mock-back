# ScrumHub — API Endpoints Specification

This document defines all API endpoints for the ScrumHub backend. Based on the ERD structure and designed for optimization, caching, and scalability.

---

## Table of Contents

1. [Conventions & Patterns](#conventions--patterns)
2. [Authentication](#authentication)
3. [Users](#users)
4. [Projects](#projects)
5. [User Folders & Projects](#user-folders--projects)
6. [Tasks (Epic, Story, Task, Subtask)](#tasks-epic-story-task-subtask)
7. [Sprints](#sprints)
8. [Status (Kanban)](#status-kanban)
9. [Chatroom & Channels](#chatroom--channels)
10. [Messages](#messages)
11. [Voice Sessions](#voice-sessions)
12. [Daily Standups](#daily-standups)
13. [Retrospectives](#retrospectives)
14. [Settings (Polymorphic)](#settings-polymorphic)
15. [AI Chat & RAG](#ai-chat--rag)
16. [Subscriptions & Credits](#subscriptions--credits)
17. [API Keys (Vault)](#api-keys-vault)
18. [Notifications](#notifications)
19. [Priority Order](#priority-order-for-implementation)

---

## Conventions & Patterns

### URL Structure
```
/api/{resource}
/api/{resource}/{id}
/api/{parent}/{parentId}/{child}
/api/{parent}/{parentId}/{child}/{childId}
```

### HTTP Methods
| Method | Purpose |
|--------|---------|
| GET | Retrieve (single or list) |
| POST | Create |
| PUT | Full update |
| PATCH | Partial update |
| DELETE | Remove |

### Query Parameters
| Param | Purpose |
|-------|---------|
| `?include=rel1,rel2` | Include related resources (JOIN) |
| `?fields=field1,field2` | Sparse fieldsets |
| `?limit=20&offset=0` | Pagination (offset-based) |
| `?cursor=xyz` | Cursor-based pagination (messages) |
| `?from=YYYY-MM-DD&to=YYYY-MM-DD` | Date range filtering |
| `?status_id=5` | Filter by status |
| `?priority=high` | Filter by priority |
| `?sprint_id=3` | Filter by sprint |
| `?type=epic` | Filter by task type |
| `?assignee_id=7` | Filter by assignee |
| `?parent_id=null` | Filter root items only |
| `?read=false` | Filter notifications by read state |

### Response Format
```json
{
  "data": { ... },
  "meta": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "next_cursor": "abc123"
  }
}
```

### Error Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": [{ "field": "email", "message": "Invalid format" }]
  }
}
```

### Caching Strategy
| Resource | Cache-Control | ETag |
|----------|---------------|------|
| Projects | 5 min | Yes |
| Tasks (list) | 2 min | Yes |
| Task (single) | 1 min | Yes |
| Stats | 60 sec | No |
| Messages | No cache | No |
| AI responses | No cache | No |

### Rate Limiting
| Endpoint Group | Limit |
|----------------|-------|
| General API | 100 req/min |
| AI endpoints | 10 req/min |
| File uploads | 20 req/min |
| Auth endpoints | 10 req/min (5 min window) |

---

## Authentication

### POST /api/auth/login
**Request:**
```json
{ "email": "user@example.com", "password": "plaintext" }
```
**Response:** `200`
```json
{
  "data": {
    "token": "jwt_token_here",
    "user": { "id": 1, "username": "john", "email": "user@example.com", "avatar_url": "..." }
  }
}
```

### POST /api/auth/register
**Request:**
```json
{ "username": "john", "email": "user@example.com", "password": "plaintext" }
```
**Response:** `201`

### POST /api/auth/logout
**Response:** `204`

### GET /api/auth/me
**Response:** `200`
```json
{
  "data": {
    "id": 1, "username": "john", "email": "user@example.com",
    "avatar_url": "...", "default_language": "en", "created_at": "..."
  }
}
```

---

## Users

### GET /api/users
Query params: `?search=john&limit=20&offset=0`
**Response:** `200`
```json
{
  "data": [{ "id": 1, "username": "john", "email": "...", "avatar_url": "..." }],
  "meta": { "total": 50, "limit": 20, "offset": 0 }
}
```

### GET /api/users/:id
**Response:** `200`

### PUT /api/users/:id
**Request:**
```json
{ "username": "john Updated", "avatar_url": "...", "default_language": "es" }
```

### GET /api/users/:id/scrum-roles
**Response:** `200`
```json
{ "data": [
  { "id": 1, "role_type": "developer", "specialization": "frontend", "is_primary": true },
  { "id": 2, "role_type": "qa", "is_primary": false }
]}
```

### POST /api/users/:id/scrum-roles
**Request:**
```json
{ "role_type": "developer", "specialization": "react", "is_primary": true }
```

### DELETE /api/users/:id/scrum-roles/:roleId

---

## Projects

### GET /api/projects/all
**Response:** `200`
```json
{
  "data": [
    { "id": 1, "name": "ScrumHub", "color": "#3B6D11", "status": "active", "members_count": 5 }
  ]
}
```

### GET /api/projects/:id
Query params: `?include=members,stats`
**Response:** `200`

### POST /api/projects
**Request:**
```json
{ "name": "New Project", "description": "...", "goal": "...", "icon": "📘", "color": "#8B5CF6" }
```

### PUT /api/projects/:id
**Request:** Same as POST

### DELETE /api/projects/:id
**Response:** `204`

### GET /api/projects/:id/members
**Response:** `200`
```json
{
  "data": [
    { "id": 1, "user_id": 5, "scrum_role": "developer", "is_admin": false, "joined_at": "...", "user": { "id": 5, "username": "...", "avatar_url": "..." } }
  ]
}
```

### POST /api/projects/:id/members
**Request:**
```json
{ "user_id": 5, "scrum_role": "developer", "is_admin": false }
```

### PUT /api/projects/:id/members/:userId
**Request:**
```json
{ "scrum_role": "qa", "is_admin": true }
```

### DELETE /api/projects/:id/members/:userId
**Response:** `204`

### GET /api/projects/:id/stats
**Response:** `200`
```json
{
  "data": {
    "total_tasks": 42,
    "completed_tasks": 15,
    "in_progress_tasks": 10,
    "pending_tasks": 12,
    "overdue_tasks": 5,
    "completion_percentage": 35.7
  }
}
```

### GET /api/projects/:id/custom-sections
**Response:** `200`
```json
{
  "data": [
    { "id": "pcs-1", "key": "vision", "value": "Our vision is...", "order_index": 0 },
    { "id": "pcs-2", "key": "mission", "value": "Our mission is...", "order_index": 1 }
  ]
}
```

### POST /api/projects/:id/custom-sections
**Request:**
```json
{ "key": "brand_guidelines", "value": "Colors: #hex...", "order_index": 2 }
```

### PUT /api/projects/:id/custom-sections/:sectionId
**Request:** `{ "key": "updated_key", "value": "Updated content", "order_index": 1 }`

### DELETE /api/projects/:id/custom-sections/:sectionId
**Response:** `204`

---

## User Folders & Projects

### GET /api/users/:userId/folders
Get user's folder tree.
**Response:** `200`
```json
{
  "data": [
    { "id": "folder-1", "user_id": "1", "parent_id": null, "name": "AI Projects", "order_index": 0, "created_at": "...", "updated_at": "..." }
  ]
}
```

### POST /api/users/:userId/folders
Create a new folder.
**Request:**
```json
{ "name": "New Folder", "parent_id": "folder-1" }
```
**Response:** `201`
```json
{ "data": { "id": "folder-new", "user_id": "1", "parent_id": "folder-1", "name": "New Folder", "order_index": 1, "created_at": "...", "updated_at": "..." } }
```

### PATCH /api/folders/:folderId
Update folder (rename, move, reorder).
**Request:**
```json
{ "name": "Updated Name", "parent_id": "folder-2", "order_index": 0 }
```
**Response:** `200`

### DELETE /api/folders/:folderId
Delete folder and reparent children to parent folder. Returns `204`.

### GET /api/users/:userId/projects
Get user's projects in folder structure with pinned projects.
**Response:** `200`
```json
{
  "data": [
    {
      "id": "folder-1",
      "name": "AI Projects",
      "parent_id": null,
      "order_index": 0,
      "children": [
        { "id": "folder-2", "name": "GPT Models", "parent_id": "folder-1", "order_index": 0, "children": [], "projects": [...] }
      ],
      "projects": [
        { "id": "proj-1", "name": "GPT-4 Fine-tune", "color": "#3B82F6", "icon": "🤖", "status": "active" }
      ]
    }
  ],
  "pinned": [
    { "id": "proj-2", "name": "ScrumHub", "color": "#10B981", "icon": "📘", "status": "active" }
  ]
}
```

### POST /api/users/:userId/folders/:folderId/projects
Add existing project to folder.
**Request:**
```json
{ "project_id": "proj-5" }
```
**Response:** `201`
```json
{ "data": { "folder_project_id": "ufp-new", "project_id": "proj-5", "folder_id": "folder-1" } }
```

### DELETE /api/users/:userId/folders/:folderId/projects/:projectId
Remove project from folder (not delete project).
**Response:** `200`
```json
{ "data": { "project_id": "proj-5", "folder_id": "folder-1", "deleted": true } }
```

### PATCH /api/users/:userId/projects/:projectId/move
Move project to different folder or root.
**Request:**
```json
{ "folder_id": "folder-2" }
```
or to move to root (unfolder):
```json
{ "folder_id": null }
```
**Response:** `200`

### POST /api/users/:userId/projects/:projectId/pin
Pin project to quick access.
**Response:** `200`

### DELETE /api/users/:userId/projects/:projectId/pin
Unpin project.
**Response:** `200`

### GET /api/users/:userId/projects/pinned
Get all pinned projects.
**Response:** `200`
```json
{
  "data": [
    { "id": "proj-1", "name": "GPT-4 Fine-tune", "color": "#3B82F6", "icon": "🤖", "status": "active" }
  ]
}
```

### GET /api/users/:userId/projects/search
Search projects by name and description.
Query params: `?q=searchterm`
**Response:** `200`
```json
{
  "data": [
    { "id": "proj-1", "name": "GPT-4 Fine-tune", "description": "...", "color": "#3B82F6", "icon": "🤖", "status": "active", "folder_id": "folder-1", "folder_name": "AI Projects" },
    { "id": "proj-5", "name": "Unfiled Project", "description": "...", "color": "#059669", "icon": "📦", "status": "active", "folder_id": null, "folder_name": null }
  ]
}
```

### GET /api/users/:userId/explorer-state
Get user's explorer UI state (stored in localStorage but synced).
**Response:** `200`
```json
{
  "data": {
    "id": "ues-1",
    "user_id": "1",
    "expanded_folder_ids": ["folder-1", "folder-2"],
    "active_folder_id": "folder-1",
    "view_size": "medium",
    "last_opened_project_id": "proj-1"
  }
}
```

### PATCH /api/users/:userId/explorer-state
Update explorer UI state.
**Request:**
```json
{ "expanded_folder_ids": ["folder-1"], "active_folder_id": "folder-2", "view_size": "compact", "last_opened_project_id": "proj-3" }
```
**Response:** `200`

---

## Tasks (Epic, Story, Task, Subtask)

All task types use the same endpoint — `type` field distinguishes them.

### GET /api/tasks
Query params: `?project_id=1&sprint_id=3&status_id=5&priority=high&type=epic&assignee_id=7&parent_id=null&include=assignees,comments,acceptance_criteria&limit=50&offset=0`

**Response:** `200`
```json
{
  "data": [
    {
      "id": 42,
      "project_id": 1,
      "parent_id": null,
      "sprint_id": 3,
      "type": "epic",
      "title": "User Authentication",
      "description": "...",
      "priority": "high",
      "status_id": 2,
      "index": 1,
      "due_date": "2024-07-15",
      "created_by_user_id": 1,
      "created_at": "...",
      "updated_at": "...",
      "assignees": [...],
      "comments_count": 5,
      "subtasks_count": 3
    }
  ],
  "meta": { "total": 150, "limit": 50, "offset": 0 }
}
```

### GET /api/tasks/my-tasks
Returns tasks where current user is assignee. Query params: `?project_id=1`

### GET /api/tasks/:id
Query params: `?include=assignees,comments,acceptance_criteria,attachments,dependencies,parent,subtasks`
**Response:** `200`

### POST /api/tasks
**Request:**
```json
{
  "project_id": 1,
  "parent_id": null,
  "sprint_id": 3,
  "type": "epic",
  "title": "New Epic",
  "description": "...",
  "priority": "high",
  "status_id": 1,
  "due_date": "2024-07-15"
}
```

### PUT /api/tasks/:id
Full update — all fields required.

### PATCH /api/tasks/:id
Partial update — only changed fields.

### PATCH /api/tasks/:id/status
Optimized for drag-drop. Debounce client-side 300ms.
**Request:** `{ "status_id": 5 }`
**Response:** `200` — returns updated task with subtasks updated if parent moved.

### DELETE /api/tasks/:id
**Response:** `204`

### GET /api/tasks/:id/subtasks
Recursive tree of all nested subtasks.
**Response:** `200`
```json
{
  "data": [
    {
      "id": 55,
      "title": "Subtask 1",
      "subtasks": [
        { "id": 60, "title": "Nested Subtask", "subtasks": [] }
      ]
    }
  ]
}
```

### POST /api/tasks/:id/assignees
**Request:** `{ "user_id": 5 }`

### DELETE /api/tasks/:id/assignees/:userId

### POST /api/tasks/:id/dependencies
**Request:** `{ "depends_on_task_id": 42, "dependency_type": "blocks_start" }`

### DELETE /api/tasks/:id/dependencies/:depId

### POST /api/tasks/:id/comments
**Request:** `{ "content": "Working on this now..." }`

### GET /api/tasks/:id/comments
Query params: `?limit=20&offset=0`

### POST /api/tasks/:id/attachments
Multipart form — file upload.
**Request:** `multipart/form-data` with `file` field.
**Response:** `201`
```json
{ "data": { "id": 4, "filename": "wireframe.png", "url": "...", "mime_type": "image/png", "size_bytes": 245632 } }
```

### GET /api/tasks/:id/acceptance-criteria
**Response:** `200`

### POST /api/tasks/:id/acceptance-criteria
**Request:** `{ "description": "OAuth flow completes" }`

### PATCH /api/tasks/:id/acceptance-criteria/:acId
**Request:** `{ "is_marked": true }`

### DELETE /api/tasks/:id/acceptance-criteria/:acId

---

## Sprints

### GET /api/projects/:projectId/sprints
Query params: `?include=tasks,stats`
**Response:** `200`

### GET /api/sprints/:id
Query params: `?include=tasks`
**Response:** `200`

### POST /api/projects/:projectId/sprints
**Request:**
```json
{
  "name": "Sprint 5",
  "description": "Focus on API integration",
  "color": "#8B5CF6",
  "start_date": "2024-06-17",
  "end_date": "2024-06-28"
}
```

### PUT /api/sprints/:id
**Request:** Same as POST

### DELETE /api/sprints/:id
**Response:** `204`

### POST /api/sprints/:id/tasks
Assign tasks to sprint.
**Request:** `{ "task_ids": [42, 55, 60] }`

### DELETE /api/sprints/:id/tasks/:taskId

### GET /api/sprints/:id/retrospective
**Response:** `200` or `404` if not exists.

### POST /api/sprints/:id/retrospective
**Request:** `{ "title": "Sprint 4 Retro", "description": "...", "sections": [...] }`

---

## Status (Kanban)

### GET /api/projects/:projectId/statuses
Returns all active statuses ordered by `order`.
**Response:** `200`

### POST /api/projects/:projectId/statuses
**Request:**
```json
{ "name": "In Review", "color": "#F59E0B", "associated_role": "qa", "order": 3 }
```

### PUT /api/projects/:projectId/statuses/:id
**Request:** Same as POST

### DELETE /api/projects/:projectId/statuses/:id
Soft delete — `is_active: false`. Returns `204`.

### PUT /api/projects/:projectId/statuses/reorder
Reorder statuses.
**Request:** `{ "status_ids": [1, 3, 2, 4] }` (ordered array)

### GET /api/projects/:projectId/boards
Returns board view with statuses and task counts.
**Response:** `200`
```json
{
  "data": [
    { "status_id": 1, "name": "To Do", "color": "#6B7280", "tasks": [...], "task_count": 5 },
    { "status_id": 2, "name": "In Progress", "color": "#3B82F6", "tasks": [...], "task_count": 3 }
  ]
}
```

---

## Chatroom & Channels

### GET /api/projects/:projectId/chatroom
Returns or creates chatroom for project. One-to-one relationship.
**Response:** `200`
```json
{
  "data": {
    "id": 1,
    "project_id": 1,
    "name": "Project Chat",
    "channels": [...]
  }
}
```

### GET /api/chatrooms/:id/channels
**Response:** `200`
```json
{
  "data": [
    { "id": 5, "type": "voice", "name": "Daily", "order": 0, "is_default": true, "is_active": true },
    { "id": 3, "type": "text", "name": "general", "order": 1, "is_default": false, "is_active": true }
  ]
}
```

### POST /api/chatrooms/:id/channels
**Request:** `{ "type": "text", "name": "backend-discuss", "order": 5 }`

### PUT /api/channels/:id
**Request:** `{ "name": "new-name", "order": 3 }`

### DELETE /api/channels/:id
Only non-default channels can be deleted. Returns `204`.

---

## Messages

### GET /api/channels/:channelId/messages
Query params: `?cursor=abc123&limit=50` (cursor-based pagination)
**Response:** `200`
```json
{
  "data": [
    { "id": 1024, "channel_id": 3, "user_id": 5, "content": "...", "created_at": "..." }
  ],
  "meta": { "next_cursor": "xyz789", "has_more": true }
}
```

### POST /api/channels/:channelId/messages
**Request:** `{ "content": "Hello team!" }`

### DELETE /api/messages/:id
Only message author or admin can delete. Returns `204`.

---

## Voice Sessions

### POST /api/channels/:channelId/voice-sessions
Start a voice session (when user joins voice channel).
**Response:** `201`
```json
{
  "data": { "id": 7, "channel_id": 5, "status": "active", "started_at": "..." }
}
```

### PUT /api/voice-sessions/:id/end
End the voice session.
**Response:** `200`

### POST /api/voice-sessions/:id/join
User joins an active voice session.
**Request:** `{ "user_id": 5 }`
**Response:** `200`

### PUT /api/voice-sessions/:id/leave
User leaves the voice session.
**Response:** `200`

### POST /api/voice-sessions/:id/transcribe
Trigger transcription explicitly.
**Request:** `{ "user_id": 5 }`
**Response:** `202` — async operation.

---

## Daily Standups

### GET /api/projects/:projectId/daily-standups
Query params: `?from=YYYY-MM-DD&to=YYYY-MM-DD`
**Response:** `200`

### GET /api/daily-standups/:id
**Response:** `200`
```json
{
  "data": {
    "id": 2,
    "project_id": 1,
    "channel_id": 5,
    "scheduled_at": "2024-06-19T09:00:00Z",
    "voice_session_id": 7,
    "state_summary": "Team is on track",
    "stoppers_detected": [],
    "expected_latencies": [],
    "notes": "No blockers"
  }
}
```

### POST /api/projects/:projectId/daily-standups
**Request:**
```json
{
  "channel_id": 5,
  "scheduled_at": "2024-06-19T09:00:00Z"
}
```

### PUT /api/daily-standups/:id
**Request:** `{ "scheduled_at": "2024-06-20T09:00:00Z", "notes": "Updated notes" }`

### DELETE /api/daily-standups/:id
**Response:** `204`

### POST /api/daily-standups/:id/transcribe
Explicitly trigger transcription for this standup.
**Response:** `202`

---

## Retrospectives

### GET /api/sprints/:sprintId/retrospective
**Response:** `200` or `404`
```json
{
  "data": {
    "id": 1,
    "sprint_id": 3,
    "title": "Sprint 3 Retro",
    "description": "...",
    "sections": [
      { "type": "what_went_wrong", "content": "...", "order": 1 },
      { "type": "what_went_good", "content": "...", "order": 2 }
    ],
    "created_by_user_id": 1,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

### POST /api/sprints/:sprintId/retrospective
**Request:**
```json
{
  "title": "Sprint 3 Retro",
  "description": "...",
  "sections": [
    { "type": "what_went_wrong", "content": "...", "order": 1 },
    { "type": "what_went_good", "content": "...", "order": 2 },
    { "type": "improvements", "content": "...", "order": 3 },
    { "type": "action_items", "content": "...", "order": 4 }
  ]
}
```

### PUT /api/retrospectives/:id
Update entire retrospective including sections array.
**Request:** Same as POST

### PATCH /api/retrospectives/:id/sections
Update only sections array.
**Request:** `{ "sections": [...] }`

---

## Settings (Polymorphic)

### GET /api/settings
Query params required:
- `GET /api/settings?type=general` — returns general settings (no scope_id)
- `GET /api/settings?type=project&scope_id=1` — returns project 1 settings
- `GET /api/settings?type=user&scope_id=5` — returns user 5 settings
- `GET /api/settings?type=user_project_override&scope_id=5&project_id=1` — returns user 5's project 1 override

**Response:** `200`
```json
{
  "data": {
    "id": 10,
    "type": "project",
    "scope_id": 1,
    "name": "Project AI Settings",
    "config": { "ai": { "temperature": 0.5, "tone": "technical" } },
    "created_at": "...",
    "updated_at": "..."
  }
}
```

### PUT /api/settings/:id
**Request:** `{ "config": { "ai": { "temperature": 0.7 } } }`
Partial update — merges with existing config.

### POST /api/settings
Create new settings entry.
**Request:**
```json
{ "type": "project", "scope_id": 1, "name": "Project Settings", "config": {...} }
```

---

## AI Chat & RAG

### POST /ai/chat
Create AI chat session and get response.
**Request:**
```json
{
  "project_id": 1,
  "agent_type": "backlog-assistant",
  "message": "Create a subtask for implementing login",
  "context": { "task_id": 42 }
}
```
**Response:** `200`
```json
{
  "data": {
    "session_id": 50,
    "message": {
      "id": 500,
      "role": "assistant",
      "content": "I've created a subtask: 'Implement login form UI'",
      "model": "deepseek-chat",
      "tokens_used": 145
    }
  }
}
```
**Side effects:** Creates AIChatSession and AIChatMessage records for RAG.

### GET /ai/sessions
Query params: `?project_id=1&agent_type=backlog-assistant&limit=20&offset=0`
**Response:** `200`

### GET /ai/sessions/:id/messages
Query params: `?limit=50&offset=0`
**Response:** `200`

### POST /ai/transcribe
Transcribe audio to text.
**Request:** `{ "voice_session_id": 7 }` or `{ "file": binary }`
**Response:** `202`
```json
{
  "data": {
    "id": 30,
    "text": "Yesterday I worked on OAuth...",
    "tokens_used": 250
  }
}
```

### GET /ai/search
Semantic search over RAG data.
**Request:** `{ "project_id": 1, "query": "OAuth implementation blockers", "limit": 5 }`
**Response:** `200`
```json
{
  "data": [
    { "type": "chat_message", "id": 500, "content": "...", "similarity": 0.87 },
    { "type": "transcription", "id": 30, "content": "...", "similarity": 0.82 }
  ]
}
```

---

## Subscriptions & Credits

### GET /subscription
Get current user's subscription.
**Response:** `200`
```json
{
  "data": {
    "id": 1,
    "user_id": 1,
    "plan": "pro",
    "status": "active",
    "credits_remaining": 42.50,
    "billing_cycle": "monthly",
    "current_period_start": "2024-06-01",
    "current_period_end": "2024-06-30"
  }
}
```

### PUT /subscription
Upgrade, downgrade, or change billing cycle.
**Request:** `{ "plan": "enterprise", "billing_cycle": "annual" }`

### GET /subscription/credits
**Response:** `200`
```json
{
  "data": {
    "credits_remaining": 42.50,
    "credits_used_this_period": 7.50,
    "next_refresh": "2024-07-01"
  }
}
```

---

## API Keys (Vault)

### GET /api-keys
List user's API keys (no secret values).
**Response:** `200`
```json
{
  "data": [
    { "id": 1, "provider": "deepseek", "public_alias": "My Key", "is_shared": true, "allow_project_share": true, "max_credit_per_user": 10.00, "created_at": "..." },
    { "id": 2, "provider": "openai", "public_alias": "Backup", "is_shared": false, "allow_project_share": false, "created_at": "..." }
  ]
}
```

### POST /api-keys
Create new API key. Backend stores encrypted value, returns only alias.
**Request:** `{ "provider": "deepseek", "api_key": "sk-...", "public_alias": "My DeepSeek", "is_shared": false, "allow_project_share": false }`
**Response:** `201`
```json
{
  "data": { "id": 3, "provider": "deepseek", "public_alias": "My DeepSeek", "is_shared": false }
}
```

### PUT /api-keys/:id
Update alias or sharing settings. Cannot update the actual key.
**Request:** `{ "public_alias": "Updated Name", "allow_project_share": true, "max_credit_per_user": 15.00 }`

### DELETE /api-keys/:id
**Response:** `204`

---

## Notifications

### GET /notifications
Query params: `?read=false&limit=20&offset=0`
**Response:** `200`

### PUT /notifications/:id/read
Mark single notification as read.
**Response:** `200`

### PUT /notifications/read-all
Mark all notifications as read.
**Response:** `200`

### GET /notification-preferences
**Response:** `200`
```json
{ "data": [
  { "type": "email", "enabled": true },
  { "type": "push", "enabled": true },
  { "type": "in_app", "enabled": true }
]}
```

### PUT /notification-preferences
**Request:** `{ "email": true, "push": false, "in_app": true }`

---

## Priority Order for Implementation

### Phase 1 — Core (Must Have)
1. **Tasks CRUD + Filtering** — All task types unified
2. **Status (Kanban)** — Board columns with drag-drop
3. **Projects + Members** — Basic project management
4. **Sprints** — Sprint lifecycle
5. **Settings (Basic)** — Theme, notifications

### Phase 2 — Collaboration
6. **Chatroom + Channels** — Text messaging
7. **Messages + Real-time (WS)** — Live chat
8. **Comments + Attachments** — Task discussions
9. **Daily Standups** — Scheduling + transcription

### Phase 3 — AI Features
10. **AI Chat** — Backlog assistant, chat
11. **RAG Search** — Semantic search
12. **Retrospectives** — AI-assisted reviews

### Phase 4 — Polish
13. **Subscriptions + Credits** — Payment flow
14. **API Keys** — User key management
15. **Voice Sessions** — WebRTC + transcriptions
16. **Advanced Notifications** — Push, email

---

## WebSocket Endpoints

### WS /ws/projects/:projectId/chat
Real-time chat messages.
```json
{ "event": "message:new", "data": { "channel_id": 3, "content": "Hello", "user_id": 5 } }
{ "event": "message:delete", "data": { "message_id": 1024 } }
{ "event": "user:join", "data": { "channel_id": 5, "user_id": 5 } }
{ "event": "user:leave", "data": { "channel_id": 5, "user_id": 5 } }
```

### WS /ws/voice/:sessionId
Real-time voice state.
```json
{ "event": "participant:join", "data": { "user_id": 5, "joined_at": "..." } }
{ "event": "participant:leave", "data": { "user_id": 5, "left_at": "..." } }
{ "event": "session:end", "data": { "ended_at": "..." } }
```

---

## Implementation Notes

### Database Considerations
- Settings `scope_id` uses separate fields: `user_id` and `project_id` (not composite key)
- Task `parent_id` allows recursive queries via CTE or closure table
- Message pagination uses cursor-based for performance
- AIChatMessage.token_usage for per-user spending tracking

### Caching Layers
- Redis for session data, real-time presence
- CDN for static assets and attachments
- Database query caching for project stats (60s TTL)

### File Storage
- Attachments stored in S3-compatible storage
- Presigned URLs for upload/download (15 min expiry)
- Max upload size: 10MB

### Security
- JWT tokens with 24h expiry
- Refresh token rotation
- API key never logged or exposed in responses
- Input sanitization for markdown content
- Rate limiting per user/IP