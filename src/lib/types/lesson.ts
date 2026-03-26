export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type LessonStatus = 'pending' | 'in_progress' | 'completed';
export type ActivityType =
  | 'listening'
  | 'vocabulary_tpr'
  | 'conversation'
  | 'srs_review'
  | 'quiz'
  | 'speaking';

export interface Activity {
  type: ActivityType;
  duration_min: number;
  data?: Record<string, unknown>;
}

export interface VocabTarget {
  word: string;
  romanization: string;
  meaning: string;
  scene_description: string;
  audioUrl?: string;
}

export interface LessonPlan {
  id: string;
  cefr_level: CefrLevel;
  week: number;
  day: number;
  theme: string;
  duration_minutes: number;
  learning_objectives: string[];
  vocabulary_targets: VocabTarget[];
  review_words: string[];
  activities: Activity[];
  colloquial_phrase: string;
  colloquial_phrase_audio_url?: string;
  cultural_note: string;
  preGeneratedQuiz?: {
    quizType: string;
    words: string[];
    questions: unknown[];
  };
}

export interface Lesson {
  id: string;
  learner_id: string;
  cefr_level: CefrLevel;
  week: number | null;
  day: number | null;
  theme: string | null;
  plan: LessonPlan;
  status: LessonStatus;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
}
