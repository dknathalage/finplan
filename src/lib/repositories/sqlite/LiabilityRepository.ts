import { execute, query } from '$lib/db/connection.svelte.js';
import { save } from '$lib/db/connection.svelte.js';
import { logAudit } from '$lib/db/audit.js';
import type { Liability, CreateLiabilityInput, UpdateLiabilityInput, LiabilityType } from '../types.js';

function row(r: Record<string, unknown>): Liability {
	return {
		id: r.id as string,
		name: r.name as string,
		balance: r.balance as number,
		interest_rate: r.interest_rate as number,
		monthly_payment: r.monthly_payment as number,
		type: r.type as LiabilityType,
		notes: r.notes as string | undefined
	};
}

export class LiabilityRepository {
	getAll(): Liability[] {
		return query<Record<string, unknown>>('SELECT * FROM liabilities ORDER BY type, name ASC').map(row);
	}

	getById(id: string): Liability | null {
		const rows = query<Record<string, unknown>>('SELECT * FROM liabilities WHERE id=?', [id]);
		return rows.length ? row(rows[0]) : null;
	}

	getTotalBalance(): number {
		const rows = query<Record<string, unknown>>('SELECT COALESCE(SUM(balance),0) as total FROM liabilities');
		return (rows[0]?.total as number) ?? 0;
	}

	getTotalMonthlyPayment(): number {
		const rows = query<Record<string, unknown>>('SELECT COALESCE(SUM(monthly_payment),0) as total FROM liabilities');
		return (rows[0]?.total as number) ?? 0;
	}

	async create(data: CreateLiabilityInput): Promise<string> {
		const id = crypto.randomUUID();
		execute(
			'INSERT INTO liabilities (id, name, balance, interest_rate, monthly_payment, type, notes) VALUES (?,?,?,?,?,?,?)',
			[id, data.name, data.balance, data.interest_rate, data.monthly_payment, data.type, data.notes ?? null]
		);
		logAudit({ entity_type: 'liability', entity_id: id, action: 'create' });
		await save();
		return id;
	}

	async update(id: string, data: UpdateLiabilityInput): Promise<void> {
		execute(
			'UPDATE liabilities SET name=?, balance=?, interest_rate=?, monthly_payment=?, type=?, notes=? WHERE id=?',
			[data.name, data.balance, data.interest_rate, data.monthly_payment, data.type, data.notes ?? null, id]
		);
		logAudit({ entity_type: 'liability', entity_id: id, action: 'update' });
		await save();
	}

	async delete(id: string): Promise<void> {
		execute('DELETE FROM liabilities WHERE id=?', [id]);
		logAudit({ entity_type: 'liability', entity_id: id, action: 'delete' });
		await save();
	}
}
