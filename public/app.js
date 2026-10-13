// State
let tasks = [];
let users = [];
let activePriorityFilter = '';
let currentDrawerTask = null;
const activeUser = { id: 'u1', name: 'Devon Wells', email: 'devon@syncspace.io' };

// Initial Fetch
async function loadInitialData() {
  try {
    const [uRes, tRes] = await Promise.all([
      fetch('/api/users'),
      fetch('/api/tasks')
    ]);
    users = await uRes.json();
    tasks = await tRes.json();
    populateUserSelects();
    renderAll();
  } catch (err) {
    console.error('Failed to load tasks', err);
  }
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Navigation & View Switching
function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view');
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.workspace-view').forEach(v => v.classList.toggle('active', v.id === `view-${view}`));

      const headings = {
        kanban: { title: 'Project Kanban Board', sub: 'Interactive task pipelines, status tracking, and priority levels' },
        list: { title: 'Master Task List', sub: 'Detailed table overview with inline metadata and sorting' },
        team: { title: 'Team Workload & Capacity', sub: 'Distribution of active responsibilities across collaborators' }
      };

      if (headings[view]) {
        document.getElementById('viewHeading').textContent = headings[view].title;
        document.querySelector('.sub-text').textContent = headings[view].sub;
      }
    });
  });

  // Search input
  document.getElementById('taskSearchInput').addEventListener('input', () => {
    renderAll();
  });
}

function applyPriorityFilter(priority) {
  activePriorityFilter = priority;
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.includes(priority) || (priority === '' && btn.textContent.includes('All')));
  });
  renderAll();
}

function getFilteredTasks() {
  const query = document.getElementById('taskSearchInput').value.toLowerCase().trim();
  return tasks.filter(t => {
    const matchesPriority = !activePriorityFilter || t.priority === activePriorityFilter;
    const matchesSearch = !query ||
      t.title.toLowerCase().includes(query) ||
      (t.description && t.description.toLowerCase().includes(query)) ||
      (t.assigneeName && t.assigneeName.toLowerCase().includes(query)) ||
      (t.tags && t.tags.some(tag => tag.toLowerCase().includes(query)));
    return matchesPriority && matchesSearch;
  });
}

// KPIs
function renderKPIs() {
  document.getElementById('statTotal').textContent = tasks.length;
  document.getElementById('statInProgress').textContent = tasks.filter(t => t.status === 'In Progress').length;
  document.getElementById('statReview').textContent = tasks.filter(t => t.status === 'Review').length;
  document.getElementById('statCompleted').textContent = tasks.filter(t => t.status === 'Completed').length;
}

// Kanban Render
function renderKanban() {
  const lanes = {
    'To Do': document.getElementById('lane-todo'),
    'In Progress': document.getElementById('lane-progress'),
    'Review': document.getElementById('lane-review'),
    'Completed': document.getElementById('lane-completed')
  };

  const counts = {
    'To Do': document.getElementById('count-todo'),
    'In Progress': document.getElementById('count-progress'),
    'Review': document.getElementById('count-review'),
    'Completed': document.getElementById('count-completed')
  };

  Object.values(lanes).forEach(el => el.innerHTML = '');
  const laneCounts = { 'To Do': 0, 'In Progress': 0, 'Review': 0, 'Completed': 0 };

  const filtered = getFilteredTasks();

  filtered.forEach(task => {
    if (lanes[task.status]) {
      laneCounts[task.status]++;
      const card = document.createElement('div');
      card.className = `task-card priority-${task.priority.toLowerCase()}`;
      card.onclick = () => openDrawer(task.id);

      let tagsHtml = '';
      if (task.tags && task.tags.length > 0) {
        tagsHtml = `<div class="tag-list">${task.tags.map(tag => `<span class="tag-chip">${tag}</span>`).join('')}</div>`;
      }

      const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'Completed';

      card.innerHTML = `
        <div class="card-title">${task.title}</div>
        <div class="card-desc">${task.description || 'No description provided.'}</div>
        ${tagsHtml}
        <div class="card-meta">
          <span>👤 ${task.assigneeName}</span>
          <span style="${isOverdue ? 'color: var(--urgent); font-weight:700;' : ''}">📅 ${task.dueDate}</span>
        </div>
        <div class="card-footer">
          <span class="badge-priority badge-${task.priority.toLowerCase()}">${task.priority}</span>
          <span style="font-size: 0.72rem; color: var(--text-muted);">💬 ${task.comments ? task.comments.length : 0}</span>
        </div>
      `;
      lanes[task.status].appendChild(card);
    }
  });

  Object.entries(counts).forEach(([status, el]) => {
    el.textContent = laneCounts[status] || 0;
  });
}

