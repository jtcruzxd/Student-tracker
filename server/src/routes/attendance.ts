import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const router = Router();

const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const;

const recordSchema = z.object({
  studentId: z.string(),
  status: z.enum(ATTENDANCE_STATUSES),
  notes: z.string().optional(),
});

const sessionSchema = z.object({
  date: z.string().min(1),
  classId: z.string().min(1),
  records: z.array(recordSchema).optional(),
});

// GET /api/attendance/sessions
router.get('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { classId, from, to } = req.query;
    const sessions = await prisma.attendanceSession.findMany({
      where: {
        ...(classId ? { classId: classId as string } : {}),
        ...(from || to ? {
          date: {
            ...(from ? { gte: new Date(from as string) } : {}),
            ...(to ? { lte: new Date(to as string) } : {}),
          },
        } : {}),
      },
      include: {
        class: true,
        records: { include: { student: true } },
        _count: { select: { records: true } },
      },
      orderBy: { date: 'desc' },
    });
    res.json({ success: true, data: sessions });
  } catch (e) { next(e); }
});

// GET /api/attendance/sessions/:id
router.get('/sessions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await prisma.attendanceSession.findUnique({
      where: { id: req.params.id },
      include: {
        class: true,
        records: { include: { student: { include: { class: true } } } },
      },
    });
    if (!session) { res.status(404).json({ success: false, message: 'Session not found' }); return; }
    res.json({ success: true, data: session });
  } catch (e) { next(e); }
});

// POST /api/attendance/sessions
router.post('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, classId, records } = sessionSchema.parse(req.body);

    // If no records provided, auto-generate for all students in class
    let recordData = records;
    if (!recordData || recordData.length === 0) {
      const students = await prisma.student.findMany({
        where: { classId, archived: false },
        select: { id: true },
      });
      recordData = students.map(s => ({ studentId: s.id, status: 'PRESENT' as const }));
    }

    const session = await prisma.attendanceSession.create({
      data: {
        date: new Date(date),
        classId,
        records: {
          create: recordData.map(r => ({
            studentId: r.studentId,
            status: r.status,
            notes: r.notes,
          })),
        },
      },
      include: { records: { include: { student: true } }, class: true },
    });
    res.status(201).json({ success: true, data: session });
  } catch (e) { next(e); }
});

// PUT /api/attendance/sessions/:id
router.put('/sessions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { records } = z.object({ records: z.array(recordSchema) }).parse(req.body);

    // Upsert each record
    await Promise.all(records.map(r =>
      prisma.attendanceRecord.upsert({
        where: { sessionId_studentId: { sessionId: req.params.id, studentId: r.studentId } },
        update: { status: r.status, notes: r.notes },
        create: { sessionId: req.params.id, studentId: r.studentId, status: r.status, notes: r.notes },
      })
    ));

    const session = await prisma.attendanceSession.findUnique({
      where: { id: req.params.id },
      include: { records: { include: { student: true } }, class: true },
    });
    res.json({ success: true, data: session });
  } catch (e) { next(e); }
});

// DELETE /api/attendance/sessions/:id
router.delete('/sessions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.attendanceSession.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Session deleted' });
  } catch (e) { next(e); }
});

// GET /api/attendance/records — per-student records with filters
router.get('/records', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId, status, from, to } = req.query;
    const records = await prisma.attendanceRecord.findMany({
      where: {
        ...(studentId ? { studentId: studentId as string } : {}),
        ...(status ? { status: status as string } : {}),
        ...(from || to ? {
          session: {
            date: {
              ...(from ? { gte: new Date(from as string) } : {}),
              ...(to ? { lte: new Date(to as string) } : {}),
            },
          },
        } : {}),
      },
      include: { session: { include: { class: true } }, student: true },
      orderBy: { session: { date: 'desc' } },
    });
    res.json({ success: true, data: records });
  } catch (e) { next(e); }
});

// GET /api/attendance/stats — class-level stats summary
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { classId, date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const sessions = await prisma.attendanceSession.findMany({
      where: {
        ...(classId ? { classId: classId as string } : {}),
        date: { gte: startOfDay, lte: endOfDay },
      },
      include: { records: true },
    });

    const allRecords = sessions.flatMap(s => s.records);
    const total = allRecords.length;
    const present = allRecords.filter(r => r.status === 'PRESENT').length;
    const absent = allRecords.filter(r => r.status === 'ABSENT').length;
    const late = allRecords.filter(r => r.status === 'LATE').length;
    const excused = allRecords.filter(r => r.status === 'EXCUSED').length;

    res.json({
      success: true,
      data: {
        date: targetDate,
        total, present, absent, late, excused,
        presentPct: total > 0 ? Math.round((present / total) * 100) : 0,
      },
    });
  } catch (e) { next(e); }
});

export default router;
