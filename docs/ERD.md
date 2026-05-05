# Entity-Relationship Diagram

This document defines the pure data structure and relationships. No technology specified — SQL vs NoSQL is an implementation detail. JSON examples show API response format.

---

## Core Entities

### User

**Purpose:** Authentication and profile management

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary Key |
| username | String | Unique, used for display |
| email | String | Unique |
| password_hash | String | Hashed password |
| avatar_url | String | Profile picture URL |
| default_language | String | User preference (e.g., "en", "es") |
| created_at | DateTime | Account creation timestamp |
| updated_at | DateTime | Last update timestamp |

**Relationships:**
- One User can have many SCRUMRolePreferences (one-to-many)
- One User can belong to many Projects (many-to-many via ProjectMember)
- One User can create many ApiKeyVaults (one-to-many)
- One User can have one Subscription (one-to-one)
- One User can have many Notifications (one-to-many)

**JSON Example:**
```json
{
  "id": 1,
  "username": "john_dev",
  "email": "john@example.com",
  "avatar_url": "https://cdn.scrumhub.io/avatars/abc123.jpg",
  "default_language": "en",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-06-20T14:22:00Z"
}
```

---

### SCRUMRolePreference

**Purpose:** User's preferred SCRUM roles (one-to-many per user)

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary Key |
| user_id | INT | Foreign Key → User |
| role_type | String | "product_owner" / "scrum_master" / "qa" / "developer" / "tester" / "devops" / "tech_lead" |
| specialization | String | Optional (e.g., "frontend", "backend", "react", "node") |
| is_primary | Boolean | This is the user's main role for the project |

**JSON Example:**
```json
[
  { "id": 1, "user_id": 1, "role_type": "developer", "specialization": "frontend", "is_primary": true },
  { "id": 2, "user_id": 1, "role_type": "qa", "specialization": null, "is_primary": false }
]
```

---

### Project

**Purpose:** Container for all project data

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary Key |
| name | String | Project name |
| description | String | Markdown description |
| color | String | User-defined hex color for entity theme |
| status | String | "active" / "archived" / "completed" |
| created_by_user_id | INT | Foreign Key → User (project creator = first admin) |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |

**Relationships:**
- One Project has many ProjectMembers (one-to-many)
- One Project has many Tasks (one-to-many)
- One Project has many Sprints (one-to-many)
- One Project has one Chatroom (one-to-one)
- One Project has many Settings (one-to-many, polymorphic)

**JSON Example:**
```json
{
  "id": 1,
  "name": "ScrumHub Frontend",
  "description": "# Project Overview\n\nBuilding the React frontend...",
  "color": "#3B6D11",
  "status": "active",
  "created_by_user_id": 1,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-06-20T14:22:00Z"
}
```

---

### ProjectMember

**Purpose:** Join table for User ↔ Project many-to-many relationship

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary Key |
| project_id | INT | Foreign Key → Project |
| user_id | INT | Foreign Key → User |
| scrum_role | String | User's role in this project |
| is_admin | Boolean | User is project admin (can manage settings, invite users) |
| joined_at | DateTime | When user joined the project |

**JSON Example:**
```json
{
  "id": 1,
  "project_id": 1,
  "user_id": 5,
  "scrum_role": "developer",
  "is_admin": false,
  "joined_at": "2024-02-01T09:00:00Z"
}
```

---

### Task

**Purpose:** Single unified entity for Epic, User Story, Task, and Subtask (distinguished by `type` field)

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary Key |
| project_id | INT | Foreign Key → Project |
| parent_id | INT | Foreign Key → Task (null if no parent, enables subtasks) |
| sprint_id | INT | Foreign Key → Sprint (nullable, task may be backlog-only) |
| type | String | "epic" / "story" / "task" |
| title | String | Task title |
| description | String | Markdown description |
| priority | String | "low" / "medium" / "high" / "urgent" |
| status_id | INT | Foreign Key → Status |
| index | INT | Hierarchy level (16-byte INT for NoSQL-like traversal) |
| due_date | DateTime | Due date |
| created_by_user_id | INT | Foreign Key → User (creator) |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |

