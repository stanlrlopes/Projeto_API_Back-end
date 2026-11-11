import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando o seed do banco de dados (modo seguro e idempotente)...');

  const passwordHash = await bcrypt.hash('123456', 10);

  // 1. Criando ou garantindo ADMIN
  await prisma.user.upsert({
    where: { email: 'admin@educaapi.com' },
    update: {},
    create: {
      name: 'Admin Sistema',
      email: 'admin@educaapi.com',
      password: passwordHash,
      role: 'ADMIN',
    },
  });

  // 2. Criando ou garantindo PROFESSOR
  const teacherUser = await prisma.user.upsert({
    where: { email: 'carlos@educaapi.com' },
    update: {},
    create: {
      name: 'Prof. Carlos Silva',
      email: 'carlos@educaapi.com',
      password: passwordHash,
      role: 'PROFESSOR',
    },
  });

  const teacher = await prisma.teacher.upsert({
    where: { registration: 'T-1001' },
    update: {},
    create: {
      userId: teacherUser.id,
      name: 'Prof. Carlos Silva',
      email: 'carlos@educaapi.com',
      registration: 'T-1001',
    },
  });

  // 3. Criando ou garantindo ALUNOS (Ana e João)
  const student1User = await prisma.user.upsert({
    where: { email: 'ana@educaapi.com' },
    update: {},
    create: {
      name: 'Ana Souza',
      email: 'ana@educaapi.com',
      password: passwordHash,
      role: 'ALUNO',
    },
  });

  const student1 = await prisma.student.upsert({
    where: { registration: 'S-2001' },
    update: {},
    create: {
      userId: student1User.id,
      name: 'Ana Souza',
      email: 'ana@educaapi.com',
      birthDate: new Date('2005-03-15'),
      registration: 'S-2001',
    },
  });

  const student2User = await prisma.user.upsert({
    where: { email: 'joao@educaapi.com' },
    update: {},
    create: {
      name: 'João Pedro',
      email: 'joao@educaapi.com',
      password: passwordHash,
      role: 'ALUNO',
    },
  });

  const student2 = await prisma.student.upsert({
    where: { registration: 'S-2002' },
    update: {},
    create: {
      userId: student2User.id,
      name: 'João Pedro',
      email: 'joao@educaapi.com',
      birthDate: new Date('2004-11-20'),
      registration: 'S-2002',
    },
  });

  // 4. Criando ou garantindo DISCIPLINA
  let subject = await prisma.subject.findFirst({
    where: { name: 'Matemática Aplicada' },
  });
  if (!subject) {
    subject = await prisma.subject.create({
      data: {
        name: 'Matemática Aplicada',
        description: 'Cálculo e Álgebra',
        workload: 80,
      },
    });
  }

  // 5. Criando ou garantindo TURMA
  const currentYear = new Date().getFullYear();
  let classEntity = await prisma.class.findFirst({
    where: {
      name: 'Turma A',
      year: currentYear,
      semester: 1,
      teacherId: teacher.id,
      subjectId: subject.id,
    },
  });
  if (!classEntity) {
    classEntity = await prisma.class.create({
      data: {
        name: 'Turma A',
        year: currentYear,
        semester: 1,
        teacherId: teacher.id,
        subjectId: subject.id,
      },
    });
  }

  // 6. Criando ou garantindo MATRÍCULAS
  await prisma.enrollment.upsert({
    where: { studentId_classId: { studentId: student1.id, classId: classEntity.id } },
    update: {},
    create: { studentId: student1.id, classId: classEntity.id, status: 'ACTIVE' },
  });

  await prisma.enrollment.upsert({
    where: { studentId_classId: { studentId: student2.id, classId: classEntity.id } },
    update: {},
    create: { studentId: student2.id, classId: classEntity.id, status: 'ACTIVE' },
  });

  // 7. Criando ou garantindo CONTEÚDO
  let content = await prisma.content.findFirst({
    where: { title: 'Introdução aos Limites', subjectId: subject.id },
  });
  if (!content) {
    content = await prisma.content.create({
      data: {
        title: 'Introdução aos Limites',
        description: 'Conceitos básicos de limites',
        subjectId: subject.id,
      },
    });
  }

  // 8. Criando ou garantindo ATIVIDADES
  let activity1 = await prisma.activity.findFirst({
    where: { title: 'Lista de Exercícios 1', classId: classEntity.id, contentId: content.id },
  });
  if (!activity1) {
    activity1 = await prisma.activity.create({
      data: {
        title: 'Lista de Exercícios 1',
        description: 'Lista sobre limites',
        contentId: content.id,
        classId: classEntity.id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        maxScore: 10,
      },
    });
  }

  let activity2 = await prisma.activity.findFirst({
    where: { title: 'Prova 1', classId: classEntity.id, contentId: content.id },
  });
  if (!activity2) {
    activity2 = await prisma.activity.create({
      data: {
        title: 'Prova 1',
        description: 'Avaliação presencial',
        contentId: content.id,
        classId: classEntity.id,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        maxScore: 10,
      },
    });
  }

  // 9. Criando ou garantindo NOTAS (Ana com notas altas, João com baixo desempenho)
  await prisma.grade.upsert({
    where: { studentId_activityId: { studentId: student1.id, activityId: activity1.id } },
    update: { score: 9.0 },
    create: { studentId: student1.id, activityId: activity1.id, score: 9.0 },
  });
  await prisma.grade.upsert({
    where: { studentId_activityId: { studentId: student1.id, activityId: activity2.id } },
    update: { score: 8.5 },
    create: { studentId: student1.id, activityId: activity2.id, score: 8.5 },
  });
  await prisma.grade.upsert({
    where: { studentId_activityId: { studentId: student2.id, activityId: activity1.id } },
    update: { score: 5.0 },
    create: { studentId: student2.id, activityId: activity1.id, score: 5.0 },
  });
  await prisma.grade.upsert({
    where: { studentId_activityId: { studentId: student2.id, activityId: activity2.id } },
    update: { score: 4.5 },
    create: { studentId: student2.id, activityId: activity2.id, score: 4.5 },
  });

  // 10. Criando ou garantindo FREQUÊNCIA (normalizada para 00:00:00 UTC)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  const attendances = [
    { studentId: student1.id, classId: classEntity.id, date: today, present: true },
    { studentId: student2.id, classId: classEntity.id, date: today, present: false },
    { studentId: student1.id, classId: classEntity.id, date: yesterday, present: true },
    { studentId: student2.id, classId: classEntity.id, date: yesterday, present: true },
  ];

  for (const att of attendances) {
    await prisma.attendance.upsert({
      where: {
        studentId_classId_date: {
          studentId: att.studentId,
          classId: att.classId,
          date: att.date,
        },
      },
      update: { present: att.present },
      create: att,
    });
  }

  console.log('✅ Seed concluído com sucesso! Banco populado de forma idempotente.');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
