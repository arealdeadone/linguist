<script lang="ts">
	import type { CostEntry, TaskCost } from '$lib/types';
	import { showToast } from '$lib/stores/toast.svelte';

	let { data } = $props();

	type PeriodKey = 'day' | 'week' | 'month';
	let activePeriod = $state<PeriodKey>('day');

	let dailyCosts = $state<CostEntry[]>([]);
	let weeklyCosts = $state<CostEntry[]>([]);
	let monthlyCosts = $state<CostEntry[]>([]);
	let taskCosts = $state<TaskCost[]>([]);
	let chartsLoading = $state(true);

	const periodLabels: Record<PeriodKey, string> = { day: 'Day', week: 'Week', month: 'Month' };

	const costData = $derived(
		activePeriod === 'day'
			? dailyCosts
			: activePeriod === 'week'
				? weeklyCosts
				: monthlyCosts
	);

	const maxCost = $derived(Math.max(...costData.map((c) => c.costUsd), 0.001));
	const maxTaskCost = $derived(Math.max(...taskCosts.map((t) => t.costUsd), 0.001));

	const taskColors: Record<string, string> = {
		lesson_generation: 'bg-indigo-500',
		conversation: 'bg-emerald-500',
		grammar_evaluation: 'bg-amber-500',
		quiz: 'bg-rose-500',
		review: 'bg-cyan-500',
		tts: 'bg-purple-500',
		stt: 'bg-pink-500',
		pronunciation: 'bg-teal-500'
	};

	$effect(() => {
		loadCharts();
	});

	async function loadCharts() {
		try {
			const res = await fetch('/admin/api/costs?all=true');
			if (!res.ok) throw new Error('Failed to load cost data');
			const json = (await res.json()) as {
				dailyCosts: CostEntry[];
				weeklyCosts: CostEntry[];
				monthlyCosts: CostEntry[];
				taskCosts: TaskCost[];
			};
			dailyCosts = json.dailyCosts;
			weeklyCosts = json.weeklyCosts;
			monthlyCosts = json.monthlyCosts;
			taskCosts = json.taskCosts;
		} catch (e) {
			showToast('Failed to load cost charts', 'error');
			console.error('Chart load error:', e);
		} finally {
			chartsLoading = false;
		}
	}

	function formatUsd(n: number): string {
		if (n === 0) return '$0.00';
		if (n < 0.01) return `$${n.toFixed(6)}`;
		if (n < 1) return `$${n.toFixed(4)}`;
		return `$${n.toFixed(2)}`;
	}

	function formatDate(iso: string, period: PeriodKey): string {
		const d = new Date(iso);
		if (period === 'month') return d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
		if (period === 'week')
			return `Wk ${d.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`;
		return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
	}

	function langLabel(pair: string): string {
		const map: Record<string, string> = {
			'zh/hi': '🇨🇳 zh → 🇮🇳 hi',
			'te/th': '🇮🇳 te → 🇹🇭 th'
		};
		return map[pair] ?? pair;
	}
</script>