**Relationships:**
- One Task has many TaskAssignees (one-to-many)
- One Task has many TaskDependencies (one-to-many, as the dependent task)
- One Task has many AcceptanceCriteria (one-to-many)
- One Task has many Comments (one-to-many)
- One Task has many Attachments (one-to-many)
- One Task belongs to one Status (many-to-one)

**JSON Example:**
```json
{
  "id": 42,
  "project_id": 1,
  "parent_id": null,
  "sprint_id": 3,
  "type": "epic",
  "title": "User Authentication System",
  "description": "Implement complete auth flow including OAuth",
  "priority": "high",
  "status_id": 2,
  "index": 1,
  "due_date": "2024-07-15T00:00:00Z",
  "created_by_user_id": 1,
  "created_at": "2024-01-20T10:00:00Z",
  "updated_at": "2024-06-18T16:30:00Z"
}
```

---

### TaskAssignee

**Purpose:** Join table for Task ↔ User many-to-many. Supports cascade override for subtasks.

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary Key |
| task_id | INT | Foreign Key → Task |
| user_id | INT | Foreign Key → User |
| is_cascade_override | Boolean | True if explicitly assigned (not inherited from parent) |

**JSON Example:**
```json
{
  "id": 15,
  "task_id": 42,
  "user_id": 5,
  "is_cascade_override": false
}
```

---

### TaskDependency

**Purpose:** Task cannot start until dependency is completed

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary Key |
| task_id | INT | Foreign Key → Task (the dependent task) |
| depends_on_task_id | INT | Foreign Key → Task (the blocking task) |
| dependency_type | String | "blocks_start" / "blocks_completion" |

**JSON Example:**
```json
{
  "id": 3,
  "task_id": 55,
  "depends_on_task_id": 42,
  "dependency_type": "blocks_start"
}
```

---

### Status

**Purpose:** Kanban board columns, user-customizable per project

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary Key |
| project_id | INT | Foreign Key → Project |
| name | String | Status name (e.g., "To Do", "In Progress", "Testing") |
| color | String | User-defined hex color |
| associated_role | String | SCRUM role that "owns" this status (e.g., "qa" for "Testing") |
| order | INT | Column ordering |
| is_active | Boolean | Soft delete flag |

**JSON Example:**
```json
{
  "id": 2,
  "project_id": 1,
  "name": "In Progress",
  "color": "#3B82F6",
  "associated_role": "developer",
  "order": 2,
  "is_active": true
}
```

---

### Sprint

**Purpose:** Time-boxed container for tasks

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary Key |
| project_id | INT | Foreign Key → Project |
| name | String | Sprint name |
| description | String | Markdown description |
| color | String | User-defined hex color |
| start_date | Date | Sprint start |
| end_date | Date | Sprint end |
| created_by_user_id | INT | Foreign Key → User |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |

**Relationships:**
- One Sprint has one Retrospective (one-to-one)
- One Sprint has many Tasks (one-to-many)
- One Sprint has many DailyStandups (one-to-many)

**JSON Example:**
```json
{
  "id": 3,
  "project_id": 1,
  "name": "Sprint 4",
  "description": "Focus on auth and user settings",
  "color": "#8B5CF6",
  "start_date": "2024-06-17",
  "end_date": "2024-06-28",
  "created_by_user_id": 1,
  "created_at": "2024-06-10T10:00:00Z",
  "updated_at": "2024-06-10T10:00:00Z"
}
```

---

### AcceptanceCriteria

**Purpose:** QA-managed checklist items required for task completion

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary Key |
| task_id | INT | Foreign Key → Task |
| description | String | Criterion description |
| is_marked | Boolean | QA has marked this complete |
| created_by_user_id | INT | Foreign Key → User |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |

