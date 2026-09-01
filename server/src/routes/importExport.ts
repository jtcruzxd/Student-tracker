import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import multer from 'multer';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ─── EXPORT ──────────────────────────────────────────────────────────────────

// GET /api/export/students?classId=&format=csv|xlsx
router.get('/students', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { classId, format = 'csv' } = req.query;
    const students = await prisma.student.findMany({
      where: { archived: false, ...(classId ? { classId: classId as string } : {}) },
      include: { class: true },
      orderBy: { fullName: 'asc' },
    });

    const rows = students.map(s => ({
      'Student ID': s.studentId,
      'Full Name': s.fullName,
      'Email': s.email || '',
      'Class': s.class.name,
      'Grade Level': s.class.gradeLevel,
      'Guardian Contact': s.guardianContact || '',
    }));

    sendFile(res, rows, 'students', format as string);
  } catch (e) { next(e); }
});

// GET /api/export/attendance?classId=&from=&to=&format=csv|xlsx
router.get('/attendance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { classId, from, to, format = 'csv' } = req.query;
    const records = await prisma.attendanceRecord.findMany({
      where: {
        ...(classId ? { session: { classId: classId as string } } : {}),
        ...(from || to ? {
          session: { date: { ...(from ? { gte: new Date(from as string) } : {}), ...(to ? { lte: new Date(to as string) } : {}) } },
        } : {}),
      },
      include: { student: { include: { class: true } }, session: true },
      orderBy: { session: { date: 'desc' } },
    });

    const rows = records.map(r => ({
      'Date': r.session.date.toISOString().split('T')[0],
      'Student ID': r.student.studentId,
      'Full Name': r.student.fullName,
      'Class': r.student.class.name,
      'Status': r.status,
      'Notes': r.notes || '',
    }));

    sendFile(res, rows, 'attendance', format as string);
  } catch (e) { next(e); }
});

// GET /api/export/grades?studentId=&classId=&category=&format=csv|xlsx
router.get('/grades', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId, classId, category, format = 'csv' } = req.query;
    const grades = await prisma.gradeEntry.findMany({
      where: {
        ...(studentId ? { studentId: studentId as string } : {}),
        ...(classId ? { student: { classId: classId as string } } : {}),
        ...(category ? { category: category as string } : {}),
      },
      include: { student: { include: { class: true } } },
      orderBy: { date: 'desc' },
    });

    const rows = grades.map(g => ({
      'Date': g.date.toISOString().split('T')[0],
      'Student ID': g.student.studentId,
      'Full Name': g.student.fullName,
      'Class': g.student.class.name,
      'Title': g.title,
      'Category': g.category,
      'Score': g.score,
      'Max Score': g.maxScore,
      'Percentage': g.percentage,
      'Remarks': g.remarks || '',
    }));

    sendFile(res, rows, 'grades', format as string);
  } catch (e) { next(e); }
});

// ─── IMPORT ──────────────────────────────────────────────────────────────────

// POST /api/import/students
router.post('/students', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) { res.status(400).json({ success: false, message: 'No file uploaded' }); return; }

    const rows = parseFile(req.file);
    const errors: { row: number; message: string }[] = [];
    const created: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as Record<string, string>;
      const rowNum = i + 2;

      const studentId = row['Student ID'] || row['studentId'] || row['student_id'];
      const fullName = row['Full Name'] || row['fullName'] || row['full_name'];
      const className = row['Class'] || row['class'];

      if (!studentId) { errors.push({ row: rowNum, message: 'Missing Student ID' }); continue; }
      if (!fullName) { errors.push({ row: rowNum, message: 'Missing Full Name' }); continue; }
      if (!className) { errors.push({ row: rowNum, message: 'Missing Class' }); continue; }

      const cls = await prisma.class.findFirst({ where: { name: { equals: className } } });
      if (!cls) { errors.push({ row: rowNum, message: `Class "${className}" not found` }); continue; }

      try {
        await prisma.student.upsert({
          where: { studentId },
          update: { fullName, email: row['Email'] || null, guardianContact: row['Guardian Contact'] || null, classId: cls.id },
          create: { studentId, fullName, email: row['Email'] || null, guardianContact: row['Guardian Contact'] || null, classId: cls.id },
        });
        created.push(studentId);
      } catch (err) {
        errors.push({ row: rowNum, message: `Failed to save: ${(err as Error).message}` });
      }
    }

    res.json({ success: true, data: { imported: created.length, errors } });
  } catch (e) { next(e); }
});

// POST /api/import/grades
router.post('/grades', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) { res.status(400).json({ success: false, message: 'No file uploaded' }); return; }

    const rows = parseFile(req.file);
    const errors: { row: number; message: string }[] = [];
    let imported = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as Record<string, string>;
      const rowNum = i + 2;

      const studentId = row['Student ID'] || row['studentId'];
      const title = row['Title'] || row['title'];
      const category = (row['Category'] || row['category'] || '').toUpperCase();
      const score = parseFloat(row['Score'] || row['score'] || '');
      const maxScore = parseFloat(row['Max Score'] || row['maxScore'] || '');
      const date = row['Date'] || row['date'];

      if (!studentId || !title || !category || isNaN(score) || isNaN(maxScore) || !date) {
        errors.push({ row: rowNum, message: 'Missing required fields (Student ID, Title, Category, Score, Max Score, Date)' });
        continue;
      }

      const validCategories = ['QUIZ', 'ASSIGNMENT', 'RECITATION', 'EXAM', 'PROJECT', 'CUSTOM'];
      if (!validCategories.includes(category)) {
        errors.push({ row: rowNum, message: `Invalid category "${category}"` });
        continue;
      }

      const student = await prisma.student.findUnique({ where: { studentId } });
      if (!student) { errors.push({ row: rowNum, message: `Student "${studentId}" not found` }); continue; }

      try {
        await prisma.gradeEntry.create({
          data: {
            title,
            category: category as 'QUIZ',
            score,
            maxScore,
            percentage: Math.round((score / maxScore) * 10000) / 100,
            remarks: row['Remarks'] || null,
            date: new Date(date),
            studentId: student.id,
          },
        });
        imported++;
      } catch (err) {
        errors.push({ row: rowNum, message: `Failed to save: ${(err as Error).message}` });
      }
    }

    res.json({ success: true, data: { imported, errors } });
  } catch (e) { next(e); }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseFile(file: Express.Multer.File): unknown[] {
  const ext = file.originalname.split('.').pop()?.toLowerCase();
  if (ext === 'csv') {
    const text = file.buffer.toString('utf-8');
    const result = Papa.parse(text, { header: true, skipEmptyLines: true });
    return result.data as unknown[];
  } else {
    const wb = XLSX.read(file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws) as unknown[];
  }
}

function sendFile(res: Response, rows: object[], filename: string, format: string): void {
  if (format === 'xlsx') {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    res.send(buf);
  } else {
    const csv = Papa.unparse(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.send(csv);
  }
}

export default router;
