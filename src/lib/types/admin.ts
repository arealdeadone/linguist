export type PeriodType = 'day' | 'week' | 'month' | 'all';
export type CostGroupBy = 'user' | 'task' | 'model';

export interface AdminStats {
	totalLearners: number;
	languagePairs: Array<{ targetLanguage: string; lessonLanguage: string; count: number }>;
	totalCostUsd: number;
	costToday: number;
	totalLessons: number;
	totalConversations: number;
	totalReviews: number;
}

export interface CostEntry {
	period: string;
	costUsd: number;
	inputTokens: number;
	outputTokens: number;
	callCount: number;
}

export interface UserCost {
	learnerId: string;
	learnerName: string;
	totalCost: number;
	lessonCost: number;
	conversationCost: number;
	reviewCost: number;
	callCount: number;
}

export interface TaskCost {
	task: string;
	costUsd: number;
	callCount: number;
	avgTokens: number;
}
