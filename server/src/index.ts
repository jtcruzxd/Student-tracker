import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { errorHandler, notFound } from './middleware/errorHandler';
import { authenticate } from './middleware/authenticate';
import authRouter from './routes/auth';
import classesRouter from './routes/classes';
import studentsRouter from './routes/students';
import attendanceRouter from './routes/attendance';
import gradesRouter from './routes/grades';
import activitiesRouter from './routes/activities';
import dashboardRouter from './routes/dashboard';
import importExportRouter from './routes/importExport';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Public routes (no auth required) ────────────────────────────────────────
app.use('/api/auth', authRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Protected routes (JWT required) ─────────────────────────────────────────
app.use('/api/dashboard', authenticate, dashboardRouter);
app.use('/api/classes', authenticate, classesRouter);
app.use('/api/students', authenticate, studentsRouter);
app.use('/api/attendance', authenticate, attendanceRouter);
app.use('/api/grades', authenticate, gradesRouter);
app.use('/api/activities', authenticate, activitiesRouter);
app.use('/api/export', authenticate, importExportRouter);
app.use('/api/import', authenticate, importExportRouter);

// ─── Error handlers ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

export default app;
