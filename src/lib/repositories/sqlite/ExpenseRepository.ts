import { execute, query } from '$lib/db/connection.svelte.js';
import { save } from '$lib/db/connection.svelte.js';
import { logAudit } from '$lib/db/audit.js';
import type { Expense, CreateExpenseInput, UpdateExpenseInput, Frequency, ExpenseCategory } from '../types.js';

function row(r: Record<string, unknown>): Expense {
	return {
		id: r.id as string,
		scenario_id: r.scenario_id as string,
		name: r.name as string,
		amount: r.amount as number,
		frequency: r.frequency as Frequency,
		category: r.category as ExpenseCategory,
		is_fixed: Boolean(r.is_fixed)
	};
}

export class ExpenseRepository {
	getByScenario(scenarioId: string): Expense[] {
		return query<Record<string, unknown>>(
			'SELECT * FROM expenses WHERE scenario_id=? ORDER BY category, name ASC',
			[scenarioId]
		).map(row);
	}

	getByCategory(scenarioId: string, category: ExpenseCategory): Expense[] {
		return query<Record<string, unknown>>(
			'SELECT * FROM expenses WHERE scenario_id=? AND category=? ORDER BY name ASC',
			[scenarioId, category]
		).map(row);
	}

	getById(id: string): Expense | null {
		const rows = query<Record<string, unknown>>('SELECT * FROM expenses WHERE id=?', [id]);
		return rows.length ? row(rows[0]) : null;
	}

	async create(data: CreateExpenseInput): Promise<string> {
		const id = crypto.randomUUID();
		execute(
			'INSERT INTO expenses (id, scenario_id, name, amount, frequency, category, is_fixed) VALUES (?,?,?,?,?,?,?)',
			[id, data.scenario_id, data.name, data.amount, data.frequency, data.category, data.is_fixed ? 1 : 0]
		);
		logAudit({ entity_type: 'expense', entity_id: id, action: 'create' });
		await save();
		return id;
	}

	async update(id: string, data: UpdateExpenseInput): Promise<void> {
		execute(
			'UPDATE expenses SET scenario_id=?, name=?, amount=?, frequency=?, category=?, is_fixed=? WHERE id=?',
			[data.scenario_id, data.name, data.amount, data.frequency, data.category, data.is_fixed ? 1 : 0, id]
		);
		logAudit({ entity_type: 'expense', entity_id: id, action: 'update' });
		await save();
	}

	async delete(id: string): Promise<void> {
		execute('DELETE FROM expenses WHERE id=?', [id]);
		logAudit({ entity_type: 'expense', entity_id: id, action: 'delete' });
		await save();
	}
}
