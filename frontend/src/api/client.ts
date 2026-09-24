import type { Answers, Dashboard, ExamReport, PaperDraft } from '@/types/bank';

const API_BASE = '/api';
const ACCESS_TOKEN_KEY = 'gxlogic_access_token';
const REFRESH_TOKEN_KEY = 'gxlogic_refresh_token';

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) ?? '';
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

async function refreshAccessToken() {
  const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refresh) return false;

  const response = await fetch(`${API_BASE}/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh })
  });

  if (!response.ok) return false;
  const data = (await response.json()) as { access: string };
  localStorage.setItem(ACCESS_TOKEN_KEY, data.access);
  return true;
}

async function request<T>(path: string, init?: RequestInit, retryAfterRefresh = true): Promise<T> {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    }
  });

  if (response.status === 401 && retryAfterRefresh && (await refreshAccessToken())) {
    return request<T>(path, init, false);
  }

  if (!response.ok) {
    throw new Error(`请求失败：${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string; service: string }>('/health/'),
  dashboard: () => request<Dashboard>('/dashboard/'),
  generatePaper: (difficulty: string, amount: number) =>
    request<PaperDraft>('/papers/generate/', {
      method: 'POST',
      body: JSON.stringify({ difficulty, amount })
    }),
  currentDraft: () => request<{ draft: PaperDraft | null }>('/papers/draft/'),
  saveDraft: (
    draft: {
      paper_id: string;
      answers?: Answers;
      unsure?: string[];
      current_index?: number;
    },
    keepalive = false
  ) =>
    request<PaperDraft>('/papers/draft/save/', {
      method: 'PUT',
      body: JSON.stringify(draft),
      keepalive
    }),
  submitExam: (paperId: string, answers: Answers) =>
    request<ExamReport>('/exams/submit/', {
      method: 'POST',
      body: JSON.stringify({ paper_id: paperId, answers })
    }),
  demoLogin: async () => {
    const result = await request<{ access: string; refresh: string }>('/auth/demo-login/', {
      method: 'POST'
    });
    setTokens(result.access, result.refresh);
    return result;
  }
};
