import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const router = Router();

const criterionSchema = z.object({
  label:    z.string().min(1),
  category: z.string().min(1), // QUIZ | ASSIGNMENT | RECITATION | EXAM | PROJECT | CUSTOM | ATTENDANCE
  weight:   z.number().min(0).max(100),
});

const bulkSchema = z.object({
  criteria: z.array(criterionSchema),
});

// ─── GET /api/grading-criteria?classId=xxx ────────────────────────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { classId } = req.query;
    if (!classId) {
      res.status(400).json({ success: false, message: 'classId is required' });
      return;
    }
    const criteria = await prisma.gradingCriteria.findMany({
      where: { classId: classId as string },
      orderBy: { weight: 'desc' },
    });
    res.json({ success: true, data: criteria });
  } catch (e) { next(e); }
});

// ─── PUT /api/grading-criteria/:classId — replace all criteria for a class ────
router.put('/:classId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { criteria } = bulkSchema.parse(req.body);
    const classId = req.params.classId;

    // Validate weights sum ≤ 100
    const total = criteria.reduce((s, c) => s + c.weight, 0);
    if (Math.round(total * 100) > 10000) {
      res.status(400).json({ success: false, message: `Weights total ${total.toFixed(1)}% — must not exceed 100%` });
      return;
    }

    // Upsert each criterion, delete any removed ones
    await prisma.$transaction(async (tx) => {
      // Delete all existing then recreate — simpler than diffing
      await tx.gradingCriteria.deleteMany({ where: { classId } });
      if (criteria.length > 0) {
        await tx.gradingCriteria.createMany({
          data: criteria.map(c => ({ classId, label: c.label, category: c.category, weight: c.weight })),
        });
      }
    });

    const saved = await prisma.gradingCriteria.findMany({
      where: { classId },
      orderBy: { weight: 'desc' },
    });
    res.json({ success: true, data: saved });
  } catch (e) { next(e); }
});

// ─── GET /api/grading-criteria/:classId/calculate ─────────────────────────────
// Returns a weighted final grade per student in the class
router.get('/:classId/calculate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { classId } = req.params;

    // Load criteria for this class
    const criteria = await prisma.gradingCriteria.findMany({ where: { classId } });
    if (criteria.length === 0) {
      res.status(400).json({ success: false, message: 'No grading criteria set for this class' });
      return;
    }

    // Load all non-archived students in class
    const students = await prisma.student.findMany({
      where: { classId, archived: false },
      orderBy: { fullName: 'asc' },
    });

    // Load all grade entries for students in this class
    const gradeEntries = await prisma.gradeEntry.findMany({
      where: { student: { classId } },
    });

    // Load attendance data for the class
    const attendanceSessions = await prisma.attendanceSession.findMany({
      where: { classId },
      include: { records: true },
    });

    const totalSessions = attendanceSessions.length;

    const results = students.map(student => {
      // Per-category averages for this student
      const categoryAvg: Record<string, number | null> = {};
      const studentGrades = gradeEntries.filter(g => g.studentId === student.id);

      for (const criterion of criteria) {
        if (criterion.category === 'ATTENDANCE') {
          // Attendance grade: % of sessions with PRESENT or EXCUSED
          if (totalSessions === 0) {
            categoryAvg['ATTENDANCE'] = null;
          } else {
            let attended = 0;
            for (const session of attendanceSessions) {
              const record = session.records.find(r => r.studentId === student.id);
              if (!record || record.status === 'PRESENT' || record.status === 'EXCUSED') {
                attended++;
              }
            }
            categoryAvg['ATTENDANCE'] = (attended / totalSessions) * 100;
          }
        } else {
          const entries = studentGrades.filter(g => g.category === criterion.category);
          if (entries.length === 0) {
            categoryAvg[criterion.category] = null;
          } else {
            const avg = entries.reduce((s, g) => s + g.percentage, 0) / entries.length;
            categoryAvg[criterion.category] = Math.round(avg * 100) / 100;
          }
        }
      }

      // Weighted final grade — only include criteria that have data
      let weightedSum = 0;
      let usedWeight = 0;
      const breakdown: {
        label: string;
        category: string;
        weight: number;
        avg: number | null;
        contribution: number | null;
      }[] = [];

      for (const criterion of criteria) {
        const avg = categoryAvg[criterion.category] ?? null;
        const contribution = avg !== null ? (avg * criterion.weight) / 100 : null;
        if (contribution !== null) {
          weightedSum += contribution;
          usedWeight += criterion.weight;
        }
        breakdown.push({
          label: criterion.label,
          category: criterion.category,
          weight: criterion.weight,
          avg,
          contribution,
        });
      }

      // If not all criteria have data, scale up proportionally
      const finalGrade = usedWeight > 0
        ? Math.round((weightedSum / usedWeight) * usedWeight * 100) / 100
        : null;

      // Convert percentage to transmuted grade (Philippine grading system)
      const transmute = (pct: number | null): number | null => {
        if (pct === null) return null;
        if (pct >= 99) return 100;
        if (pct >= 96) return 99;
        if (pct >= 93) return 98;
        if (pct >= 90) return 97;
        if (pct >= 87) return 96;
        if (pct >= 84) return 95;
        if (pct >= 81) return 94;
        if (pct >= 78) return 93;
        if (pct >= 75) return 92;
        if (pct >= 72) return 91;
        if (pct >= 69) return 90;
        if (pct >= 66) return 89;
        if (pct >= 63) return 88;
        if (pct >= 60) return 87;
        if (pct >= 57) return 86;
        if (pct >= 54) return 85;
        if (pct >= 51) return 84;
        if (pct >= 48) return 83;
        if (pct >= 45) return 82;
        if (pct >= 42) return 81;
        if (pct >= 39) return 80;
        return 75; // below 39%
      };

      return {
        studentId: student.id,
        studentNo: student.studentId,
        fullName: student.fullName,
        breakdown,
        finalGrade: finalGrade !== null ? Math.round(finalGrade * 100) / 100 : null,
        transmutedGrade: transmute(finalGrade),
        usedWeight,
        totalWeight: criteria.reduce((s, c) => s + c.weight, 0),
      };
    });

    res.json({ success: true, data: results });
  } catch (e) { next(e); }
});

export default router;
