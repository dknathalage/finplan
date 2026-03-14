<script lang="ts">
	import { repositories } from '$lib/repositories/index.js';
	import {
		calculateCashFlow,
		projectCashFlow,
		calculateRunway
	} from '$lib/calc/projections.js';
	import type { Scenario } from '$lib/repositories/types.js';

	// ── Data loading ─────────────────────────────────────────────────────────────
	const scenarios = $derived(repositories.scenarios.getAll());

	// ── Controls ─────────────────────────────────────────────────────────────────
	let selectedIds = $state<string[]>([]);
	let timeRange = $state(36);

	// Initialise: select baseline by default
	$effect(() => {
		if (scenarios.length > 0 && selectedIds.length === 0) {
			const baseline = scenarios.find((s) => s.is_baseline);
			if (baseline) selectedIds = [baseline.id];
			else selectedIds = [scenarios[0].id];
		}
	});

	function toggleScenario(id: string) {
		if (selectedIds.includes(id)) {
			selectedIds = selectedIds.filter((x) => x !== id);
		} else if (selectedIds.length < 2) {
			selectedIds = [...selectedIds, id];
		}
	}

	// ── Projection data ───────────────────────────────────────────────────────────
	interface ScenarioProjection {
		scenario: Scenario;
		cashFlow: ReturnType<typeof calculateCashFlow>;
		projection: ReturnType<typeof projectCashFlow>;
		runway: number;
		color: string;
	}

	const COLORS = ['#16a34a', '#2563eb', '#d97706', '#dc2626'];

	const projections = $derived<ScenarioProjection[]>(
		selectedIds.map((id, idx) => {
			const scenario = scenarios.find((s) => s.id === id)!;
			if (!scenario) return null as unknown as ScenarioProjection;
			const income = repositories.income.getByScenario(id);
			const expenses = repositories.expenses.getByScenario(id);
			const cashFlow = calculateCashFlow(income, expenses);
			const projection = projectCashFlow(0, cashFlow.monthlySurplus, timeRange);
			const runway = calculateRunway(0, cashFlow.monthlySurplus);
			return { scenario, cashFlow, projection, runway, color: COLORS[idx % COLORS.length] };
		}).filter(Boolean)
	);

	// ── SVG chart math ────────────────────────────────────────────────────────────
	const SVG_W = 800;
	const SVG_H = 300;
	const PAD = { top: 20, right: 30, bottom: 40, left: 80 };
	const chartW = SVG_W - PAD.left - PAD.right;
	const chartH = SVG_H - PAD.top - PAD.bottom;

	const allValues = $derived(
		projections.flatMap((p) => p.projection.map((pt) => pt.cashPosition))
	);
	const yMin = $derived(Math.min(0, ...(allValues.length ? allValues : [0])));
	const yMax = $derived(Math.max(0, ...(allValues.length ? allValues : [0])));
	const yRange = $derived(yMax - yMin || 1);

	function xScale(month: number) {
		return PAD.left + (month / timeRange) * chartW;
	}
	function yScale(value: number) {
		return PAD.top + chartH - ((value - yMin) / yRange) * chartH;
	}

	// Y-axis grid lines
	const gridLines = $derived((() => {
		const lines: number[] = [];
		const rawStep = yRange / 5;
		const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(rawStep) || 1)));
		const step = Math.ceil(rawStep / magnitude) * magnitude || magnitude;
		const start = Math.ceil(yMin / step) * step;
		for (let v = start; v <= yMax + step * 0.01; v += step) {
			lines.push(Math.round(v));
		}
		return lines;
	})());

	// Line path for each scenario
	function makePath(proj: ScenarioProjection['projection']) {
		if (!proj.length) return '';
		const pts = [{ month: 0, cashPosition: 0 }, ...proj];
		return pts
			.map((pt, i) => `${i === 0 ? 'M' : 'L'}${xScale(pt.month).toFixed(1)},${yScale(pt.cashPosition).toFixed(1)}`)
			.join(' ');
	}

	// Find zero-crossing month
	function zeroCrossing(proj: ScenarioProjection['projection']): number | null {
		for (let i = 1; i < proj.length; i++) {
			const prev = i === 1 ? 0 : proj[i - 2].cashPosition;
			const curr = proj[i - 1].cashPosition;
			if ((prev >= 0 && curr < 0) || (prev <= 0 && curr > 0)) return proj[i - 1].month;
		}
		return null;
	}

	// ── Formatting ────────────────────────────────────────────────────────────────
	function fmt(n: number) {
		if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
		if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
		return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
	}
	function fmtFull(n: number) {
		return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
	}
