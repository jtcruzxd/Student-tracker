import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const router = Router();

const gradeSchema = z.object({
  title: z.string().min(1),
  category: z.enum(['QUIZ', 'ASSIGNMENT', 'RECITATION', 'EXAM', 'PROJECT', 'CUSTOM']),
  score: z.number().min(0),
  maxScore: z.number().min(0.01),
  remarks: z.string().optional(),
  date: z.string().min(1),
  studentId: z.string().min(1),
  activityId: z.string().optional(),
});

// GET /api/grades
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId, category, classId } = req.query;
    const grades = await prisma.gradeEntry.findMany({
      where: {
        ...(studentId ? { studentId: studentId as string } : {}),
        ...(category ? { category: category as string } : {}),
        ...(classId ? { student: { classId: classId as string } } : {}),
      },
      include: { student: { include: { class: true } }, activity: true },
      orderBy: { date: 'desc' },
    });
    res.json({ success: true, data: grades });
  } catch (e) { next(e); }
});

// GET /api/grades/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const grade = await prisma.gradeEntry.findUnique({
      where: { id: req.params.id },
      include: { student: true, activity: true },
    });
    if (!grade) { res.status(404).json({ success: false, message: 'Grade not found' }); return; }
    res.json({ success: true, data: grade });
  } catch (e) { next(e); }
});

// POST /api/grades
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = gradeSchema.parse(req.body);
    const percentage = Math.round((data.score / data.maxScore) * 10000) / 100;
    const grade = await prisma.gradeEntry.create({
      data: {
        ...data,
        percentage,
        date: new Date(data.date),
        activityId: data.activityId || null,
      },
      include: { student: true },
    });
    res.status(201).json({ success: true, data: grade });
  } catch (e) { next(e); }
});

// PUT /api/grades/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = gradeSchema.partial().parse(req.body);
    const existing = await prisma.gradeEntry.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ success: false, message: 'Grade not found' }); return; }

    const score = data.score ?? existing.score;
    const maxScore = data.maxScore ?? existing.maxScore;
    const percentage = Math.round((score / maxScore) * 10000) / 100;

    const grade = await prisma.gradeEntry.update({
      where: { id: req.params.id },
      data: {
        ...data,
        percentage,
        date: data.date ? new Date(data.date) : undefined,
        activityId: data.activityId !== undefined ? (data.activityId || null) : undefined,
      },
      include: { student: true },
    });
    res.json({ success: true, data: grade });
  } catch (e) { next(e); }
});

// DELETE /api/grades/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.gradeEntry.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Grade deleted' });
  } catch (e) { next(e); }
});

// GET /api/grades/student/:studentId/summary
router.get('/student/:studentId/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const grades = await prisma.gradeEntry.findMany({
      where: { studentId: req.params.studentId },
      orderBy: { date: 'desc' },
    });

    const categories = ['QUIZ', 'ASSIGNMENT', 'RECITATION', 'EXAM', 'PROJECT', 'CUSTOM'] as const;
    const summary: Record<string, { count: number; avg: number; entries: typeof grades }> = {};

    for (const cat of categories) {
      const catGrades = grades.filter(g => g.category === cat);
      summary[cat] = {
        count: catGrades.length,
        avg: catGrades.length > 0
          ? Math.round((catGrades.reduce((s, g) => s + g.percentage, 0) / catGrades.length) * 100) / 100
          : 0,
        entries: catGrades,
      };
    }

    const overall = grades.length > 0
      ? Math.round((grades.reduce((s, g) => s + g.percentage, 0) / grades.length) * 100) / 100
      : null;

    res.json({ success: true, data: { summary, overall, total: grades.length } });
  } catch (e) { next(e); }
});

export default router;
