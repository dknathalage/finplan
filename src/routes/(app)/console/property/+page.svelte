<script lang="ts">
	import { repositories } from '$lib/repositories/index.js';
	import { analyseProperty } from '$lib/calc/property.js';
	import type { Property, CreatePropertyInput } from '$lib/repositories/types.js';

	// ── Form state ──────────────────────────────────────────────────────────────
	let name: string = $state('');
	let purchasePrice: number = $state(700000);
	let isFirstHome: boolean = $state(false);
	let propState: string = $state('VIC');
	let depositPct: number = $state(20);
	let interestRate: number = $state(6.0);
	let loanTermYears: number = $state(30);
	let purchaseType = $state('move_in' as 'move_in' | 'rent_out');
	let weeklyRent: number = $state(500);
	let annualExpensesPct: number = $state(1.5);

	let saving: boolean = $state(false);
	let saveError: string = $state('');

	// ── Saved properties ────────────────────────────────────────────────────────
	let savedProperties: Property[] = $state([]);

	function loadProperties() {
		savedProperties = repositories.properties.getAll();
	}
	loadProperties();

	// ── Live analysis ────────────────────────────────────────────────────────────
	const liveProperty: Property = $derived({
		id: '__preview__',
		name: name || 'Preview',
		purchase_price: purchasePrice,
		deposit_pct: depositPct,
		interest_rate: interestRate,
		loan_term_years: loanTermYears,
		weekly_rent: purchaseType === 'rent_out' ? weeklyRent : undefined,
		annual_expenses_pct: annualExpensesPct,
		purchase_type: purchaseType,
		state: propState,
		is_first_home: isFirstHome
	});

	const analysis = $derived(analyseProperty(liveProperty));

	// ── Helpers ──────────────────────────────────────────────────────────────────
	function fmt(n: number) {
		return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
	}
	function fmtDec(n: number, decimals = 2) {
		return n.toFixed(decimals);
	}

	// ── Save ─────────────────────────────────────────────────────────────────────
	async function handleSave() {
		if (!name.trim()) { saveError = 'Property name is required.'; return; }
		saveError = '';
		saving = true;
		const input: CreatePropertyInput = {
			name: name.trim(),
			purchase_price: purchasePrice,
			deposit_pct: depositPct,
			interest_rate: interestRate,
			loan_term_years: loanTermYears,
			weekly_rent: purchaseType === 'rent_out' ? weeklyRent : undefined,
			annual_expenses_pct: annualExpensesPct,
			purchase_type: purchaseType,
			state: propState,
			is_first_home: isFirstHome
		};
		try {
			await repositories.properties.create(input);
			loadProperties();
			name = '';
		} catch (e: unknown) {
			saveError = e instanceof Error ? e.message : 'Failed to save.';
		} finally {
			saving = false;
		}
	}

	async function handleDelete(id: string) {
		await repositories.properties.delete(id);
		loadProperties();
	}

	interface PropWithAnalysis {
		property: Property;
		analysis: ReturnType<typeof analyseProperty>;
	}

	const comparisonProps: PropWithAnalysis[] = $derived(
		savedProperties.map((p) => ({ property: p, analysis: analyseProperty(p) }))
	);
</script>

