import {
  AvailabilityPreferences,
  SchedulableTask,
  commuteInterval,
  computeFreeSlots,
  expandRecurring,
  findConflicts,
  generateSuggestions,
  mergeIntervals,
  overlaps,
  subtractIntervals,
  taskScore,
} from '../../src/domain/scheduling';
import { toLocalTime, zonedToUtc } from '../../src/utils/timezone';

// 2026-03-02 é uma segunda-feira.
const MONDAY = '2026-03-02';
const at = (time: string, day = MONDAY) => zonedToUtc(day, time);

const prefs: AvailabilityPreferences = {
  availabilityStart: '07:00',
  availabilityEnd: '23:00',
  availableWeekdays: [0, 1, 2, 3, 4, 5, 6],
  breakMinutes: 0,
  minSlotMinutes: 15,
  maxTaskBlockMinutes: 120,
};

const task = (overrides: Partial<SchedulableTask>): SchedulableTask => ({
  id: 't1',
  title: 'Tarefa',
  priority: 'MEDIUM',
  dueDate: null,
  estimatedMinutes: 30,
  scheduledMinutes: 0,
  ...overrides,
});

describe('intervalos', () => {
  it('detecta sobreposição sem considerar intervalos encostados', () => {
    expect(overlaps({ start: at('08:00'), end: at('09:00') }, { start: at('08:30'), end: at('10:00') })).toBe(true);
    expect(overlaps({ start: at('08:00'), end: at('09:00') }, { start: at('09:00'), end: at('10:00') })).toBe(false);
  });

  it('une intervalos sobrepostos', () => {
    const merged = mergeIntervals([
      { start: at('10:00'), end: at('11:00') },
      { start: at('08:00'), end: at('09:30') },
      { start: at('09:00'), end: at('10:00') },
    ]);
    expect(merged).toHaveLength(1);
    expect(toLocalTime(merged[0].start)).toBe('08:00');
    expect(toLocalTime(merged[0].end)).toBe('11:00');
  });

  it('subtrai bloqueios de uma janela', () => {
    const free = subtractIntervals({ start: at('07:00'), end: at('12:00') }, [
      { start: at('08:00'), end: at('09:00') },
      { start: at('10:00'), end: at('11:00') },
    ]);
    expect(free.map((f) => `${toLocalTime(f.start)}-${toLocalTime(f.end)}`)).toEqual([
      '07:00-08:00',
      '09:00-10:00',
      '11:00-12:00',
    ]);
  });
});

describe('conflitos de horário', () => {
  const busy = [
    { start: at('08:00'), end: at('17:00'), kind: 'RECURRING' as const, title: 'Estágio', sourceId: 'estagio' },
    { start: at('19:00'), end: at('22:00'), kind: 'RECURRING' as const, title: 'Faculdade', sourceId: 'faculdade' },
  ];

  it('identifica conflito com compromisso existente', () => {
    const conflicts = findConflicts({ start: at('16:00'), end: at('18:00') }, busy);
    expect(conflicts.map((c) => c.title)).toEqual(['Estágio']);
  });

  it('não acusa conflito em intervalo livre ou encostado', () => {
    expect(findConflicts({ start: at('17:00'), end: at('19:00') }, busy)).toHaveLength(0);
  });

  it('ignora o próprio compromisso ao editar', () => {
    expect(findConflicts({ start: at('09:00'), end: at('10:00') }, busy, ['estagio'])).toHaveLength(0);
  });
});

describe('recorrência', () => {
  const rule = {
    id: 'r1',
    weekdays: [1, 2, 3, 4, 5],
    startTime: '08:00',
    endTime: '17:00',
    startDate: '2026-03-01',
    endDate: '2026-03-10',
  };

  it('gera uma ocorrência por dia útil dentro da vigência', () => {
    const occurrences = expandRecurring(rule, at('00:00', '2026-03-01'), at('23:59', '2026-03-15'));
    expect(occurrences.map((o) => o.dateKey)).toEqual([
      '2026-03-02',
      '2026-03-03',
      '2026-03-04',
      '2026-03-05',
      '2026-03-06',
      '2026-03-09',
      '2026-03-10',
    ]);
    expect(toLocalTime(occurrences[0].start)).toBe('08:00');
  });

  it('não duplica ocorrências e usa ids estáveis', () => {
    const occurrences = expandRecurring(rule, at('00:00'), at('23:59'));
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].occurrenceId).toBe('r1:2026-03-02');
  });
});

describe('deslocamentos', () => {
  const anchor = { start: at('08:00'), end: at('17:00') };

  it('ocupa o tempo após o compromisso', () => {
    const interval = commuteInterval({ durationMinutes: 60, position: 'AFTER', startAt: null }, anchor);
    expect(toLocalTime(interval!.start)).toBe('17:00');
    expect(toLocalTime(interval!.end)).toBe('18:00');
  });

  it('ocupa o tempo antes do compromisso', () => {
    const interval = commuteInterval({ durationMinutes: 45, position: 'BEFORE', startAt: null }, anchor);
    expect(toLocalTime(interval!.start)).toBe('07:15');
  });
});

