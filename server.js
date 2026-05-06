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

server.use(rewriter);
server.use(router);

server.listen(PORT, () => {
  console.log(`\n🚀 ScrumHub Mock API Server`);
  console.log(`   Local: http://localhost:${PORT}`);
  console.log(`\n   Available endpoints:`);
  console.log(`   - Auth: /api/auth/*`);
  console.log(`   - Users: /api/users/*`);
  console.log(`   - Projects: /api/projects/*`);
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