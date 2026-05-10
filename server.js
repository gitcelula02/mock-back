const jsonServer = require('json-server');
const bcrypt = require('bcrypt');
const path = require('path');

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults();
const rewriter = jsonServer.rewriter(require('./routes.json'));

const PORT = process.env.PORT || 3001;

server.use(middlewares);
server.use(jsonServer.bodyParser);

server.use((req, res, next) => {
  if (req.method === 'POST') {
    req.body.created_at = new Date().toISOString();
    req.body.updated_at = new Date().toISOString();
  }
  if (req.method === 'PUT' || req.method === 'PATCH') {
    req.body.updated_at = new Date().toISOString();
  }
  next();
});

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

server.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' }
    });
  }
  const user = router.db.get('users').find({ email }).value();
  if (!user) {
    return res.status(401).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
    });
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
    });
  }
  res.json({
    data: {
      token: 'mock-jwt-token-' + user.id,
      user: { id: user.id, username: user.username, email: user.email, avatar_url: user.avatar_url }
    }
  });
});

server.get('/api/tasks/:id', (req, res) => {
  const taskId = parseInt(req.params.id, 10);
  const task = router.db.get('tasks').find({ id: taskId }).value();
  if (!task) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Task not found' }
    });
  }
  const include = req.query.include ? req.query.include.split(',') : [];
  const result = { ...task };
  if (include.includes('comments')) {
    const comments = router.db.get('comments').filter({ task_id: taskId }).value();
    result.comments = comments.map(c => {
      const author = router.db.get('users').find({ id: c.user_id }).value();
      return { ...c, user: author ? { id: author.id, username: author.username, avatar_url: author.avatar_url } : null };
    });
  }
  res.json({ data: result });
});

server.get('/api/users/:userId/folders', (req, res) => {
  const { userId } = req.params;
  const folders = router.db.get('user_folders').filter({ user_id: userId }).value();
  const folderProjects = router.db.get('user_folder_projects').filter({ user_id: userId }).value();
  const allProjectIds = [...new Set(folderProjects.map(ufp => ufp.project_id))];

  const projectMap = {};
  allProjectIds.forEach(pid => {
    const project = router.db.get('projects').find({ id: pid }).value();
    if (project) {
      projectMap[pid] = project;
    }
  });

  const buildFolderTree = (parentId) => {
    return folders
      .filter(f => f.parent_id === parentId)
      .sort((a, b) => a.order_index - b.order_index)
      .map(folder => {
        const folderUfps = folderProjects.filter(ufp => ufp.folder_id === folder.id);
        const projects = folderUfps.map(ufp => {
          const proj = projectMap[ufp.project_id];
          return proj ? { id: proj.id, name: proj.name, description: proj.description || '', goal: proj.goal || '', color: proj.color, icon: proj.icon, status: proj.status, created_by_user_id: proj.created_by_user_id, created_at: proj.created_at, updated_at: proj.updated_at } : null;
        }).filter(Boolean);
        return {
          id: folder.id,
          user_id: folder.user_id,
          name: folder.name,
          parent_id: folder.parent_id,
          order_index: folder.order_index,
          created_at: folder.created_at,
          updated_at: folder.updated_at,
          children: buildFolderTree(folder.id),
          projects
        };
      });
  };

  res.json({ data: buildFolderTree(null) });
});

server.post('/api/users/:userId/folders', (req, res) => {
  const { userId } = req.params;
  const { name, parent_id } = req.body;
  if (!name) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Folder name is required' } });
  }
  const existingFolders = router.db.get('user_folders').filter({ user_id: userId }).value();
  const maxOrder = existingFolders.reduce((max, f) => Math.max(max, f.order_index), -1);
  const newFolder = {
    id: generateId('folder'),
    user_id: userId,
    parent_id: parent_id || null,
    name,
    order_index: maxOrder + 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  router.db.get('user_folders').push(newFolder).write();
  res.json({ data: newFolder });
});

server.patch('/api/folders/:folderId', (req, res) => {
  const { folderId } = req.params;
  const { name, parent_id, order_index } = req.body;
  const folder = router.db.get('user_folders').find({ id: folderId }).value();
  if (!folder) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Folder not found' } });
  }
  if (name !== undefined) folder.name = name;
  if (parent_id !== undefined) folder.parent_id = parent_id;
  if (order_index !== undefined) folder.order_index = order_index;
  folder.updated_at = new Date().toISOString();
  router.db.get('user_folders').find({ id: folderId }).assign(folder).write();
  res.json({ data: folder });
});

