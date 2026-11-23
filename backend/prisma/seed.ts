/**
 * Seed de demonstração do EntreTurnos.
 * Cria um usuário fictício com rotina de estagiária + universitária.
 * As datas são relativas ao dia da execução, para o dashboard sempre ter dados atuais.
 * Pode ser executado várias vezes: o usuário de demonstração é recriado do zero.
 */
import { PrismaClient, PomodoroType, TaskPriority, TaskStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { categoryService } from '../src/services/category.service';
import { notificationService } from '../src/services/notification.service';
import { planningService } from '../src/services/planning.service';
import { addDaysToKey, startOfWeekKey, toDateKey, weekdayOf, zonedToUtc } from '../src/utils/timezone';

const prisma = new PrismaClient();

export const DEMO_EMAIL = 'demo@entreturnos.com';
export const DEMO_PASSWORD = 'Demo@1234';

/** Próxima data (a partir de hoje, inclusive) com o dia da semana informado. */
function nextWeekday(fromKey: string, weekday: number) {
  let key = fromKey;
  while (weekdayOf(key) !== weekday) key = addDaysToKey(key, 1);
  return key;
}

async function main() {
  await categoryService.ensureDefaults();
  const categories = await prisma.category.findMany();
  const cat = (slug: string) => {
    const found = categories.find((c) => c.slug === slug);
    if (!found) throw new Error(`Categoria ${slug} não encontrada`);
    return found.id;
  };

  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const user = await prisma.user.create({
    data: {
      name: 'Maria Oliveira',
      email: DEMO_EMAIL,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
      preference: {
        create: {
          availabilityStart: '07:00',
          availabilityEnd: '23:00',
          availableWeekdays: [0, 1, 2, 3, 4, 5, 6],
          breakMinutes: 10,
          minSlotMinutes: 20,
          maxTaskBlockMinutes: 90,
          planningHorizonDays: 7,
        },
      },
    },
  });

  const now = new Date();
  const today = toDateKey(now);
  const ruleStart = addDaysToKey(startOfWeekKey(today), -7 * 8);

  // ---------------- Compromissos fixos ----------------
  const estagio = await prisma.recurringAppointment.create({
    data: {
      userId: user.id,
      categoryId: cat('estagio'),
      title: 'Estágio — Desenvolvimento',
      location: 'Empresa Exemplo Tecnologia',
      description: 'Estágio em desenvolvimento de software.',
      weekdays: [1, 2, 3, 4, 5],
      startTime: '08:00',
      endTime: '17:00',
      startDate: ruleStart,
    },
  });

  const faculdade = await prisma.recurringAppointment.create({
    data: {
      userId: user.id,
      categoryId: cat('faculdade'),
      title: 'Aulas — Engenharia de Software',
      location: 'Campus Centro, bloco B',
      weekdays: [1, 2, 3, 4],
      startTime: '19:00',
      endTime: '22:00',
      startDate: ruleStart,
    },
  });

  await prisma.recurringAppointment.create({
    data: {
      userId: user.id,
      categoryId: cat('pessoal'),
      title: 'Academia',
      location: 'Academia do bairro',
      weekdays: [2, 4],
      startTime: '06:00',
      endTime: '07:00',
      startDate: ruleStart,
    },
  });

  // ---------------- Deslocamentos ----------------
  await prisma.commute.createMany({
    data: [
      {
        userId: user.id,
        origin: 'Casa',
        destination: 'Estágio',
        durationMinutes: 45,
        mode: 'BUS',
        position: 'BEFORE',
        recurringAppointmentId: estagio.id,
      },
      {
        userId: user.id,
        origin: 'Estágio',
        destination: 'Faculdade',
        durationMinutes: 60,
        mode: 'SUBWAY',
        position: 'AFTER',
        recurringAppointmentId: estagio.id,
      },
      {
        userId: user.id,
        origin: 'Faculdade',
        destination: 'Casa',
        durationMinutes: 40,
        mode: 'BUS',
        position: 'AFTER',
        recurringAppointmentId: faculdade.id,
      },
    ],
  });

  // ---------------- Compromissos únicos ----------------
  const friday = nextWeekday(today, 5);
  const saturday = nextWeekday(today, 6);
  await prisma.appointment.createMany({
    data: [
      {
        userId: user.id,
        categoryId: cat('pessoal'),
        title: 'Consulta no dentista',
        location: 'Clínica Sorriso',
        startAt: zonedToUtc(friday, '18:30'),
        endAt: zonedToUtc(friday, '19:30'),
      },
      {
        userId: user.id,
        categoryId: cat('faculdade'),
        title: 'Reunião do grupo de TCC',
        location: 'Biblioteca central',
        description: 'Alinhar capítulo de metodologia.',
        startAt: zonedToUtc(saturday, '10:00'),
        endAt: zonedToUtc(saturday, '11:30'),
      },
    ],
  });

  // Grupo de estudos nos últimos sábados (histórico para os relatórios)
  for (let week = 1; week <= 6; week++) {
    const pastSaturday = addDaysToKey(nextWeekday(today, 6), -7 * week);
    await prisma.appointment.create({
      data: {
        userId: user.id,
        categoryId: cat('estudos'),
        title: 'Grupo de estudos de Cálculo',
        location: 'Biblioteca central',
        startAt: zonedToUtc(pastSaturday, '14:00'),
        endAt: zonedToUtc(pastSaturday, '16:00'),
      },
    });
  }

  // ---------------- Tarefas ----------------
  const due = (days: number, time = '23:59') => zonedToUtc(addDaysToKey(today, days), time);
  const taskData: {
    title: string;
    description?: string;
    category: string;
    dueDate: Date | null;
    estimatedMinutes: number;
    priority: TaskPriority;
    status: TaskStatus;
    completedDaysAgo?: number;
  }[] = [
    { title: 'Entregar relatório de Banco de Dados', description: 'Modelagem ER + scripts SQL.', category: 'faculdade', dueDate: due(1), estimatedMinutes: 90, priority: 'HIGH', status: 'IN_PROGRESS' },
    { title: 'Estudar para prova de Estruturas de Dados', description: 'Árvores AVL e grafos.', category: 'estudos', dueDate: due(3), estimatedMinutes: 120, priority: 'HIGH', status: 'PENDING' },
    { title: 'Revisar pull request do time', category: 'estagio', dueDate: due(0, '17:00'), estimatedMinutes: 30, priority: 'MEDIUM', status: 'PENDING' },
    { title: 'Ler artigo para o TCC', description: 'Capítulo 2 do referencial teórico.', category: 'faculdade', dueDate: due(5), estimatedMinutes: 60, priority: 'MEDIUM', status: 'PENDING' },
    { title: 'Lista de exercícios de Cálculo II', category: 'estudos', dueDate: due(-1), estimatedMinutes: 45, priority: 'HIGH', status: 'PENDING' },
    { title: 'Pagar conta de internet', category: 'pessoal', dueDate: due(2, '18:00'), estimatedMinutes: 10, priority: 'LOW', status: 'PENDING' },
    { title: 'Atualizar currículo e LinkedIn', category: 'pessoal', dueDate: null, estimatedMinutes: 40, priority: 'LOW', status: 'PENDING' },
    { title: 'Documentar API do projeto do estágio', category: 'estagio', dueDate: due(6), estimatedMinutes: 60, priority: 'MEDIUM', status: 'PENDING' },
    { title: 'Resumo de Engenharia de Requisitos', category: 'faculdade', dueDate: due(-2), estimatedMinutes: 45, priority: 'MEDIUM', status: 'COMPLETED', completedDaysAgo: 2 },
    { title: 'Apresentação de Sistemas Operacionais', category: 'faculdade', dueDate: due(-5), estimatedMinutes: 90, priority: 'HIGH', status: 'COMPLETED', completedDaysAgo: 6 },
    { title: 'Configurar ambiente Docker no estágio', category: 'estagio', dueDate: due(-9), estimatedMinutes: 60, priority: 'MEDIUM', status: 'COMPLETED', completedDaysAgo: 10 },
    { title: 'Exercícios de Probabilidade', category: 'estudos', dueDate: due(-12), estimatedMinutes: 60, priority: 'MEDIUM', status: 'COMPLETED', completedDaysAgo: 13 },
    { title: 'Organizar documentos do estágio', category: 'pessoal', dueDate: due(-16), estimatedMinutes: 30, priority: 'LOW', status: 'COMPLETED', completedDaysAgo: 17 },
    { title: 'Trabalho de Redes de Computadores', category: 'faculdade', dueDate: due(-20), estimatedMinutes: 120, priority: 'HIGH', status: 'COMPLETED', completedDaysAgo: 21 },
    { title: 'Revisão de Álgebra Linear', category: 'estudos', dueDate: due(-25), estimatedMinutes: 60, priority: 'MEDIUM', status: 'COMPLETED', completedDaysAgo: 26 },
    { title: 'Correção de bugs do sprint', category: 'estagio', dueDate: due(-1), estimatedMinutes: 90, priority: 'HIGH', status: 'COMPLETED', completedDaysAgo: 1 },
  ];

  const tasks = [];
  for (const t of taskData) {
    const completedAt =
      t.completedDaysAgo !== undefined ? zonedToUtc(addDaysToKey(today, -t.completedDaysAgo), '21:30') : null;
    tasks.push(
      await prisma.task.create({
        data: {
          userId: user.id,
          categoryId: cat(t.category),
          title: t.title,
          description: t.description ?? null,
          dueDate: t.dueDate,
          estimatedMinutes: t.estimatedMinutes,
          priority: t.priority,
          status: t.status,
          completedAt,
          createdAt: completedAt ? new Date(completedAt.getTime() - 5 * 86_400_000) : new Date(now.getTime() - 2 * 86_400_000),
        },
      }),
    );
  }

  // ---------------- Sessões Pomodoro (últimas 4 semanas) ----------------
  const studyTasks = tasks.filter((t) => t.categoryId === cat('estudos') || t.categoryId === cat('faculdade'));
  const sessions: { userId: string; taskId: string | null; type: PomodoroType; durationMinutes: number; startedAt: Date; endedAt: Date }[] = [];
  for (let daysAgo = 27; daysAgo >= 1; daysAgo--) {
    const key = addDaysToKey(today, -daysAgo);
    const weekday = weekdayOf(key);
    // Mais sessões nas semanas recentes, simulando evolução da produtividade.
    const count = weekday === 0 ? 0 : weekday === 6 ? 4 : (daysAgo % 3) + (daysAgo < 14 ? 2 : 1);
    for (let i = 0; i < count; i++) {
      const startedAt = zonedToUtc(key, weekday === 6 ? `${String(9 + i).padStart(2, '0')}:00` : '18:05');
      const start = new Date(startedAt.getTime() + (weekday === 6 ? 0 : i * 30 * 60_000));
      const task = studyTasks[(daysAgo + i) % studyTasks.length];
      sessions.push({
        userId: user.id,
        taskId: task?.id ?? null,
        type: 'FOCUS',
        durationMinutes: 25,
        startedAt: start,
        endedAt: new Date(start.getTime() + 25 * 60_000),
      });
    }
  }
  await prisma.pomodoroSession.createMany({ data: sessions });

  // ---------------- Notificações ----------------
  await prisma.notification.create({
    data: {
      userId: user.id,
      type: 'SYSTEM',
      title: 'Boas-vindas ao EntreTurnos!',
      message: 'Sua rotina de exemplo foi carregada. Explore o Planejamento Inteligente para ver sugestões de horários.',
      link: '/planejamento',
      dedupeKey: 'welcome',
    },
  });
  await notificationService.refresh(user.id, now);

  // ---------------- Sugestões de horário ----------------
  const { pending } = await planningService.generate(user.id, now);

  console.info('✅ Seed concluído!');
  console.info(`   Usuário: ${DEMO_EMAIL}`);
  console.info(`   Senha:   ${DEMO_PASSWORD}`);
  console.info(`   ${tasks.length} tarefas, ${sessions.length} sessões Pomodoro, ${pending.length} sugestões geradas.`);
}

main()
  .catch((error) => {
    console.error('❌ Erro no seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    const { prisma: appPrisma } = await import('../src/config/prisma');
    await appPrisma.$disconnect();
  });