**JSON Example:**
```json
{
  "id": 8,
  "task_id": 42,
  "description": "OAuth2 flow completes successfully",
  "is_marked": true,
  "created_by_user_id": 3,
  "created_at": "2024-01-20T10:00:00Z",
  "updated_at": "2024-06-15T11:30:00Z"
}
```

---

### Comment

**Purpose:** Task discussion

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary Key |
| task_id | INT | Foreign Key → Task |
| user_id | INT | Foreign Key → User |
| content | String | Comment content (markdown) |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |

**JSON Example:**
```json
{
  "id": 12,
  "task_id": 42,
  "user_id": 5,
  "content": "I've started working on the OAuth integration. Should be ready by Thursday.",
  "created_at": "2024-06-18T09:15:00Z",
  "updated_at": "2024-06-18T09:15:00Z"
}
```

---

### Attachment

**Purpose:** Task files

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary Key |
| task_id | INT | Foreign Key → Task |
| user_id | INT | Foreign Key → User (uploader) |
| filename | String | Original filename |
| url | String | Storage URL |
| mime_type | String | MIME type |
| size_bytes | INT | File size |
| created_at | DateTime | Upload timestamp |

**JSON Example:**
```json
{
  "id": 4,
  "task_id": 42,
  "user_id": 5,
  "filename": "wireframe-v2.png",
  "url": "https://storage.scrumhub.io/attachments/xyz789.png",
  "mime_type": "image/png",
  "size_bytes": 245632,
  "created_at": "2024-06-17T14:20:00Z"
}
```

---

## Chatroom Entities

### Chatroom

**Purpose:** Project's Discord-like chat interface

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary Key |
| project_id | INT | Foreign Key → Project (one-to-one) |
| name | String | Chatroom name |
| created_at | DateTime | Creation timestamp |

**Relationships:**
- One Chatroom has many Channels (one-to-many)
- One Chatroom has one DailyStandup (one-to-one, the default "Daily" channel)

