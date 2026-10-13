const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Seed Users for collaboration & assignment
let teamMembers = [
  { id: 'u1', name: 'Devon Wells', email: 'devon@syncspace.io', role: 'Engineering Lead', avatar: 'DW' },
  { id: 'u2', name: 'Maya Lin', email: 'maya@syncspace.io', role: 'Product Designer', avatar: 'ML' },
  { id: 'u3', name: 'Carlos Mendez', email: 'carlos@syncspace.io', role: 'Full Stack Engineer', avatar: 'CM' },
  { id: 'u4', name: 'Aisha Patel', email: 'aisha@syncspace.io', role: 'QA Engineer', avatar: 'AP' }
];

// Seed Tasks
let tasks = [
  {
    id: 'tsk-101',
    title: 'Architect Enterprise GraphQL Gateway',
    description: 'Design unified schema and federation for backend services with caching layer.',
    priority: 'High',
    status: 'In Progress',
    dueDate: '2025-05-20',
    assigneeId: 'u1',
    assigneeName: 'Devon Wells',
    tags: ['Architecture', 'Backend'],
    comments: [
      { id: 'c-1', author: 'Maya Lin', text: 'Schema draft reviewed and aligns with mobile client needs.', timestamp: '2025-05-10T10:15:00Z' }
    ],
    activityLog: [
      { text: 'Task created by Devon Wells', timestamp: '2025-05-09T09:00:00Z' },
      { text: 'Status moved to In Progress', timestamp: '2025-05-10T08:30:00Z' }
    ]
  },
  {
    id: 'tsk-102',
    title: 'Design Dark Mode UI Component Library',
    description: 'Build WCAG AA compliant dark theme tokens in Figma and export React variables.',
    priority: 'Medium',
    status: 'Completed',
    dueDate: '2025-05-12',
    assigneeId: 'u2',
    assigneeName: 'Maya Lin',
    tags: ['Design System', 'UI/UX'],
    comments: [
      { id: 'c-2', author: 'Carlos Mendez', text: 'Tokens imported into CSS custom properties cleanly.', timestamp: '2025-05-11T14:20:00Z' }
    ],
    activityLog: [
      { text: 'Task created by Maya Lin', timestamp: '2025-05-08T11:00:00Z' },
      { text: 'Status marked as Completed', timestamp: '2025-05-12T16:00:00Z' }
    ]
  },
  {
    id: 'tsk-103',
    title: 'Fix Database Connection Pooling Timeout',
    description: 'Resolve max connection leaks observed during peak load simulations in Postgres cluster.',
    priority: 'Urgent',
    status: 'To Do',
    dueDate: '2025-05-14',
    assigneeId: 'u3',
    assigneeName: 'Carlos Mendez',
    tags: ['Database', 'DevOps'],
    comments: [],
    activityLog: [
      { text: 'Task created by Devon Wells', timestamp: '2025-05-11T15:45:00Z' }
    ]
  },
  {
    id: 'tsk-104',
    title: 'Automated Regression Suite for Checkout API',
    description: 'Write end-to-end integration tests using Vitest covering edge cases in payment gateway.',
    priority: 'High',
    status: 'Review',
    dueDate: '2025-05-18',
    assigneeId: 'u4',
    assigneeName: 'Aisha Patel',
    tags: ['Testing', 'QA'],
    comments: [],
    activityLog: [
      { text: 'Task created by Aisha Patel', timestamp: '2025-05-09T13:00:00Z' },
      { text: 'Moved to Review stage', timestamp: '2025-05-12T10:00:00Z' }
    ]
  }
];

// Endpoints
app.get('/api/users', (req, res) => res.json(teamMembers));

app.get('/api/tasks', (req, res) => {
  const { status, priority, assigneeId, search } = req.query;
  let filtered = [...tasks];

  if (status) filtered = filtered.filter(t => t.status === status);
  if (priority) filtered = filtered.filter(t => t.priority === priority);
  if (assigneeId) filtered = filtered.filter(t => t.assigneeId === assigneeId);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
    );
  }

  res.json(filtered);
});

app.get('/api/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

app.post('/api/tasks', (req, res) => {
  const { title, description, priority, dueDate, assigneeId, tags } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const assignee = teamMembers.find(u => u.id === assigneeId) || teamMembers[0];
  const newTask = {
    id: 'tsk-' + Date.now().toString().slice(-4),
    title,
    description: description || '',
    priority: priority || 'Medium',
    status: 'To Do',
    dueDate: dueDate || new Date().toISOString().split('T')[0],
    assigneeId: assignee.id,
    assigneeName: assignee.name,
    tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(s => s.trim()) : []),
    comments: [],
    activityLog: [
      { text: `Task created and assigned to ${assignee.name}`, timestamp: new Date().toISOString() }
    ]
  };

  tasks.unshift(newTask);
  res.status(201).json(newTask);
});

app.patch('/api/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const { title, description, priority, status, dueDate, assigneeId, tags } = req.body;
  
  if (status && status !== task.status) {
    task.activityLog.unshift({ text: `Status changed from "${task.status}" to "${status}"`, timestamp: new Date().toISOString() });
    task.status = status;
  }
  if (priority && priority !== task.priority) {
    task.activityLog.unshift({ text: `Priority changed to "${priority}"`, timestamp: new Date().toISOString() });
    task.priority = priority;
  }
  if (assigneeId && assigneeId !== task.assigneeId) {
    const user = teamMembers.find(u => u.id === assigneeId);
    if (user) {
      task.activityLog.unshift({ text: `Reassigned to ${user.name}`, timestamp: new Date().toISOString() });
      task.assigneeId = user.id;
      task.assigneeName = user.name;
    }
  }
  if (title) task.title = title;
  if (description !== undefined) task.description = description;
  if (dueDate) task.dueDate = dueDate;
  if (tags) task.tags = Array.isArray(tags) ? tags : tags.split(',').map(s => s.trim());

  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });
  const [removed] = tasks.splice(idx, 1);
  res.json({ message: 'Task deleted successfully', task: removed });
});

// Collaborative Comments
app.post('/api/tasks/:id/comments', (req, res) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const { author, text } = req.body;
  if (!text) return res.status(400).json({ error: 'Comment text is required' });

  const newComment = {
    id: 'c-' + Date.now().toString().slice(-4),
    author: author || 'Devon Wells',
    text,
    timestamp: new Date().toISOString()
  };

  task.comments.push(newComment);
  task.activityLog.unshift({ text: `Comment added by ${newComment.author}`, timestamp: new Date().toISOString() });
  res.status(201).json(newComment);
});

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Task Manager Server running on port ${PORT}`);
  });
}

module.exports = app;
