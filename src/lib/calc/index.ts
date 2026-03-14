export {
	monthlyAmount,
	calculateCashFlow,
	calculateNetWorth,
	projectCashFlow,
	calculateRunway
} from './projections.js';
export type { CashFlow, NetWorth, CashFlowProjection } from './projections.js';

export {
	calculateStampDuty,
	calculateMortgagePayment,
	analyseProperty
} from './property.js';
export type { PropertyAnalysis } from './property.js';

export {
	calculateFinancePayment,
	calculateTotalCost,
	compareVehicleOptions
} from './vehicle.js';
export type { VehicleCostSummary, VehicleComparison } from './vehicle.js';
