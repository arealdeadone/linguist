export type MessageRole = 'system' | 'user' | 'assistant';

export interface Message {
  role: MessageRole;
  content: string;
  timestamp?: Date;
  audio_url?: string;
}

export interface CodeSwitch {
  turn: number;
  learner_said: string;
  gap_word: string;
  target_equivalent: string | null;
  times_used: number;
  auto_promoted: boolean;
}

export interface ConversationAnalysis {
  words_used_correctly: string[];
  words_used_incorrectly: Array<{
    word: string;
    error: string;
    correction: string;
  }>;
  code_switches: CodeSwitch[];
  new_patterns_demonstrated: string[];
  srs_updates: Array<{
    word: string;
    quality: number;
  }>;
  suggested_focus_next_session: string;
}

export interface Conversation {
  id: string;
  learner_id: string;
  lesson_id: string | null;
  scenario: string | null;
  messages: Message[];
  analysis: ConversationAnalysis | null;
  created_at: Date;
  completed_at: Date | null;
}
