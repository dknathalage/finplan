import { describe, it, expect } from 'vitest';
import { monthlyAmount, calculateCashFlow, calculateNetWorth, projectCashFlow, calculateRunway } from './projections.js';
import type { IncomeSource, Expense, Asset, Liability } from '$lib/repositories/types.js';

describe('monthlyAmount', () => {
	it('weekly', () => expect(monthlyAmount(100, 'weekly')).toBeCloseTo(100 * 52 / 12, 4));
	it('fortnightly', () => expect(monthlyAmount(100, 'fortnightly')).toBeCloseTo(100 * 26 / 12, 4));
	it('monthly', () => expect(monthlyAmount(100, 'monthly')).toBe(100));
	it('annually', () => expect(monthlyAmount(1200, 'annually')).toBe(100));
});

describe('calculateCashFlow', () => {
	const income: IncomeSource[] = [
		{ id: '1', scenario_id: 's1', name: 'Salary', amount: 6000, frequency: 'monthly', type: 'salary', is_active: true },
		{ id: '2', scenario_id: 's1', name: 'Rental', amount: 500, frequency: 'weekly', type: 'rental', is_active: true },
		{ id: '3', scenario_id: 's1', name: 'Inactive', amount: 1000, frequency: 'monthly', type: 'other', is_active: false }
	];
	const expenses: Expense[] = [
		{ id: 'e1', scenario_id: 's1', name: 'Rent', amount: 2000, frequency: 'monthly', category: 'housing', is_fixed: true }
	];

	it('ignores inactive income', () => {
		const cf = calculateCashFlow(income, expenses);
		// Only first two income sources
		expect(cf.monthlyIncome).toBeCloseTo(6000 + 500 * 52 / 12, 2);
	});

	it('calculates surplus', () => {
		const cf = calculateCashFlow(income, expenses);
		expect(cf.monthlySurplus).toBeCloseTo(cf.monthlyIncome - cf.monthlyExpenses, 4);
	});
});

describe('calculateNetWorth', () => {
	const assets: Asset[] = [
		{ id: 'a1', name: 'House', value: 800_000, type: 'property', as_of: '2026-01-01' },
		{ id: 'a2', name: 'Cash', value: 50_000, type: 'cash', as_of: '2026-01-01' }
	];
	const liabilities: Liability[] = [
		{ id: 'l1', name: 'Mortgage', balance: 560_000, interest_rate: 6, monthly_payment: 3000, type: 'mortgage' }
	];

	it('totals correctly', () => {
		const nw = calculateNetWorth(assets, liabilities);
		expect(nw.totalAssets).toBe(850_000);
		expect(nw.totalLiabilities).toBe(560_000);
		expect(nw.netWorth).toBe(290_000);
	});
});

describe('projectCashFlow', () => {
	it('projects 3 months with $1000 surplus', () => {
		const proj = projectCashFlow(10_000, 1_000, 3);
		expect(proj).toHaveLength(3);
		expect(proj[0]).toEqual({ month: 1, cashPosition: 11_000 });
		expect(proj[2]).toEqual({ month: 3, cashPosition: 13_000 });
	});
});

describe('calculateRunway', () => {
	it('returns infinity when surplus >= 0', () => {
		expect(calculateRunway(10_000, 0)).toBe(Infinity);
		expect(calculateRunway(10_000, 500)).toBe(Infinity);
	});

	it('calculates months before zero', () => {
		expect(calculateRunway(10_000, -1_000)).toBe(10);
	});
});
