/**
 * Creates or updates the admin user account.
 * Run once:  npx tsx src/createAdmin.ts
 *
 * Credentials are read from environment variables:
 *   ADMIN_USERNAME  (default: "admin")
 *   ADMIN_PASSWORD  (required — set in .env or pass via shell)
 *
 * Example:
 *   ADMIN_USERNAME=Admin ADMIN_PASSWORD=yourpassword npx tsx src/createAdmin.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function main() {
  if (!ADMIN_PASSWORD) {
    console.error('❌ ADMIN_PASSWORD environment variable is required.');
    console.error('   Set it in .env or run: ADMIN_PASSWORD=yourpassword npx tsx src/createAdmin.ts');
    process.exit(1);
  }

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { username: ADMIN_USERNAME },
    update: { passwordHash: hash },
    create: { username: ADMIN_USERNAME, passwordHash: hash },
  });

  console.log(`✅ Admin account ready`);
  console.log(`   Username : ${user.username}`);
  console.log(`   ID       : ${user.id}`);
}

main()
  .catch(e => { console.error('❌ Failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
