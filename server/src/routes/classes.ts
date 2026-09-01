import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const router = Router();

const classSchema = z.object({
  name: z.string().min(1),
  gradeLevel: z.string().min(1),
  section: z.string().optional(),
  schoolYear: z.string().min(1),
});

// GET /api/classes
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const classes = await prisma.class.findMany({
      include: { _count: { select: { students: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: classes });
  } catch (e) { next(e); }
});

// GET /api/classes/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cls = await prisma.class.findUnique({
      where: { id: req.params.id },
      include: {
        students: { where: { archived: false }, orderBy: { fullName: 'asc' } },
        _count: { select: { students: true, activities: true } },
      },
    });
    if (!cls) { res.status(404).json({ success: false, message: 'Class not found' }); return; }
    res.json({ success: true, data: cls });
  } catch (e) { next(e); }
});

// POST /api/classes
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = classSchema.parse(req.body);
    const cls = await prisma.class.create({ data });
    res.status(201).json({ success: true, data: cls });
  } catch (e) { next(e); }
});

// PUT /api/classes/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = classSchema.partial().parse(req.body);
    const cls = await prisma.class.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: cls });
  } catch (e) { next(e); }
});

// DELETE /api/classes/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.class.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Class deleted' });
  } catch (e) { next(e); }
});

export default router;
