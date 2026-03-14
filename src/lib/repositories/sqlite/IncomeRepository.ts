import { execute, query } from '$lib/db/connection.svelte.js';
import { save } from '$lib/db/connection.svelte.js';
import { logAudit } from '$lib/db/audit.js';
import type { IncomeSource, CreateIncomeInput, UpdateIncomeInput, Frequency, IncomeType } from '../types.js';

function row(r: Record<string, unknown>): IncomeSource {
	return {
		id: r.id as string,
		scenario_id: r.scenario_id as string,
		name: r.name as string,
		amount: r.amount as number,
		frequency: r.frequency as Frequency,
		type: r.type as IncomeType,
		is_active: Boolean(r.is_active),
		starts_at: r.starts_at as string | undefined,
		ends_at: r.ends_at as string | undefined
	};
}

export class IncomeRepository {
	getByScenario(scenarioId: string): IncomeSource[] {
		return query<Record<string, unknown>>(
			'SELECT * FROM income_sources WHERE scenario_id=? ORDER BY name ASC',
			[scenarioId]
		).map(row);
	}

	getById(id: string): IncomeSource | null {
		const rows = query<Record<string, unknown>>('SELECT * FROM income_sources WHERE id=?', [id]);
		return rows.length ? row(rows[0]) : null;
	}

	async create(data: CreateIncomeInput): Promise<string> {
		const id = crypto.randomUUID();
		execute(
			'INSERT INTO income_sources (id, scenario_id, name, amount, frequency, type, is_active, starts_at, ends_at) VALUES (?,?,?,?,?,?,?,?,?)',
			[id, data.scenario_id, data.name, data.amount, data.frequency, data.type, data.is_active ? 1 : 0, data.starts_at ?? null, data.ends_at ?? null]
		);
		logAudit({ entity_type: 'income_source', entity_id: id, action: 'create' });
		await save();
		return id;
	}

	async update(id: string, data: UpdateIncomeInput): Promise<void> {
		execute(
			'UPDATE income_sources SET scenario_id=?, name=?, amount=?, frequency=?, type=?, is_active=?, starts_at=?, ends_at=? WHERE id=?',
			[data.scenario_id, data.name, data.amount, data.frequency, data.type, data.is_active ? 1 : 0, data.starts_at ?? null, data.ends_at ?? null, id]
		);
		logAudit({ entity_type: 'income_source', entity_id: id, action: 'update' });
		await save();
	}

	async delete(id: string): Promise<void> {
		execute('DELETE FROM income_sources WHERE id=?', [id]);
		logAudit({ entity_type: 'income_source', entity_id: id, action: 'delete' });
		await save();
	}
}
