import { ScenarioRepository } from './sqlite/ScenarioRepository.js';
import { IncomeRepository } from './sqlite/IncomeRepository.js';
import { ExpenseRepository } from './sqlite/ExpenseRepository.js';
import { AssetRepository } from './sqlite/AssetRepository.js';
import { LiabilityRepository } from './sqlite/LiabilityRepository.js';
import { PropertyRepository } from './sqlite/PropertyRepository.js';
import { VehicleRepository } from './sqlite/VehicleRepository.js';

export const repositories = {
	scenarios: new ScenarioRepository(),
	income: new IncomeRepository(),
	expenses: new ExpenseRepository(),
	assets: new AssetRepository(),
	liabilities: new LiabilityRepository(),
	properties: new PropertyRepository(),
	vehicles: new VehicleRepository()
};

export type Repositories = typeof repositories;

export type {
	Scenario, IncomeSource, Expense, Asset, Liability, Property, Vehicle,
	Frequency, IncomeType, ExpenseCategory, AssetType, LiabilityType, PurchaseMethod, PurchaseType,
	CreateScenarioInput, UpdateScenarioInput,
	CreateIncomeInput, UpdateIncomeInput,
	CreateExpenseInput, UpdateExpenseInput,
	CreateAssetInput, UpdateAssetInput,
	CreateLiabilityInput, UpdateLiabilityInput,
	CreatePropertyInput, UpdatePropertyInput,
	CreateVehicleInput, UpdateVehicleInput
} from './types.js';
