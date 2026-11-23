import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { errorMessage } from '../services/api';
import { pomodoroApi, userApi } from '../services/endpoints';
import type { PomodoroType } from '../types';
import { POMODORO_LABEL } from '../utils/labels';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

/**
 * Temporizador Pomodoro global: fica acima das rotas, então continua contando
 * ao navegar entre páginas. O estado é salvo no navegador e o tempo é calculado
 * a partir do horário de término, mantendo a precisão mesmo com a aba em segundo plano.
 */

type TimerStatus = 'idle' | 'running' | 'paused';

interface PersistedState {
  mode: PomodoroType;
  status: TimerStatus;
  endsAt: number | null;
  remainingMs: number;
  startedAt: string | null;
  completedFocus: number;
  taskId: string | null;
}

interface Durations {
  FOCUS: number;
  SHORT_BREAK: number;
  LONG_BREAK: number;
  cyclesBeforeLong: number;
}

interface PomodoroContextValue {
  mode: PomodoroType;
  status: TimerStatus;
  remainingMs: number;
  totalMs: number;
  progress: number;
  completedFocus: number;
  cyclesBeforeLong: number;
  taskId: string | null;
  durations: Durations;
  savedCount: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  switchMode: (mode: PomodoroType) => void;
  skip: () => void;
  setTaskId: (taskId: string | null) => void;
  reloadDurations: () => Promise<void>;
}

const STORAGE_KEY = 'entreturnos:pomodoro';
const DEFAULT_DURATIONS: Durations = { FOCUS: 25, SHORT_BREAK: 5, LONG_BREAK: 15, cyclesBeforeLong: 4 };

const PomodoroContext = createContext<PomodoroContextValue | null>(null);

function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedState) : null;
  } catch {
    return null;
  }
}

function saveState(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* armazenamento indisponível */
  }
}