**JSON Example:**
```json
{
  "id": 1,
  "project_id": 1,
  "name": "ScrumHub Frontend Chat",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

### Channel

**Purpose:** Text or voice channel within a chatroom

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary Key |
| chatroom_id | INT | Foreign Key → Chatroom |
| type | String | "text" / "voice" |
| name | String | Channel name |
| order | INT | Display order |
| is_default | Boolean | True if this is the "Daily" standup channel |
| is_active | Boolean | Soft delete flag |

**JSON Example:**
```json
{
  "id": 5,
  "chatroom_id": 1,
  "type": "voice",
  "name": "Daily",
  "order": 0,
  "is_default": true,
  "is_active": true
}
```

---

### Message

**Purpose:** Text channel messages

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary Key |
| channel_id | INT | Foreign Key → Channel |
| user_id | INT | Foreign Key → User (sender) |
| content | String | Message content (markdown) |
| created_at | DateTime | Sent timestamp |

**JSON Example:**
```json
{
  "id": 1024,
  "channel_id": 3,
  "user_id": 5,
  "content": "Quick update: OAuth flow is 80% done, should finish tomorrow morning.",
  "created_at": "2024-06-18T10:30:00Z"
}
```

---

### VoiceSession

**Purpose:** Real-time voice call in a channel

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary Key |
| channel_id | INT | Foreign Key → Channel |
| status | String | "active" / "ended" |
| started_at | DateTime | Call start |
| ended_at | DateTime | Call end (nullable if active) |

**Relationships:**
- One VoiceSession has many VoiceSessionParticipants (one-to-many)

**JSON Example:**
```json
{
  "id": 7,
  "channel_id": 5,
  "status": "ended",
  "started_at": "2024-06-18T09:00:00Z",
  "ended_at": "2024-06-18T09:25:00Z"
}
```

---

### VoiceSessionParticipant

**Purpose:** Track who joined a voice session

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary Key |
| voice_session_id | INT | Foreign Key → VoiceSession |
| user_id | INT | Foreign Key → User |
| joined_at | DateTime | When user joined |
| left_at | DateTime | When user left (nullable if still in call) |

**JSON Example:**
```json
{
  "id": 22,
  "voice_session_id": 7,
  "user_id": 5,
  "joined_at": "2024-06-18T09:00:00Z",
  "left_at": "2024-06-18T09:25:00Z"
}
```

---

## AI & Settings Entities

### Settings

**Purpose:** Polymorphic settings entity. One row per scope context.

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary Key |
| type | String | "general" / "project" / "user" / "user_project_override" |
| scope_id | INT | project_id or user_id or {user_id,project_id} depending on type |
| name | String | Settings name/identifier |
| config | JSON | Full configuration object |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |

**Config JSON Structure:**
```json
{
  "general": {
    "theme": "dark",
    "language": "en",
    "notifications": { "email": true, "push": true, "in_app": true }
  },
  "ai": {
    "default_model": "deepseek-chat",
    "models_per_capability": { "chat": "deepseek-chat", "code": "deepseek-coder" },
    "temperature": 0.7,
    "tone": "professional",
    "system_prompt": "You are a helpful Scrum assistant...",
    "language": "en",
    "skills": ["retrospective", "backlog-optimization"],
    "tools": ["web-search"]
  },
  "agents": {
    "backlog-assistant": {
      "enabled": true,
      "system_prompt": "You help manage backlogs...",
      "model": "deepseek-chat",
      "temperature": 0.7
    }
  }
}
```

**JSON Example (Project Settings):**
```json
{
  "id": 10,
  "type": "project",
  "scope_id": 1,
  "name": "Project AI Settings",
  "config": {
    "ai": {
      "default_model": "deepseek-chat",
      "temperature": 0.5,
      "tone": "technical"
    }
  },
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-06-01T08:00:00Z"
}
```

---

### ApiKeyVault

**Purpose:** Secure storage for encrypted API keys

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary Key |
| user_id | INT | Foreign Key → User (creator) |
| provider | String | "deepseek" / "openai" / "anthropic" |
| encrypted_value | String | Encrypted key value (never stored plaintext) |
| public_alias | String | User-defined name (shown in UI) |
| is_shared | Boolean | Key is shared with other users |
| allow_project_share | Boolean | Project admin can share with project members |
| max_credit_per_user | Decimal | Max credits a single user can expend when using shared key |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |

**JSON Example:**
```json
{
  "id": 1,
  "user_id": 1,
  "provider": "deepseek",
  "encrypted_value": "enc_a7f8b2c3...",
  "public_alias": "My DeepSeek Key",
  "is_shared": true,
  "allow_project_share": true,
  "max_credit_per_user": 10.00,
  "created_at": "2024-03-01T12:00:00Z",
  "updated_at": "2024-03-01T12:00:00Z"
}
```

---

### Subscription

**Purpose:** User's plan and credit tracking

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary Key |
| user_id | INT | Foreign Key → User (one-to-one) |
| plan | String | "free" / "starter" / "pro" / "enterprise" |
| status | String | "active" / "cancelled" / "past_due" |
| credits_remaining | Decimal | Available credits |
| billing_cycle | String | "monthly" / "annual" |
| current_period_start | Date | Billing period start |
| current_period_end | Date | Billing period end |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |

**JSON Example:**
```json
{
  "id": 1,
  "user_id": 1,
  "plan": "pro",
  "status": "active",
  "credits_remaining": 42.50,
  "billing_cycle": "monthly",
  "current_period_start": "2024-06-01T00:00:00Z",
  "current_period_end": "2024-06-30T23:59:59Z",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-06-15T14:00:00Z"
}
```

---

### NotificationPreference

**Purpose:** User notification settings (separate from general Settings)

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary Key |
| user_id | INT | Foreign Key → User |
| type | String | "email" / "push" / "in_app" |
| enabled | Boolean | Notification type enabled |

**JSON Example:**
```json
[
  { "id": 1, "user_id": 1, "type": "email", "enabled": true },
  { "id": 2, "user_id": 1, "type": "push", "enabled": true },
  { "id": 3, "user_id": 1, "type": "in_app", "enabled": true }
]
```

---

### Notification

**Purpose:** User notification records

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary Key |
| user_id | INT | Foreign Key → User |
| type | String | Notification type |
| title | String | Notification title |
| message | String | Notification body |
| read | Boolean | Has user read this |
| link | String | Optional deep link URL |
| created_at | DateTime | Creation timestamp |

**JSON Example:**
```json
{
  "id": 100,
  "user_id": 5,
  "type": "in_app",
  "title": "Task assigned to you",
  "message": "You have been assigned to 'Implement OAuth flow' in ScrumHub Frontend",
  "read": false,
  "link": "/projects/1/tasks/42",
  "created_at": "2024-06-18T10:00:00Z"
}
```

---

## AI Conversation & RAG Entities

### AIChatSession

**Purpose:** AI conversation context, scoped per project for per-user spending tracking

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary Key |
| user_id | INT | Foreign Key → User (who initiated) |
| project_id | INT | Foreign Key → Project (nullable for global) |
| agent_type | String | "backlog-assistant" / "chat-assistant" / "retrospective-agent" |
| created_at | DateTime | Session start |
| updated_at | DateTime | Last message |

**Relationships:**
- One AIChatSession has many AIChatMessages (one-to-many)

**JSON Example:**
```json
{
  "id": 50,
  "user_id": 5,
  "project_id": 1,
  "agent_type": "backlog-assistant",
  "created_at": "2024-06-18T09:00:00Z",
  "updated_at": "2024-06-18T09:30:00Z"
}
```

---

### AIChatMessage

**Purpose:** Individual message in AI conversation (for RAG vectorization)

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary Key |
| session_id | INT | Foreign Key → AIChatSession |
| role | String | "user" / "assistant" |
| content | String | Message content |
| model | String | Model used for this message |
| tokens_used | INT | Token consumption |
| created_at | DateTime | Timestamp |

**JSON Example:**
```json
{
  "id": 500,
  "session_id": 50,
  "role": "user",
  "content": "Create a subtask for implementing the login form UI",
  "model": "deepseek-chat",
  "tokens_used": 45,
  "created_at": "2024-06-18T09:05:00Z"
}
```

---

### AITranscription

**Purpose:** Voice transcription records (RAG-stored for AI context)

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary Key |
| voice_session_id | INT | Foreign Key → VoiceSession (nullable if manual) |
| daily_standup_id | INT | Foreign Key → DailyStandup (nullable) |
| user_id | INT | Foreign Key → User |
| project_id | INT | Foreign Key → Project |
| text | String | Transcribed text |
| created_at | DateTime | Transcription timestamp |

**JSON Example:**
```json
{
  "id": 30,
  "voice_session_id": 7,
  "daily_standup_id": 2,
  "user_id": 5,
  "project_id": 1,
  "text": "Yesterday I worked on the OAuth integration. Today I'll finish the callback handler and start on the token refresh logic. No blockers.",
  "created_at": "2024-06-18T09:25:00Z"
}
```

---

## Standup & Retrospective Entities

### DailyStandup

**Purpose:** Daily standup scheduling and tracking (always transcribed for AI)

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary Key |
| project_id | INT | Foreign Key → Project |
| channel_id | INT | Foreign Key → Channel (the "Daily" voice channel) |
| scheduled_at | DateTime | Scheduled time |
| voice_session_id | INT | Foreign Key → VoiceSession (nullable until held) |
| state_summary | String | AI-generated summary of current state |
| stoppers_detected | JSON | Array of detected blockers |
| expected_latencies | JSON | Array of expected delays |
| notes | String | Additional AI notes |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |

**JSON Example:**
```json
{
  "id": 2,
  "project_id": 1,
  "channel_id": 5,
  "scheduled_at": "2024-06-19T09:00:00Z",
  "voice_session_id": null,
  "state_summary": "Team is on track. OAuth feature at 80% completion.",
  "stoppers_detected": [],
  "expected_latencies": [],
  "notes": "No major blockers reported.",
  "created_at": "2024-06-18T20:00:00Z",
  "updated_at": "2024-06-18T20:00:00Z"
}
```

---

### Retrospective

**Purpose:** Sprint retrospective (NoSQL structure with custom sections)

**Attributes:**
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary Key |
| sprint_id | INT | Foreign Key → Sprint (one-to-one) |
| title | String | Retro title |
| description | String | Markdown description |
| sections | JSON | Array of section objects |
| created_by_user_id | INT | Foreign Key → User |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |

**Sections JSON Structure:**
```json
[
  { "type": "what_went_wrong", "content": "...", "order": 1 },
  { "type": "what_went_good", "content": "...", "order": 2 },
  { "type": "improvements", "content": "...", "order": 3 },
  { "type": "action_items", "content": "...", "order": 4 }
]
```

**JSON Example:**
```json
{
  "id": 1,
  "sprint_id": 3,
  "title": "Sprint 3 Retrospective",
  "description": "Our third sprint retrospective focusing on frontend delivery",
  "sections": [
    { "type": "what_went_wrong", "content": "API integration took longer than expected due to authentication issues", "order": 1 },
    { "type": "what_went_good", "content": "Team collaboration was excellent, daily standups were productive", "order": 2 },
    { "type": "improvements", "content": "Need better upfront estimation for auth flows", "order": 3 },
    { "type": "action_items", "content": "- Schedule auth spike before next sprint\n- Create shared test fixtures for API", "order": 4 }
  ],
  "created_by_user_id": 1,
  "created_at": "2024-06-28T16:00:00Z",
  "updated_at": "2024-06-28T17:30:00Z"
}
```

---

## Entity Relationship Summary

```
User
├── SCRUMRolePreference (1→many)
├── ProjectMember (1→many)
├── ApiKeyVault (1→many)
├── Subscription (1→1)
├── Notification (1→many)
├── NotificationPreference (1→many)
├── AIChatSession (1→many)
│   └── AIChatMessage (1→many)
└── AITranscription (1→many)

