export interface Category {
  id: number;
  name: string;
  accuracy: number;
  total: number;
}

export interface Question {
  id: string;
  source_id?: number;
  type: string;
  difficulty: string;
  stem: string;
  options: string[];
  answer: string;
  explanation: string;
  knowledge: string;
}

export type Answers = Record<string, string>;

export interface PaperDraft {
  paper_id: string;
  difficulty: string;
  amount: number;
  paper: Question[];
  answers: Answers;
  unsure: string[];
  current_index: number;
  updated_at: string;
}

export interface ExamReport {
  paper_id: string;
  score: number;
  correct: number;
  total: number;
  rank_hint: string;
  analysis: string[];
}

export interface Ranking {
  rank: number;
  name: string;
  tier: string;
  score: number;
  accuracy: number;
}

export interface WrongBookItem {
  id: number;
  title: string;
  type: string;
  mistakes: number;
  lastPracticed: string;
}

export interface Dashboard {
  profile: {
    nickname: string;
    tier: string;
    totalAnswered: number;
    correctRate: number;
    streakDays: number;
    practiceMinutes: number;
  };
  categories: Category[];
  wrongBook: WrongBookItem[];
  rankings: Ranking[];
  radar: { axis: string; value: number }[];
}
