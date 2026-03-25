import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getJobById } from '$lib/server/data/ai-jobs';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const job = await getJobById(params.id);
		if (!job) return json({ error: 'Job not found' }, { status: 404 });

		return json({
			id: job.id,
			status: job.status,
			output: job.output,
			error: job.error,
			createdAt: job.createdAt,
			completedAt: job.completedAt
		});
	} catch (e) {
		console.error('Failed to fetch AI job status:', e);
		return json({ error: 'Failed to fetch job status' }, { status: 500 });
	}
};