server.delete('/api/folders/:folderId', (req, res) => {
  const { folderId } = req.params;
  const folder = router.db.get('user_folders').find({ id: folderId }).value();
  if (!folder) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Folder not found' } });
  }
  router.db.get('user_folders').remove({ id: folderId }).write();
  router.db.get('user_folder_projects').remove({ folder_id: folderId }).write();
  const childFolders = router.db.get('user_folders').filter({ parent_id: folderId }).value();
  childFolders.forEach(child => {
    router.db.get('user_folders').find({ id: child.id }).assign({ parent_id: folder.parent_id }).write();
  });
  res.json({ data: { id: folderId, deleted: true } });
});

server.get('/api/users/:userId/projects', (req, res) => {
  const { userId } = req.params;
  const folderProjects = router.db.get('user_folder_projects').filter({ user_id: userId }).value();
  const pinnedProjects = folderProjects.filter(ufp => ufp.is_pinned);

  const pinned = pinnedProjects.map(ufp => {
    const proj = router.db.get('projects').find({ id: ufp.project_id }).value();
    return proj ? { id: proj.id, name: proj.name, description: proj.description || '', goal: proj.goal || '', color: proj.color, icon: proj.icon, status: proj.status, created_by_user_id: proj.created_by_user_id, created_at: proj.created_at, updated_at: proj.updated_at } : null;
  }).filter(Boolean);

  res.json({ pinned });
});

server.post('/api/users/:userId/folders/:folderId/projects', (req, res) => {
  const { userId, folderId } = req.params;
  const { project_id } = req.body;
  if (!project_id) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'project_id is required' } });
  }
  const project = router.db.get('projects').find({ id: project_id }).value();
  if (!project) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found' } });
  }
  const folder = router.db.get('user_folders').find({ id: folderId, user_id: userId }).value();
  if (!folder) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Folder not found' } });
  }
  const existingUfp = router.db.get('user_folder_projects').find({ user_id: userId, project_id, folder_id: folderId }).value();
  if (existingUfp) {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'Project already in this folder' } });
  }
  const userUfps = router.db.get('user_folder_projects').filter({ user_id: userId, folder_id: folderId }).value();
  const maxOrder = userUfps.reduce((max, ufp) => Math.max(max, ufp.order_index), -1);
  const newUfp = {
    id: generateId('ufp'),
    user_id: userId,
    folder_id: folderId,
    project_id,
    order_index: maxOrder + 1,
    is_pinned: false,
    created_at: new Date().toISOString()
  };
  router.db.get('user_folder_projects').push(newUfp).write();
  res.json({ data: { folder_project_id: newUfp.id, project_id: newUfp.project_id, folder_id: newUfp.folder_id } });
});

server.delete('/api/users/:userId/folders/:folderId/projects/:projectId', (req, res) => {
  const { userId, folderId, projectId } = req.params;
  const ufp = router.db.get('user_folder_projects').find({ user_id: userId, folder_id: folderId, project_id: projectId }).value();
  if (!ufp) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found in folder' } });
  }
  router.db.get('user_folder_projects').remove({ id: ufp.id }).write();
  res.json({ data: { project_id: projectId, folder_id: folderId, deleted: true } });
});

server.patch('/api/users/:userId/projects/:projectId/move', (req, res) => {
  const { userId, projectId } = req.params;
  const { folder_id } = req.body;
  const ufp = router.db.get('user_folder_projects').find({ user_id: userId, project_id: projectId }).value();
  if (!ufp) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found in user folders' } });
  }
  if (folder_id !== undefined) {
    if (folder_id !== null) {
      const folder = router.db.get('user_folders').find({ id: folder_id, user_id: userId }).value();
      if (!folder) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Target folder not found' } });
      }
    }
    router.db.get('user_folder_projects').find({ id: ufp.id }).assign({ folder_id }).write();
  }
  const updated = router.db.get('user_folder_projects').find({ id: ufp.id }).value();
  res.json({ data: updated });
});

