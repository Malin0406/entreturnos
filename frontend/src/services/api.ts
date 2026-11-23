// Cliente HTTP do EntreTurnos (fetch + JWT).

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';
const TOKEN_KEY = 'entreturnos:token';

export const UNAUTHORIZED_EVENT = 'entreturnos:unauthorized';

export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  errors: FieldError[];

  constructor(status: number, message: string, details?: unknown, errors: FieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.errors = errors;
  }
}

export const tokenStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* armazenamento indisponível */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* armazenamento indisponível */
    }
  },
};

type Query = Record<string, string | number | boolean | null | undefined>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
}

function buildUrl(path: string, query?: Query) {
  const url = `${BASE_URL}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = tokenStorage.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor. Verifique se a API está em execução.');
  }

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/login')) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(
      response.status,
      data?.message ?? 'Ocorreu um erro inesperado.',
      data?.details,
      Array.isArray(data?.errors) ? data.errors : [],
    );
  }
  return data as T;
}

/** Mensagem amigável para exibir ao usuário a partir de qualquer erro. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.errors.length > 0) return error.errors.map((e) => e.message).join(' ');
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Ocorreu um erro inesperado.';
}
