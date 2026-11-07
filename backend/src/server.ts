import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/config.js';
import { prisma } from './config/database.js';
import { sendError } from './utils/helpers.js';
import authRoutes from './routes/auth.routes.js';
import businessRoutes from './routes/business.routes.js';
import userRoutes from './routes/user.routes.js';
import accountRoutes from './routes/account.routes.js';
import productRoutes from './routes/product.routes.js';
import transactionRoutes from './routes/transaction.routes.js';
import journalRoutes from './routes/journal.routes.js';
import reportRoutes from './routes/report.routes.js';
import backupRoutes from './routes/backup.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import salaryRoutes from './routes/salary.routes.js';
import shiftRoutes from './routes/shift.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';

const app = express();

// ============================================================
// MIDDLEWARE GLOBAL
// ============================================================
app.use(
  helmet({
    contentSecurityPolicy: false, // Dimatikan untuk LAN usage
  })
);
app.use(cors({ origin: '*' })); // Izinkan semua origin pada jaringan lokal
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// ============================================================
// HEALTH CHECK ENDPOINT
// ============================================================
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Robin Group API Server berjalan dengan baik',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// ============================================================
// ROUTES (akan ditambahkan di Fase 2 & 3)
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/users', userRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/journals', journalRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/salaries', salaryRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/attendance', attendanceRoutes);

// ============================================================
// SERVE FRONTEND STATIC BUILD (PRODUCTION / ALL-IN-ONE)
// ============================================================
const frontendDistPath = path.resolve(process.cwd(), '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  // SPA fallback untuk route selain /api (Express 5 compatible)
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(frontendDistPath, 'index.html'));
    }
    next();
  });
}

// ============================================================
// ERROR HANDLER GLOBAL (404)
// ============================================================
app.use((_req, res) => {
  sendError(res, 'Endpoint tidak ditemukan', 404);
});

// ============================================================
// ERROR HANDLER GLOBAL (500)
// ============================================================
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('[SERVER ERROR]', err.stack);
    sendError(
      res,
      config.nodeEnv === 'development'
        ? err.message
        : 'Terjadi kesalahan pada server',
      500
    );
  }
);

// ============================================================
// START SERVER
// ============================================================
async function startServer(): Promise<void> {
  try {
    // Test koneksi database
    await prisma.$connect();
    console.log('✅ Koneksi database berhasil');

    app.listen(config.port, '0.0.0.0', () => {
      console.log(
        `🚀 Robin Group API Server berjalan di http://0.0.0.0:${config.port}`
      );
      console.log(`   Environment: ${config.nodeEnv}`);
      console.log(`   Aplikasi Web (UI): http://localhost:${config.port}`);
      console.log(`   API Health Check:  http://localhost:${config.port}/api/health`);
    });
  } catch (error) {
    console.error('❌ Gagal terhubung ke database:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();

export default app;
