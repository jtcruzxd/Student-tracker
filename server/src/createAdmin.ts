/**
 * Creates the admin user account.
 * Run once:  npx tsx src/createAdmin.ts
 *
 * To change password, run again — it will update the existing account.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123'; // ← change this before running in production

async function main() {
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { username: ADMIN_USERNAME },
    update: { passwordHash: hash },
    create: { username: ADMIN_USERNAME, passwordHash: hash },
  });

  console.log(`✅ Admin account ready`);
  console.log(`   Username : ${user.username}`);
  console.log(`   Password : ${ADMIN_PASSWORD}`);
  console.log(`   ID       : ${user.id}`);
}

main()
  .catch(e => { console.error('❌ Failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
