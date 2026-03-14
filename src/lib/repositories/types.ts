export type Frequency = 'weekly' | 'fortnightly' | 'monthly' | 'annually'
export type IncomeType = 'salary' | 'rental' | 'business' | 'investment' | 'other'
export type ExpenseCategory = 'housing' | 'transport' | 'food' | 'utilities' | 'insurance' | 'subscriptions' | 'childcare' | 'education' | 'health' | 'entertainment' | 'savings' | 'debt' | 'other'
export type AssetType = 'property' | 'vehicle' | 'cash' | 'shares' | 'super' | 'other'
export type LiabilityType = 'mortgage' | 'personal_loan' | 'car_loan' | 'credit_card' | 'student_loan' | 'other'
export type PurchaseMethod = 'cash' | 'finance' | 'lease'
export type PurchaseType = 'move_in' | 'rent_out'

export interface Scenario { id: string; name: string; description?: string; is_baseline: boolean; created_at: string }
export interface IncomeSource { id: string; scenario_id: string; name: string; amount: number; frequency: Frequency; type: IncomeType; is_active: boolean; starts_at?: string; ends_at?: string }
export interface Expense { id: string; scenario_id: string; name: string; amount: number; frequency: Frequency; category: ExpenseCategory; is_fixed: boolean }
export interface Asset { id: string; name: string; value: number; type: AssetType; notes?: string; as_of: string }
export interface Liability { id: string; name: string; balance: number; interest_rate: number; monthly_payment: number; type: LiabilityType; notes?: string }
export interface Property { id: string; name: string; purchase_price: number; deposit_pct: number; interest_rate: number; loan_term_years: number; weekly_rent?: number; annual_expenses_pct: number; purchase_type: PurchaseType; state: string; is_first_home: boolean; notes?: string }
export interface Vehicle { id: string; name: string; purchase_price: number; purchase_method: PurchaseMethod; finance_rate?: number; finance_term_months?: number; annual_running_cost: number; notes?: string }

// Input types (omit id, system fields)
export type CreateScenarioInput = Omit<Scenario, 'id' | 'created_at'>
export type UpdateScenarioInput = Omit<Scenario, 'id' | 'created_at'>
export type CreateIncomeInput = Omit<IncomeSource, 'id'>
export type UpdateIncomeInput = Omit<IncomeSource, 'id'>
export type CreateExpenseInput = Omit<Expense, 'id'>
export type UpdateExpenseInput = Omit<Expense, 'id'>
export type CreateAssetInput = Omit<Asset, 'id'>
export type UpdateAssetInput = Omit<Asset, 'id'>
export type CreateLiabilityInput = Omit<Liability, 'id'>
export type UpdateLiabilityInput = Omit<Liability, 'id'>
export type CreatePropertyInput = Omit<Property, 'id'>
export type UpdatePropertyInput = Omit<Property, 'id'>
export type CreateVehicleInput = Omit<Vehicle, 'id'>
export type UpdateVehicleInput = Omit<Vehicle, 'id'>