function beep() {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    [0, 0.25, 0.5].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.22);
    });
  } catch {
    /* áudio indisponível */
  }
}

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const [durations, setDurations] = useState<Durations>(DEFAULT_DURATIONS);
  const durationMs = useCallback((mode: PomodoroType) => durations[mode] * 60_000, [durations]);

  const [state, setState] = useState<PersistedState>(
    () =>
      loadState() ?? {
        mode: 'FOCUS',
        status: 'idle',
        endsAt: null,
        remainingMs: DEFAULT_DURATIONS.FOCUS * 60_000,
        startedAt: null,
        completedFocus: 0,
        taskId: null,
      },
  );
  const [now, setNow] = useState(() => Date.now());
  const [savedCount, setSavedCount] = useState(0);
  const completingRef = useRef(false);

  useEffect(() => saveState(state), [state]);

  const reloadDurations = useCallback(async () => {
    try {
      const pref = await userApi.getPreferences();
      const next: Durations = {
        FOCUS: pref.pomodoroFocusMinutes,
        SHORT_BREAK: pref.pomodoroShortBreakMinutes,
        LONG_BREAK: pref.pomodoroLongBreakMinutes,
        cyclesBeforeLong: pref.pomodoroCyclesBeforeLong,
      };
      setDurations(next);
      // Atualiza o tempo exibido se o temporizador estiver parado.
      setState((s) => (s.status === 'idle' ? { ...s, remainingMs: next[s.mode] * 60_000 } : s));
    } catch {
      /* mantém os valores atuais */
    }
  }, []);

  useEffect(() => {
    if (user) void reloadDurations();
  }, [user, reloadDurations]);

  // Encerra o temporizador ao sair da conta (não durante a restauração da sessão ao recarregar a página).
  useEffect(() => {
    if (!authLoading && !user) {
      setState((s) =>
        s.status === 'idle' && !s.taskId
          ? s
          : { ...s, status: 'idle', endsAt: null, startedAt: null, taskId: null, remainingMs: durationMs(s.mode) },
      );
    }
  }, [user, authLoading, durationMs]);

  const remainingMs =
    state.status === 'running' && state.endsAt ? Math.max(0, state.endsAt - now) : state.remainingMs;

  const complete = useCallback(
    async (finished: PersistedState) => {
      const total = durationMs(finished.mode);
      const endedAt = new Date(finished.endsAt ?? Date.now());
      const startedAt = finished.startedAt ?? new Date(endedAt.getTime() - total).toISOString();
      const completedFocus = finished.mode === 'FOCUS' ? finished.completedFocus + 1 : finished.completedFocus;
      const nextMode: PomodoroType =
        finished.mode === 'FOCUS'
          ? completedFocus % durations.cyclesBeforeLong === 0
            ? 'LONG_BREAK'
            : 'SHORT_BREAK'
          : 'FOCUS';

      setState({
        ...finished,
        mode: nextMode,
        status: 'idle',
        endsAt: null,
        startedAt: null,
        remainingMs: durationMs(nextMode),
        completedFocus,
      });
      beep();

      try {
        await pomodoroApi.create({
          type: finished.mode,
          durationMinutes: durations[finished.mode],
          startedAt,
          endedAt: endedAt.toISOString(),
          completed: true,
          taskId: finished.mode === 'FOCUS' ? finished.taskId : null,
        });
        setSavedCount((c) => c + 1);
        toast.success(
          finished.mode === 'FOCUS'
            ? `Sessão de foco concluída! Hora de uma ${POMODORO_LABEL[nextMode].toLowerCase()}.`
            : 'Pausa encerrada. Pronto para mais um ciclo de foco?',
        );
      } catch (error) {
        toast.error(`Não foi possível registrar a sessão: ${errorMessage(error)}`);
      } finally {
        completingRef.current = false;
      }
    },
    [durationMs, durations, toast],
  );

  // Relógio: só atualiza enquanto estiver rodando.
  useEffect(() => {
    if (state.status !== 'running') return;
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [state.status]);

  useEffect(() => {
    if (state.status === 'running' && state.endsAt && now >= state.endsAt && !completingRef.current) {
      completingRef.current = true;
      void complete(state);
    }
  }, [now, state, complete]);

  // Título da aba mostra o tempo restante.
  useEffect(() => {
    const base = 'EntreTurnos — Organizador Inteligente de Rotina';
    if (state.status === 'idle') {
      document.title = base;
      return;
    }
    const minutes = Math.floor(remainingMs / 60_000);
    const seconds = Math.floor((remainingMs % 60_000) / 1000);
    document.title = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} · ${POMODORO_LABEL[state.mode]} — EntreTurnos`;
  }, [remainingMs, state.status, state.mode]);

  const start = useCallback(() => {
    const t = Date.now();
    setNow(t);
    setState((s) => ({
      ...s,
      status: 'running',
      startedAt: new Date(t).toISOString(),
      endsAt: t + durationMs(s.mode),
      remainingMs: durationMs(s.mode),
    }));
  }, [durationMs]);

  const pause = useCallback(() => {
    setState((s) =>
      s.status === 'running' && s.endsAt
        ? { ...s, status: 'paused', remainingMs: Math.max(0, s.endsAt - Date.now()), endsAt: null }
        : s,
    );
  }, []);

  const resume = useCallback(() => {
    const t = Date.now();
    setNow(t);
    setState((s) => (s.status === 'paused' ? { ...s, status: 'running', endsAt: t + s.remainingMs } : s));
  }, []);

  const reset = useCallback(() => {
    setState((s) => ({ ...s, status: 'idle', endsAt: null, startedAt: null, remainingMs: durationMs(s.mode) }));
  }, [durationMs]);

  const switchMode = useCallback(
    (mode: PomodoroType) => {
      setState((s) => ({ ...s, mode, status: 'idle', endsAt: null, startedAt: null, remainingMs: durationMs(mode) }));
    },
    [durationMs],
  );

  const skip = useCallback(() => {
    setState((s) => {
      const nextMode: PomodoroType = s.mode === 'FOCUS' ? 'SHORT_BREAK' : 'FOCUS';
      return { ...s, mode: nextMode, status: 'idle', endsAt: null, startedAt: null, remainingMs: durationMs(nextMode) };
    });
  }, [durationMs]);

  const setTaskId = useCallback((taskId: string | null) => setState((s) => ({ ...s, taskId })), []);

  const totalMs = durationMs(state.mode);
  const value = useMemo<PomodoroContextValue>(
    () => ({
      mode: state.mode,
      status: state.status,
      remainingMs,
      totalMs,
      progress: totalMs === 0 ? 0 : 1 - remainingMs / totalMs,
      completedFocus: state.completedFocus,
      cyclesBeforeLong: durations.cyclesBeforeLong,
      taskId: state.taskId,
      durations,
      savedCount,
      start,
      pause,
      resume,
      reset,
      switchMode,
      skip,
      setTaskId,
      reloadDurations,
    }),
    [state, remainingMs, totalMs, durations, savedCount, start, pause, resume, reset, switchMode, skip, setTaskId, reloadDurations],
  );

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}

export function usePomodoro() {
  const context = useContext(PomodoroContext);
  if (!context) throw new Error('usePomodoro deve ser usado dentro de PomodoroProvider');
  return context;
}

export function formatClock(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
