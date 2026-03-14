import { execute, query } from '$lib/db/connection.svelte.js';
import { save } from '$lib/db/connection.svelte.js';
import { logAudit } from '$lib/db/audit.js';
import type { Property, CreatePropertyInput, UpdatePropertyInput, PurchaseType } from '../types.js';

function row(r: Record<string, unknown>): Property {
	return {
		id: r.id as string,
		name: r.name as string,
		purchase_price: r.purchase_price as number,
		deposit_pct: r.deposit_pct as number,
		interest_rate: r.interest_rate as number,
		loan_term_years: r.loan_term_years as number,
		weekly_rent: r.weekly_rent as number | undefined,
		annual_expenses_pct: r.annual_expenses_pct as number,
		purchase_type: r.purchase_type as PurchaseType,
		state: r.state as string,
		is_first_home: Boolean(r.is_first_home),
		notes: r.notes as string | undefined
	};
}

export class PropertyRepository {
	getAll(): Property[] {
		return query<Record<string, unknown>>('SELECT * FROM properties ORDER BY name ASC').map(row);
	}

	getById(id: string): Property | null {
		const rows = query<Record<string, unknown>>('SELECT * FROM properties WHERE id=?', [id]);
		return rows.length ? row(rows[0]) : null;
	}

	async create(data: CreatePropertyInput): Promise<string> {
		const id = crypto.randomUUID();
		execute(
			'INSERT INTO properties (id, name, purchase_price, deposit_pct, interest_rate, loan_term_years, weekly_rent, annual_expenses_pct, purchase_type, state, is_first_home, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
			[id, data.name, data.purchase_price, data.deposit_pct, data.interest_rate, data.loan_term_years, data.weekly_rent ?? null, data.annual_expenses_pct, data.purchase_type, data.state, data.is_first_home ? 1 : 0, data.notes ?? null]
		);
		logAudit({ entity_type: 'property', entity_id: id, action: 'create' });
		await save();
		return id;
	}

	async update(id: string, data: UpdatePropertyInput): Promise<void> {
		execute(
			'UPDATE properties SET name=?, purchase_price=?, deposit_pct=?, interest_rate=?, loan_term_years=?, weekly_rent=?, annual_expenses_pct=?, purchase_type=?, state=?, is_first_home=?, notes=? WHERE id=?',
			[data.name, data.purchase_price, data.deposit_pct, data.interest_rate, data.loan_term_years, data.weekly_rent ?? null, data.annual_expenses_pct, data.purchase_type, data.state, data.is_first_home ? 1 : 0, data.notes ?? null, id]
		);
		logAudit({ entity_type: 'property', entity_id: id, action: 'update' });
		await save();
	}

	async delete(id: string): Promise<void> {
		execute('DELETE FROM properties WHERE id=?', [id]);
		logAudit({ entity_type: 'property', entity_id: id, action: 'delete' });
		await save();
	}
}
