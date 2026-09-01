import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const router = Router();

const activitySchema = z.object({
  title: z.string().min(1),
  type: z.enum(['QUIZ', 'ASSIGNMENT', 'RECITATION', 'EXAM', 'PROJECT']),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  activityDate: z.string().optional(),
  maxScore: z.number().min(0.01),
  classId: z.string().min(1),
  studentIds: z.array(z.string()).optional(), // if empty/absent, assign all class students
});

const scoreSchema = z.object({
  studentId: z.string(),
  score: z.number().min(0).optional(),
  submitted: z.boolean().optional(),
  notes: z.string().optional(),
});

// GET /api/activities
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { classId, type } = req.query;
    const activities = await prisma.activity.findMany({
      where: {
        ...(classId ? { classId: classId as string } : {}),
        ...(type ? { type: type as string } : {}),
      },
      include: {
        class: true,
        _count: { select: { scores: true } },
      },
      orderBy: [{ dueDate: 'desc' }, { activityDate: 'desc' }],
    });
    res.json({ success: true, data: activities });
  } catch (e) { next(e); }
});

// GET /api/activities/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activity = await prisma.activity.findUnique({
      where: { id: req.params.id },
      include: {
        class: true,
        scores: { include: { student: true } },
      },
    });
    if (!activity) { res.status(404).json({ success: false, message: 'Activity not found' }); return; }
    res.json({ success: true, data: activity });
  } catch (e) { next(e); }
});

// POST /api/activities
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentIds, dueDate, activityDate, ...rest } = activitySchema.parse(req.body);

    // Determine target students
    let targetIds = studentIds;
    if (!targetIds || targetIds.length === 0) {
      const students = await prisma.student.findMany({
        where: { classId: rest.classId, archived: false },
        select: { id: true },
      });
      targetIds = students.map(s => s.id);
    }

    const activity = await prisma.activity.create({
      data: {
        ...rest,
        dueDate: dueDate ? new Date(dueDate) : null,
        activityDate: activityDate ? new Date(activityDate) : null,
        scores: {
          create: targetIds.map(sid => ({ studentId: sid, submitted: false })),
        },
      },
      include: { scores: { include: { student: true } }, class: true },
    });
    res.status(201).json({ success: true, data: activity });
  } catch (e) { next(e); }
});

// PUT /api/activities/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentIds: _s, dueDate, activityDate, ...rest } = activitySchema.partial().parse(req.body);
    const activity = await prisma.activity.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        activityDate: activityDate ? new Date(activityDate) : undefined,
      },
      include: { scores: { include: { student: true } }, class: true },
    });
    res.json({ success: true, data: activity });
  } catch (e) { next(e); }
});

// DELETE /api/activities/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.activity.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Activity deleted' });
  } catch (e) { next(e); }
});

// PUT /api/activities/:id/scores — bulk update scores
router.put('/:id/scores', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scores } = z.object({ scores: z.array(scoreSchema) }).parse(req.body);
    const activity = await prisma.activity.findUnique({ where: { id: req.params.id } });
    if (!activity) { res.status(404).json({ success: false, message: 'Activity not found' }); return; }

    await Promise.all(scores.map(s =>
      prisma.activityScore.upsert({
        where: { studentId_activityId: { studentId: s.studentId, activityId: req.params.id } },
        update: { score: s.score ?? null, submitted: s.submitted ?? false, notes: s.notes },
        create: { studentId: s.studentId, activityId: req.params.id, score: s.score ?? null, submitted: s.submitted ?? false, notes: s.notes },
      })
    ));

    // Auto-create grade entries for scored students
    for (const s of scores) {
      if (s.score !== undefined && s.score !== null) {
        const percentage = Math.round((s.score / activity.maxScore) * 10000) / 100;
        const catMap: Record<string, string> = {
          QUIZ: 'QUIZ', ASSIGNMENT: 'ASSIGNMENT', RECITATION: 'RECITATION',
          EXAM: 'EXAM', PROJECT: 'PROJECT',
        };
        const category = catMap[activity.type] || 'CUSTOM';
        // Check for existing grade entry linked to this activity and student
        const existing = await prisma.gradeEntry.findFirst({
          where: { studentId: s.studentId, activityId: req.params.id },
        });
        if (existing) {
          await prisma.gradeEntry.update({
            where: { id: existing.id },
            data: { score: s.score, percentage, maxScore: activity.maxScore },
          });
        } else {
          await prisma.gradeEntry.create({
            data: {
              title: activity.title,
              category,
              score: s.score,
              maxScore: activity.maxScore,
              percentage,
              date: activity.activityDate || activity.dueDate || new Date(),
              studentId: s.studentId,
              activityId: req.params.id,
            },
          });
        }
      }
    }

    const updated = await prisma.activity.findUnique({
      where: { id: req.params.id },
      include: { scores: { include: { student: true } } },
    });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
});

export default router;
