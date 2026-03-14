import { execute, query } from '$lib/db/connection.svelte.js';
import { save } from '$lib/db/connection.svelte.js';
import { logAudit } from '$lib/db/audit.js';
import type { Scenario, CreateScenarioInput, UpdateScenarioInput } from '../types.js';

function row(r: Record<string, unknown>): Scenario {
	return {
		id: r.id as string,
		name: r.name as string,
		description: r.description as string | undefined,
		is_baseline: Boolean(r.is_baseline),
		created_at: r.created_at as string
	};
}

export class ScenarioRepository {
	getAll(): Scenario[] {
		return query<Record<string, unknown>>('SELECT * FROM scenarios ORDER BY created_at ASC').map(row);
	}

	getById(id: string): Scenario | null {
		const rows = query<Record<string, unknown>>('SELECT * FROM scenarios WHERE id = ?', [id]);
		return rows.length ? row(rows[0]) : null;
	}

	getBaseline(): Scenario | null {
		const rows = query<Record<string, unknown>>('SELECT * FROM scenarios WHERE is_baseline = 1 LIMIT 1');
		return rows.length ? row(rows[0]) : null;
	}

	async create(data: CreateScenarioInput): Promise<string> {
		const id = crypto.randomUUID();
		execute(
			'INSERT INTO scenarios (id, name, description, is_baseline) VALUES (?, ?, ?, ?)',
			[id, data.name, data.description ?? null, data.is_baseline ? 1 : 0]
		);
		logAudit({ entity_type: 'scenario', entity_id: id, action: 'create' });
		await save();
		return id;
	}

	async update(id: string, data: UpdateScenarioInput): Promise<void> {
		execute(
			'UPDATE scenarios SET name=?, description=?, is_baseline=? WHERE id=?',
			[data.name, data.description ?? null, data.is_baseline ? 1 : 0, id]
		);
		logAudit({ entity_type: 'scenario', entity_id: id, action: 'update' });
		await save();
	}

	async delete(id: string): Promise<void> {
		execute('DELETE FROM scenarios WHERE id=?', [id]);
		logAudit({ entity_type: 'scenario', entity_id: id, action: 'delete' });
		await save();
	}
}
