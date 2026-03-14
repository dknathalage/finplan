import type { Property } from '$lib/repositories/types.js';

/**
 * VIC Stamp Duty 2026
 * Brackets:
 *   ≤ $25k       → 1.4%
 *   $25k–$130k   → $350 + 2.4% × (v − $25k)
 *   $130k–$960k  → $2,870 + 6% × (v − $130k)
 *   $960k–$2m    → $55,000 + 5.5% × (v − $960k)
 *   > $2m        → 6.5% × v
 *
 * First home buyer concession (VIC):
 *   ≤ $600k → waived (duty = 0)
 *   $600k–$750k → linear concession
 *   > $750k → no concession
 */
export function calculateStampDuty(
	value: number,
	isFirstHome: boolean = false,
	state: string = 'VIC'
): number {
	let duty: number;

	if (state === 'VIC') {
		if (value <= 25_000) {
			duty = value * 0.014;
		} else if (value <= 130_000) {
			duty = 350 + 0.024 * (value - 25_000);
		} else if (value <= 960_000) {
			duty = 2_870 + 0.06 * (value - 130_000);
		} else if (value <= 2_000_000) {
			duty = 55_000 + 0.055 * (value - 960_000);
		} else {
			duty = value * 0.065;
		}

		if (isFirstHome) {
			if (value <= 600_000) {
				duty = 0;
			} else if (value <= 750_000) {
				// Linear concession: full at $600k, zero at $750k
				const concessionFraction = (750_000 - value) / 150_000;
				duty = duty * (1 - concessionFraction);
			}
			// > $750k: no concession, full duty applies
		}
	} else {
		// Simplified fallback for other states (5% flat)
		duty = value * 0.05;
	}

	return Math.round(duty * 100) / 100;
}

/**
 * Monthly mortgage repayment using standard amortisation formula:
 * M = P × r(1+r)^n / ((1+r)^n − 1)
 */
export function calculateMortgagePayment(
	principal: number,
	annualRate: number,
	termYears: number
): number {
	const r = annualRate / 100 / 12;
	const n = termYears * 12;
	if (r === 0) return principal / n;
	const payment = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
	return Math.round(payment * 100) / 100;
}

export interface PropertyAnalysis {
	deposit: number;
	stampDuty: number;
	legal: number;
	inspection: number;
	totalUpfront: number;
	loanAmount: number;
	monthlyMortgage: number;
	monthlyRates: number;
	monthlyInsurance: number;
	monthlyMaintenance: number;
	/** Gross monthly rent received (rent_out only) */
	monthlyRent: number;
	/** Property management fee (rent_out only, ~8.5% of rent) */
	monthlyPMFee: number;
	/** Net monthly cost (positive = cost, negative = income) */
	netMonthlyCost: number;
	/** Annual gross yield (%) — rent_out only */
	grossYield: number;
	/** Annual net yield (%) — rent_out only */
	netYield: number;
	/** Weekly rent needed to break even */
	breakEvenWeeklyRent: number;
}

export function analyseProperty(p: Property): PropertyAnalysis {
	const deposit = p.purchase_price * (p.deposit_pct / 100);
	const loanAmount = p.purchase_price - deposit;
	const stampDuty = calculateStampDuty(p.purchase_price, p.is_first_home, p.state);
	const legal = 3_000;
	const inspection = 600;
	const totalUpfront = deposit + stampDuty + legal + inspection;

	const monthlyMortgage = loanAmount > 0
		? calculateMortgagePayment(loanAmount, p.interest_rate, p.loan_term_years)
		: 0;

	const monthlyRates = 150;
	const monthlyInsurance = 125;
	const monthlyMaintenance = (p.purchase_price * (p.annual_expenses_pct / 100)) / 12;

	const monthlyRent = p.weekly_rent ? p.weekly_rent * (52 / 12) : 0;
	const monthlyPMFee = p.purchase_type === 'rent_out' ? monthlyRent * 0.085 : 0;

	const monthlyCosts = monthlyMortgage + monthlyRates + monthlyInsurance + monthlyMaintenance;
	const monthlyIncome = p.purchase_type === 'rent_out' ? monthlyRent - monthlyPMFee : 0;
	const netMonthlyCost = monthlyCosts - monthlyIncome;

	const annualRent = monthlyRent * 12;
	const grossYield = p.purchase_type === 'rent_out' && p.purchase_price > 0
		? (annualRent / p.purchase_price) * 100
		: 0;

	const annualNetIncome = annualRent - (monthlyPMFee * 12) - ((monthlyRates + monthlyInsurance + monthlyMaintenance) * 12);
	const netYield = p.purchase_type === 'rent_out' && p.purchase_price > 0
		? (annualNetIncome / p.purchase_price) * 100
		: 0;

	// Break even: rent that covers all costs (mortgage + rates + insurance + maintenance + PM fee)
	// netMonthlyCost = monthlyCosts - (weeklyBreakEven * 52/12 * 0.915) = 0
	// weeklyBreakEven * 52/12 * 0.915 = monthlyCosts
	const breakEvenWeeklyRent = (monthlyCosts / 0.915) / (52 / 12);

	return {
		deposit,
		stampDuty,
		legal,
		inspection,
		totalUpfront,
		loanAmount,
		monthlyMortgage,
		monthlyRates,
		monthlyInsurance,
		monthlyMaintenance,
		monthlyRent,
		monthlyPMFee,
		netMonthlyCost,
		grossYield,
		netYield,
		breakEvenWeeklyRent: Math.round(breakEvenWeeklyRent * 100) / 100
	};
}
