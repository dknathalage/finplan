import type { IncomeSource, Expense, Asset, Liability, Frequency } from '$lib/repositories/types.js';

/** Convert any frequency amount to monthly */
export function monthlyAmount(amount: number, frequency: Frequency): number {
	switch (frequency) {
		case 'weekly':      return amount * (52 / 12);
		case 'fortnightly': return amount * (26 / 12);
		case 'monthly':     return amount;
		case 'annually':    return amount / 12;
	}
}

export interface CashFlow {
	monthlyIncome: number;
	monthlyExpenses: number;
	monthlySurplus: number;
}

/** Calculate monthly cash flow for a scenario */
export function calculateCashFlow(
	incomeSources: IncomeSource[],
	expenses: Expense[]
): CashFlow {
	const monthlyIncome = incomeSources
		.filter((i) => i.is_active)
		.reduce((sum, i) => sum + monthlyAmount(i.amount, i.frequency), 0);

	const monthlyExpenses = expenses
		.reduce((sum, e) => sum + monthlyAmount(e.amount, e.frequency), 0);

	return {
		monthlyIncome,
		monthlyExpenses,
		monthlySurplus: monthlyIncome - monthlyExpenses
	};
}

export interface NetWorth {
	totalAssets: number;
	totalLiabilities: number;
	netWorth: number;
}

/** Calculate net worth from assets and liabilities */
export function calculateNetWorth(assets: Asset[], liabilities: Liability[]): NetWorth {
	const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
	const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
	return { totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities };
}

export interface CashFlowProjection {
	month: number;
	cashPosition: number;
}

/**
 * Project cash position over N months.
 * @param initialCash Starting cash balance
 * @param monthlySurplus Net monthly surplus (can be negative)
 * @param months Number of months to project
 */
export function projectCashFlow(
	initialCash: number,
	monthlySurplus: number,
	months: number
): CashFlowProjection[] {
	const result: CashFlowProjection[] = [];
	let cashPosition = initialCash;
	for (let month = 1; month <= months; month++) {
		cashPosition += monthlySurplus;
		result.push({ month, cashPosition });
	}
	return result;
}

/**
 * Calculate runway in months before cash hits zero.
 * Returns Infinity if surplus is >= 0.
 */
export function calculateRunway(initialCash: number, monthlySurplus: number): number {
	if (monthlySurplus >= 0) return Infinity;
	return Math.floor(initialCash / Math.abs(monthlySurplus));
}
