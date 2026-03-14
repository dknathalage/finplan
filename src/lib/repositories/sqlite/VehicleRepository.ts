import { execute, query } from '$lib/db/connection.svelte.js';
import { save } from '$lib/db/connection.svelte.js';
import { logAudit } from '$lib/db/audit.js';
import type { Vehicle, CreateVehicleInput, UpdateVehicleInput, PurchaseMethod } from '../types.js';

function row(r: Record<string, unknown>): Vehicle {
	return {
		id: r.id as string,
		name: r.name as string,
		purchase_price: r.purchase_price as number,
		purchase_method: r.purchase_method as PurchaseMethod,
		finance_rate: r.finance_rate as number | undefined,
		finance_term_months: r.finance_term_months as number | undefined,
		annual_running_cost: r.annual_running_cost as number,
		notes: r.notes as string | undefined
	};
}

export class VehicleRepository {
	getAll(): Vehicle[] {
		return query<Record<string, unknown>>('SELECT * FROM vehicles ORDER BY name ASC').map(row);
	}

	getById(id: string): Vehicle | null {
		const rows = query<Record<string, unknown>>('SELECT * FROM vehicles WHERE id=?', [id]);
		return rows.length ? row(rows[0]) : null;
	}

	async create(data: CreateVehicleInput): Promise<string> {
		const id = crypto.randomUUID();
		execute(
			'INSERT INTO vehicles (id, name, purchase_price, purchase_method, finance_rate, finance_term_months, annual_running_cost, notes) VALUES (?,?,?,?,?,?,?,?)',
			[id, data.name, data.purchase_price, data.purchase_method, data.finance_rate ?? null, data.finance_term_months ?? null, data.annual_running_cost, data.notes ?? null]
		);
		logAudit({ entity_type: 'vehicle', entity_id: id, action: 'create' });
		await save();
		return id;
	}

	async update(id: string, data: UpdateVehicleInput): Promise<void> {
		execute(
			'UPDATE vehicles SET name=?, purchase_price=?, purchase_method=?, finance_rate=?, finance_term_months=?, annual_running_cost=?, notes=? WHERE id=?',
			[data.name, data.purchase_price, data.purchase_method, data.finance_rate ?? null, data.finance_term_months ?? null, data.annual_running_cost, data.notes ?? null, id]
		);
		logAudit({ entity_type: 'vehicle', entity_id: id, action: 'update' });
		await save();
	}

	async delete(id: string): Promise<void> {
		execute('DELETE FROM vehicles WHERE id=?', [id]);
		logAudit({ entity_type: 'vehicle', entity_id: id, action: 'delete' });
		await save();
	}
}
