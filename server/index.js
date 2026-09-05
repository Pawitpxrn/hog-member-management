const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/members');
const auditRoutes = require('./routes/audit');
const sheetsRoutes = require('./routes/sheets');
const tagsRoutes = require('./routes/tags');
const usersRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));

const uploadsPath = path.join(__dirname, 'uploads');
if (!require('fs').existsSync(uploadsPath)) {
  require('fs').mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/sheets', sheetsRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/users', usersRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'HOG Member Management API', timestamp: new Date() });
});

// Serve frontend static build if production
const clientDistPath = path.join(__dirname, '..', 'dist');
if (require('fs').existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ message: `API route not found: ${req.method} ${req.path}` });
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  HOG Harley Member Management System API Running`);
    console.log(`  Server Port: http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