Project
├── ProjectMember (1→many)
├── Task (1→many)
├── Sprint (1→many)
├── Chatroom (1→1)
│   ├── Channel (1→many)
│   │   ├── Message (1→many)
│   │   ├── VoiceSession (1→many)
│   │   │   └── VoiceSessionParticipant (1→many)
│   │   └── DailyStandup (1→1)
│   │       └── AITranscription (1→many)
│   └── DailyStandup (1→1)
├── Settings (1→many, polymorphic)
└── AITranscription (1→many)

Sprint
├── Task (1→many)
└── Retrospective (1→1)

Task
├── TaskAssignee (1→many)
├── TaskDependency (1→many, as dependent)
├── TaskDependency (1→many, as blocker)
├── AcceptanceCriteria (1→many)
├── Comment (1→many)
└── Attachment (1→many)
```

---

## Implementation Notes

### On SQL vs NoSQL
- **SQL approach**: Use `parent_id` with recursive CTEs or closure table for task hierarchy
- **NoSQL approach**: Use `index` field with array-style traversal (as defined in TRUTH.md)
- **Hybrid**: Tasks stored in SQL with `index` field for hierarchical queries

### On RAG Vectorization
- AIChatMessage.content → vectorized for semantic search
- AITranscription.text → vectorized for context retrieval
- Task.description, AcceptanceCriteria.description → vectorized for AI context
- Retrospective.sections → vectorized for report generation

### On Settings Polymorphism
Settings.type determines interpretation of scope_id:
- `general`: scope_id is NULL
- `project`: scope_id = project_id
- `user`: scope_id = user_id
- `user_project_override`: scope_id = combined (stored as JSON or composite key)