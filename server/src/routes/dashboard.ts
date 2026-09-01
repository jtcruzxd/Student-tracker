import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/dashboard
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today); endOfDay.setHours(23, 59, 59, 999);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 7);

    const [
      totalStudents,
      totalClasses,
      todaySessions,
      recentActivities,
      upcomingActivities,
      recentGrades,
      lowAttendanceStudents,
    ] = await Promise.all([
      prisma.student.count({ where: { archived: false } }),
      prisma.class.count(),
      prisma.attendanceSession.findMany({
        where: { date: { gte: startOfDay, lte: endOfDay } },
        include: { records: true, class: true },
      }),
      prisma.activity.findMany({
        where: { activityDate: { gte: startOfWeek } },
        include: { class: true, _count: { select: { scores: true } } },
        orderBy: { activityDate: 'desc' },
        take: 5,
      }),
      prisma.activity.findMany({
        where: { dueDate: { gte: today } },
        include: { class: true },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      prisma.gradeEntry.findMany({
        where: { date: { gte: startOfWeek } },
        include: { student: { include: { class: true } } },
        orderBy: { date: 'desc' },
        take: 10,
      }),
      // Students with attendance rate < 75%
      prisma.student.findMany({
        where: { archived: false },
        include: { attendanceRecords: true },
        take: 100,
      }),
    ]);

    // Today attendance summary
    const todayRecords = todaySessions.flatMap(s => s.records);
    const todayTotal = todayRecords.length;
    const todayPresent = todayRecords.filter(r => r.status === 'PRESENT').length;
    const todayAbsent = todayRecords.filter(r => r.status === 'ABSENT').length;
    const todayLate = todayRecords.filter(r => r.status === 'LATE').length;
    const todayExcused = todayRecords.filter(r => r.status === 'EXCUSED').length;

    // Low attendance
    const lowAtt = lowAttendanceStudents
      .map(s => {
        const total = s.attendanceRecords.length;
        const present = s.attendanceRecords.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
        const pct = total > 0 ? Math.round((present / total) * 100) : 100;
        return { id: s.id, fullName: s.fullName, studentId: s.studentId, pct, total };
      })
      .filter(s => s.total > 0 && s.pct < 75)
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 5);

    // Grade distribution
    const allGrades = await prisma.gradeEntry.findMany({ select: { percentage: true } });
    const distribution = { failing: 0, poor: 0, fair: 0, good: 0, excellent: 0 };
    for (const g of allGrades) {
      if (g.percentage < 60) distribution.failing++;
      else if (g.percentage < 70) distribution.poor++;
      else if (g.percentage < 80) distribution.fair++;
      else if (g.percentage < 90) distribution.good++;
      else distribution.excellent++;
    }
    const classAvg = allGrades.length > 0
      ? Math.round((allGrades.reduce((s, g) => s + g.percentage, 0) / allGrades.length) * 100) / 100
      : null;

    res.json({
      success: true,
      data: {
        totalStudents,
        totalClasses,
        todayAttendance: {
          total: todayTotal, present: todayPresent, absent: todayAbsent,
          late: todayLate, excused: todayExcused,
          presentPct: todayTotal > 0 ? Math.round((todayPresent / todayTotal) * 100) : 0,
          sessions: todaySessions.length,
        },
        lowAttendanceStudents: lowAtt,
        recentActivities,
        upcomingActivities,
        recentGrades,
        gradeDistribution: distribution,
        classAvg,
      },
    });
  } catch (e) { next(e); }
});

export default router;
