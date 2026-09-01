import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler, notFound } from './middleware/errorHandler';
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

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/dashboard', dashboardRouter);
app.use('/api/classes', classesRouter);
app.use('/api/students', studentsRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/grades', gradesRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/export', importExportRouter);
app.use('/api/import', importExportRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handlers
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

export default app;
