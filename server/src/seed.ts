import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.activityScore.deleteMany();
  await prisma.gradeEntry.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.student.deleteMany();
  await prisma.class.deleteMany();

  // Classes
  const [class10A, class10B, class9A] = await Promise.all([
    prisma.class.create({ data: { name: 'Grade 10 - Rizal', gradeLevel: 'Grade 10', section: 'Rizal', schoolYear: '2025-2026' } }),
    prisma.class.create({ data: { name: 'Grade 10 - Bonifacio', gradeLevel: 'Grade 10', section: 'Bonifacio', schoolYear: '2025-2026' } }),
    prisma.class.create({ data: { name: 'Grade 9 - Luna', gradeLevel: 'Grade 9', section: 'Luna', schoolYear: '2025-2026' } }),
  ]);

  // Students for Grade 10 - Rizal
  const studentsData10A = [
    { studentId: '2026-001', fullName: 'Maria Clara Santos', email: 'maria.santos@school.edu', guardianContact: '09171234567' },
    { studentId: '2026-002', fullName: 'Juan dela Cruz', email: 'juan.cruz@school.edu', guardianContact: '09281234567' },
    { studentId: '2026-003', fullName: 'Ana Reyes', email: 'ana.reyes@school.edu', guardianContact: '09391234567' },
    { studentId: '2026-004', fullName: 'Carlo Mendoza', email: 'carlo.mendoza@school.edu', guardianContact: '09501234567' },
    { studentId: '2026-005', fullName: 'Sofia Garcia', email: 'sofia.garcia@school.edu', guardianContact: '09611234567' },
    { studentId: '2026-006', fullName: 'Miguel Torres', email: 'miguel.torres@school.edu', guardianContact: '09721234567' },
    { studentId: '2026-007', fullName: 'Isabella Ramos', email: 'isabella.ramos@school.edu', guardianContact: '09831234567' },
    { studentId: '2026-008', fullName: 'Rafael Aquino', email: 'rafael.aquino@school.edu', guardianContact: '09941234567' },
  ];

  const studentsData10B = [
    { studentId: '2026-009', fullName: 'Daniela Flores', email: 'daniela.flores@school.edu', guardianContact: '09151234567' },
    { studentId: '2026-010', fullName: 'Luis Castillo', email: 'luis.castillo@school.edu', guardianContact: '09261234567' },
    { studentId: '2026-011', fullName: 'Camille Morales', email: 'camille.morales@school.edu', guardianContact: '09371234567' },
    { studentId: '2026-012', fullName: 'Marco Villanueva', email: 'marco.villanueva@school.edu', guardianContact: '09481234567' },
    { studentId: '2026-013', fullName: 'Patricia Navarro', email: 'patricia.navarro@school.edu', guardianContact: '09591234567' },
    { studentId: '2026-014', fullName: 'Andre Salazar', email: 'andre.salazar@school.edu', guardianContact: '09601234567' },
  ];

  const studentsData9A = [
    { studentId: '2026-015', fullName: 'Jasmine Lim', email: 'jasmine.lim@school.edu', guardianContact: '09711234567' },
    { studentId: '2026-016', fullName: 'Kevin Tan', email: 'kevin.tan@school.edu', guardianContact: '09821234567' },
    { studentId: '2026-017', fullName: 'Beatrice Ong', email: 'beatrice.ong@school.edu', guardianContact: '09931234567' },
    { studentId: '2026-018', fullName: 'Dino Pascual', email: 'dino.pascual@school.edu', guardianContact: '09041234567' },
    { studentId: '2026-019', fullName: 'Elena Cruz', email: 'elena.cruz@school.edu', guardianContact: '09151234568' },
  ];

  const [students10A, students10B, students9A] = await Promise.all([
    Promise.all(studentsData10A.map(s => prisma.student.create({ data: { ...s, classId: class10A.id } }))),
    Promise.all(studentsData10B.map(s => prisma.student.create({ data: { ...s, classId: class10B.id } }))),
    Promise.all(studentsData9A.map(s => prisma.student.create({ data: { ...s, classId: class9A.id } }))),
  ]);

  // Attendance sessions (last 10 school days)
  const today = new Date();
  const dates: Date[] = [];
  for (let i = 0; i < 10; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (d.getDay() !== 0 && d.getDay() !== 6) dates.push(d);
    if (dates.length === 10) break;
  }

  const statuses: AttendanceStatus[] = ['PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];

  for (const date of dates.slice(0, 5)) {
    const sessionDate = new Date(date);
    sessionDate.setHours(8, 0, 0, 0);
    await prisma.attendanceSession.create({
      data: {
        date: sessionDate,
        classId: class10A.id,
        records: {
          create: students10A.map((s, idx) => ({
            studentId: s.id,
            status: statuses[idx % statuses.length],
          })),
        },
      },
    });
  }

  for (const date of dates.slice(0, 4)) {
    const sessionDate = new Date(date);
    sessionDate.setHours(8, 0, 0, 0);
    await prisma.attendanceSession.create({
      data: {
        date: sessionDate,
        classId: class10B.id,
        records: {
          create: students10B.map((s, idx) => ({
            studentId: s.id,
            status: statuses[(idx + 1) % statuses.length],
          })),
        },
      },
    });
  }

  // Activities
  const quiz1 = await prisma.activity.create({
    data: {
      title: 'Quiz 1 - Linear Equations',
      type: 'QUIZ',
      description: 'Chapter 3 quiz covering linear equations and inequalities.',
      activityDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5),
      maxScore: 50,
      classId: class10A.id,
      scores: {
        create: students10A.map((s, i) => ({
          studentId: s.id,
          score: 35 + (i * 2) % 15,
          submitted: true,
        })),
      },
    },
  });

  const assign1 = await prisma.activity.create({
    data: {
      title: 'Assignment 1 - Problem Set',
      type: 'ASSIGNMENT',
      description: 'Solve problems 1-20 on page 54.',
      dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3),
      maxScore: 100,
      classId: class10A.id,
      scores: {
        create: students10A.map((s, i) => ({
          studentId: s.id,
          score: i < 5 ? 80 + i * 4 : null,
          submitted: i < 5,
        })),
      },
    },
  });

  const recitation1 = await prisma.activity.create({
    data: {
      title: 'Recitation - Chapter 4',
      type: 'RECITATION',
      activityDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2),
      maxScore: 20,
      classId: class10A.id,
      scores: {
        create: students10A.map((s, i) => ({
          studentId: s.id,
          score: 12 + (i * 2) % 8,
          submitted: true,
        })),
      },
    },
  });

  await prisma.activity.create({
    data: {
      title: 'Quiz 1 - Photosynthesis',
      type: 'QUIZ',
      activityDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3),
      maxScore: 40,
      classId: class10B.id,
      scores: {
        create: students10B.map((s, i) => ({
          studentId: s.id,
          score: 25 + (i * 3) % 15,
          submitted: true,
        })),
      },
    },
  });

  await prisma.activity.create({
    data: {
      title: 'Midterm Exam',
      type: 'EXAM',
      dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14),
      maxScore: 100,
      classId: class10A.id,
      scores: {
        create: students10A.map(s => ({ studentId: s.id, submitted: false })),
      },
    },
  });

  // Grade entries linked to activities
  const gradeCategories = ['QUIZ', 'ASSIGNMENT', 'RECITATION', 'EXAM', 'PROJECT', 'CUSTOM'] as const;

  for (const student of students10A) {
    // Quiz grade from quiz1
    await prisma.gradeEntry.create({
      data: {
        title: quiz1.title,
        category: 'QUIZ',
        score: 38,
        maxScore: 50,
        percentage: 76,
        remarks: 'Good',
        date: quiz1.activityDate!,
        studentId: student.id,
        activityId: quiz1.id,
      },
    });

    // Recitation grade
    await prisma.gradeEntry.create({
      data: {
        title: recitation1.title,
        category: 'RECITATION',
        score: 16,
        maxScore: 20,
        percentage: 80,
        date: recitation1.activityDate!,
        studentId: student.id,
        activityId: recitation1.id,
      },
    });

    // Random additional grades
    const additionalGrades = [
      { title: 'Assignment 2 - Word Problems', category: 'ASSIGNMENT' as const, score: 85, maxScore: 100, percentage: 85 },
      { title: 'Quiz 2 - Quadratic Formula', category: 'QUIZ' as const, score: 42, maxScore: 50, percentage: 84 },
      { title: 'Project - Math in Real Life', category: 'PROJECT' as const, score: 90, maxScore: 100, percentage: 90 },
    ];

    for (const g of additionalGrades) {
      await prisma.gradeEntry.create({
        data: {
          ...g,
          remarks: g.percentage >= 90 ? 'Excellent' : g.percentage >= 80 ? 'Good' : 'Satisfactory',
          date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - Math.floor(Math.random() * 14)),
          studentId: student.id,
        },
      });
    }
  }

  // Grades for 10B students
  for (const student of students10B) {
    await prisma.gradeEntry.create({
      data: {
        title: 'Quiz 1 - Photosynthesis',
        category: 'QUIZ',
        score: 32,
        maxScore: 40,
        percentage: 80,
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3),
        studentId: student.id,
      },
    });
  }

  console.log('✅ Seed complete!');
  console.log(`   Classes: 3`);
  console.log(`   Students: ${students10A.length + students10B.length + students9A.length}`);
  console.log(`   Activities: 5`);
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
