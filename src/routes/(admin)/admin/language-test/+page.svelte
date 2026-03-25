<script lang="ts">
	import { showToast } from '$lib/stores/toast.svelte';

	type Recommendation = 'viable' | 'marginal' | 'not_viable';

	interface LanguageTestResult {
		sentence: string;
		targetLanguage: string;
		sourceLanguage: string;
		ttsLatencyMs: number;
		sttLatencyMs: number;
		evalLatencyMs: number;
		sttTranscript: string;
		evalScore: number;
		evalFeedback: string;
		roundTripSuccess: boolean;
	}

	interface LanguageTestSummary {
		results: LanguageTestResult[];
		averageScore: number;
		successRate: number;
		averageLatencyMs: number;
		recommendation: Recommendation;
		reasoning: string;
		agentAnalysis: string;
		modelRouting: Record<string, string>;
	}

	let sourceLanguageCode = $state('hi');
	let sourceLanguageName = $state('Hindi');
	let targetLanguageCode = $state('zh');
	let targetLanguageName = $state('Chinese Mandarin');
	let testCount = $state(5);

	let isRunning = $state(false);
	let isAddingPair = $state(false);
	let summary = $state<LanguageTestSummary | null>(null);
	let statusMessage = $state('');
	let liveResults = $state<LanguageTestResult[]>([]);
	let totalSentences = $state(0);

	const recommendationStyles: Record<Recommendation, string> = {
		viable: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
		marginal: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
		not_viable: 'bg-red-500/20 text-red-300 border-red-500/40'
	};

	function formatRecommendation(value: Recommendation): string {
		if (value === 'not_viable') return 'Not Viable';
		return value.charAt(0).toUpperCase() + value.slice(1);
	}

	async function runTest(): Promise<void> {
		if (!sourceLanguageCode.trim() || !targetLanguageCode.trim()) {
			showToast('Source and target language codes are required.', 'error');
			return;
		}

		isRunning = true;
		summary = null;
		liveResults = [];
		totalSentences = 0;
		statusMessage = 'Starting test...';

		try {
			const res = await fetch('/admin/api/language-test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					targetLanguage: targetLanguageCode.trim(),
					sourceLanguage: sourceLanguageCode.trim(),
					targetLanguageName: targetLanguageName.trim(),
					sourceLanguageName: sourceLanguageName.trim(),
					testCount
				})
			});

			if (!res.ok) {
				const err = (await res.json()) as { error?: string };
				showToast(err.error ?? 'Language test failed.', 'error');
				return;
			}

			const reader = res.body?.getReader();
			if (!reader) {
				showToast('Stream not available.', 'error');
				return;
			}

			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n\n');
				buffer = lines.pop() ?? '';

				for (const line of lines) {
					const dataLine = line.trim();
					if (!dataLine.startsWith('data: ')) continue;
					try {
						const parsed = JSON.parse(dataLine.slice(6));

						if (parsed.event === 'status') {
							statusMessage = parsed.message ?? '';
						} else if (parsed.event === 'sentences') {
							totalSentences = parsed.total ?? 0;
						} else if (parsed.event === 'result') {
							liveResults = [...liveResults, parsed.result];
						} else if (parsed.event === 'complete') {
							summary = parsed as LanguageTestSummary;
							statusMessage = '';
						} else if (parsed.event === 'error') {
							showToast(parsed.message ?? 'Test failed.', 'error');
						}
					} catch {
						console.error('Failed to parse SSE:', dataLine);
					}
				}
			}

			if (summary) {
				showToast('Language test complete.', 'success');
			}
		} catch (error) {
			console.error('Language test request failed:', error);
			showToast('Failed to run language test.', 'error');
		} finally {
			isRunning = false;
			statusMessage = '';
		}
	}

	async function addLanguagePair(): Promise<void> {
		if (!summary || summary.recommendation !== 'viable') {
			showToast('Only viable pairs can be added.', 'error');
			return;
		}

		isAddingPair = true;
		try {
			const res = await fetch('/admin/api/language-test/add-pair', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					targetLanguageCode: targetLanguageCode.trim(),
					targetLanguageName: targetLanguageName.trim(),
					sourceLanguageCode: sourceLanguageCode.trim(),
					sourceLanguageName: sourceLanguageName.trim(),
					modelRouting: summary.modelRouting
				})
			});

			if (!res.ok) {
				const err = (await res.json()) as { error?: string };
				showToast(err.error ?? 'Failed to add language pair.', 'error');
				return;
			}

			showToast('Language pair added with model routing.', 'success');
		} catch (error) {
			console.error('Add language pair failed:', error);
			showToast('Failed to add language pair.', 'error');
		} finally {
			isAddingPair = false;
		}
	}
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-2xl font-bold text-white">Language Test</h2>
		<p class="mt-1 text-sm text-gray-500">
			Validate STT/TTS round-trip quality for language pairs.
		</p>
	</div>

	<div class="rounded-xl border border-gray-800 bg-gray-900 p-5">
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<div>
				<label
					for="source-language-code"
					class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-400"
				>
					Source language code
				</label>
				<input
					id="source-language-code"
					type="text"
					bind:value={sourceLanguageCode}
					placeholder="hi"
					class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
				/>
			</div>
			<div>
				<label
					for="source-language-name"
					class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-400"
				>
					Source language name
				</label>
				<input
					id="source-language-name"
					type="text"
					bind:value={sourceLanguageName}
					placeholder="Hindi"
					class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
				/>
			</div>
			<div>
				<label
					for="target-language-code"
					class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-400"
				>
					Target language code
				</label>
				<input
					id="target-language-code"
					type="text"
					bind:value={targetLanguageCode}
					placeholder="zh"
					class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
				/>
			</div>
			<div>
				<label
					for="target-language-name"
					class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-400"
				>
					Target language name
				</label>
				<input
					id="target-language-name"
					type="text"
					bind:value={targetLanguageName}
					placeholder="Chinese Mandarin"
					class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
				/>
			</div>
		</div>

		<div class="mt-4 flex flex-wrap items-center gap-3">
			<label for="test-count" class="text-xs font-medium uppercase tracking-wide text-gray-400">
				Test count
			</label>
			<input
				id="test-count"
				type="number"
				bind:value={testCount}
				min="1"
				max="10"
				class="w-24 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
			/>
			<button
				onclick={runTest}
				disabled={isRunning}
				class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{isRunning ? `Running ${testCount} tests…` : 'Run Test'}
			</button>
		</div>
	</div>

	{#if isRunning}
		<div class="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
			<div class="flex items-center gap-3">
				<div
					class="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent"
				></div>
				<p class="text-sm text-gray-300">{statusMessage || 'Processing...'}</p>
			</div>

			{#if totalSentences > 0}
				<div class="space-y-1">
					<div class="flex justify-between text-xs text-gray-500">
						<span>{liveResults.length} / {totalSentences} sentences</span>
						<span>{Math.round((liveResults.length / totalSentences) * 100)}%</span>
					</div>
					<div class="h-2 overflow-hidden rounded-full bg-gray-800">
						<div
							class="h-full rounded-full bg-indigo-500 transition-all duration-500"
							style="width: {(liveResults.length / totalSentences) * 100}%"
						></div>
					</div>
				</div>
			{/if}

			{#if liveResults.length > 0}
				<div class="space-y-2">
					{#each liveResults as result, i}
						<div class="flex items-center gap-3 rounded-lg bg-gray-800/50 px-3 py-2 text-xs">
							<span class="shrink-0 font-mono text-gray-500">#{i + 1}</span>
							<span class="min-w-0 flex-1 truncate text-gray-300" title={result.sentence}
								>{result.sentence}</span
							>
							<span
								class="shrink-0 {result.roundTripSuccess ? 'text-emerald-400' : 'text-red-400'}"
							>
								{result.evalScore}%
							</span>
							<span class="shrink-0 text-gray-500">
								{result.ttsLatencyMs + result.sttLatencyMs + result.evalLatencyMs}ms
							</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	{#if summary}
		<div class="rounded-xl border border-gray-800 bg-gray-900 p-5">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h3 class="text-sm font-semibold text-white">Summary</h3>
				<span
					class="rounded-full border px-2.5 py-1 text-xs font-semibold {recommendationStyles[
						summary.recommendation
					]}"
				>
					{formatRecommendation(summary.recommendation)}
				</span>
			</div>
			<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
				<div class="rounded-lg border border-gray-800 bg-gray-950 p-3">
					<p class="text-xs uppercase tracking-wide text-gray-500">Average score</p>
					<p class="mt-1 text-xl font-semibold text-white">{summary.averageScore.toFixed(1)}</p>
				</div>
				<div class="rounded-lg border border-gray-800 bg-gray-950 p-3">
					<p class="text-xs uppercase tracking-wide text-gray-500">Success rate</p>
					<p class="mt-1 text-xl font-semibold text-white">{summary.successRate.toFixed(1)}%</p>
				</div>
				<div class="rounded-lg border border-gray-800 bg-gray-950 p-3">
					<p class="text-xs uppercase tracking-wide text-gray-500">Avg latency</p>
					<p class="mt-1 text-xl font-semibold text-white">
						{Math.round(summary.averageLatencyMs)} ms
					</p>
				</div>
			</div>
			<p class="mt-4 text-sm text-gray-300">{summary.reasoning}</p>

			{#if summary.agentAnalysis}
				<div class="mt-4 rounded-lg border border-gray-700 bg-gray-800/50 p-4">
					<h4 class="text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">
						Agent Analysis
					</h4>
					<p class="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
						{summary.agentAnalysis}
					</p>
				</div>
			{/if}

			{#if Object.keys(summary.modelRouting).length > 0}
				<div class="mt-4 rounded-lg border border-gray-700 bg-gray-800/50 p-4">
					<h4 class="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
						Recommended model routing
					</h4>
					<div class="space-y-2 text-sm">
						{#each Object.entries(summary.modelRouting) as [task, model]}
							<div class="flex items-center justify-between gap-4 rounded bg-gray-900/60 px-3 py-2">
								<span class="font-mono text-gray-300">{task}</span>
								<span class="font-mono text-indigo-300">{model}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			{#if summary.recommendation === 'viable'}
				<button
					onclick={addLanguagePair}
					disabled={isAddingPair}
					class="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{isAddingPair ? 'Adding…' : 'Add Language Pair'}
				</button>
			{/if}
		</div>

		<div class="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
			<table class="w-full text-left text-sm">
				<thead>
					<tr class="border-b border-gray-800 text-xs uppercase tracking-wide text-gray-500">
						<th class="px-4 py-3">Sentence</th>
						<th class="px-4 py-3">Transcript</th>
						<th class="px-4 py-3 text-right">Score</th>
						<th class="px-4 py-3 text-right">TTS</th>
						<th class="px-4 py-3 text-right">STT</th>
						<th class="px-4 py-3 text-right">Eval</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-800">
					{#each summary.results as result}
						<tr class="transition-colors hover:bg-gray-800/30">
							<td class="max-w-xs px-4 py-3 text-white">{result.sentence}</td>
							<td class="max-w-xs px-4 py-3 text-gray-300">{result.sttTranscript || '—'}</td>
							<td
								class="px-4 py-3 text-right font-mono {result.evalScore >= 70
									? 'text-emerald-300'
									: 'text-amber-300'}"
							>
								{result.evalScore}
							</td>
							<td class="px-4 py-3 text-right font-mono text-gray-300">{result.ttsLatencyMs}ms</td>
							<td class="px-4 py-3 text-right font-mono text-gray-300">{result.sttLatencyMs}ms</td>
							<td class="px-4 py-3 text-right font-mono text-gray-300">{result.evalLatencyMs}ms</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