describe('cálculo de horários livres', () => {
  // Cenário do enunciado: estágio 08–17, deslocamento 17–18, faculdade 19–22.
  const busy = [
    { start: at('08:00'), end: at('17:00') },
    { start: at('17:00'), end: at('18:00') },
    { start: at('19:00'), end: at('22:00') },
  ];
  const earlyNow = at('06:00');

  it('identifica o intervalo das 18h às 19h', () => {
    const slots = computeFreeSlots({ dateKeys: [MONDAY], busy, preferences: prefs, now: earlyNow });
    expect(slots.map((s) => `${toLocalTime(s.start)}-${toLocalTime(s.end)}`)).toEqual([
      '07:00-08:00',
      '18:00-19:00',
      '22:00-23:00',
    ]);
  });

  it('aplica pausa de descanso ao redor dos compromissos', () => {
    const slots = computeFreeSlots({
      dateKeys: [MONDAY],
      busy,
      preferences: { ...prefs, breakMinutes: 10 },
      now: earlyNow,
    });
    const evening = slots.find((s) => toLocalTime(s.start) === '18:10');
    expect(evening?.minutes).toBe(40);
  });

  it('respeita a disponibilidade configurada e os dias permitidos', () => {
    const slots = computeFreeSlots({
      dateKeys: [MONDAY, '2026-03-03'],
      busy: [],
      preferences: { ...prefs, availabilityStart: '18:00', availabilityEnd: '20:00', availableWeekdays: [1] },
      now: earlyNow,
    });
    expect(slots).toHaveLength(1);
    expect(slots[0].minutes).toBe(120);
  });

  it('não oferece horários no passado', () => {
    const slots = computeFreeSlots({ dateKeys: [MONDAY], busy, preferences: prefs, now: at('18:32') });
    expect(toLocalTime(slots[0].start)).toBe('18:35');
  });

  it('descarta intervalos menores que o mínimo configurado', () => {
    const slots = computeFreeSlots({
      dateKeys: [MONDAY],
      busy,
      preferences: { ...prefs, minSlotMinutes: 90 },
      now: earlyNow,
    });
    expect(slots).toHaveLength(0);
  });
});

describe('geração de sugestões', () => {
  const now = at('06:00');
  const freeSlots = computeFreeSlots({
    dateKeys: [MONDAY],
    busy: [
      { start: at('07:00'), end: at('17:00') },
      { start: at('17:00'), end: at('18:00') },
      { start: at('19:00'), end: at('22:00') },
    ],
    preferences: prefs,
    now,
  });

  it('sugere a tarefa de 30 minutos no intervalo das 18h', () => {
    const suggestions = generateSuggestions({ tasks: [task({})], freeSlots, preferences: prefs, now });
    expect(suggestions).toHaveLength(1);
    expect(toLocalTime(suggestions[0].start)).toBe('18:00');
    expect(toLocalTime(suggestions[0].end)).toBe('18:30');
  });

  it('prioriza tarefas de alta prioridade e prazo próximo', () => {
    const suggestions = generateSuggestions({
      tasks: [
        task({ id: 'baixa', priority: 'LOW', estimatedMinutes: 60 }),
        task({ id: 'urgente', priority: 'HIGH', estimatedMinutes: 60, dueDate: at('23:00') }),
      ],
      freeSlots,
      preferences: prefs,
      now,
    });
    expect(suggestions[0].taskId).toBe('urgente');
    expect(toLocalTime(suggestions[0].start)).toBe('18:00');
    expect(suggestions[1].taskId).toBe('baixa');
    expect(toLocalTime(suggestions[1].start)).toBe('22:00');
  });

  it('nunca sobrepõe sugestões nem ocupa horários bloqueados', () => {
    const suggestions = generateSuggestions({
      tasks: [task({ id: 'a', estimatedMinutes: 45 }), task({ id: 'b', estimatedMinutes: 45 }), task({ id: 'c', estimatedMinutes: 45 })],
      freeSlots,
      preferences: prefs,
      now,
    });
    for (let i = 0; i < suggestions.length; i++) {
      for (let j = i + 1; j < suggestions.length; j++) {
        expect(overlaps(suggestions[i], suggestions[j])).toBe(false);
      }
      expect(freeSlots.some((s) => suggestions[i].start >= s.start && suggestions[i].end <= s.end)).toBe(true);
    }
  });

  it('divide tarefas longas em blocos e respeita o tamanho máximo', () => {
    const slots = computeFreeSlots({ dateKeys: [MONDAY], busy: [], preferences: prefs, now });
    const suggestions = generateSuggestions({
      tasks: [task({ estimatedMinutes: 300 })],
      freeSlots: slots,
      preferences: { ...prefs, maxTaskBlockMinutes: 90, breakMinutes: 15 },
      now,
    });
    expect(suggestions.reduce((sum, s) => sum + (s.end.getTime() - s.start.getTime()) / 60000, 0)).toBe(300);
    expect(suggestions.every((s) => (s.end.getTime() - s.start.getTime()) / 60000 <= 90)).toBe(true);
    // Pausa de 15 min entre os blocos
    expect(suggestions[1].start.getTime() - suggestions[0].end.getTime()).toBe(15 * 60000);
  });

  it('não sugere após o prazo de entrega', () => {
    const suggestions = generateSuggestions({
      tasks: [task({ estimatedMinutes: 30, dueDate: at('12:00') })],
      freeSlots,
      preferences: prefs,
      now,
    });
    expect(suggestions).toHaveLength(0);
  });

  it('desconta minutos já reservados e pula intervalos recusados', () => {
    expect(
      generateSuggestions({ tasks: [task({ scheduledMinutes: 30 })], freeSlots, preferences: prefs, now }),
    ).toHaveLength(0);

    const suggestions = generateSuggestions({
      tasks: [task({ blocked: [{ start: at('18:00'), end: at('18:30') }] })],
      freeSlots,
      preferences: prefs,
      now,
    });
    expect(toLocalTime(suggestions[0].start)).toBe('18:30');
  });

  it('pontua tarefas atrasadas acima das demais', () => {
    expect(taskScore({ priority: 'LOW', dueDate: at('05:00') }, now)).toBeGreaterThan(
      taskScore({ priority: 'HIGH', dueDate: null }, now),
    );
  });
});