</script>

<div class="space-y-8">
	<div>
		<h1 class="text-2xl font-bold text-gray-900">📈 Cash Flow Projections</h1>
		<p class="text-gray-500 text-sm mt-1">Visualise cumulative cash position over time across scenarios.</p>
	</div>

	<!-- Controls -->
	<div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-wrap gap-6 items-start">
		<div>
			<p class="block text-sm font-medium text-gray-700 mb-2">Scenarios (select up to 2)</p>
			{#if scenarios.length === 0}
				<p class="text-gray-400 text-sm">No scenarios found. Add scenarios first.</p>
			{:else}
				<div class="flex flex-wrap gap-2">
					{#each scenarios as s}
						<button
							type="button"
							onclick={() => toggleScenario(s.id)}
							class="px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors {selectedIds.includes(s.id)
								? 'bg-primary-600 text-white border-primary-600'
								: 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'} {!selectedIds.includes(s.id) && selectedIds.length >= 2 ? 'opacity-40 cursor-not-allowed' : ''}"
						>
							{s.name}{s.is_baseline ? ' (baseline)' : ''}
						</button>
					{/each}
				</div>
			{/if}
		</div>
		<div>
			<p class="block text-sm font-medium text-gray-700 mb-2">Time Range</p>
			<div class="flex gap-2">
				{#each [12, 36, 60] as m}
					<button
						type="button"
						onclick={() => (timeRange = m)}
						class="px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors {timeRange === m
							? 'bg-primary-600 text-white border-primary-600'
							: 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'}"
					>
						{m} months
					</button>
				{/each}
			</div>
		</div>
	</div>

	<!-- SVG Chart -->
	<div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
		<h2 class="text-base font-semibold text-gray-700 mb-4">Cumulative Cash Position</h2>

		{#if projections.length === 0}
			<div class="flex items-center justify-center h-48 text-gray-400">
				Select at least one scenario to view projections.
			</div>
		{:else}
			<svg
				viewBox="0 0 {SVG_W} {SVG_H}"
				width="100%"
				aria-label="Cash flow projection chart"
				class="overflow-visible"
			>
				<!-- Grid lines -->
				{#each gridLines as v}
					<line
						x1={PAD.left}
						y1={yScale(v)}
						x2={PAD.left + chartW}
						y2={yScale(v)}
						stroke="#e5e7eb"
						stroke-width="1"
					/>
					<text
						x={PAD.left - 6}
						y={yScale(v)}
						text-anchor="end"
						dominant-baseline="middle"
						font-size="11"
						fill="#9ca3af"
					>
						{fmt(v)}
					</text>
				{/each}

				<!-- Zero line (dashed) -->
				{#if yMin < 0 && yMax > 0}
					<line
						x1={PAD.left}
						y1={yScale(0)}
						x2={PAD.left + chartW}
						y2={yScale(0)}
						stroke="#6b7280"
						stroke-width="1.5"
						stroke-dasharray="6,4"
					/>
				{/if}

				<!-- X-axis labels -->
				{#each Array.from({ length: timeRange / 12 + 1 }, (_, i) => i * 12) as m}
					<text
						x={xScale(m)}
						y={SVG_H - PAD.bottom + 16}
						text-anchor="middle"
						font-size="11"
						fill="#9ca3af"
					>
						{m === 0 ? 'Now' : `Mo ${m}`}
					</text>
				{/each}

				<!-- Axes -->
				<line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + chartH} stroke="#d1d5db" stroke-width="1" />
				<line x1={PAD.left} y1={PAD.top + chartH} x2={PAD.left + chartW} y2={PAD.top + chartH} stroke="#d1d5db" stroke-width="1" />

				<!-- Lines per scenario -->
				{#each projections as proj}
					<path
						d={makePath(proj.projection)}
						fill="none"
						stroke={proj.color}
						stroke-width="2.5"
						stroke-linejoin="round"
					/>

					<!-- Zero-crossing marker -->
					{#if zeroCrossing(proj.projection) !== null}
						{@const crossMonth = zeroCrossing(proj.projection)!}
						<circle cx={xScale(crossMonth)} cy={yScale(0)} r="5" fill={proj.color} />
						<text
							x={xScale(crossMonth)}
							y={yScale(0) - 10}
							text-anchor="middle"
							font-size="10"
							fill={proj.color}
							font-weight="bold"
						>
							Runway ends: Mo {crossMonth}
						</text>
					{/if}

					<!-- Scenario label at end of line -->
					{#if proj.projection.length > 0}
						{@const last = proj.projection[proj.projection.length - 1]}
						<text
							x={xScale(last.month) + 4}
							y={yScale(last.cashPosition)}
							font-size="10"
							fill={proj.color}
							dominant-baseline="middle"
							font-weight="600"
						>
							{proj.scenario.name}
						</text>
					{/if}
				{/each}
			</svg>

			<!-- Legend -->
			<div class="flex gap-6 mt-2">
				{#each projections as proj}
					<div class="flex items-center gap-2 text-sm">
						<div class="w-6 h-0.5 rounded" style="background:{proj.color}"></div>
						<span class="text-gray-600">{proj.scenario.name}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Summary cards -->
	{#if projections.length > 0}
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			{#each projections as proj}
				{@const endPos = proj.projection.length ? proj.projection[proj.projection.length - 1].cashPosition : 0}
				{@const totalSurplus = proj.cashFlow.monthlySurplus > 0 ? proj.cashFlow.monthlySurplus * timeRange : 0}
				{@const totalDeficit = proj.cashFlow.monthlySurplus < 0 ? Math.abs(proj.cashFlow.monthlySurplus) * timeRange : 0}
				<div class="bg-white rounded-xl border-2 shadow-sm p-5" style="border-color:{proj.color}20">
					<div class="flex items-center gap-2 mb-3">
						<div class="w-3 h-3 rounded-full" style="background:{proj.color}"></div>
						<h3 class="font-semibold text-gray-800">{proj.scenario.name}</h3>
						{#if proj.scenario.is_baseline}
							<span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">baseline</span>
						{/if}
					</div>
					<dl class="space-y-1.5 text-sm">
						<div class="flex justify-between">
							<dt class="text-gray-500">Monthly Surplus</dt>
							<dd class="font-medium {proj.cashFlow.monthlySurplus >= 0 ? 'text-primary-600' : 'text-red-600'}">
								{fmtFull(proj.cashFlow.monthlySurplus)}/mo
							</dd>
						</div>
						<div class="flex justify-between">
							<dt class="text-gray-500">Position at {timeRange} months</dt>
							<dd class="font-bold {endPos >= 0 ? 'text-primary-600' : 'text-red-600'}">{fmtFull(endPos)}</dd>
						</div>
						{#if totalSurplus > 0}
							<div class="flex justify-between">
								<dt class="text-gray-500">Total saved (period)</dt>
								<dd class="text-primary-700 font-medium">{fmtFull(totalSurplus)}</dd>
							</div>
						{/if}
						{#if totalDeficit > 0}
							<div class="flex justify-between">
								<dt class="text-gray-500">Total deficit (period)</dt>
								<dd class="text-red-600 font-medium">{fmtFull(totalDeficit)}</dd>
							</div>
						{/if}
						{#if proj.cashFlow.monthlySurplus < 0}
							<div class="flex justify-between">
								<dt class="text-gray-500">Cash runway</dt>
								<dd class="text-amber-600 font-medium">
									{proj.runway === Infinity ? '∞' : `${proj.runway} months`}
								</dd>
							</div>
						{/if}
					</dl>
				</div>
			{/each}
		</div>
	{/if}
</div>
