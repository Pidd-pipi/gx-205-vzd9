import type { Dashboard, ExamReport, PaperDraft } from '@/types/bank';

const API_BASE = '/api';
const ACCESS_KEY = 'gxlogic.access';
const REFRESH_KEY = 'gxlogic.refresh';

let accessToken = localStorage.getItem(ACCESS_KEY) ?? '';
let refreshToken = localStorage.getItem(REFRESH_KEY) ?? '';

function storeTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`请求失败：${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function refreshAuth(): Promise<boolean> {
  if (refreshToken) {
    try {
      const result = await post<{ access: string }>('/auth/token/refresh/', { refresh: refreshToken });
      storeTokens(result.access, refreshToken);
      return true;
    } catch {
      // 刷新失败则回退到演示登录
    }
  }
  try {
    const result = await post<{ access: string; refresh: string }>('/auth/demo-login/');
    storeTokens(result.access, result.refresh);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, init?: RequestInit, allowRetry = true): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (response.status === 401 && allowRetry && (await refreshAuth())) {
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
  ensureAuth: async () => {
    if (!accessToken) {
      await refreshAuth();
    }
  },
  generatePaper: (difficulty: string, amount: number) =>
    request<PaperDraft>('/papers/generate/', {
      method: 'POST',
      body: JSON.stringify({ difficulty, amount })
    }),
  currentPaper: () => request<{ paper: PaperDraft | null }>('/papers/current/'),
  saveDraft: (paperId: number, answers: Record<number, string>, uncertain: number[]) =>
    request<{ saved: boolean; updated_at: string }>(`/papers/${paperId}/draft/`, {
      method: 'PUT',
      body: JSON.stringify({ answers, uncertain })
    }),
  submitExam: (paperId: number, answers: Record<number, string>) =>
    request<ExamReport>('/exams/submit/', {
      method: 'POST',
      body: JSON.stringify({ paper_id: paperId, answers })
    }),
  demoLogin: async () => {
    const result = await post<{ access: string; refresh: string }>('/auth/demo-login/');
    storeTokens(result.access, result.refresh);
    return result;
  }
};
