import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/authenticate';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid username or password' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, message: 'Invalid username or password' });
      return;
    }

    const secret = process.env.JWT_SECRET!;
    const expiresIn = process.env.JWT_EXPIRES_IN ?? '8h';

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      secret,
      { expiresIn } as jwt.SignOptions
    );

    // Set httpOnly cookie (for same-origin requests)
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours in ms
    });

    res.json({
      success: true,
      data: { token, user: { id: user.id, username: user.username } },
    });
  } catch (e) { next(e); }
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out' });
});

// GET /api/auth/me  — verify current token and return user info
router.get('/me', authenticate, (req: Request, res: Response) => {
  res.json({ success: true, data: { user: req.user } });
});

export default router;