// Table Render
function renderTable() {
  const tbody = document.getElementById('taskTableBody');
  tbody.innerHTML = '';

  const filtered = getFilteredTasks();

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px; color:var(--text-muted);">No tasks matched your criteria.</td></tr>`;
    return;
  }

  filtered.forEach(task => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong style="cursor:pointer;" onclick="openDrawer('${task.id}')">${task.title}</strong>
        <div style="font-size:0.75rem; color:var(--text-muted);">${task.id}</div>
      </td>
      <td>👤 ${task.assigneeName}</td>
      <td><span class="badge-priority badge-${task.priority.toLowerCase()}">${task.priority}</span></td>
      <td>
        <select onchange="inlineUpdateStatus('${task.id}', this.value)" style="padding: 4px 8px; font-size: 0.8rem;">
          <option value="To Do" ${task.status === 'To Do' ? 'selected' : ''}>To Do</option>
          <option value="In Progress" ${task.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
          <option value="Review" ${task.status === 'Review' ? 'selected' : ''}>Review</option>
          <option value="Completed" ${task.status === 'Completed' ? 'selected' : ''}>Completed</option>
        </select>
      </td>
      <td>📅 ${task.dueDate}</td>
      <td>💬 ${task.comments ? task.comments.length : 0}</td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="openDrawer('${task.id}')">View</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Team Workload Render
function renderTeamWorkload() {
  const grid = document.getElementById('teamWorkloadGrid');
  grid.innerHTML = '';

  users.forEach(u => {
    const userTasks = tasks.filter(t => t.assigneeId === u.id);
    const activeTasks = userTasks.filter(t => t.status !== 'Completed');

    const card = document.createElement('div');
    card.className = 'member-card';

    let taskItemsHtml = '';
    if (userTasks.length === 0) {
      taskItemsHtml = `<div style="font-size:0.8rem; color:var(--text-muted);">No assigned tasks</div>`;
    } else {
      userTasks.forEach(t => {
        taskItemsHtml += `
          <div class="member-task-item" onclick="openDrawer('${t.id}')" style="cursor:pointer;">
            <span>${t.title}</span>
            <span class="badge-priority badge-${t.priority.toLowerCase()}">${t.status}</span>
          </div>
        `;
      });
    }

    card.innerHTML = `
      <div class="member-head">
        <div class="avatar">${u.avatar}</div>
        <div>
          <strong>${u.name}</strong>
          <div style="font-size:0.75rem; color:var(--text-muted);">${u.role}</div>
        </div>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:0.8rem; color:var(--text-muted);">
        <span>Assigned: <strong>${userTasks.length}</strong></span>
        <span>Active Workload: <strong style="color:var(--primary);">${activeTasks.length}</strong></span>
      </div>
      <div class="member-tasks-list">
        ${taskItemsHtml}
      </div>
    `;
    grid.appendChild(card);
  });
}

// Drawer Details & Collaboration
function openDrawer(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  currentDrawerTask = task;

  document.getElementById('drawerTaskId').textContent = task.id;
  document.getElementById('drawerTitle').textContent = task.title;
  document.getElementById('drawerDesc').textContent = task.description || 'No description provided.';

  // Status Select
  const statusSel = document.getElementById('drawerStatusSelect');
  statusSel.innerHTML = `
    <option value="To Do" ${task.status === 'To Do' ? 'selected' : ''}>To Do</option>
    <option value="In Progress" ${task.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
    <option value="Review" ${task.status === 'Review' ? 'selected' : ''}>Review</option>
    <option value="Completed" ${task.status === 'Completed' ? 'selected' : ''}>Completed</option>
  `;

  // Priority Select
  document.getElementById('drawerPrioritySelect').value = task.priority;

  // Assignee Select
  const assigneeSel = document.getElementById('drawerAssigneeSelect');
  assigneeSel.innerHTML = '';
  users.forEach(u => {
    assigneeSel.innerHTML += `<option value="${u.id}" ${u.id === task.assigneeId ? 'selected' : ''}>${u.name}</option>`;
  });

  // Due Date
  document.getElementById('drawerDueDate').value = task.dueDate;

  // Tags
  const tagsDiv = document.getElementById('drawerTags');
  tagsDiv.innerHTML = '';
  if (task.tags && task.tags.length > 0) {
    task.tags.forEach(t => {
      tagsDiv.innerHTML += `<span class="tag-chip">${t}</span>`;
    });
  } else {
    tagsDiv.innerHTML = `<span style="font-size:0.78rem; color:var(--text-muted);">No tags</span>`;
  }

  // Comments
  renderDrawerComments();

  // Activity Log
  renderDrawerActivity();

  document.getElementById('detailDrawer').classList.add('open');
}

function closeDrawer() {
  document.getElementById('detailDrawer').classList.remove('open');
  currentDrawerTask = null;
}

function renderDrawerComments() {
  const list = document.getElementById('drawerComments');
  list.innerHTML = '';
  if (!currentDrawerTask.comments || currentDrawerTask.comments.length === 0) {
    list.innerHTML = `<div style="font-size:0.8rem; color:var(--text-muted); font-style:italic;">No comments yet. Start the discussion!</div>`;
    return;
  }
  currentDrawerTask.comments.forEach(c => {
    const item = document.createElement('div');
    item.className = 'comment-bubble';
    item.innerHTML = `
      <div class="comment-meta">
        <strong>${c.author}</strong>
        <span>${new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div>${c.text}</div>
    `;
    list.appendChild(item);
  });
}

function renderDrawerActivity() {
  const list = document.getElementById('drawerActivity');
  list.innerHTML = '';
  if (!currentDrawerTask.activityLog || currentDrawerTask.activityLog.length === 0) {
    list.innerHTML = `<li>Task initiated</li>`;
    return;
  }
  currentDrawerTask.activityLog.forEach(log => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${log.text}</span> <small style="display:block; font-size:0.7rem; color:var(--text-muted);">${new Date(log.timestamp).toLocaleString()}</small>`;
    list.appendChild(li);
  });
}

// Drawer Updates
async function updateDrawerTaskStatus() {
  if (!currentDrawerTask) return;
  const status = document.getElementById('drawerStatusSelect').value;
  await patchTask(currentDrawerTask.id, { status });
}

async function updateDrawerTaskPriority() {
  if (!currentDrawerTask) return;
  const priority = document.getElementById('drawerPrioritySelect').value;
  await patchTask(currentDrawerTask.id, { priority });
}

async function updateDrawerTaskAssignee() {
  if (!currentDrawerTask) return;
  const assigneeId = document.getElementById('drawerAssigneeSelect').value;
  await patchTask(currentDrawerTask.id, { assigneeId });
}

async function updateDrawerTaskDueDate() {
  if (!currentDrawerTask) return;
  const dueDate = document.getElementById('drawerDueDate').value;
  await patchTask(currentDrawerTask.id, { dueDate });
}

async function patchTask(id, data) {
  try {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const updated = await res.json();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx !== -1) tasks[idx] = updated;
    currentDrawerTask = updated;
    renderAll();
    renderDrawerActivity();
    showToast('Task updated');
  } catch (err) {
    showToast('Update failed');
  }
}

async function inlineUpdateStatus(id, status) {
  await patchTask(id, { status });
}

async function submitComment(e) {
  e.preventDefault();
  if (!currentDrawerTask) return;
  const text = document.getElementById('commentInput').value.trim();
  if (!text) return;

  try {
    const res = await fetch(`/api/tasks/${currentDrawerTask.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author: activeUser.name, text })
    });
    const comment = await res.json();
    currentDrawerTask.comments.push(comment);
    currentDrawerTask.activityLog.unshift({ text: `Comment added by ${activeUser.name}`, timestamp: new Date().toISOString() });
    document.getElementById('commentInput').value = '';
    renderDrawerComments();
    renderDrawerActivity();
    renderAll();
    showToast('Comment posted');
  } catch (err) {
    showToast('Failed to post comment');
  }
}