<div class="space-y-8">
	<div>
		<h2 class="text-2xl font-bold text-white">Dashboard</h2>
		<p class="mt-1 text-sm text-gray-500">AI usage and cost overview</p>
	</div>

	<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
		<div class="rounded-xl border border-gray-800 bg-gray-900 p-5">
			<p class="text-xs font-medium uppercase tracking-wide text-gray-500">Learners</p>
			<p class="mt-2 text-3xl font-bold text-white">{data.learnerCount}</p>
			<div class="mt-2 space-y-1">
				{#each data.languagePairs as lp}
					<p class="text-xs text-gray-400">{langLabel(lp.pair)}: {lp.count}</p>
				{/each}
			</div>
		</div>

		<div class="rounded-xl border border-gray-800 bg-gray-900 p-5">
			<p class="text-xs font-medium uppercase tracking-wide text-gray-500">Total AI Cost</p>
			<p class="mt-2 text-3xl font-bold text-indigo-400">{formatUsd(data.stats.totalCost)}</p>
			<p class="mt-2 text-xs text-gray-400">{data.stats.totalTokens.toLocaleString()} tokens</p>
		</div>

		<div class="rounded-xl border border-gray-800 bg-gray-900 p-5">
			<p class="text-xs font-medium uppercase tracking-wide text-gray-500">Cost Today</p>
			<p class="mt-2 text-3xl font-bold text-amber-400">{formatUsd(data.stats.costToday)}</p>
		</div>

		<div class="rounded-xl border border-gray-800 bg-gray-900 p-5">
			<p class="text-xs font-medium uppercase tracking-wide text-gray-500">API Calls</p>
			<p class="mt-2 text-3xl font-bold text-white">{data.stats.totalCalls.toLocaleString()}</p>
			<p class="mt-2 text-xs text-gray-400">{data.stats.totalTokens.toLocaleString()} tokens</p>
		</div>
	</div>

	<div class="rounded-xl border border-gray-800 bg-gray-900 p-6">
		<div class="mb-4 flex items-center justify-between">
			<h3 class="text-sm font-semibold text-white">Cost Over Time</h3>
			<div class="flex rounded-lg border border-gray-700 bg-gray-800">
				{#each ['day', 'week', 'month'] as const as period}
					<button
						onclick={() => (activePeriod = period)}
						class="px-3 py-1.5 text-xs font-medium transition-colors {activePeriod === period
							? 'bg-indigo-600 text-white'
							: 'text-gray-400 hover:text-gray-200'}"
						class:rounded-l-lg={period === 'day'}
						class:rounded-r-lg={period === 'month'}
					>
						{periodLabels[period]}
					</button>
				{/each}
			</div>
		</div>

		{#if chartsLoading}
			<div class="flex items-center justify-center py-8">
				<span class="text-sm text-gray-500">Loading charts…</span>
			</div>
		{:else if costData.length === 0}
			<p class="py-8 text-center text-sm text-gray-500">No cost data yet</p>
		{:else}
			<div class="space-y-2">
				{#each [...costData].reverse() as entry (entry.period)}
					<div class="flex items-center gap-3">
						<span class="w-24 shrink-0 text-right text-xs text-gray-400">
							{formatDate(entry.period, activePeriod)}
						</span>
						<div class="flex-1">
							<div
								class="h-6 rounded bg-indigo-600/80 transition-all duration-300"
								style="width: {Math.max((entry.costUsd / maxCost) * 100, 1)}%"
							></div>
						</div>
						<span class="w-20 shrink-0 text-right text-xs font-mono text-gray-300">
							{formatUsd(entry.costUsd)}
						</span>
						<span class="w-16 shrink-0 text-right text-xs text-gray-500">
							{entry.callCount} calls
						</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div class="rounded-xl border border-gray-800 bg-gray-900 p-6">
		<h3 class="mb-4 text-sm font-semibold text-white">Cost by Task</h3>
		{#if chartsLoading}
			<div class="flex items-center justify-center py-8">
				<span class="text-sm text-gray-500">Loading…</span>
			</div>
		{:else if taskCosts.length === 0}
			<p class="py-8 text-center text-sm text-gray-500">No task data yet</p>
		{:else}
			<div class="space-y-3">
				{#each taskCosts as task (task.task)}
					<div class="flex items-center gap-3">
						<span class="w-36 shrink-0 text-right text-xs text-gray-400">
							{task.task.replace(/_/g, ' ')}
						</span>
						<div class="flex-1">
							<div
								class="h-6 rounded transition-all duration-300 {taskColors[task.task] ??
									'bg-gray-600'}"
								style="width: {Math.max((task.costUsd / maxTaskCost) * 100, 1)}%; opacity: 0.8"
							></div>
						</div>
						<span class="w-20 shrink-0 text-right text-xs font-mono text-gray-300">
							{formatUsd(task.costUsd)}
						</span>
						<span class="w-16 shrink-0 text-right text-xs text-gray-500">
							{task.callCount} calls
						</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
