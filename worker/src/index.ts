import { config } from './config';
import { startPoller, stopPoller } from './poller';
import { closeRedis } from './redis';

console.log('[worker] AI Worker starting...');
console.log(`[worker] Database: ${config.databaseUrl ? 'configured' : 'MISSING'}`);
console.log(`[worker] Redis: ${config.redisUrl ? 'configured' : 'MISSING'}`);
console.log(`[worker] GenAI: ${config.genaiApiKey ? 'configured' : 'MISSING'}`);

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown(): Promise<void> {
	console.log('[worker] Shutting down gracefully...');
	stopPoller();
	await closeRedis();
	process.exit(0);
}

startPoller().catch((error) => {
	console.error('[worker] Fatal error:', error);
	process.exit(1);
});
