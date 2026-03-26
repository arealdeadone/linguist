import { relations, sql } from 'drizzle-orm';
import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	real,
	timestamp,
	text,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';

export const learners = pgTable('learners', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: text('name').notNull(),
	supabaseUserId: text('supabase_user_id').unique(),
	targetLanguage: text('target_language').notNull(),
	lessonLanguage: text('lesson_language').notNull(),
	cefrLevel: text('cefr_level').notNull().default('A1'),
	preferences: jsonb('preferences').$type<Record<string, unknown>>().notNull().default({}),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const vocabulary = pgTable(
	'vocabulary',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		learnerId: uuid('learner_id')
			.notNull()
			.references(() => learners.id, { onDelete: 'cascade' }),
		word: text('word').notNull(),
		romanization: text('romanization'),
		meaning: text('meaning'),
		sceneDescription: text('scene_description'),
		audioUrl: text('audio_url'),
		cefrLevel: text('cefr_level').notNull(),
		sm2Repetition: integer('sm2_repetition').notNull().default(0),
		sm2Interval: integer('sm2_interval').notNull().default(0),
		sm2Ef: real('sm2_ef').notNull().default(2.5),
		nextReview: timestamp('next_review', { withTimezone: true }).notNull().defaultNow(),
		modalityScores: jsonb('modality_scores')
			.$type<{ listening: number; speaking: number; contextual: number }>()
			.notNull()
			.default({ listening: 0, speaking: 0, contextual: 0 }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		uniqueIndex('vocabulary_learner_id_word_unique').on(table.learnerId, table.word),
		index('vocabulary_learner_id_next_review_idx').on(table.learnerId, table.nextReview),
		index('vocabulary_learner_id_cefr_level_idx').on(table.learnerId, table.cefrLevel)
	]
);

export const lessons = pgTable('lessons', {
	id: uuid('id').defaultRandom().primaryKey(),
	learnerId: uuid('learner_id')
		.notNull()
		.references(() => learners.id, { onDelete: 'cascade' }),
	cefrLevel: text('cefr_level').notNull(),
	week: integer('week'),
	day: integer('day'),
	theme: text('theme'),
	plan: jsonb('plan').$type<Record<string, unknown>>().notNull(),
	status: text('status').notNull().default('pending'),
	startedAt: timestamp('started_at', { withTimezone: true }),
	completedAt: timestamp('completed_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const conversations = pgTable('conversations', {
	id: uuid('id').defaultRandom().primaryKey(),
	learnerId: uuid('learner_id')
		.notNull()
		.references(() => learners.id, { onDelete: 'cascade' }),
	lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'set null' }),
	scenario: text('scenario'),
	messages: jsonb('messages')
		.$type<Record<string, unknown>[]>()
		.notNull()
		.default(sql`'[]'::jsonb`),
	analysis: jsonb('analysis').$type<Record<string, unknown> | null>(),
	srsUpdates: jsonb('srs_updates').$type<Record<string, unknown> | null>(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	completedAt: timestamp('completed_at', { withTimezone: true })
});

export const codeSwitches = pgTable(
	'code_switches',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		learnerId: uuid('learner_id')
			.notNull()
			.references(() => learners.id, { onDelete: 'cascade' }),
		conversationId: uuid('conversation_id').references(() => conversations.id, {
			onDelete: 'set null'
		}),
		gapWord: text('gap_word').notNull(),
		targetEquiv: text('target_equiv'),
		timesUsed: integer('times_used').notNull().default(1),
		promotedToVocab: boolean('promoted_to_vocab').notNull().default(false),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		uniqueIndex('code_switches_learner_id_gap_word_unique').on(table.learnerId, table.gapWord),
		index('code_switches_learner_id_times_used_desc_idx').on(
			table.learnerId,
			sql`${table.timesUsed} DESC`
		)
	]
);