server.post('/api/users/:userId/projects/:projectId/pin', (req, res) => {
  const { userId, projectId } = req.params;
  const ufp = router.db.get('user_folder_projects').find({ user_id: userId, project_id: projectId }).value();
  if (!ufp) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found in user folders' } });
  }
  router.db.get('user_folder_projects').find({ id: ufp.id }).assign({ is_pinned: true }).write();
  const updated = router.db.get('user_folder_projects').find({ id: ufp.id }).value();
  res.json({ data: updated });
});

server.delete('/api/users/:userId/projects/:projectId/pin', (req, res) => {
  const { userId, projectId } = req.params;
  const ufp = router.db.get('user_folder_projects').find({ user_id: userId, project_id: projectId }).value();
  if (!ufp) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found in user folders' } });
  }
  router.db.get('user_folder_projects').find({ id: ufp.id }).assign({ is_pinned: false }).write();
  const updated = router.db.get('user_folder_projects').find({ id: ufp.id }).value();
  res.json({ data: updated });
});

server.get('/api/users/:userId/projects/search', (req, res) => {
  const { userId } = req.params;
  const q = (req.query.q || '').toLowerCase();
  if (!q) {
    return res.json({ data: [] });
  }
  const folderProjects = router.db.get('user_folder_projects').filter({ user_id: userId }).value();
  const folders = router.db.get('user_folders').filter({ user_id: userId }).value();
  const folderMap = {};
  folders.forEach(f => { folderMap[f.id] = f.name; });

  const results = [];
  const processedProjects = new Set();
  folderProjects.forEach(ufp => {
    if (processedProjects.has(ufp.project_id)) return;
    processedProjects.add(ufp.project_id);
    const project = router.db.get('projects').find({ id: ufp.project_id }).value();
    if (!project) return;
    if (project.name.toLowerCase().includes(q) || (project.description && project.description.toLowerCase().includes(q))) {
      results.push({
        id: project.id,
        name: project.name,
        description: project.description,
        color: project.color,
        icon: project.icon,
        status: project.status,
        folder_id: ufp.folder_id,
        folder_name: ufp.folder_id ? folderMap[ufp.folder_id] : null
      });
    }
  });
  const allProjects = router.db.get('projects').value();
  allProjects.forEach(project => {
    if (processedProjects.has(project.id)) return;
    if (project.name.toLowerCase().includes(q) || (project.description && project.description.toLowerCase().includes(q))) {
      results.push({
        id: project.id,
        name: project.name,
        description: project.description,
        color: project.color,
        icon: project.icon,
        status: project.status,
        folder_id: null,
        folder_name: null
      });
    }
  });
  res.json({ data: results });
});

server.use(rewriter);
server.use(router);

server.listen(PORT, () => {
  console.log(`\n🚀 ScrumHub Mock API Server`);
  console.log(`   Local: http://localhost:${PORT}`);
  console.log(`\n   Available endpoints:`);
  console.log(`   - Auth: /api/auth/*`);
  console.log(`   - Users: /api/users/*`);
  console.log(`   - Folders: /api/users/:userId/folders, /api/folders/:folderId`);
  console.log(`   - Projects: /api/projects/*, /api/users/:userId/projects`);
  console.log(`   - Tasks: /api/tasks/*`);
  console.log(`   - Sprints: /api/sprints/*, /api/projects/:id/sprints/*`);
  console.log(`   - Statuses: /api/projects/:id/statuses/*`);
  console.log(`   - Boards: /api/projects/:id/boards`);
  console.log(`   - Chatrooms: /api/projects/:id/chatroom`);
  console.log(`   - Channels: /api/chatrooms/:id/channels`);
  console.log(`   - Messages: /api/channels/:id/messages`);
  console.log(`   - Voice: /api/channels/:id/voice-sessions`);
  console.log(`   - Standups: /api/projects/:id/daily-standups`);
  console.log(`   - Retrospectives: /api/sprints/:id/retrospective`);
  console.log(`   - Settings: /api/settings`);
  console.log(`   - AI: /ai/chat, /ai/sessions/*, /ai/transcribe, /ai/search`);
  console.log(`   - Subscription: /subscription`);
  console.log(`   - API Keys: /api-keys`);
  console.log(`   - Notifications: /notifications, /notification-preferences`);
  console.log(`\n   Press Ctrl+C to stop\n`);
});

module.exports = server;