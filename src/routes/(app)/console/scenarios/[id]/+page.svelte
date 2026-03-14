<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { repositories } from '$lib/repositories';
	import { calculateCashFlow, monthlyAmount } from '$lib/calc/projections';
	import type { Scenario, IncomeSource, Expense, Frequency, IncomeType, ExpenseCategory } from '$lib/repositories';

	const FREQUENCIES: Frequency[] = ['weekly', 'fortnightly', 'monthly', 'annually'];
	const INCOME_TYPES: IncomeType[] = ['salary', 'rental', 'business', 'investment', 'other'];
	const EXPENSE_CATS: ExpenseCategory[] = [
		'housing', 'transport', 'food', 'utilities', 'insurance',
		'subscriptions', 'childcare', 'education', 'health', 'entertainment',
		'savings', 'debt', 'other'
	];

	const scenarioId = $derived($page.params.id ?? '');

	let scenario = $state<Scenario | null>(null);
	let incomes = $state<IncomeSource[]>([]);
	let expenses = $state<Expense[]>([]);
	let nameEdit = $state('');
	let descEdit = $state('');
	let saving = $state(false);

	// New income row
	let newIncome = $state({ name: '', amount: '', frequency: 'monthly' as Frequency, type: 'salary' as IncomeType });
	let addingIncome = $state(false);

	// Edit income
	let editIncomeId = $state<string | null>(null);
	let editIncome = $state({ name: '', amount: '', frequency: 'monthly' as Frequency, type: 'salary' as IncomeType });

	// New expense row
	let newExpense = $state({ name: '', amount: '', frequency: 'monthly' as Frequency, category: 'other' as ExpenseCategory, is_fixed: false });
	let addingExpense = $state(false);

	// Edit expense
	let editExpenseId = $state<string | null>(null);
	let editExpense = $state({ name: '', amount: '', frequency: 'monthly' as Frequency, category: 'other' as ExpenseCategory, is_fixed: false });

	let cashFlow = $derived(calculateCashFlow(incomes, expenses));

	function loadData() {
		scenario = repositories.scenarios.getById(scenarioId);
		if (!scenario) {
			goto(`${base}/console/scenarios`);
			return;
		}
		nameEdit = scenario.name;
		descEdit = scenario.description ?? '';
		incomes = repositories.income.getByScenario(scenarioId);
		expenses = repositories.expenses.getByScenario(scenarioId);
	}

	onMount(loadData);

	async function saveMeta() {
		if (!scenario) return;
		saving = true;
		await repositories.scenarios.update(scenarioId, {
			name: nameEdit,
			description: descEdit,
			is_baseline: scenario.is_baseline
		});
		scenario = { ...scenario, name: nameEdit, description: descEdit };
		saving = false;
	}

	async function setBaseline() {
		if (!scenario) return;
		// unset others
		const all = repositories.scenarios.getAll();
		for (const s of all) {
			if (s.is_baseline && s.id !== scenarioId) {
				await repositories.scenarios.update(s.id, { ...s, is_baseline: false });
			}
		}
		await repositories.scenarios.update(scenarioId, { name: nameEdit, description: descEdit, is_baseline: true });
		scenario = { ...scenario, is_baseline: true };
	}

	async function addIncome() {
		if (!newIncome.name || !newIncome.amount) return;
		await repositories.income.create({
			scenario_id: scenarioId,
			name: newIncome.name,
			amount: parseFloat(newIncome.amount),
			frequency: newIncome.frequency,
			type: newIncome.type,
			is_active: true
		});
		newIncome = { name: '', amount: '', frequency: 'monthly', type: 'salary' };
		addingIncome = false;
		incomes = repositories.income.getByScenario(scenarioId);
	}

	function startEditIncome(i: IncomeSource) {
		editIncomeId = i.id;
		editIncome = { name: i.name, amount: String(i.amount), frequency: i.frequency, type: i.type };
	}

	async function saveEditIncome(i: IncomeSource) {
		await repositories.income.update(i.id, {
			...i,
			name: editIncome.name,
			amount: parseFloat(editIncome.amount),
			frequency: editIncome.frequency,
			type: editIncome.type
		});
		editIncomeId = null;
		incomes = repositories.income.getByScenario(scenarioId);
	}

	async function deleteIncome(id: string) {
		await repositories.income.delete(id);
		incomes = repositories.income.getByScenario(scenarioId);
	}

	async function addExpense() {
		if (!newExpense.name || !newExpense.amount) return;
		await repositories.expenses.create({
			scenario_id: scenarioId,
			name: newExpense.name,
			amount: parseFloat(newExpense.amount),
			frequency: newExpense.frequency,
			category: newExpense.category,
			is_fixed: newExpense.is_fixed
		});
		newExpense = { name: '', amount: '', frequency: 'monthly', category: 'other', is_fixed: false };
		addingExpense = false;
		expenses = repositories.expenses.getByScenario(scenarioId);
	}

	function startEditExpense(e: Expense) {
		editExpenseId = e.id;
		editExpense = { name: e.name, amount: String(e.amount), frequency: e.frequency, category: e.category, is_fixed: e.is_fixed };
	}

	async function saveEditExpense(e: Expense) {
		await repositories.expenses.update(e.id, {
			...e,
			name: editExpense.name,
			amount: parseFloat(editExpense.amount),
			frequency: editExpense.frequency,
			category: editExpense.category,
			is_fixed: editExpense.is_fixed
		});
		editExpenseId = null;
		expenses = repositories.expenses.getByScenario(scenarioId);
	}

	async function deleteExpense(id: string) {
		await repositories.expenses.delete(id);
		expenses = repositories.expenses.getByScenario(scenarioId);
	}

	function fmt(n: number) {
		const abs = Math.abs(n);
		const sign = n < 0 ? '-' : '';
		if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
		return `${sign}$${abs.toFixed(2)}`;
	}

	function fmtMonthly(amount: number, freq: Frequency) {
		return fmt(monthlyAmount(amount, freq));
	}
