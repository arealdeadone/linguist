import { and, eq, inArray, lt, sql } from 'drizzle-orm';
import { db } from '../db';
import { aiJobs } from '../schema';

export type AIJob = typeof aiJobs.$inferSelect;

function toDate(value: unknown): Date | null {
	if (!value) return null;
	if (value instanceof Date) return value;
	if (typeof value === 'string' || typeof value === 'number') {
		const date = new Date(value);
		if (!Number.isNaN(date.getTime())) return date;
	}
	return null;
}

function toAIJob(raw: Record<string, unknown>): AIJob {
	const id = raw.id;
	const learnerId = raw.learnerId ?? raw.learner_id;
	const jobType = raw.jobType ?? raw.job_type;
	const status = raw.status;
	const priority = raw.priority;
	const input = raw.input;
	const output = raw.output;
	const error = raw.error;
	const attempts = raw.attempts;
	const maxAttempts = raw.maxAttempts ?? raw.max_attempts;
	const workerId = raw.workerId ?? raw.worker_id;
	const createdAt = raw.createdAt ?? raw.created_at;
	const startedAt = raw.startedAt ?? raw.started_at;
	const completedAt = raw.completedAt ?? raw.completed_at;
	const runAfter = raw.runAfter ?? raw.run_after;

	if (typeof id !== 'string') throw new Error('Invalid ai_jobs.id returned from database');
	if (learnerId !== null && learnerId !== undefined && typeof learnerId !== 'string') {
		throw new Error('Invalid ai_jobs.learner_id returned from database');
	}
	if (typeof jobType !== 'string') throw new Error('Invalid ai_jobs.job_type returned from database');
	if (typeof status !== 'string') throw new Error('Invalid ai_jobs.status returned from database');
	if (typeof priority !== 'number') throw new Error('Invalid ai_jobs.priority returned from database');
	if (!input || typeof input !== 'object' || Array.isArray(input)) {
		throw new Error('Invalid ai_jobs.input returned from database');
	}
	if (output !== null && output !== undefined && (typeof output !== 'object' || Array.isArray(output))) {
		throw new Error('Invalid ai_jobs.output returned from database');
	}
	if (error !== null && error !== undefined && typeof error !== 'string') {
		throw new Error('Invalid ai_jobs.error returned from database');
	}
	if (typeof attempts !== 'number') throw new Error('Invalid ai_jobs.attempts returned from database');
	if (typeof maxAttempts !== 'number') {
		throw new Error('Invalid ai_jobs.max_attempts returned from database');
	}
	if (workerId !== null && workerId !== undefined && typeof workerId !== 'string') {
		throw new Error('Invalid ai_jobs.worker_id returned from database');
	}

	const createdAtDate = toDate(createdAt);
	const startedAtDate = toDate(startedAt);
	const completedAtDate = toDate(completedAt);
	const runAfterDate = toDate(runAfter);

	if (!createdAtDate) throw new Error('Invalid ai_jobs.created_at returned from database');
	if (!runAfterDate) throw new Error('Invalid ai_jobs.run_after returned from database');

	return {
		id,
		learnerId: (learnerId as string | null | undefined) ?? null,
		jobType,
		status,
		priority,
		input: input as Record<string, unknown>,
		output: (output as Record<string, unknown> | null | undefined) ?? null,
		error: (error as string | null | undefined) ?? null,
		attempts,
		maxAttempts,
		workerId: (workerId as string | null | undefined) ?? null,
		createdAt: createdAtDate,
		startedAt: startedAtDate,
		completedAt: completedAtDate,
		runAfter: runAfterDate
	};
}

export async function createJob(data: {
	learnerId?: string;
	jobType: string;
	input: Record<string, unknown>;
	priority?: number;
}): Promise<AIJob> {
	const rows = await db
		.insert(aiJobs)
		.values({
			learnerId: data.learnerId,
			jobType: data.jobType,
			input: data.input,
			priority: data.priority ?? 0
		})
		.returning();

	return rows[0];
}

export async function claimNextJob(workerId: string): Promise<AIJob | null> {
	const rows = await db.execute(sql`
		WITH next_job AS (
			SELECT id FROM ai_jobs
			WHERE status = 'pending'
				AND run_after <= now()
				AND attempts < max_attempts
			ORDER BY priority DESC, created_at ASC
			LIMIT 1
			FOR UPDATE SKIP LOCKED
		)
		UPDATE ai_jobs
		SET status = 'processing', worker_id = ${workerId}, started_at = now(), attempts = attempts + 1
		FROM next_job
		WHERE ai_jobs.id = next_job.id
		RETURNING ai_jobs.*;
	`);

	const row = rows[0];
	if (!row) return null;

	return toAIJob(row as Record<string, unknown>);
}

export async function completeJob(jobId: string, output: Record<string, unknown>): Promise<void> {
	await db
		.update(aiJobs)
		.set({
			status: 'completed',
			output,
			error: null,
			completedAt: new Date()
		})
		.where(eq(aiJobs.id, jobId));
}

export async function failJob(jobId: string, error: string): Promise<void> {
	await db
		.update(aiJobs)
		.set({
			status: 'failed',
			error,
			completedAt: new Date()
		})
		.where(eq(aiJobs.id, jobId));
}

export async function getJobById(jobId: string): Promise<AIJob | null> {
	const rows = await db.select().from(aiJobs).where(eq(aiJobs.id, jobId)).limit(1);
	return rows[0] ?? null;
}

export async function pollJobResult(
	jobId: string,
	intervalMs = 1000,
	timeoutMs = 60000
): Promise<AIJob> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const job = await getJobById(jobId);
		if (!job) throw new Error(`Job ${jobId} not found`);
		if (job.status === 'completed' || job.status === 'failed') return job;
		await new Promise((resolve) => setTimeout(resolve, intervalMs));
	}
	throw new Error(`Job ${jobId} timed out after ${timeoutMs}ms`);
}

export async function cleanupOldJobs(olderThanDays = 7): Promise<number> {
	const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
	const rows = await db
		.delete(aiJobs)
		.where(
			and(
				inArray(aiJobs.status, ['completed', 'failed']),
				lt(aiJobs.completedAt, cutoff)
			)
		)
		.returning({ id: aiJobs.id });

	return rows.length;
}

export async function recoverStaleJobs(staleMinutes = 10): Promise<number> {
	const staleBefore = new Date(Date.now() - staleMinutes * 60 * 1000);
	const rows = await db
		.update(aiJobs)
		.set({
			status: 'pending',
			workerId: null,
			startedAt: null,
			runAfter: new Date()
		})
		.where(
			and(
				eq(aiJobs.status, 'processing'),
				lt(aiJobs.startedAt, staleBefore),
				sql`${aiJobs.attempts} < ${aiJobs.maxAttempts}`
			)
		)
		.returning({ id: aiJobs.id });

	return rows.length;
}
