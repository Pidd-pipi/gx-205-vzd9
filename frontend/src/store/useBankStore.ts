import { create } from 'zustand';
import { api, getAccessToken } from '@/api/client';
import type { Answers, Dashboard, ExamReport, PaperDraft } from '@/types/bank';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface BankState {
  loading: boolean;
  error: string;
  dashboard: Dashboard | null;
  draft: PaperDraft | null;
  answers: Answers;
  unsure: string[];
  currentIndex: number;
  report: ExamReport | null;
  submitted: boolean;
  saveState: SaveState;
  submitting: boolean;
  loadDashboard: () => Promise<void>;
  demoLogin: () => Promise<void>;
  restoreDraft: () => Promise<void>;
  generatePaper: (difficulty: string, amount: number) => Promise<void>;
  selectAnswer: (questionId: string, option: string) => void;
  toggleUnsure: (questionId: string) => void;
  submitExam: () => Promise<void>;
  flushSave: () => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function firstUnansweredIndex(paper: PaperDraft['paper'], answers: Answers) {
  const index = paper.findIndex((question) => !answers[question.id]);
  return index === -1 ? paper.length - 1 : index;
}

export const useBankStore = create<BankState>((set, get) => {
  function applyDraft(draft: PaperDraft | null) {
    set({
      draft,
      answers: draft?.answers ?? {},
      unsure: draft?.unsure ?? [],
      currentIndex: draft ? firstUnansweredIndex(draft.paper, draft.answers) : 0,
      report: null,
      submitted: false,
      saveState: 'idle'
    });
  }

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const { draft, answers, unsure, currentIndex, submitted } = get();
      if (!draft || submitted) return;
      set({ saveState: 'saving' });
      try {
        await api.saveDraft({
          paper_id: draft.paper_id,
          answers,
          unsure,
          current_index: currentIndex
        });
        if (!get().submitted) set({ saveState: 'saved' });
      } catch {
        if (!get().submitted) set({ saveState: 'error' });
      }
    }, 500);
  }

  async function flushSave() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    const { draft, answers, unsure, currentIndex, submitted } = get();
    if (!draft || submitted) return;
    set({ saveState: 'saving' });
    try {
      await api.saveDraft({
        paper_id: draft.paper_id,
        answers,
        unsure,
        current_index: currentIndex
      }, true);
      set({ saveState: 'saved' });
    } catch {
      set({ saveState: 'error' });
    }
  }

  return {
    loading: false,
    error: '',
    dashboard: null,
    draft: null,
    answers: {},
    unsure: [],
    currentIndex: 0,
    report: null,
    submitted: false,
    saveState: 'idle',
    submitting: false,

    loadDashboard: async () => {
      set({ loading: true, error: '' });
      try {
        set({ dashboard: await api.dashboard() });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '数据加载失败' });
      } finally {
        set({ loading: false });
      }
    },

    demoLogin: async () => {
      await api.demoLogin();
      await get().restoreDraft();
    },

    restoreDraft: async () => {
      if (!getAccessToken()) return;
      try {
        const { draft } = await api.currentDraft();
        applyDraft(draft);
      } catch {
        // 未登录或 token 失效时忽略，等待用户重新登录
      }
    },

    generatePaper: async (difficulty, amount) => {
      if (!getAccessToken()) {
        await get().demoLogin();
      }
      set({ error: '' });
      try {
        const draft = await api.generatePaper(difficulty, amount);
        applyDraft(draft);
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '生成试卷失败' });
      }
    },

    selectAnswer: (questionId, option) => {
      if (get().submitted) return;
      const draft = get().draft;
      const answers = { ...get().answers, [questionId]: option };
      set({
        answers,
        currentIndex: draft ? firstUnansweredIndex(draft.paper, answers) : 0,
        saveState: 'saving'
      });
      scheduleSave();
    },

    toggleUnsure: (questionId) => {
      if (get().submitted) return;
      const unsure = get().unsure.includes(questionId)
        ? get().unsure.filter((id) => id !== questionId)
        : [...get().unsure, questionId];
      set({ unsure, saveState: 'saving' });
      scheduleSave();
    },

    submitExam: async () => {
      const { draft, answers, submitting } = get();
      if (!draft || submitting) return;
      if (saveTimer) clearTimeout(saveTimer);
      set({ submitting: true, error: '' });
      try {
        const report = await api.submitExam(draft.paper_id, answers);
        set({ report, submitted: true, saveState: 'idle' });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '提交失败' });
      } finally {
        set({ submitting: false });
      }
    },

    flushSave
  };
});
