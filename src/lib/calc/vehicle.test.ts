import { describe, it, expect } from 'vitest';
import { calculateFinancePayment, calculateTotalCost, compareVehicleOptions } from './vehicle.js';
import type { Vehicle } from '$lib/repositories/types.js';

const cashVehicle: Vehicle = {
	id: 'v1', name: 'Budget Car', purchase_price: 20_000,
	purchase_method: 'cash', annual_running_cost: 3_000
};

const financeVehicle: Vehicle = {
	id: 'v2', name: 'Finance Car', purchase_price: 40_000,
	purchase_method: 'finance', finance_rate: 7, finance_term_months: 60,
	annual_running_cost: 4_000
};

describe('calculateFinancePayment', () => {
	it('$40k at 7% over 60mo', () => {
		const p = calculateFinancePayment(40_000, 7, 60);
		expect(p).toBeGreaterThan(700);
		expect(p).toBeLessThan(900);
	});

	it('zero rate', () => {
		expect(calculateFinancePayment(12_000, 0, 12)).toBeCloseTo(1000, 0);
	});
});

describe('calculateTotalCost', () => {
	it('cash: upfront = purchase price', () => {
		const result = calculateTotalCost(cashVehicle, 5);
		expect(result.upfrontCost).toBe(20_000);
		expect(result.totalRunningCost).toBe(15_000);
		expect(result.totalCostOfOwnership).toBe(35_000);
	});

	it('finance: no upfront, has monthly payment', () => {
		const result = calculateTotalCost(financeVehicle, 5);
		expect(result.upfrontCost).toBe(0);
		expect(result.monthlyPayment).toBeGreaterThan(0);
	});
});

describe('compareVehicleOptions', () => {
	it('ranks cheaper option first', () => {
		const comparison = compareVehicleOptions([financeVehicle, cashVehicle], 5);
		expect(comparison[0].rank).toBe(1);
		expect(comparison[0].summary.totalCostOfOwnership).toBeLessThanOrEqual(
			comparison[1].summary.totalCostOfOwnership
		);
	});
});