</script>

<svelte:head><title>{scenario?.name ?? 'Scenario'} — FinPlan</title></svelte:head>

<div class="p-6 lg:p-8 max-w-4xl">
	<!-- Back -->
	<a href="{base}/console/scenarios" class="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
		← Scenarios
	</a>

	{#if scenario}
		<!-- Name & description -->
		<div class="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<div class="flex flex-wrap items-start gap-3">
				<div class="flex-1 min-w-0">
					<input
						bind:value={nameEdit}
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-lg font-bold text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
						placeholder="Scenario name"
					/>
					<textarea
						bind:value={descEdit}
						class="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
						placeholder="Description (optional)"
						rows="2"
					></textarea>
				</div>
				<div class="flex flex-col gap-2 shrink-0">
					<button
						onclick={saveMeta}
						disabled={saving}
						class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
					>
						{saving ? 'Saving…' : 'Save'}
					</button>
					{#if !scenario.is_baseline}
						<button
							onclick={setBaseline}
							class="rounded-lg border border-primary-300 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
						>
							Set as Baseline
						</button>
					{:else}
						<span class="rounded-full bg-primary-100 px-3 py-1 text-center text-xs font-medium text-primary-700">✓ Baseline</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Income table -->
		<div class="mb-6 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
			<div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
				<h2 class="text-base font-semibold text-gray-900">Income Sources</h2>
				<button
					onclick={() => (addingIncome = true)}
					class="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
				>
					+ Add
				</button>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
						<tr>
							<th class="px-4 py-2 text-left font-medium">Name</th>
							<th class="px-4 py-2 text-right font-medium">Amount</th>
							<th class="px-4 py-2 text-left font-medium">Frequency</th>
							<th class="px-4 py-2 text-right font-medium">Monthly</th>
							<th class="px-4 py-2 text-left font-medium">Type</th>
							<th class="px-4 py-2 text-right font-medium">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-100">
						{#each incomes as i}
							{#if editIncomeId === i.id}
								<tr class="bg-primary-50">
									<td class="px-4 py-2"><input bind:value={editIncome.name} class="w-full rounded border border-gray-300 px-2 py-1 text-sm" /></td>
									<td class="px-4 py-2"><input bind:value={editIncome.amount} type="number" class="w-24 rounded border border-gray-300 px-2 py-1 text-sm text-right" /></td>
									<td class="px-4 py-2">
										<select bind:value={editIncome.frequency} class="rounded border border-gray-300 px-2 py-1 text-sm">
											{#each FREQUENCIES as f}<option value={f}>{f}</option>{/each}
										</select>
									</td>
									<td class="px-4 py-2 text-right text-gray-500">{fmtMonthly(parseFloat(editIncome.amount) || 0, editIncome.frequency)}</td>
									<td class="px-4 py-2">
										<select bind:value={editIncome.type} class="rounded border border-gray-300 px-2 py-1 text-sm">
											{#each INCOME_TYPES as t}<option value={t}>{t}</option>{/each}
										</select>
									</td>
									<td class="px-4 py-2 text-right">
										<button onclick={() => saveEditIncome(i)} class="mr-1 rounded bg-primary-600 px-2 py-1 text-xs text-white hover:bg-primary-700">Save</button>
										<button onclick={() => (editIncomeId = null)} class="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
									</td>
								</tr>
							{:else}
								<tr class="hover:bg-gray-50">
									<td class="px-4 py-3 font-medium text-gray-900">{i.name}</td>
									<td class="px-4 py-3 text-right text-gray-700">{fmt(i.amount)}</td>
									<td class="px-4 py-3 capitalize text-gray-500">{i.frequency}</td>
									<td class="px-4 py-3 text-right text-gray-700">{fmtMonthly(i.amount, i.frequency)}</td>
									<td class="px-4 py-3 capitalize text-gray-500">{i.type}</td>
									<td class="px-4 py-3 text-right">
										<button onclick={() => startEditIncome(i)} class="mr-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">Edit</button>
										<button onclick={() => deleteIncome(i.id)} class="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">Del</button>
									</td>
								</tr>
							{/if}
						{/each}

						{#if addingIncome}
							<tr class="bg-primary-50">
								<td class="px-4 py-2"><input bind:value={newIncome.name} placeholder="Name" class="w-full rounded border border-gray-300 px-2 py-1 text-sm" /></td>
								<td class="px-4 py-2"><input bind:value={newIncome.amount} type="number" placeholder="0" class="w-24 rounded border border-gray-300 px-2 py-1 text-sm text-right" /></td>
								<td class="px-4 py-2">
									<select bind:value={newIncome.frequency} class="rounded border border-gray-300 px-2 py-1 text-sm">
										{#each FREQUENCIES as f}<option value={f}>{f}</option>{/each}
									</select>
								</td>
								<td class="px-4 py-2 text-right text-gray-500">{fmtMonthly(parseFloat(newIncome.amount) || 0, newIncome.frequency)}</td>
								<td class="px-4 py-2">
									<select bind:value={newIncome.type} class="rounded border border-gray-300 px-2 py-1 text-sm">
										{#each INCOME_TYPES as t}<option value={t}>{t}</option>{/each}
									</select>
								</td>
								<td class="px-4 py-2 text-right">
									<button onclick={addIncome} class="mr-1 rounded bg-primary-600 px-2 py-1 text-xs text-white hover:bg-primary-700">Save</button>
									<button onclick={() => (addingIncome = false)} class="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
								</td>
							</tr>
						{/if}

						{#if incomes.length === 0 && !addingIncome}
							<tr><td colspan="6" class="px-4 py-6 text-center text-sm text-gray-400">No income sources yet</td></tr>
						{/if}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Expense table -->
		<div class="mb-6 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
			<div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
				<h2 class="text-base font-semibold text-gray-900">Expenses</h2>
				<button
					onclick={() => (addingExpense = true)}
					class="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
				>
					+ Add
				</button>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
						<tr>
							<th class="px-4 py-2 text-left font-medium">Name</th>
							<th class="px-4 py-2 text-right font-medium">Amount</th>
							<th class="px-4 py-2 text-left font-medium">Frequency</th>
							<th class="px-4 py-2 text-right font-medium">Monthly</th>
							<th class="px-4 py-2 text-left font-medium">Category</th>
							<th class="px-4 py-2 text-center font-medium">Fixed?</th>
							<th class="px-4 py-2 text-right font-medium">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-100">
						{#each expenses as e}
							{#if editExpenseId === e.id}
								<tr class="bg-primary-50">
									<td class="px-4 py-2"><input bind:value={editExpense.name} class="w-full rounded border border-gray-300 px-2 py-1 text-sm" /></td>
									<td class="px-4 py-2"><input bind:value={editExpense.amount} type="number" class="w-24 rounded border border-gray-300 px-2 py-1 text-sm text-right" /></td>
									<td class="px-4 py-2">
										<select bind:value={editExpense.frequency} class="rounded border border-gray-300 px-2 py-1 text-sm">
											{#each FREQUENCIES as f}<option value={f}>{f}</option>{/each}
										</select>
									</td>
									<td class="px-4 py-2 text-right text-gray-500">{fmtMonthly(parseFloat(editExpense.amount) || 0, editExpense.frequency)}</td>
									<td class="px-4 py-2">
										<select bind:value={editExpense.category} class="rounded border border-gray-300 px-2 py-1 text-sm">
											{#each EXPENSE_CATS as c}<option value={c}>{c}</option>{/each}
										</select>
									</td>
									<td class="px-4 py-2 text-center"><input type="checkbox" bind:checked={editExpense.is_fixed} /></td>
									<td class="px-4 py-2 text-right">
										<button onclick={() => saveEditExpense(e)} class="mr-1 rounded bg-primary-600 px-2 py-1 text-xs text-white hover:bg-primary-700">Save</button>
										<button onclick={() => (editExpenseId = null)} class="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
									</td>
								</tr>
							{:else}
								<tr class="hover:bg-gray-50">
									<td class="px-4 py-3 font-medium text-gray-900">{e.name}</td>
									<td class="px-4 py-3 text-right text-gray-700">{fmt(e.amount)}</td>
									<td class="px-4 py-3 capitalize text-gray-500">{e.frequency}</td>
									<td class="px-4 py-3 text-right text-gray-700">{fmtMonthly(e.amount, e.frequency)}</td>
									<td class="px-4 py-3 capitalize text-gray-500">{e.category}</td>
									<td class="px-4 py-3 text-center">{e.is_fixed ? '✓' : ''}</td>
									<td class="px-4 py-3 text-right">
										<button onclick={() => startEditExpense(e)} class="mr-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">Edit</button>
										<button onclick={() => deleteExpense(e.id)} class="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">Del</button>
									</td>
								</tr>
							{/if}
						{/each}

						{#if addingExpense}
							<tr class="bg-primary-50">
								<td class="px-4 py-2"><input bind:value={newExpense.name} placeholder="Name" class="w-full rounded border border-gray-300 px-2 py-1 text-sm" /></td>
								<td class="px-4 py-2"><input bind:value={newExpense.amount} type="number" placeholder="0" class="w-24 rounded border border-gray-300 px-2 py-1 text-sm text-right" /></td>
								<td class="px-4 py-2">
									<select bind:value={newExpense.frequency} class="rounded border border-gray-300 px-2 py-1 text-sm">
										{#each FREQUENCIES as f}<option value={f}>{f}</option>{/each}
									</select>
								</td>
								<td class="px-4 py-2 text-right text-gray-500">{fmtMonthly(parseFloat(newExpense.amount) || 0, newExpense.frequency)}</td>
								<td class="px-4 py-2">
									<select bind:value={newExpense.category} class="rounded border border-gray-300 px-2 py-1 text-sm">
										{#each EXPENSE_CATS as c}<option value={c}>{c}</option>{/each}
									</select>
								</td>
								<td class="px-4 py-2 text-center"><input type="checkbox" bind:checked={newExpense.is_fixed} /></td>
								<td class="px-4 py-2 text-right">
									<button onclick={addExpense} class="mr-1 rounded bg-primary-600 px-2 py-1 text-xs text-white hover:bg-primary-700">Save</button>
									<button onclick={() => (addingExpense = false)} class="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
								</td>
							</tr>
						{/if}

						{#if expenses.length === 0 && !addingExpense}
							<tr><td colspan="7" class="px-4 py-6 text-center text-sm text-gray-400">No expenses yet</td></tr>
						{/if}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Cash flow summary -->
		<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<h2 class="mb-4 text-base font-semibold text-gray-900">Cash Flow Summary</h2>
			<div class="space-y-2 text-sm">
				<div class="flex justify-between">
					<span class="text-gray-500">Total Monthly Income</span>
					<span class="font-medium text-green-700">+{fmt(cashFlow.monthlyIncome)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-gray-500">Total Monthly Expenses</span>
					<span class="font-medium text-red-700">-{fmt(cashFlow.monthlyExpenses)}</span>
				</div>
				<div class="border-t border-gray-200 pt-2 flex justify-between">
					<span class="font-semibold text-gray-900">Monthly {cashFlow.monthlySurplus >= 0 ? 'Surplus' : 'Deficit'}</span>
					<span class="text-2xl font-bold {cashFlow.monthlySurplus >= 0 ? 'text-primary-600' : 'text-red-600'}">
						{cashFlow.monthlySurplus >= 0 ? '+' : ''}{fmt(cashFlow.monthlySurplus)}
					</span>
				</div>
			</div>
		</div>
	{/if}
</div>
