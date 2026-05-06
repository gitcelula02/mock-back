# CHANGES.md

## Changes Made (2026-05-06)

---

## 1. Fixed `GET /api/tasks/:id` endpoint to include comments

### Problem
The `GET /api/tasks/:id` endpoint was returning only the raw task data without related resources, even when the `?include=comments` query parameter was provided.

### Solution
Added custom middleware in `server.js` (line 53-68) to handle `GET /api/tasks/:id` requests with `?include=comments`.

### Usage
```
GET /api/tasks/:id?include=comments
```

### Response Format
```json
{
  "data": {
    "id": 1,
    "title": "Task Title",
    "comments": [
      {
        "id": 1,
        "task_id": 1,
        "user_id": 2,
        "content": "Comment text",
        "created_at": "...",
        "user": {
          "id": 2,
          "username": "maria_dev",
          "avatar_url": "..."
        }
      }
    ]
  }
}
```

---

## 2. Added comments to all tasks

### Summary
Added realistic comments to all 16 tasks in the database. Previously, only 3 tasks had comments.

### Comments Distribution
| Task ID | Comments Count |
|---------|---------------|
| 1 | 1 |
| 2 | 2 |
| 3 | 1 |
| 4 | 2 |
| 5 | 1 |
| 6 | 1 |
| 7 | 2 |
| 8 | 1 |
| 9 | 2 |
| 10 | 2 |
| 11 | 2 |
| 12 | 2 |
| 13 | 1 |
| 14 | 2 |
| 15 | 2 |
| 16 | 2 |

**Total comments added: 26 (from 3 to 26)**

---

## 3. Documentation - Comments Entity Details

### Entity Type
**Comments is an EXISTING entity** defined in `docs/ERD.md` (lines 338-362).

### Database Technology
This is a **NoSQL (LowDB/JSON)** mock database. The `comments` collection is stored as a JSON array in `db.json`.

For a production SQL implementation, the Comment entity would be:
```sql
CREATE TABLE comments (
  id INT PRIMARY KEY,
  task_id INT NOT NULL REFERENCES tasks(id),
  user_id INT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Comment Entity Schema
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary Key |
| task_id | INT | Foreign Key → Task |
| user_id | INT | Foreign Key → User (author) |
| content | String | Comment content (markdown) |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |

### Relationship
- **Task → Comment**: One-to-Many (one task can have many comments)
- **User → Comment**: One-to-Many (one user can author many comments)

---

## Files Modified

| File | Change |
|------|--------|
| `server.js` | Added custom handler for `GET /api/tasks/:id` with `?include=comments` support |
| `db.json` | Expanded comments collection from 3 to 26 comments across all tasks |

---

## Notes

- The `?include=comments` parameter supports multiple includes (e.g., `?include=comments,assignees`)
- Comments are enriched with author information (username, avatar_url) when included
- The mock server uses LowDB which stores data as JSON files (NoSQL document store)