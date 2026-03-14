<script lang="ts">
	import { repositories } from '$lib/repositories/index.js';
	import { calculateCashFlow, calculateNetWorth, monthlyAmount } from '$lib/calc/projections.js';
	import type { Scenario } from '$lib/repositories/types.js';

	// ── Data ──────────────────────────────────────────────────────────────────────
	const scenarios = $derived(repositories.scenarios.getAll());
	let activeId: string = $state('');

	$effect(() => {
		if (scenarios.length > 0 && !activeId) {
			const baseline = scenarios.find((s) => s.is_baseline);
			activeId = baseline?.id ?? scenarios[0].id;
		}
	});

	const activeScenario: Scenario | null = $derived(scenarios.find((s) => s.id === activeId) ?? null);

	// Per-scenario computed data
	interface ScenarioData {
		scenario: Scenario;
		cashFlow: ReturnType<typeof calculateCashFlow>;
		monthlyDebt: number;
		annualSavings: number;
		income: ReturnType<typeof repositories.income.getByScenario>;
		expenses: ReturnType<typeof repositories.expenses.getByScenario>;
	}

	const allData: ScenarioData[] = $derived(
		scenarios.map((s) => {
			const income = repositories.income.getByScenario(s.id);
			const expenses = repositories.expenses.getByScenario(s.id);
			const cashFlow = calculateCashFlow(income, expenses);
			const liabilities = repositories.liabilities.getAll();
			const monthlyDebt = liabilities.reduce((sum, l) => sum + l.monthly_payment, 0);
			const annualSavings = cashFlow.monthlySurplus * 12;
			return { scenario: s, cashFlow, monthlyDebt, annualSavings, income, expenses };
		})
	);

	const activeData: ScenarioData | null = $derived(allData.find((d) => d.scenario.id === activeId) ?? null);

	// Net worth
	const allAssets = $derived(repositories.assets.getAll());
	const allLiabilities = $derived(repositories.liabilities.getAll());
	const nw = $derived(calculateNetWorth(allAssets, allLiabilities));

	// ── Helpers ──────────────────────────────────────────────────────────────────
	function fmt(n: number) {
		return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
	}

	interface CompareRow {
		label: string;
		higher: boolean;
		getValue: (d: ScenarioData) => number;
	}

	const compareRows: CompareRow[] = [
		{ label: 'Monthly Income', higher: true, getValue: (d) => d.cashFlow.monthlyIncome },
		{ label: 'Monthly Expenses', higher: false, getValue: (d) => d.cashFlow.monthlyExpenses },
		{ label: 'Surplus / Deficit', higher: true, getValue: (d) => d.cashFlow.monthlySurplus },
		{ label: 'Annual Savings', higher: true, getValue: (d) => d.annualSavings },
		{ label: 'Monthly Debt Service', higher: false, getValue: (d) => d.monthlyDebt }
	];

	function bestScenarioIndex(row: CompareRow): number {
		if (allData.length === 0) return -1;
		let best = 0;
		for (let i = 1; i < allData.length; i++) {
			const a = row.getValue(allData[i]);
			const b = row.getValue(allData[best]);
			if (row.higher ? a > b : a < b) best = i;
		}
		return best;
	}

	// ── SVG Bar Chart ─────────────────────────────────────────────────────────────
	const BAR_H = 28;
	const BAR_GAP = 6;
	const BAR_PAD = { left: 160, right: 60, top: 10, bottom: 10 };

	interface BarItem {
		label: string;
		value: number;
		pct: number;
	}

	function makeIncomeItems(data: ScenarioData | null): BarItem[] {
		if (!data) return [];
		const total = data.cashFlow.monthlyIncome || 1;
		return data.income
			.filter((i) => i.is_active)
			.map((i) => ({
				label: i.name,
				value: monthlyAmount(i.amount, i.frequency),
				pct: (monthlyAmount(i.amount, i.frequency) / total) * 100
			}))
			.sort((a, b) => b.value - a.value);
	}

	function makeExpenseItems(data: ScenarioData | null): BarItem[] {
		if (!data) return [];
		const total = data.cashFlow.monthlyExpenses || 1;
		return data.expenses
			.map((e) => ({
				label: e.name,
				value: monthlyAmount(e.amount, e.frequency),
				pct: (monthlyAmount(e.amount, e.frequency) / total) * 100
			}))
			.sort((a, b) => b.value - a.value);
	}

	const incomeItems: BarItem[] = $derived(makeIncomeItems(activeData));
	const expenseItems: BarItem[] = $derived(makeExpenseItems(activeData));

	function svgHeight(items: BarItem[]) {
		return BAR_PAD.top + BAR_PAD.bottom + Math.max(1, items.length) * (BAR_H + BAR_GAP);
	}

	function barWidth(pct: number) {
		return Math.max(2, (pct / 100) * 480);
	}

	// Asset/Liability breakdown
	interface StackItem { label: string; value: number; color: string; }
	const ASSET_COLORS: Record<string, string> = {
		property: '#16a34a', vehicle: '#2563eb', cash: '#d97706',
		shares: '#7c3aed', super: '#0891b2', other: '#9ca3af'
	};
	const LIAB_COLORS: Record<string, string> = {
		mortgage: '#dc2626', personal_loan: '#ea580c', car_loan: '#d97706',
		credit_card: '#9333ea', student_loan: '#2563eb', other: '#6b7280'
	};

	const assetStack: StackItem[] = $derived(
		allAssets.map((a) => ({ label: `${a.name} (${a.type})`, value: a.value, color: ASSET_COLORS[a.type] ?? '#9ca3af' }))
	);
	const liabStack: StackItem[] = $derived(
		allLiabilities.map((l) => ({ label: `${l.name} (${l.type})`, value: l.balance, color: LIAB_COLORS[l.type] ?? '#6b7280' }))
	);
