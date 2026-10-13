import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;
const WS_PORT = process.env.WS_PORT || 5001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const db = new sqlite3.Database(':memory:');

// WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ port: WS_PORT });
const connectedClients = new Set();

// Broadcast message to all connected WebSocket clients
function broadcastMessage(data) {
  connectedClients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(JSON.stringify(data));
    }
  });
}

// Initialize database
db.serialize(() => {
  db.run(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      fullName TEXT,
      role TEXT DEFAULT 'member',
      avatar TEXT,
      registrationDate TEXT NOT NULL,
      status TEXT DEFAULT 'active'
    )
  `);

  db.run(`
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      ownerId TEXT NOT NULL,
      createdDate TEXT NOT NULL,
      dueDate TEXT,
      status TEXT DEFAULT 'active',
      visibility TEXT DEFAULT 'private',
      color TEXT DEFAULT '#667eea',
      FOREIGN KEY (ownerId) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE projectMembers (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      userId TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      joinedDate TEXT NOT NULL,
      FOREIGN KEY (projectId) REFERENCES projects(id),
      FOREIGN KEY (userId) REFERENCES users(id),
      UNIQUE(projectId, userId)
    )
  `);

  db.run(`
    CREATE TABLE tasks (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'todo',
      priority TEXT DEFAULT 'medium',
      assignedTo TEXT,
      dueDate TEXT,
      createdBy TEXT NOT NULL,
      createdDate TEXT NOT NULL,
      updatedDate TEXT,
      completedDate TEXT,
      estimatedHours REAL,
      actualHours REAL,
      tags TEXT,
      FOREIGN KEY (projectId) REFERENCES projects(id),
      FOREIGN KEY (assignedTo) REFERENCES users(id),
      FOREIGN KEY (createdBy) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE subtasks (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      createdDate TEXT NOT NULL,
      completedDate TEXT,
      FOREIGN KEY (taskId) REFERENCES tasks(id)
    )
  `);

  db.run(`
    CREATE TABLE comments (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      userId TEXT NOT NULL,
      text TEXT NOT NULL,
      createdDate TEXT NOT NULL,
      updatedDate TEXT,
      FOREIGN KEY (taskId) REFERENCES tasks(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE attachments (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      fileName TEXT NOT NULL,
      fileUrl TEXT NOT NULL,
      uploadedBy TEXT NOT NULL,
      uploadedDate TEXT NOT NULL,
      FOREIGN KEY (taskId) REFERENCES tasks(id),
      FOREIGN KEY (uploadedBy) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE taskActivity (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      userId TEXT NOT NULL,
      activityType TEXT NOT NULL,
      description TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (taskId) REFERENCES tasks(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE notifications (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      taskId TEXT,
      read INTEGER DEFAULT 0,
      createdDate TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (taskId) REFERENCES tasks(id)
    )
  `);

  console.log('Task Manager Database initialized successfully');
});

// WebSocket connection handler
wss.on('connection', (ws) => {
  connectedClients.add(ws);
  console.log(`Client connected. Total clients: ${connectedClients.size}`);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('Received message:', message.type);
      broadcastMessage({ type: 'notification', data: message });
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    connectedClients.delete(ws);
    console.log(`Client disconnected. Total clients: ${connectedClients.size}`);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// ============ USER ENDPOINTS ============

// Register user
app.post('/api/users/register', (req, res) => {
  const { username, email, password, fullName } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  const id = uuidv4();
  const registrationDate = new Date().toISOString();

  db.run(
    `INSERT INTO users (id, username, email, password, fullName, registrationDate, status)
     VALUES (?, ?, ?, ?, ?, ?, 'active')`,
    [id, username, email, password, fullName, registrationDate],
    (err) => {
      if (err) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }
      res.status(201).json({
        id,
        username,
        email,
        fullName,
        registrationDate,
        status: 'active',
      });
    }
  );
});

// Get all users
app.get('/api/users', (req, res) => {
  db.all('SELECT id, username, email, fullName, role, status FROM users ORDER BY registrationDate DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get user by ID
app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT id, username, email, fullName, role, avatar, status FROM users WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'User not found' });
    res.json(row);
  });
});

// Update user
app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { fullName, avatar, role } = req.body;

  db.run(
    'UPDATE users SET fullName = ?, avatar = ?, role = ? WHERE id = ?',
    [fullName, avatar, role, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'User updated successfully' });
    }
  );
});

// ============ PROJECT ENDPOINTS ============

// Create project
app.post('/api/projects', (req, res) => {
  const { name, description, ownerId, dueDate, visibility } = req.body;

  if (!name || !ownerId) {
    return res.status(400).json({ error: 'Name and owner ID are required' });
  }

  const id = uuidv4();
  const createdDate = new Date().toISOString();

  db.run(
    `INSERT INTO projects (id, name, description, ownerId, createdDate, dueDate, visibility)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, name, description, ownerId, createdDate, dueDate, visibility || 'private'],
    (err) => {
      if (err) {
        return res.status(400).json({ error: 'Invalid data' });
      }

      // Add owner as project member
      const memberId = uuidv4();
      db.run(
        `INSERT INTO projectMembers (id, projectId, userId, role, joinedDate)
         VALUES (?, ?, ?, 'owner', ?)`,
        [memberId, id, ownerId, createdDate],
        () => {
          res.status(201).json({
            id,
            name,
            description,
            ownerId,
            createdDate,
            dueDate,
            visibility: visibility || 'private',
            status: 'active',
          });
        }
      );
    }
  );
});

// Get all projects for user
app.get('/api/users/:userId/projects', (req, res) => {
  const { userId } = req.params;
  db.all(
    `SELECT p.* FROM projects p
     JOIN projectMembers pm ON p.id = pm.projectId
     WHERE pm.userId = ? OR p.ownerId = ?
     ORDER BY p.createdDate DESC`,
    [userId, userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Get project details
app.get('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM projects WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Project not found' });
    res.json(row);
  });
});

// Update project
app.put('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, dueDate, status, visibility } = req.body;

  db.run(
    'UPDATE projects SET name = ?, description = ?, dueDate = ?, status = ?, visibility = ? WHERE id = ?',
    [name, description, dueDate, status, visibility, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      broadcastMessage({ type: 'project_updated', projectId: id });
      res.json({ message: 'Project updated successfully' });
    }
  );
});

// Add member to project
app.post('/api/projects/:projectId/members', (req, res) => {
  const { projectId } = req.params;
  const { userId, role } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const id = uuidv4();
  const joinedDate = new Date().toISOString();

  db.run(
    `INSERT INTO projectMembers (id, projectId, userId, role, joinedDate)
     VALUES (?, ?, ?, ?, ?)`,
    [id, projectId, userId, role || 'member', joinedDate],
    (err) => {
      if (err) {
        return res.status(400).json({ error: 'User already a member or invalid data' });
      }
      res.status(201).json({ id, projectId, userId, role: role || 'member', joinedDate });
    }
  );
});

// Get project members
app.get('/api/projects/:projectId/members', (req, res) => {
  const { projectId } = req.params;
  db.all(
    `SELECT pm.*, u.username, u.email, u.fullName, u.avatar
     FROM projectMembers pm
     JOIN users u ON pm.userId = u.id
     WHERE pm.projectId = ?`,
    [projectId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ============ TASK ENDPOINTS ============

// Create task
app.post('/api/tasks', (req, res) => {
  const { projectId, title, description, priority, assignedTo, dueDate, createdBy, estimatedHours, tags } = req.body;

  if (!projectId || !title || !createdBy) {
    return res.status(400).json({ error: 'Project ID, title, and creator ID are required' });
  }

  const id = uuidv4();
  const createdDate = new Date().toISOString();

  db.run(
    `INSERT INTO tasks (id, projectId, title, description, priority, assignedTo, dueDate, createdBy, createdDate, estimatedHours, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, projectId, title, description, priority || 'medium', assignedTo, dueDate, createdBy, createdDate, estimatedHours, tags],
    (err) => {
      if (err) {
        return res.status(400).json({ error: 'Invalid data' });
      }

      // Log activity
      const activityId = uuidv4();
      db.run(
        `INSERT INTO taskActivity (id, taskId, userId, activityType, description, timestamp)
         VALUES (?, ?, ?, 'created', ?, ?)`,
        [activityId, id, createdBy, `Task created: ${title}`, createdDate]
      );

      broadcastMessage({ type: 'task_created', taskId: id, projectId });
      res.status(201).json({
        id,
        projectId,
        title,
        description,
        status: 'todo',
        priority: priority || 'medium',
        assignedTo,
        dueDate,
        createdBy,
        createdDate,
        estimatedHours,
        tags,
      });
    }
  );
});

// Get project tasks
app.get('/api/projects/:projectId/tasks', (req, res) => {
  const { projectId } = req.params;
  const { status, assignedTo, priority } = req.query;

  let query = `SELECT t.*, u.fullName as assignedToName, c.fullName as createdByName
               FROM tasks t
               LEFT JOIN users u ON t.assignedTo = u.id
               LEFT JOIN users c ON t.createdBy = c.id
               WHERE t.projectId = ?`;
  const params = [projectId];

  if (status) {
    query += ` AND t.status = ?`;
    params.push(status);
  }
  if (assignedTo) {
    query += ` AND t.assignedTo = ?`;
    params.push(assignedTo);
  }
  if (priority) {
    query += ` AND t.priority = ?`;
    params.push(priority);
  }

  query += ` ORDER BY CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, t.dueDate ASC`;

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get all tasks for user
app.get('/api/users/:userId/tasks', (req, res) => {
  const { userId } = req.params;
  db.all(
    `SELECT t.*, p.name as projectName, u.fullName as createdByName
     FROM tasks t
     JOIN projects p ON t.projectId = p.id
     LEFT JOIN users u ON t.createdBy = u.id
     WHERE t.assignedTo = ?
     ORDER BY t.dueDate ASC, t.priority DESC`,
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Get single task
app.get('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  db.get(
    `SELECT t.*, u.fullName as assignedToName, c.fullName as createdByName
     FROM tasks t
     LEFT JOIN users u ON t.assignedTo = u.id
     LEFT JOIN users c ON t.createdBy = c.id
     WHERE t.id = ?`,
    [id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Task not found' });
      res.json(row);
    }
  );
});

// Update task
app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, status, priority, assignedTo, dueDate, actualHours, tags } = req.body;

  const updatedDate = new Date().toISOString();
  const completedDate = status === 'completed' ? updatedDate : null;

  db.run(
    `UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, assignedTo = ?, 
     dueDate = ?, updatedDate = ?, completedDate = ?, actualHours = ?, tags = ? WHERE id = ?`,
    [title, description, status, priority, assignedTo, dueDate, updatedDate, completedDate, actualHours, tags, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      broadcastMessage({ type: 'task_updated', taskId: id, status });
      res.json({ message: 'Task updated successfully' });
    }
  );
});

// Delete task
app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM tasks WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    broadcastMessage({ type: 'task_deleted', taskId: id });
    res.json({ message: 'Task deleted successfully' });
  });
});

// ============ SUBTASK ENDPOINTS ============

// Create subtask
app.post('/api/tasks/:taskId/subtasks', (req, res) => {
  const { taskId } = req.params;
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Subtask title is required' });
  }

  const id = uuidv4();
  const createdDate = new Date().toISOString();

  db.run(
    `INSERT INTO subtasks (id, taskId, title, completed, createdDate)
     VALUES (?, ?, ?, 0, ?)`,
    [id, taskId, title, createdDate],
    (err) => {
      if (err) {
        return res.status(400).json({ error: 'Invalid data' });
      }
      res.status(201).json({ id, taskId, title, completed: 0, createdDate });
    }
  );
});

// Get subtasks
app.get('/api/tasks/:taskId/subtasks', (req, res) => {
  const { taskId } = req.params;
  db.all(
    'SELECT * FROM subtasks WHERE taskId = ? ORDER BY createdDate ASC',
    [taskId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Update subtask
app.put('/api/subtasks/:id', (req, res) => {
  const { id } = req.params;
  const { completed, title } = req.body;

  const completedDate = completed ? new Date().toISOString() : null;

  db.run(
    'UPDATE subtasks SET completed = ?, title = ?, completedDate = ? WHERE id = ?',
    [completed ? 1 : 0, title, completedDate, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Subtask updated successfully' });
    }
  );
});

// ============ COMMENT ENDPOINTS ============

// Add comment to task
app.post('/api/tasks/:taskId/comments', (req, res) => {
  const { taskId } = req.params;
  const { userId, text } = req.body;

  if (!userId || !text) {
    return res.status(400).json({ error: 'User ID and text are required' });
  }

  const id = uuidv4();
  const createdDate = new Date().toISOString();

  db.run(
    `INSERT INTO comments (id, taskId, userId, text, createdDate)
     VALUES (?, ?, ?, ?, ?)`,
    [id, taskId, userId, text, createdDate],
    (err) => {
      if (err) {
        return res.status(400).json({ error: 'Invalid data' });
      }
      broadcastMessage({ type: 'comment_added', taskId });
      res.status(201).json({ id, taskId, userId, text, createdDate });
    }
  );
});

// Get task comments
app.get('/api/tasks/:taskId/comments', (req, res) => {
  const { taskId } = req.params;
  db.all(
    `SELECT c.*, u.username, u.fullName, u.avatar
     FROM comments c
     JOIN users u ON c.userId = u.id
     WHERE c.taskId = ?
     ORDER BY c.createdDate DESC`,
    [taskId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ============ NOTIFICATION ENDPOINTS ============

// Get user notifications
app.get('/api/users/:userId/notifications', (req, res) => {
  const { userId } = req.params;
  db.all(
    'SELECT * FROM notifications WHERE userId = ? ORDER BY createdDate DESC LIMIT 50',
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Mark notification as read
app.put('/api/notifications/:id', (req, res) => {
  const { id } = req.params;
  db.run('UPDATE notifications SET read = 1 WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Notification marked as read' });
  });
});

// ============ DASHBOARD ENDPOINTS ============

// Get user dashboard data
app.get('/api/users/:userId/dashboard', (req, res) => {
  const { userId } = req.params;

  db.all(
    'SELECT COUNT(*) as count FROM tasks WHERE assignedTo = ? AND status != ?',
    [userId, 'completed'],
    (err, pendingTasks) => {
      if (err) return res.status(500).json({ error: err.message });

      db.all(
        'SELECT COUNT(*) as count FROM tasks WHERE assignedTo = ? AND status = ?',
        [userId, 'completed'],
        (err, completedTasks) => {
          if (err) return res.status(500).json({ error: err.message });

          db.all(
            `SELECT COUNT(*) as count FROM tasks WHERE assignedTo = ? AND status != ? AND dueDate < ?`,
            [userId, 'completed', new Date().toISOString()],
            (err, overdueTasks) => {
              if (err) return res.status(500).json({ error: err.message });

              db.all(
                `SELECT COUNT(*) as count FROM tasks WHERE assignedTo = ? AND priority = ? AND status != ?`,
                [userId, 'high', 'completed'],
                (err, highPriorityTasks) => {
                  if (err) return res.status(500).json({ error: err.message });

                  const dashboard = {
                    pendingTasks: pendingTasks[0].count,
                    completedTasks: completedTasks[0].count,
                    overdueTasks: overdueTasks[0].count,
                    highPriorityTasks: highPriorityTasks[0].count,
                    generatedDate: new Date().toISOString(),
                  };

                  res.json(dashboard);
                }
              );
            }
          );
        }
      );
    }
  );
});

// Get project analytics
app.get('/api/projects/:projectId/analytics', (req, res) => {
  const { projectId } = req.params;

  db.all(
    'SELECT COUNT(*) as count FROM tasks WHERE projectId = ?',
    [projectId],
    (err, totalTasks) => {
      if (err) return res.status(500).json({ error: err.message });

      db.all(
        'SELECT COUNT(*) as count FROM tasks WHERE projectId = ? AND status = ?',
        [projectId, 'completed'],
        (err, completedTasks) => {
          if (err) return res.status(500).json({ error: err.message });

          const analytics = {
            totalTasks: totalTasks[0].count,
            completedTasks: completedTasks[0].count,
            completionPercentage: totalTasks[0].count > 0 
              ? Math.round((completedTasks[0].count / totalTasks[0].count) * 100)
              : 0,
            generatedDate: new Date().toISOString(),
          };

          res.json(analytics);
        }
      );
    }
  );
});

// ============ ERROR HANDLING ============
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============ START SERVER ============
app.listen(PORT, () => {
  console.log(`Task Manager API running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${WS_PORT}`);
  console.log('Real-time updates enabled for tasks, comments, and notifications');
});
