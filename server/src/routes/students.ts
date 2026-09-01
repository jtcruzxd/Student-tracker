import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const router = Router();

const studentSchema = z.object({
  studentId: z.string().min(1),
  fullName: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  guardianContact: z.string().optional(),
  classId: z.string().min(1),
});

// GET /api/students
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, classId, archived } = req.query;
    const students = await prisma.student.findMany({
      where: {
        archived: archived === 'true' ? true : false,
        ...(classId ? { classId: classId as string } : {}),
        ...(search ? {
          OR: [
            { fullName: { contains: search as string } },
            { studentId: { contains: search as string } },
            { email: { contains: search as string } },
          ],
        } : {}),
      },
      include: {
        class: true,
        _count: { select: { attendanceRecords: true, gradeEntries: true } },
      },
      orderBy: { fullName: 'asc' },
    });
    res.json({ success: true, data: students });
  } catch (e) { next(e); }
});

// GET /api/students/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: {
        class: true,
        attendanceRecords: {
          include: { session: { include: { class: true } } },
          orderBy: { session: { date: 'desc' } },
        },
        gradeEntries: { orderBy: { date: 'desc' } },
        activityScores: { include: { activity: true }, orderBy: { activity: { dueDate: 'desc' } } },
      },
    });
    if (!student) { res.status(404).json({ success: false, message: 'Student not found' }); return; }
    res.json({ success: true, data: student });
  } catch (e) { next(e); }
});

// POST /api/students
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = studentSchema.parse(req.body);
    const student = await prisma.student.create({
      data: { ...data, email: data.email || null },
      include: { class: true },
    });
    res.status(201).json({ success: true, data: student });
  } catch (e) { next(e); }
});

// PUT /api/students/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = studentSchema.partial().parse(req.body);
    const student = await prisma.student.update({
      where: { id: req.params.id },
      data: { ...data, email: data.email || null },
      include: { class: true },
    });
    res.json({ success: true, data: student });
  } catch (e) { next(e); }
});

// DELETE /api/students/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.student.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Student deleted' });
  } catch (e) { next(e); }
});

// GET /api/students/:id/stats — attendance + grade summary
router.get('/:id/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: {
        attendanceRecords: true,
        gradeEntries: true,
      },
    });
    if (!student) { res.status(404).json({ success: false, message: 'Student not found' }); return; }

    const att = student.attendanceRecords;
    const total = att.length;
    const present = att.filter(r => r.status === 'PRESENT').length;
    const absent = att.filter(r => r.status === 'ABSENT').length;
    const late = att.filter(r => r.status === 'LATE').length;
    const excused = att.filter(r => r.status === 'EXCUSED').length;
    const attendancePct = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    const grades = student.gradeEntries;
    const overallAvg = grades.length > 0
      ? Math.round((grades.reduce((sum, g) => sum + g.percentage, 0) / grades.length) * 100) / 100
      : null;

    const byCategory: Record<string, { count: number; avg: number }> = {};
    for (const g of grades) {
      if (!byCategory[g.category]) byCategory[g.category] = { count: 0, avg: 0 };
      byCategory[g.category].count++;
      byCategory[g.category].avg += g.percentage;
    }
    for (const cat of Object.keys(byCategory)) {
      byCategory[cat].avg = Math.round((byCategory[cat].avg / byCategory[cat].count) * 100) / 100;
    }

    res.json({
      success: true,
      data: {
        attendance: { total, present, absent, late, excused, attendancePct },
        grades: { overallAvg, byCategory, totalEntries: grades.length },
      },
    });
  } catch (e) { next(e); }
});

export default router;