</script>

<div class="space-y-8">
	<div>
		<h1 class="text-2xl font-bold text-gray-900">📊 Reports</h1>
		<p class="text-gray-500 text-sm mt-1">Scenario comparison, income/expense breakdown, and net worth composition.</p>
	</div>

	<!-- ── Scenario selector ── -->
	{#if scenarios.length > 0}
		<div class="flex gap-2 flex-wrap">
			{#each scenarios as s}
				<button
					type="button"
					onclick={() => (activeId = s.id)}
					class="px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors {activeId === s.id
						? 'bg-primary-600 text-white border-primary-600'
						: 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'}"
				>
					{s.name}{s.is_baseline ? ' (baseline)' : ''}
				</button>
			{/each}
		</div>
	{:else}
		<div class="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700 text-sm">
			No scenarios yet. Add scenarios and data to see reports.
		</div>
	{/if}

	<!-- ── Scenario Comparison Table ── -->
	{#if allData.length > 0}
		<div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 overflow-x-auto">
			<h2 class="text-lg font-semibold text-gray-800 mb-4">Scenario Comparison</h2>
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-gray-100">
						<th class="pb-2 pr-6 text-left font-medium text-gray-500">Metric</th>
						{#each allData as d}
							<th class="pb-2 px-4 text-right font-medium text-gray-700">
								{d.scenario.name}
								{#if d.scenario.is_baseline}
									<span class="block text-xs text-gray-400 font-normal">baseline</span>
								{/if}
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each compareRows as row, ri}
						{@const bestIdx = bestScenarioIndex(row)}
						<tr class="border-b border-gray-50 hover:bg-gray-50 {ri % 2 === 0 ? '' : 'bg-gray-50/50'}">
							<td class="py-2 pr-6 font-medium text-gray-600">{row.label}</td>
							{#each allData as d, di}
								{@const val = row.getValue(d)}
								<td class="py-2 px-4 text-right font-medium {di === bestIdx && allData.length > 1 ? 'bg-primary-50 text-primary-700 rounded' : 'text-gray-700'}">
									{fmt(val)}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<!-- ── Income Breakdown ── -->
	{#if activeData && incomeItems.length > 0}
		<div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
			<h2 class="text-lg font-semibold text-gray-800 mb-1">Income Breakdown</h2>
			<p class="text-sm text-gray-400 mb-4">{activeScenario?.name} — monthly</p>

			<svg
				viewBox="0 0 700 {svgHeight(incomeItems)}"
				width="100%"
				aria-label="Income breakdown chart"
			>
				{#each incomeItems as item, i}
					{@const y = BAR_PAD.top + i * (BAR_H + BAR_GAP)}
					{@const bw = barWidth(item.pct)}
					<text x={BAR_PAD.left - 8} y={y + BAR_H / 2} text-anchor="end" dominant-baseline="middle" font-size="12" fill="#4b5563">
						{item.label.length > 22 ? item.label.slice(0, 21) + '…' : item.label}
					</text>
					<rect x={BAR_PAD.left} y={y} width={bw} height={BAR_H} rx="4" fill="#16a34a" opacity="0.85" />
					<text x={BAR_PAD.left + bw + 8} y={y + BAR_H / 2} dominant-baseline="middle" font-size="11" fill="#374151">
						{fmt(item.value)} ({item.pct.toFixed(1)}%)
					</text>
				{/each}
			</svg>
		</div>
	{/if}

	<!-- ── Expense Breakdown ── -->
	{#if activeData && expenseItems.length > 0}
		<div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
			<h2 class="text-lg font-semibold text-gray-800 mb-1">Expense Breakdown</h2>
			<p class="text-sm text-gray-400 mb-4">{activeScenario?.name} — monthly</p>

			<svg
				viewBox="0 0 700 {svgHeight(expenseItems)}"
				width="100%"
				aria-label="Expense breakdown chart"
			>
				{#each expenseItems as item, i}
					{@const y = BAR_PAD.top + i * (BAR_H + BAR_GAP)}
					{@const bw = barWidth(item.pct)}
					<text x={BAR_PAD.left - 8} y={y + BAR_H / 2} text-anchor="end" dominant-baseline="middle" font-size="12" fill="#4b5563">
						{item.label.length > 22 ? item.label.slice(0, 21) + '…' : item.label}
					</text>
					<rect x={BAR_PAD.left} y={y} width={bw} height={BAR_H} rx="4" fill="#dc2626" opacity="0.75" />
					<text x={BAR_PAD.left + bw + 8} y={y + BAR_H / 2} dominant-baseline="middle" font-size="11" fill="#374151">
						{fmt(item.value)} ({item.pct.toFixed(1)}%)
					</text>
				{/each}
			</svg>
		</div>
	{/if}

	<!-- ── Net Worth Composition ── -->
	<div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
		<h2 class="text-lg font-semibold text-gray-800 mb-4">Net Worth Composition</h2>

		<div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
			<div class="text-center p-4 bg-primary-50 rounded-lg">
				<div class="text-sm text-gray-500 mb-1">Total Assets</div>
				<div class="text-xl font-bold text-primary-700">{fmt(nw.totalAssets)}</div>
			</div>
			<div class="text-center p-4 bg-red-50 rounded-lg">
				<div class="text-sm text-gray-500 mb-1">Total Liabilities</div>
				<div class="text-xl font-bold text-red-600">{fmt(nw.totalLiabilities)}</div>
			</div>
			<div class="text-center p-4 {nw.netWorth >= 0 ? 'bg-primary-100' : 'bg-red-100'} rounded-lg">
				<div class="text-sm text-gray-500 mb-1">Net Worth</div>
				<div class="text-xl font-bold {nw.netWorth >= 0 ? 'text-primary-800' : 'text-red-700'}">{fmt(nw.netWorth)}</div>
			</div>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
			<!-- Assets -->
			<div>
				<h3 class="text-sm font-semibold text-gray-600 mb-3">Assets</h3>
				{#if assetStack.length === 0}
					<p class="text-gray-400 text-sm">No assets recorded.</p>
				{:else}
					<div class="space-y-2">
						{#each assetStack as item}
							{@const pct = nw.totalAssets > 0 ? (item.value / nw.totalAssets) * 100 : 0}
							<div class="flex items-center gap-2 text-sm">
								<div class="w-3 h-3 rounded-sm flex-shrink-0" style="background:{item.color}"></div>
								<span class="text-gray-600 flex-1 truncate">{item.label}</span>
								<span class="font-medium text-gray-700">{fmt(item.value)}</span>
								<span class="text-gray-400 w-12 text-right">{pct.toFixed(1)}%</span>
							</div>
							<div class="h-2 bg-gray-100 rounded-full overflow-hidden">
								<div class="h-full rounded-full" style="width:{pct}%;background:{item.color};opacity:0.8"></div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Liabilities -->
			<div>
				<h3 class="text-sm font-semibold text-gray-600 mb-3">Liabilities</h3>
				{#if liabStack.length === 0}
					<p class="text-gray-400 text-sm">No liabilities recorded.</p>
				{:else}
					<div class="space-y-2">
						{#each liabStack as item}
							{@const pct = nw.totalLiabilities > 0 ? (item.value / nw.totalLiabilities) * 100 : 0}
							<div class="flex items-center gap-2 text-sm">
								<div class="w-3 h-3 rounded-sm flex-shrink-0" style="background:{item.color}"></div>
								<span class="text-gray-600 flex-1 truncate">{item.label}</span>
								<span class="font-medium text-gray-700">{fmt(item.value)}</span>
								<span class="text-gray-400 w-12 text-right">{pct.toFixed(1)}%</span>
							</div>
							<div class="h-2 bg-gray-100 rounded-full overflow-hidden">
								<div class="h-full rounded-full" style="width:{pct}%;background:{item.color};opacity:0.8"></div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
