import { addDaysToKey, toDateKey, zonedToUtc } from '../../src/utils/timezone';
import { app, categoryId, createUser, hasDatabase, prisma, request, resetDatabase } from '../helpers';

const futureDay = addDaysToKey(toDateKey(new Date()), 2);
const iso = (time: string, day = futureDay) => zonedToUtc(day, time).toISOString();

describe.skipIf(!hasDatabase)('API EntreTurnos (integração)', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('autenticação', () => {
    it('cadastra usuário com senha criptografada e retorna token', async () => {
      const response = await request(app).post('/api/auth/register').send({
        name: 'Ana Souza',
        email: 'ana@exemplo.com',
        password: 'Senha1234',
        confirmPassword: 'Senha1234',
      });
      expect(response.status).toBe(201);
      expect(response.body.token).toBeTruthy();
      expect(response.body.user).not.toHaveProperty('passwordHash');

      const stored = await prisma.user.findUniqueOrThrow({ where: { email: 'ana@exemplo.com' } });
      expect(stored.passwordHash).not.toBe('Senha1234');
      expect(stored.passwordHash.startsWith('$2')).toBe(true);
    });

    it('rejeita e-mail duplicado e senhas diferentes', async () => {
      const duplicated = await request(app).post('/api/auth/register').send({
        name: 'Ana Souza',
        email: 'ana@exemplo.com',
        password: 'Senha1234',
        confirmPassword: 'Senha1234',
      });
      expect(duplicated.status).toBe(409);

      const mismatch = await request(app).post('/api/auth/register').send({
        name: 'Outra Pessoa',
        email: 'outra@exemplo.com',
        password: 'Senha1234',
        confirmPassword: 'Senha9999',
      });
      expect(mismatch.status).toBe(422);
    });

    it('faz login com credenciais válidas e recusa senha incorreta', async () => {
      const ok = await request(app).post('/api/auth/login').send({ email: 'ana@exemplo.com', password: 'Senha1234' });
      expect(ok.status).toBe(200);
      expect(ok.body.token).toBeTruthy();

      const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${ok.body.token}`);
      expect(me.body.user.email).toBe('ana@exemplo.com');

      const wrong = await request(app).post('/api/auth/login').send({ email: 'ana@exemplo.com', password: 'Errada123' });
      expect(wrong.status).toBe(401);
    });

    it('bloqueia rotas privadas sem token', async () => {
      const response = await request(app).get('/api/tasks');
      expect(response.status).toBe(401);
    });

    it('redefine a senha com token válido', async () => {
      const forgot = await request(app).post('/api/auth/forgot-password').send({ email: 'ana@exemplo.com' });
      expect(forgot.body.resetToken).toBeTruthy();

      const reset = await request(app).post('/api/auth/reset-password').send({
        token: forgot.body.resetToken,
        password: 'NovaSenha123',
        confirmPassword: 'NovaSenha123',
      });
      expect(reset.status).toBe(200);

      const login = await request(app).post('/api/auth/login').send({ email: 'ana@exemplo.com', password: 'NovaSenha123' });
      expect(login.status).toBe(200);
    });
  });

  describe('tarefas', () => {
    it('cria, atualiza, conclui e isola tarefas por usuário', async () => {
      const { token } = await createUser();
      const auth = { Authorization: `Bearer ${token}` };

      const created = await request(app)
        .post('/api/tasks')
        .set(auth)
        .send({
          title: 'Trabalho de Banco de Dados',
          categoryId: await categoryId('faculdade'),
          estimatedMinutes: 60,
          priority: 'HIGH',
          dueDate: iso('23:00'),
        });
      expect(created.status).toBe(201);
      expect(created.body.status).toBe('PENDING');

      const updated = await request(app)
        .put(`/api/tasks/${created.body.id}`)
        .set(auth)
        .send({ title: 'Trabalho de BD (revisado)', estimatedMinutes: 90 });
      expect(updated.status).toBe(200);
      expect(updated.body.title).toBe('Trabalho de BD (revisado)');
      expect(updated.body.priority).toBe('HIGH');

      const done = await request(app).patch(`/api/tasks/${created.body.id}/status`).set(auth).send({ status: 'COMPLETED' });
      expect(done.body.status).toBe('COMPLETED');
      expect(done.body.completedAt).toBeTruthy();

      const filtered = await request(app).get('/api/tasks?status=COMPLETED').set(auth);
      expect(filtered.body).toHaveLength(1);

      const other = await createUser('Outra Pessoa');
      const forbidden = await request(app).get(`/api/tasks/${created.body.id}`).set('Authorization', `Bearer ${other.token}`);
      expect(forbidden.status).toBe(404);
    });

    it('valida dados obrigatórios', async () => {
      const { token } = await createUser();
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '', estimatedMinutes: 1 });
      expect(response.status).toBe(422);
      expect(response.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('compromissos, deslocamentos e conflitos', () => {
    it('cadastra compromisso e detecta conflito de horário', async () => {
      const { token } = await createUser();
      const auth = { Authorization: `Bearer ${token}` };
      const faculdade = await categoryId('faculdade');

      const first = await request(app)
        .post('/api/appointments')
        .set(auth)
        .send({ title: 'Prova', categoryId: faculdade, startAt: iso('19:00'), endAt: iso('21:00') });
      expect(first.status).toBe(201);

      const conflict = await request(app)
        .post('/api/appointments')
        .set(auth)
        .send({ title: 'Reunião', categoryId: faculdade, startAt: iso('20:00'), endAt: iso('22:00') });
      expect(conflict.status).toBe(409);
      expect(conflict.body.details.conflicts[0].title).toBe('Prova');

      const forced = await request(app)
        .post('/api/appointments')
        .set(auth)
        .send({ title: 'Reunião', categoryId: faculdade, startAt: iso('20:00'), endAt: iso('22:00'), force: true });
      expect(forced.status).toBe(201);
    });

    it('recorrência + deslocamento geram o intervalo livre esperado', async () => {
      const { token } = await createUser();
      const auth = { Authorization: `Bearer ${token}` };
      const weekday = new Date(`${futureDay}T12:00:00Z`).getUTCDay();

      const estagio = await request(app)
        .post('/api/recurring-appointments')
        .set(auth)
        .send({
          title: 'Estágio',
          categoryId: await categoryId('estagio'),
          weekdays: [weekday],
          startTime: '08:00',
          endTime: '17:00',
          startDate: toDateKey(new Date()),
        });
      expect(estagio.status).toBe(201);

      const commute = await request(app)
        .post('/api/commutes')
        .set(auth)
        .send({
          origin: 'Estágio',
          destination: 'Faculdade',
          durationMinutes: 60,
          mode: 'BUS',
          position: 'AFTER',
          recurringAppointmentId: estagio.body.id,
        });
      expect(commute.status).toBe(201);

      const faculdade = await request(app)
        .post('/api/recurring-appointments')
        .set(auth)
        .send({
          title: 'Faculdade',
          categoryId: await categoryId('faculdade'),
          weekdays: [weekday],
          startTime: '19:00',
          endTime: '22:00',
          startDate: toDateKey(new Date()),
        });
      expect(faculdade.status).toBe(201);

      // Compromisso no horário do deslocamento deve conflitar
      const overlapCommute = await request(app)
        .post('/api/appointments')
        .set(auth)
        .send({ title: 'Café', categoryId: await categoryId('pessoal'), startAt: iso('17:15'), endAt: iso('17:45') });
      expect(overlapCommute.status).toBe(409);

      await request(app).put('/api/preferences').set(auth).send({ breakMinutes: 0, minSlotMinutes: 15 });

      const events = await request(app)
        .get(`/api/calendar/events?start=${encodeURIComponent(iso('00:00'))}&end=${encodeURIComponent(iso('23:59'))}`)
        .set(auth);
      expect(events.body.map((e: { kind: string }) => e.kind).sort()).toEqual(['COMMUTE', 'RECURRING', 'RECURRING']);

      const free = await request(app).get(`/api/planning/free-slots?start=${futureDay}&days=1`).set(auth);
      const slots = free.body.byDay[0].slots.map((s: { start: string; end: string }) => [s.start, s.end]);
      expect(slots).toContainEqual([iso('18:00'), iso('19:00')]);
      expect(slots).not.toContainEqual(expect.arrayContaining([iso('17:00')]));
    });
  });

  describe('planejamento inteligente', () => {
    it('gera sugestões, aceita uma criando compromisso e recusa outra', async () => {
      const { token } = await createUser();
      const auth = { Authorization: `Bearer ${token}` };
      const estudos = await categoryId('estudos');

      for (const title of ['Estudar grafos', 'Resumo de artigo']) {
        await request(app)
          .post('/api/tasks')
          .set(auth)
          .send({ title, categoryId: estudos, estimatedMinutes: 30, priority: 'HIGH' });
      }

      const generated = await request(app).post('/api/planning/suggestions/generate').set(auth);
      expect(generated.status).toBe(200);
      expect(generated.body.pending.length).toBeGreaterThanOrEqual(2);

      const [first, second] = generated.body.pending;
      const accepted = await request(app).post(`/api/planning/suggestions/${first.id}/accept`).set(auth);
      expect(accepted.status).toBe(200);
      expect(accepted.body.status).toBe('ACCEPTED');

      const appointment = await prisma.appointment.findUniqueOrThrow({ where: { id: accepted.body.appointmentId } });
      expect(appointment.taskId).toBe(first.taskId);

      const rejected = await request(app).post(`/api/planning/suggestions/${second.id}/reject`).set(auth);
      expect(rejected.body.status).toBe('REJECTED');

      // Ao recalcular, a tarefa já reservada não recebe nova sugestão e o horário recusado não volta.
      const regenerated = await request(app).post('/api/planning/suggestions/generate').set(auth);
      const pending = regenerated.body.pending as { taskId: string; startAt: string }[];
      expect(pending.some((s) => s.taskId === first.taskId)).toBe(false);
      expect(pending.some((s) => s.taskId === second.taskId && s.startAt === second.startAt)).toBe(false);
    });
  });

  describe('pomodoro e relatórios', () => {
    it('registra sessões e reflete nos relatórios', async () => {
      const { token } = await createUser();
      const auth = { Authorization: `Bearer ${token}` };
      const task = await request(app)
        .post('/api/tasks')
        .set(auth)
        .send({ title: 'Ler capítulo', categoryId: await categoryId('estudos'), estimatedMinutes: 50 });

      const endedAt = new Date();
      const startedAt = new Date(endedAt.getTime() - 25 * 60_000);
      const session = await request(app).post('/api/pomodoro-sessions').set(auth).send({
        taskId: task.body.id,
        type: 'FOCUS',
        durationMinutes: 25,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
      });
      expect(session.status).toBe(201);
      expect(session.body.task.title).toBe('Ler capítulo');

      const today = await request(app).get('/api/pomodoro-sessions/today').set(auth);
      expect(today.body.focusSessions).toBe(1);

      const report = await request(app).get('/api/reports/summary?weeks=4').set(auth);
      expect(report.body.totals.focusSessions).toBe(1);
      expect(report.body.totals.focusMinutes).toBe(25);
      expect(report.body.weekly).toHaveLength(4);

      const dashboard = await request(app).get('/api/dashboard').set(auth);
      expect(dashboard.status).toBe(200);
      expect(dashboard.body.counts.pending).toBe(1);
      expect(dashboard.body.focusMinutesWeek).toBe(25);
    });
  });
});
