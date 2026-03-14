<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { repositories } from '$lib/repositories';
	import { calculateNetWorth, calculateCashFlow, calculateRunway } from '$lib/calc/projections';
	import type { Scenario } from '$lib/repositories';

	let scenarios = $state<Scenario[]>([]);
	let activeScenarioId = $state('');

	let netWorth = $state({ totalAssets: 0, totalLiabilities: 0, netWorth: 0 });
	let cashFlow = $state({ monthlyIncome: 0, monthlyExpenses: 0, monthlySurplus: 0 });
	let runway = $state<number>(Infinity);

	function fmt(n: number) {
		const abs = Math.abs(n);
		const sign = n < 0 ? '-' : '';
		if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
		if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
		return `${sign}$${abs.toFixed(0)}`;
	}

	function loadData() {
		const assets = repositories.assets.getAll();
		const liabilities = repositories.liabilities.getAll();
		netWorth = calculateNetWorth(assets, liabilities);

		if (activeScenarioId) {
			const income = repositories.income.getByScenario(activeScenarioId);
			const expenses = repositories.expenses.getByScenario(activeScenarioId);
			cashFlow = calculateCashFlow(income, expenses);
			const cashAssets = assets.filter((a) => a.type === 'cash').reduce((s, a) => s + a.value, 0);
			runway = calculateRunway(cashAssets, cashFlow.monthlySurplus);
		}
	}

	onMount(() => {
		scenarios = repositories.scenarios.getAll();
		const baseline = repositories.scenarios.getBaseline();
		activeScenarioId = baseline?.id ?? scenarios[0]?.id ?? '';
		loadData();
	});

	function onScenarioChange(e: Event) {
		activeScenarioId = (e.target as HTMLSelectElement).value;
		loadData();
	}
</script>

<svelte:head><title>Dashboard — FinPlan</title></svelte:head>

<div class="p-6 lg:p-8">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>

		{#if scenarios.length > 0}
			<div class="flex items-center gap-2">
				<label for="scenario-select" class="text-sm text-gray-500">Scenario:</label>
				<select
					id="scenario-select"
					value={activeScenarioId}
					onchange={onScenarioChange}
					class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
				>
					{#each scenarios as s}
						<option value={s.id}>{s.name}{s.is_baseline ? ' (baseline)' : ''}</option>
					{/each}
				</select>
			</div>
		{/if}
	</div>

	<!-- Summary cards -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
		<!-- Net Worth card -->
		<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<p class="text-sm font-medium text-gray-500">Net Worth</p>
			<p class="mt-2 text-4xl font-bold {netWorth.netWorth >= 0 ? 'text-primary-600' : 'text-red-600'}">
				{fmt(netWorth.netWorth)}
			</p>
			<div class="mt-3 flex gap-4 text-sm text-gray-500">
				<span>Assets: <span class="font-medium text-gray-700">{fmt(netWorth.totalAssets)}</span></span>
				<span>Liabilities: <span class="font-medium text-gray-700">{fmt(netWorth.totalLiabilities)}</span></span>
			</div>
		</div>

		<!-- Monthly Cash Flow card -->
		<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<p class="text-sm font-medium text-gray-500">Monthly Cash Flow</p>
			{#if activeScenarioId}
				<p class="mt-2 text-4xl font-bold {cashFlow.monthlySurplus >= 0 ? 'text-primary-600' : 'text-red-600'}">
					{cashFlow.monthlySurplus >= 0 ? 'Surplus' : 'Deficit'}: {fmt(Math.abs(cashFlow.monthlySurplus))}/mo
				</p>
				<div class="mt-3 flex gap-4 text-sm text-gray-500">
					<span>Income: <span class="font-medium text-gray-700">{fmt(cashFlow.monthlyIncome)}</span></span>
					<span>Expenses: <span class="font-medium text-gray-700">{fmt(cashFlow.monthlyExpenses)}</span></span>
				</div>
			{:else}
				<p class="mt-2 text-sm text-gray-400">No scenario selected</p>
			{/if}
		</div>

		<!-- Runway card -->
		<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<p class="text-sm font-medium text-gray-500">Runway</p>
			{#if activeScenarioId}
				{#if cashFlow.monthlySurplus >= 0}
					<p class="mt-2 text-2xl font-bold text-primary-600">
						Saving {fmt(cashFlow.monthlySurplus)}/mo
					</p>
					<p class="mt-1 text-sm text-gray-500">On track 🎯</p>
				{:else if runway === 0}
					<p class="mt-2 text-2xl font-bold text-red-600">Empty now</p>
				{:else}
					<p class="mt-2 text-4xl font-bold text-amber-600">{runway} mo</p>
					<p class="mt-1 text-sm text-gray-500">until cash is empty</p>
				{/if}
			{:else}
				<p class="mt-2 text-sm text-gray-400">No scenario selected</p>
			{/if}
		</div>
	</div>

	<!-- Quick actions -->
	<div class="mt-8">
		<h2 class="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">Quick Actions</h2>
		<div class="flex flex-wrap gap-3">
			<button
				onclick={() => goto(`${base}/console/property`)}
				class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 active:bg-gray-100"
			>
				🏠 Add Property
			</button>
			<button
				onclick={() => goto(`${base}/console/vehicle`)}
				class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 active:bg-gray-100"
			>
				🚗 Add Vehicle
			</button>
			<button
				onclick={() => goto(`${base}/console/projections`)}
				class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 active:bg-gray-100"
			>
				📈 View Projections
			</button>
			<button
				onclick={() => goto(`${base}/console/scenarios`)}
				class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 active:bg-primary-800"
			>
				🔄 Manage Scenarios
			</button>
		</div>
	</div>

	{#if scenarios.length === 0}
		<div class="mt-10 rounded-2xl border border-dashed border-gray-300 p-10 text-center">
			<p class="text-4xl">🔄</p>
			<p class="mt-3 text-lg font-medium text-gray-700">No scenarios yet</p>
			<p class="mt-1 text-sm text-gray-500">Create a scenario to start tracking your cash flow</p>
			<button
				onclick={() => goto(`${base}/console/scenarios`)}
				class="mt-4 rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700"
			>
				Create Scenario
			</button>
		</div>
	{/if}
</div>
