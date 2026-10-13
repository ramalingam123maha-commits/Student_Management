const http = require('http');
const assert = require('assert');
const app = require('./server');

const TEST_PORT = 5199;
const server = app.listen(TEST_PORT, async () => {
  console.log(`Task Manager test server running on port ${TEST_PORT}`);

  try {
    // 1. Test GET /api/users
    const userRes = await fetch(`http://localhost:${TEST_PORT}/api/users`);
    assert.strictEqual(userRes.status, 200);
    const users = await userRes.json();
    assert(users.length >= 4, 'Should have seed team members');
    console.log('✓ Team users list verified');

    // 2. Test GET /api/tasks
    const taskRes = await fetch(`http://localhost:${TEST_PORT}/api/tasks`);
    assert.strictEqual(taskRes.status, 200);
    const tasks = await taskRes.json();
    assert(tasks.length >= 4, 'Should have initial tasks');
    console.log('✓ Task retrieval verified');

    // 3. Test POST /api/tasks (Create & Assign with Priority and Deadline)
    const createRes = await fetch(`http://localhost:${TEST_PORT}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Integrate Realtime Notification Worker',
        description: 'Send webhooks when high priority issues are logged.',
        priority: 'Urgent',
        dueDate: '2025-05-25',
        assigneeId: 'u2',
        tags: 'Notifications, Worker'
      })
    });
    assert.strictEqual(createRes.status, 201);
    const newTask = await createRes.json();
    assert.strictEqual(newTask.priority, 'Urgent');
    assert.strictEqual(newTask.assigneeName, 'Maya Lin');
    assert.strictEqual(newTask.status, 'To Do');
    console.log('✓ Task creation & assignment with priority verified');

    // 4. Test PATCH /api/tasks/:id (Status update & timeline)
    const patchRes = await fetch(`http://localhost:${TEST_PORT}/api/tasks/${newTask.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'In Progress'
      })
    });
    assert.strictEqual(patchRes.status, 200);
    const patchedTask = await patchRes.json();
    assert.strictEqual(patchedTask.status, 'In Progress');
    assert(patchedTask.activityLog.length >= 2, 'Activity log should reflect status change');
    console.log('✓ Status update & audit log verified');

    // 5. Test Collaborative Comments
    const commentRes = await fetch(`http://localhost:${TEST_PORT}/api/tasks/${newTask.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: 'Carlos Mendez',
        text: 'I can pair on the webhook payload validation.'
      })
    });
    assert.strictEqual(commentRes.status, 201);
    const commentData = await commentRes.json();
    assert.strictEqual(commentData.author, 'Carlos Mendez');
    console.log('✓ Collaborative commenting verified');

    server.close();
    console.log('\nAll Task Manager tests passed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    server.close();
    process.exit(1);
  }
});
