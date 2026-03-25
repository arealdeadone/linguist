import { sql } from 'drizzle-orm';
import { db } from './db';
import { aiJobs } from './schema';
import { processJob } from './processor';
import { config } from './config';
import { eq } from 'drizzle-orm';

let running = true;
let activeJobs = 0;

export function stopPoller(): void {
	running = false;
}

async function claimAndProcess(): Promise<void> {
	if (activeJobs >= config.maxConcurrentJobs) return;

	const result = await db.execute(sql`
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
		SET status = 'processing', worker_id = ${config.workerId}, started_at = now(), attempts = attempts + 1
		FROM next_job
		WHERE ai_jobs.id = next_job.id
		RETURNING ai_jobs.*
	`);

	if (!result || result.length === 0) return;

	const job = result[0] as Record<string, unknown>;
	activeJobs++;

	try {
		const output = await processJob({
			id: job.id as string,
			jobType: job.job_type as string,
			input: job.input as Record<string, unknown>,
			learnerId: job.learner_id as string | null
		});

		await db
			.update(aiJobs)
			.set({ status: 'completed', output, completedAt: new Date() })
			.where(eq(aiJobs.id, job.id as string));

		console.log(`[worker] Completed job ${job.id} (${job.job_type})`);
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : 'Unknown error';
		await db
			.update(aiJobs)
			.set({ status: 'failed', error: errorMsg, completedAt: new Date() })
			.where(eq(aiJobs.id, job.id as string));

		console.error(`[worker] Failed job ${job.id} (${job.job_type}):`, errorMsg);
	} finally {
		activeJobs--;
	}
}

async function recoverStaleJobs(): Promise<void> {
	const result = await db.execute(sql`
		UPDATE ai_jobs
		SET status = 'pending', worker_id = NULL, started_at = NULL
		WHERE status = 'processing'
			AND started_at < now() - interval '${sql.raw(String(config.staleJobMinutes))} minutes'
		RETURNING id
	`);
	if (result.length > 0) {
		console.log(`[worker] Recovered ${result.length} stale jobs`);
	}
}

export async function startPoller(): Promise<void> {
	console.log(
		`[worker] Starting poller (ID: ${config.workerId}, interval: ${config.pollIntervalMs}ms, concurrency: ${config.maxConcurrentJobs})`
	);

	let recoveryCounter = 0;

	while (running) {
		try {
			await claimAndProcess();

			recoveryCounter++;
			if (recoveryCounter >= 30) {
				await recoverStaleJobs();
				recoveryCounter = 0;
			}
		} catch (error) {
			console.error('[worker] Poll error:', error);
		}

		await new Promise((r) => setTimeout(r, config.pollIntervalMs));
	}
}
