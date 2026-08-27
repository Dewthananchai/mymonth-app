import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import expensesRoutes from './routes/expenses.js';
import categoriesRoutes from './routes/categories.js';
import budgetsRoutes from './routes/budgets.js';
import settlementsRoutes from './routes/settlements.js';
import notificationsRoutes from './routes/notifications.js';
import exportRoutes from './routes/export.js';
import adminRoutes from './routes/admin.js';
import superAdminRoutes from './routes/super-admin.js';
import lineLoginRoutes from './routes/line-login.js';
import lineNotifyRoutes from './routes/line-notify.js';
import lineBotRoutes from './routes/line-bot.js';
import { seedDatabase } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
const isProd = process.env.NODE_ENV === 'production';
app.use(cors({
  origin: isProd ? true : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded receipts statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/budgets', budgetsRoutes);
app.use('/api/settlements', settlementsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/line', lineLoginRoutes);
app.use('/api/line-notify', lineNotifyRoutes);
app.use('/api/line', lineBotRoutes);

// Serve static files from client build (production)
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'MyMonth API v2.0', timestamp: new Date().toISOString() });
});

// Debug: List all registered routes
app.get('/api/debug/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach(layer => {
    if (layer.route) {
      routes.push({ path: layer.route.path, methods: Object.keys(layer.route.methods) });
    } else if (layer.name === 'router' && layer.handle.stack) {
      const prefix = layer.regexp.toString().replace('/^\\/', '').replace('\\/?(?=\\/|$)/i', '').replace(/\\/g, '/');
      layer.handle.stack.forEach(r => {
        if (r.route) routes.push({ path: prefix + r.route.path, methods: Object.keys(r.route.methods) });
      });
    }
  });
  res.json({ routes });
});

// Auto seed if empty
seedDatabase(false).then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 MyMonth Backend Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Seed failed:', err);
  // Start server anyway
  app.listen(PORT, () => {
    console.log(`🚀 MyMonth Backend Server running on http://localhost:${PORT} (seed failed)`);
  });
});
