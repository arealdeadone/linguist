export interface SM2Params {
  repetition: number;
  interval: number;
  ef: number;
  next_review: Date;
}

export interface ModalityScores {
  listening: number;
  speaking: number;
  contextual: number;
}

export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

export interface VocabCard {
  id: string;
  learner_id: string;
  word: string;
  romanization: string | null;
  cefr_level: string;
  sm2: SM2Params;
  modality_scores: ModalityScores;
  created_at: Date;
  updated_at: Date;
}

export interface ReviewResult {
  vocab_id: string;
  quality: ReviewQuality;
  modality: 'listening' | 'speaking' | 'contextual';
}

export interface ReviewStats {
  due_today: number;
  due_tomorrow: number;
  due_this_week: number;
  total_cards: number;
  mastered: number;
}
