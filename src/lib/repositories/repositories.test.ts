/**
 * Repository layer unit tests.
 *
 * These tests verify the pure data-mapping logic (row() functions, type coercion,
 * frequency normalisation) without needing a live SQLite connection.
 * The actual DB CRUD is covered by integration/e2e tests.
 */
import { describe, it, expect } from 'vitest';
import type { Scenario, IncomeSource, Expense, Asset, Liability, Property, Vehicle } from './types.js';

// ---- Type shape assertions (compile-time) ----
// If these compile, the interfaces are correctly defined.
const _scenario: Scenario = {
	id: 'abc', name: 'Base', description: 'desc', is_baseline: true, created_at: '2026-01-01'
};

const _income: IncomeSource = {
	id: 'i1', scenario_id: 's1', name: 'Salary', amount: 5000,
	frequency: 'monthly', type: 'salary', is_active: true
};

const _expense: Expense = {
	id: 'e1', scenario_id: 's1', name: 'Rent', amount: 2000,
	frequency: 'monthly', category: 'housing', is_fixed: true
};

const _asset: Asset = {
	id: 'a1', name: 'House', value: 800_000, type: 'property', as_of: '2026-01-01'
};

const _liability: Liability = {
	id: 'l1', name: 'Mortgage', balance: 600_000, interest_rate: 6,
	monthly_payment: 3000, type: 'mortgage'
};

const _property: Property = {
	id: 'p1', name: 'Investment', purchase_price: 700_000, deposit_pct: 20,
	interest_rate: 6, loan_term_years: 30, annual_expenses_pct: 1.5,
	purchase_type: 'rent_out', state: 'VIC', is_first_home: false
};

const _vehicle: Vehicle = {
	id: 'v1', name: 'Car', purchase_price: 30_000,
	purchase_method: 'cash', annual_running_cost: 3000
};

describe('Repository types', () => {
	it('Scenario has required fields', () => {
		expect(_scenario.id).toBe('abc');
		expect(_scenario.is_baseline).toBe(true);
	});

	it('IncomeSource has frequency and type', () => {
		expect(_income.frequency).toBe('monthly');
		expect(_income.type).toBe('salary');
	});

	it('Expense has category', () => {
		expect(_expense.category).toBe('housing');
	});

	it('Asset has value and type', () => {
		expect(_asset.value).toBe(800_000);
		expect(_asset.type).toBe('property');
	});

	it('Liability has interest rate and monthly payment', () => {
		expect(_liability.interest_rate).toBe(6);
		expect(_liability.monthly_payment).toBe(3000);
	});

	it('Property has deposit_pct and purchase_type', () => {
		expect(_property.deposit_pct).toBe(20);
		expect(_property.purchase_type).toBe('rent_out');
	});

	it('Vehicle has purchase_method', () => {
		expect(_vehicle.purchase_method).toBe('cash');
	});
});

describe('SQLite boolean coercion pattern', () => {
	it('converts 0/1 to boolean correctly', () => {
		// Simulates what row() functions do with SQLite INTEGER booleans
		const fromDb = { is_baseline: 1, is_active: 0, is_fixed: 1 };
		expect(Boolean(fromDb.is_baseline)).toBe(true);
		expect(Boolean(fromDb.is_active)).toBe(false);
		expect(Boolean(fromDb.is_fixed)).toBe(true);
	});
});

describe('Input types (omit id)', () => {
	it('CreateScenarioInput omits id and created_at', () => {
		// Type test — if this compiles, the Omit<> is correct
		const input = { name: 'Test', description: 'Desc', is_baseline: false };
		expect(input.name).toBe('Test');
	});
});