<div class="space-y-8">
	<div>
		<h1 class="text-2xl font-bold text-gray-900">🏠 Property Analysis</h1>
		<p class="text-gray-500 text-sm mt-1">Evaluate property purchase decisions — upfront costs, monthly cash flow, rental yields.</p>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
		<!-- ── Input Form ── -->
		<div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
			<h2 class="text-lg font-semibold text-gray-800">Property Details</h2>

			<div>
				<label for="prop-name" class="block text-sm font-medium text-gray-700 mb-1">Property Name</label>
				<input
					id="prop-name"
					type="text"
					bind:value={name}
					placeholder="e.g. Richmond Apartment"
					class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
				/>
			</div>

			<div class="grid grid-cols-2 gap-3">
				<div>
					<label for="prop-price" class="block text-sm font-medium text-gray-700 mb-1">Purchase Price (AUD)</label>
					<input
						id="prop-price"
						type="number"
						bind:value={purchasePrice}
						min="0"
						step="10000"
						class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
					/>
				</div>
				<div>
					<label for="prop-state" class="block text-sm font-medium text-gray-700 mb-1">State</label>
					<select
						id="prop-state"
						bind:value={propState}
						class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
					>
						<option value="VIC">VIC</option>
						<option value="NSW">NSW</option>
						<option value="QLD">QLD</option>
						<option value="SA">SA</option>
						<option value="WA">WA</option>
						<option value="TAS">TAS</option>
						<option value="ACT">ACT</option>
						<option value="NT">NT</option>
					</select>
				</div>
			</div>

			<div class="flex items-center gap-3">
				<button
					type="button"
					aria-label="Toggle first home buyer"
					onclick={() => (isFirstHome = !isFirstHome)}
					class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 {isFirstHome ? 'bg-primary-500' : 'bg-gray-200'}"
				>
					<span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform {isFirstHome ? 'translate-x-5' : 'translate-x-0'}"></span>
				</button>
				<span class="text-sm font-medium text-gray-700">First Home Buyer (stamp duty concession)</span>
			</div>

			<div class="grid grid-cols-3 gap-3">
				<div>
					<label for="prop-deposit" class="block text-sm font-medium text-gray-700 mb-1">Deposit %</label>
					<input
						id="prop-deposit"
						type="number"
						bind:value={depositPct}
						min="5"
						max="100"
						step="1"
						class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
					/>
				</div>
				<div>
					<label for="prop-rate" class="block text-sm font-medium text-gray-700 mb-1">Interest Rate %</label>
					<input
						id="prop-rate"
						type="number"
						bind:value={interestRate}
						min="0"
						max="20"
						step="0.05"
						class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
					/>
				</div>
				<div>
					<label for="prop-term" class="block text-sm font-medium text-gray-700 mb-1">Loan Term (yrs)</label>
					<input
						id="prop-term"
						type="number"
						bind:value={loanTermYears}
						min="5"
						max="30"
						step="1"
						class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
					/>
				</div>
			</div>

			<div>
				<p class="block text-sm font-medium text-gray-700 mb-1">Purchase Type</p>
				<div class="flex gap-2">
					{#each ['move_in', 'rent_out'] as pt}
						<button
							type="button"
							onclick={() => (purchaseType = pt as 'move_in' | 'rent_out')}
							class="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors {purchaseType === pt
								? 'bg-primary-600 text-white border-primary-600'
								: 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'}"
						>
							{pt === 'move_in' ? '🏡 Move In' : '💰 Rent Out'}
						</button>
					{/each}
				</div>
			</div>

			{#if purchaseType === 'rent_out'}
				<div class="grid grid-cols-2 gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
					<div>
						<label for="prop-rent" class="block text-sm font-medium text-gray-700 mb-1">Weekly Rent ($)</label>
						<input
							id="prop-rent"
							type="number"
							bind:value={weeklyRent}
							min="0"
							step="25"
							class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
						/>
					</div>
					<div>
						<label for="prop-maint-rent" class="block text-sm font-medium text-gray-700 mb-1">Maint. % of value/yr</label>
						<input
							id="prop-maint-rent"
							type="number"
							bind:value={annualExpensesPct}
							min="0"
							max="10"
							step="0.1"
							class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
						/>
					</div>
				</div>
			{:else}
				<div>
					<label for="prop-maint" class="block text-sm font-medium text-gray-700 mb-1">Annual Maintenance % of value</label>
					<input
						id="prop-maint"
						type="number"
						bind:value={annualExpensesPct}
						min="0"
						max="10"
						step="0.1"
						class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
					/>
				</div>
			{/if}

			{#if saveError}
				<p class="text-red-600 text-sm">{saveError}</p>
			{/if}

			<button
				onclick={handleSave}
				disabled={saving}
				class="w-full py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
			>
				{saving ? 'Saving…' : '💾 Save Property'}
			</button>
		</div>

		<!-- ── Results Panel ── -->
		<div class="space-y-4">
			<!-- Upfront Costs -->
			<div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
				<h3 class="font-semibold text-gray-700 mb-3">💵 Upfront Costs</h3>
				<div class="space-y-2 text-sm">
					<div class="flex justify-between">
						<span class="text-gray-600">Deposit ({depositPct}%)</span>
						<span class="font-medium">{fmt(analysis.deposit)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-600">
							Stamp Duty
							{#if isFirstHome && purchasePrice <= 600_000}
								<span class="text-xs text-primary-600 ml-1">(FHB waived)</span>
							{:else if isFirstHome && purchasePrice <= 750_000}
								<span class="text-xs text-primary-600 ml-1">(FHB concession)</span>
							{/if}
						</span>
						<span class="font-medium">{fmt(analysis.stampDuty)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-600">Legal / Conveyancing (est.)</span>
						<span class="font-medium">{fmt(analysis.legal)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-600">Building Inspection (est.)</span>
						<span class="font-medium">{fmt(analysis.inspection)}</span>
					</div>
					<div class="flex justify-between border-t border-gray-100 pt-2 mt-2">
						<span class="font-bold text-gray-800 text-base">Total Cash Needed</span>
						<span class="font-bold text-gray-900 text-base">{fmt(analysis.totalUpfront)}</span>
					</div>
				</div>
			</div>

			<!-- Monthly Costs -->
			<div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
				<h3 class="font-semibold text-gray-700 mb-3">📅 Monthly Costs</h3>
				<div class="space-y-2 text-sm">
					<div class="flex justify-between">
						<span class="text-gray-600">Mortgage Payment</span>
						<span class="font-medium">{fmt(analysis.monthlyMortgage)}/mo</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-600">Council Rates (est.)</span>
						<span class="font-medium">{fmt(analysis.monthlyRates)}/mo</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-600">Insurance (est.)</span>
						<span class="font-medium">{fmt(analysis.monthlyInsurance)}/mo</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-600">Maintenance ({annualExpensesPct}% p.a.)</span>
						<span class="font-medium">{fmt(analysis.monthlyMaintenance)}/mo</span>
					</div>
					{#if purchaseType === 'rent_out'}
						<div class="flex justify-between text-primary-700">
							<span>− Rental Income</span>
							<span class="font-medium">−{fmt(analysis.monthlyRent)}/mo</span>
						</div>
						<div class="flex justify-between text-red-600">
							<span>+ Property Mgmt Fee (~8.5%)</span>
							<span class="font-medium">+{fmt(analysis.monthlyPMFee)}/mo</span>
						</div>
					{/if}
					<div class="flex justify-between border-t border-gray-100 pt-2 mt-2">
						<span class="font-bold text-gray-800 text-base">Net Monthly Cost</span>
						<span class="font-bold text-base {analysis.netMonthlyCost < 0 ? 'text-primary-600' : 'text-gray-900'}">
							{fmt(analysis.netMonthlyCost)}/mo
						</span>
					</div>
				</div>
			</div>

			<!-- Rental metrics (rent_out only) -->
			{#if purchaseType === 'rent_out'}
				<div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
					<h3 class="font-semibold text-gray-700 mb-3">📊 Rental Metrics</h3>
					<div class="space-y-2 text-sm">
						<div class="flex justify-between">
							<span class="text-gray-600">Gross Rental Yield</span>
							<span class="font-medium">{fmtDec(analysis.grossYield)}%</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600">Net Rental Yield</span>
							<span class="font-medium">{fmtDec(analysis.netYield)}%</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600">Monthly Cash Flow</span>
							<span class="font-bold {-analysis.netMonthlyCost >= 0 ? 'text-primary-600' : 'text-red-600'}">
								{fmt(-analysis.netMonthlyCost)}/mo
								{#if -analysis.netMonthlyCost >= 0}
									<span class="text-xs ml-1">✓ cash flow positive!</span>
								{/if}
							</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600">Break-Even Weekly Rent</span>
							<span class="font-medium">{fmt(analysis.breakEvenWeeklyRent)}/wk</span>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- ── Saved Properties ── -->
	{#if savedProperties.length > 0}
		<div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
			<h2 class="text-lg font-semibold text-gray-800 mb-4">Saved Properties</h2>

			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="text-left text-gray-500 border-b border-gray-100">
							<th class="pb-2 pr-4 font-medium">Name</th>
							<th class="pb-2 pr-4 font-medium text-right">Purchase Price</th>
							<th class="pb-2 pr-4 font-medium text-right">Total Upfront</th>
							<th class="pb-2 pr-4 font-medium text-right">Net Monthly</th>
							<th class="pb-2 pr-4 font-medium">Type</th>
							<th class="pb-2 font-medium">Action</th>
						</tr>
					</thead>
					<tbody>
						{#each comparisonProps as { property: p, analysis: a }}
							<tr class="border-b border-gray-50 hover:bg-gray-50">
								<td class="py-2 pr-4 font-medium text-gray-800">{p.name}</td>
								<td class="py-2 pr-4 text-right">{fmt(p.purchase_price)}</td>
								<td class="py-2 pr-4 text-right">{fmt(a.totalUpfront)}</td>
								<td class="py-2 pr-4 text-right font-medium {a.netMonthlyCost < 0 ? 'text-primary-600' : 'text-gray-700'}">{fmt(a.netMonthlyCost)}/mo</td>
								<td class="py-2 pr-4">
									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {p.purchase_type === 'rent_out' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}">
										{p.purchase_type === 'rent_out' ? 'Rent Out' : 'Move In'}
									</span>
								</td>
								<td class="py-2">
									<button
										onclick={() => handleDelete(p.id)}
										class="text-red-500 hover:text-red-700 text-xs font-medium"
									>
										Delete
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Side-by-side comparison if 2+ properties -->
			{#if savedProperties.length >= 2}
				<div class="mt-6">
					<h3 class="text-base font-semibold text-gray-700 mb-3">Side-by-Side Comparison</h3>
					<div class="overflow-x-auto">
						<table class="w-full text-sm border border-gray-200 rounded-lg">
							<thead>
								<tr class="bg-gray-50">
									<th class="px-4 py-2 text-left font-medium text-gray-600 border-r border-gray-200">Metric</th>
									{#each comparisonProps as { property: p }}
										<th class="px-4 py-2 text-right font-medium text-gray-700">{p.name}</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each [
									{ label: 'Purchase Price', isPrice: true, isProp: true, propKey: 'purchase_price' },
									{ label: 'Deposit', isPrice: true, isProp: false, propKey: 'deposit' },
									{ label: 'Stamp Duty', isPrice: true, isProp: false, propKey: 'stampDuty' },
									{ label: 'Total Upfront', isPrice: true, isProp: false, propKey: 'totalUpfront' },
									{ label: 'Loan Amount', isPrice: true, isProp: false, propKey: 'loanAmount' },
									{ label: 'Monthly Mortgage', isPrice: true, isProp: false, propKey: 'monthlyMortgage' },
									{ label: 'Net Monthly Cost', isPrice: true, isProp: false, propKey: 'netMonthlyCost' },
									{ label: 'Gross Yield', isPrice: false, isProp: false, propKey: 'grossYield' },
									{ label: 'Net Yield', isPrice: false, isProp: false, propKey: 'netYield' }
								] as row}
									<tr class="border-t border-gray-100 hover:bg-gray-50">
										<td class="px-4 py-2 font-medium text-gray-600 border-r border-gray-200">{row.label}</td>
										{#each comparisonProps as { property: p, analysis: a }}
											<td class="px-4 py-2 text-right text-gray-700">
												{#if row.isProp}
													{fmt(p[row.propKey as keyof Property] as number)}
												{:else if row.isPrice}
													{fmt(a[row.propKey as keyof typeof a] as number)}
												{:else}
													{(a[row.propKey as keyof typeof a] as number).toFixed(2)}%
												{/if}
											</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