async function deleteCurrentDrawerTask() {
  if (!currentDrawerTask) return;
  if (confirm(`Are you sure you want to delete "${currentDrawerTask.title}"?`)) {
    try {
      await fetch(`/api/tasks/${currentDrawerTask.id}`, { method: 'DELETE' });
      tasks = tasks.filter(t => t.id !== currentDrawerTask.id);
      closeDrawer();
      renderAll();
      showToast('Task deleted');
    } catch (e) {
      showToast('Delete failed');
    }
  }
}

// Modal Task Creation
function openCreateModal() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 3);
  document.getElementById('newTaskDueDate').value = tomorrow.toISOString().split('T')[0];
  document.getElementById('taskModal').classList.add('open');
}

function closeCreateModal() {
  document.getElementById('taskModal').classList.remove('open');
  document.getElementById('createTaskForm').reset();
}

function populateUserSelects() {
  const sel = document.getElementById('newTaskAssignee');
  sel.innerHTML = '';
  users.forEach(u => {
    sel.innerHTML += `<option value="${u.id}">${u.name} (${u.role})</option>`;
  });
}

async function handleCreateTask(e) {
  e.preventDefault();
  const title = document.getElementById('newTaskTitle').value.trim();
  const description = document.getElementById('newTaskDesc').value.trim();
  const priority = document.getElementById('newTaskPriority').value;
  const dueDate = document.getElementById('newTaskDueDate').value;
  const assigneeId = document.getElementById('newTaskAssignee').value;
  const tags = document.getElementById('newTaskTags').value;

  try {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, priority, dueDate, assigneeId, tags })
    });
    const newTask = await res.json();
    tasks.unshift(newTask);
    closeCreateModal();
    renderAll();
    showToast('Task created and assigned!');
  } catch (err) {
    showToast('Failed to create task');
  }
}

// Master Render
function renderAll() {
  renderKPIs();
  renderKanban();
  renderTable();
  renderTeamWorkload();
}

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  loadInitialData();
});
