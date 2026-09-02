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

    sendFile(res, rows, 'students', format as string,
      `Student List — ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      [14, 28, 28, 24, 16, 20],
    );
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

    sendFile(res, rows, 'attendance', format as string,
      `Attendance Records — ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      [14, 14, 28, 24, 12, 30],
    );
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
      'Activity': g.title,
      'Category': g.category,
      'Score': g.score,
      'Max Score': g.maxScore,
      'Percentage (%)': g.percentage,
      'Remarks': g.remarks || '',
    }));

    sendFile(res, rows, 'grades', format as string,
      `Grade Records — ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      [14, 14, 28, 24, 28, 14, 10, 12, 16, 24],
    );
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

// ─── Palette ────────────────────────────────────────────────────────────────
// Header: dark charcoal bg, white text
// Sub-header / title row: rose accent
// Even rows: very light rose tint
// Odd rows: white
// Borders: light gray

const C = {
  headerBg:    'FF2D2D2D', // dark charcoal
  headerFont:  'FFFFFFFF', // white
  accentBg:    'FFD96868', // rose
  accentFont:  'FFFFFFFF',
  evenRowBg:   'FFFFF5F5', // light rose tint
  oddRowBg:    'FFFFFFFF',
  borderColor: 'FFD1D5DB',
  titleBg:     'FF689D4B', // forest green for title band
  titleFont:   'FFFFFFFF',
};

function makeBorder() {
  const side = { style: 'thin' as const, color: { rgb: C.borderColor } };
  return { top: side, bottom: side, left: side, right: side };
}

function styleWorksheet(
  ws: XLSX.WorkSheet,
  headers: string[],
  rows: object[],
  sheetTitle: string,
  colWidths: number[],
) {
  const totalCols = headers.length;
  const totalRows = rows.length;

  // Set column widths
  ws['!cols'] = colWidths.map(w => ({ wch: w }));

  // Freeze top 2 rows (title + header)
  ws['!freeze'] = { xSplit: 0, ySplit: 2 };

  // Row 1: merged title banner
  // We insert a title row above the data — shift everything down by 1
  // Note: json_to_sheet already placed headers at row 1, data at row 2+
  // We'll insert a title row at row 1 and push headers to row 2

  // Re-encode: shift all existing cells down by 1
  const ref = ws['!ref'];
  if (ref) {
    const range = XLSX.utils.decode_range(ref);
    // Shift existing cells down by 1 row
    for (let r = range.e.r; r >= range.s.r; r--) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const oldAddr = XLSX.utils.encode_cell({ r, c });
        const newAddr = XLSX.utils.encode_cell({ r: r + 1, c });
        if (ws[oldAddr]) { ws[newAddr] = ws[oldAddr]; delete ws[oldAddr]; }
      }
    }
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: range.e.r + 1, c: range.e.c } });
  }

  // Row 0: Title banner (merged across all columns)
  const titleCell: XLSX.CellObject = {
    t: 's', v: sheetTitle,
    s: {
      font: { bold: true, sz: 14, color: { rgb: C.titleFont }, name: 'Calibri' },
      fill: { fgColor: { rgb: C.titleBg }, patternType: 'solid' },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: makeBorder(),
    },
  };
  ws['A1'] = titleCell;
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }];
  ws['!rows'] = [{ hpt: 28 }, { hpt: 22 }]; // title row height, header row height

  // Row 1 (now header row after shift): style header cells
  for (let c = 0; c < totalCols; c++) {
    const addr = XLSX.utils.encode_cell({ r: 1, c });
    if (ws[addr]) {
      ws[addr].s = {
        font: { bold: true, sz: 10, color: { rgb: C.headerFont }, name: 'Calibri' },
        fill: { fgColor: { rgb: C.headerBg }, patternType: 'solid' },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: makeBorder(),
      };
    }
  }

  // Data rows (row 2+): alternating background + borders
  for (let r = 2; r <= totalRows + 1; r++) {
    const isEven = (r % 2 === 0);
    const bg = isEven ? C.evenRowBg : C.oddRowBg;
    for (let c = 0; c < totalCols; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (cell) {
        cell.s = {
          font: { sz: 10, name: 'Calibri' },
          fill: { fgColor: { rgb: bg }, patternType: 'solid' },
          alignment: { vertical: 'center', wrapText: false },
          border: makeBorder(),
        };
        // Center numeric/percentage columns
        if (typeof cell.v === 'number') {
          cell.s.alignment = { ...cell.s.alignment, horizontal: 'center' };
        }
      }
    }
  }

  return ws;
}

function buildStyledXlsx(
  rows: object[],
  filename: string,
  sheetTitle: string,
  colWidths: number[],
): Buffer {
  if (rows.length === 0) {
    // Empty sheet with just a title
    const wb = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = { A1: { t: 's', v: 'No data found' }, '!ref': 'A1:A1' };
    XLSX.utils.book_append_sheet(wb, ws, filename);
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
  }

  const headers = Object.keys(rows[0]);
  const ws = XLSX.utils.json_to_sheet(rows);
  styleWorksheet(ws, headers, rows, sheetTitle, colWidths);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, filename.charAt(0).toUpperCase() + filename.slice(1));

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
}

function sendFile(res: Response, rows: object[], filename: string, format: string, sheetTitle: string, colWidths: number[]): void {
  const stamp = new Date().toISOString().split('T')[0];
  if (format === 'xlsx') {
    const buf = buildStyledXlsx(rows, filename, sheetTitle, colWidths);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}-${stamp}.xlsx"`);
    res.send(buf);
  } else {
    const csv = Papa.unparse(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}-${stamp}.csv"`);
    res.send(csv);
  }
}

export default router;
