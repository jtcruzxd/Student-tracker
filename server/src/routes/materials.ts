import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const router = Router();

// 25 MB limit per file
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png', 'image/jpeg', 'image/gif', 'image/webp',
      'text/plain',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`Unsupported file type: ${file.mimetype}`));
  },
});

function getFileType(mimetype: string): string {
  const map: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/vnd.ms-powerpoint': 'PPT',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/vnd.ms-excel': 'XLS',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'image/png': 'PNG',
    'image/jpeg': 'JPG',
    'image/gif': 'GIF',
    'image/webp': 'WEBP',
    'text/plain': 'TXT',
  };
  return map[mimetype] ?? 'OTHER';
}

// GET /api/materials?classId=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { classId } = req.query;
    const materials = await prisma.material.findMany({
      where: classId ? { classId: classId as string } : {},
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, description: true,
        fileName: true, fileType: true, fileSize: true,
        classId: true, createdAt: true, updatedAt: true,
        class: { select: { id: true, name: true, gradeLevel: true } },
      },
    });
    res.json({ success: true, data: materials });
  } catch (e) { next(e); }
});

// POST /api/materials  — multipart/form-data
router.post('/', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const { title, description, classId } = z.object({
      title:       z.string().min(1),
      description: z.string().optional(),
      classId:     z.string().min(1),
    }).parse(req.body);

    // Verify class exists
    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls) {
      res.status(404).json({ success: false, message: 'Class not found' });
      return;
    }

    const material = await prisma.material.create({
      data: {
        title,
        description: description ?? null,
        fileName: req.file.originalname,
        fileType: getFileType(req.file.mimetype),
        fileSize: req.file.size,
        fileData: req.file.buffer,
        classId,
      },
      select: {
        id: true, title: true, description: true,
        fileName: true, fileType: true, fileSize: true,
        classId: true, createdAt: true, updatedAt: true,
      },
    });

    res.status(201).json({ success: true, data: material });
  } catch (e) { next(e); }
});

// GET /api/materials/:id/file  — stream the raw file bytes
router.get('/:id/file', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const material = await prisma.material.findUnique({
      where: { id: req.params.id },
    });
    if (!material) {
      res.status(404).json({ success: false, message: 'Material not found' });
      return;
    }

    const mimeMap: Record<string, string> = {
      PDF:  'application/pdf',
      PPT:  'application/vnd.ms-powerpoint',
      PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      DOC:  'application/msword',
      DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      XLS:  'application/vnd.ms-excel',
      XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      PNG:  'image/png',
      JPG:  'image/jpeg',
      GIF:  'image/gif',
      WEBP: 'image/webp',
      TXT:  'text/plain',
    };

    const mime = mimeMap[material.fileType] ?? 'application/octet-stream';

    // inline for PDF and images so browser can display them directly
    const inlineTypes = ['PDF', 'PNG', 'JPG', 'GIF', 'WEBP', 'TXT'];
    const disposition = inlineTypes.includes(material.fileType)
      ? `inline; filename="${material.fileName}"`
      : `attachment; filename="${material.fileName}"`;

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', disposition);
    res.setHeader('Content-Length', material.fileSize);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(material.fileData);
  } catch (e) { next(e); }
});

// PATCH /api/materials/:id  — update title/description
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description } = z.object({
      title:       z.string().min(1).optional(),
      description: z.string().optional(),
    }).parse(req.body);

    const material = await prisma.material.update({
      where: { id: req.params.id },
      data: {
        ...(title ? { title } : {}),
        description: description ?? null,
      },
      select: {
        id: true, title: true, description: true,
        fileName: true, fileType: true, fileSize: true,
        classId: true, createdAt: true, updatedAt: true,
      },
    });
    res.json({ success: true, data: material });
  } catch (e) { next(e); }
});

// DELETE /api/materials/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.material.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Material deleted' });
  } catch (e) { next(e); }
});

export default router;