export const quizResults = pgTable('quiz_results', {
	id: uuid('id').defaultRandom().primaryKey(),
	learnerId: uuid('learner_id')
		.notNull()
		.references(() => learners.id, { onDelete: 'cascade' }),
	lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'set null' }),
	quizType: text('quiz_type').notNull(),
	questions: jsonb('questions').$type<Record<string, unknown>>().notNull(),
	answers: jsonb('answers').$type<Record<string, unknown>>().notNull(),
	score: real('score'),
	srsUpdates: jsonb('srs_updates').$type<Record<string, unknown> | null>(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const aiUsageLogs = pgTable(
	'ai_usage_logs',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		learnerId: uuid('learner_id').references(() => learners.id, { onDelete: 'set null' }),
		task: text('task').notNull(),
		model: text('model').notNull(),
		inputTokens: integer('input_tokens').notNull().default(0),
		outputTokens: integer('output_tokens').notNull().default(0),
		costUsd: real('cost_usd').notNull().default(0),
		durationMs: integer('duration_ms'),
		metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('ai_usage_learner_idx').on(table.learnerId, table.createdAt),
		index('ai_usage_task_idx').on(table.task, table.createdAt),
		index('ai_usage_date_idx').on(table.createdAt)
	]
);

export const tutorPrompts = pgTable('tutor_prompts', {
	id: uuid('id').defaultRandom().primaryKey(),
	language: text('language').notNull().unique(),
	sections: jsonb('sections').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const modelRouting = pgTable(
	'model_routing',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		language: text('language').notNull(),
		task: text('task').notNull(),
		model: text('model').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [uniqueIndex('model_routing_lang_task_idx').on(table.language, table.task)]
);

export const languages = pgTable('languages', {
	code: text('code').primaryKey(),
	name: text('name').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const aiJobs = pgTable(
	'ai_jobs',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		learnerId: uuid('learner_id').references(() => learners.id, { onDelete: 'set null' }),
		jobType: text('job_type').notNull(),
		status: text('status').notNull().default('pending'),
		priority: integer('priority').notNull().default(0),
		input: jsonb('input').$type<Record<string, unknown>>().notNull(),
		output: jsonb('output').$type<Record<string, unknown> | null>(),
		error: text('error'),
		attempts: integer('attempts').notNull().default(0),
		maxAttempts: integer('max_attempts').notNull().default(3),
		workerId: text('worker_id'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		startedAt: timestamp('started_at', { withTimezone: true }),
		completedAt: timestamp('completed_at', { withTimezone: true }),
		runAfter: timestamp('run_after', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('ai_jobs_queue_idx').on(table.priority, table.createdAt).where(sql`status = 'pending'`),
		index('ai_jobs_learner_status_idx').on(table.learnerId, table.status)
	]
);

export const learnersRelations = relations(learners, ({ many }) => ({
	vocabulary: many(vocabulary),
	lessons: many(lessons),
	conversations: many(conversations),
	aiUsageLogs: many(aiUsageLogs)
}));

export const vocabularyRelations = relations(vocabulary, ({ one }) => ({
	learner: one(learners, {
		fields: [vocabulary.learnerId],
		references: [learners.id]
	})
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
	learner: one(learners, {
		fields: [lessons.learnerId],
		references: [learners.id]
	}),
	conversations: many(conversations)
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
	learner: one(learners, {
		fields: [conversations.learnerId],
		references: [learners.id]
	}),
	lesson: one(lessons, {
		fields: [conversations.lessonId],
		references: [lessons.id]
	}),
	codeSwitches: many(codeSwitches)
}));

export const codeSwitchesRelations = relations(codeSwitches, ({ one }) => ({
	conversation: one(conversations, {
		fields: [codeSwitches.conversationId],
		references: [conversations.id]
	}),
	learner: one(learners, {
		fields: [codeSwitches.learnerId],
		references: [learners.id]
	})
}));

export const quizResultsRelations = relations(quizResults, ({ one }) => ({
	learner: one(learners, {
		fields: [quizResults.learnerId],
		references: [learners.id]
	}),
	lesson: one(lessons, {
		fields: [quizResults.lessonId],
		references: [lessons.id]
	})
}));

export const aiUsageLogsRelations = relations(aiUsageLogs, ({ one }) => ({
	learner: one(learners, {
		fields: [aiUsageLogs.learnerId],
		references: [learners.id]
	})
}));

export const aiJobsRelations = relations(aiJobs, ({ one }) => ({
	learner: one(learners, {
		fields: [aiJobs.learnerId],
		references: [learners.id]
	})
}));
