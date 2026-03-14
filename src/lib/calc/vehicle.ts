import type { Vehicle } from '$lib/repositories/types.js';

/**
 * Monthly finance payment using amortisation formula.
 * Same as mortgage: M = P × r(1+r)^n / ((1+r)^n − 1)
 */
export function calculateFinancePayment(
	principal: number,
	annualRate: number,
	termMonths: number
): number {
	const r = annualRate / 100 / 12;
	const n = termMonths;
	if (r === 0) return principal / n;
	const payment = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
	return Math.round(payment * 100) / 100;
}

export interface VehicleCostSummary {
	upfrontCost: number;
	monthlyPayment: number;
	totalFinanceCost: number;
	totalRunningCost: number;
	totalCostOfOwnership: number;
	annualCost: number;
}

/**
 * Calculate total cost of ownership over N years (default 5).
 */
export function calculateTotalCost(vehicle: Vehicle, years: number = 5): VehicleCostSummary {
	const months = years * 12;
	let upfrontCost = 0;
	let monthlyPayment = 0;
	let totalFinanceCost = 0;

	switch (vehicle.purchase_method) {
		case 'cash':
			upfrontCost = vehicle.purchase_price;
			break;
		case 'finance':
			if (vehicle.finance_rate != null && vehicle.finance_term_months != null) {
				monthlyPayment = calculateFinancePayment(
					vehicle.purchase_price,
					vehicle.finance_rate,
					vehicle.finance_term_months
				);
				const actualMonths = Math.min(months, vehicle.finance_term_months);
				totalFinanceCost = monthlyPayment * actualMonths;
			}
			break;
		case 'lease':
			// Lease: monthly payment for full period
			monthlyPayment = vehicle.finance_rate != null && vehicle.finance_term_months != null
				? calculateFinancePayment(vehicle.purchase_price, vehicle.finance_rate, vehicle.finance_term_months)
				: 0;
			totalFinanceCost = monthlyPayment * Math.min(months, vehicle.finance_term_months ?? months);
			break;
	}

	const totalRunningCost = vehicle.annual_running_cost * years;
	const totalCostOfOwnership = upfrontCost + totalFinanceCost + totalRunningCost;

	return {
		upfrontCost,
		monthlyPayment,
		totalFinanceCost,
		totalRunningCost,
		totalCostOfOwnership,
		annualCost: totalCostOfOwnership / years
	};
}

export interface VehicleComparison {
	vehicle: Vehicle;
	summary: VehicleCostSummary;
	rank: number;
}

/**
 * Compare multiple vehicle options ranked by total cost of ownership.
 */
export function compareVehicleOptions(vehicles: Vehicle[], years: number = 5): VehicleComparison[] {
	const summaries = vehicles.map((v) => ({
		vehicle: v,
		summary: calculateTotalCost(v, years)
	}));

	summaries.sort((a, b) => a.summary.totalCostOfOwnership - b.summary.totalCostOfOwnership);

	return summaries.map((s, i) => ({ ...s, rank: i + 1 }));
}
