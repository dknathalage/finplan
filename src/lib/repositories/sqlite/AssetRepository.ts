import { execute, query } from '$lib/db/connection.svelte.js';
import { save } from '$lib/db/connection.svelte.js';
import { logAudit } from '$lib/db/audit.js';
import type { Asset, CreateAssetInput, UpdateAssetInput, AssetType } from '../types.js';

function row(r: Record<string, unknown>): Asset {
	return {
		id: r.id as string,
		name: r.name as string,
		value: r.value as number,
		type: r.type as AssetType,
		notes: r.notes as string | undefined,
		as_of: r.as_of as string
	};
}

export class AssetRepository {
	getAll(): Asset[] {
		return query<Record<string, unknown>>('SELECT * FROM assets ORDER BY type, name ASC').map(row);
	}

	getByType(type: AssetType): Asset[] {
		return query<Record<string, unknown>>('SELECT * FROM assets WHERE type=? ORDER BY name ASC', [type]).map(row);
	}

	getById(id: string): Asset | null {
		const rows = query<Record<string, unknown>>('SELECT * FROM assets WHERE id=?', [id]);
		return rows.length ? row(rows[0]) : null;
	}

	getTotalValue(): number {
		const rows = query<Record<string, unknown>>('SELECT COALESCE(SUM(value),0) as total FROM assets');
		return (rows[0]?.total as number) ?? 0;
	}

	async create(data: CreateAssetInput): Promise<string> {
		const id = crypto.randomUUID();
		execute(
			'INSERT INTO assets (id, name, value, type, notes, as_of) VALUES (?,?,?,?,?,?)',
			[id, data.name, data.value, data.type, data.notes ?? null, data.as_of]
		);
		logAudit({ entity_type: 'asset', entity_id: id, action: 'create' });
		await save();
		return id;
	}

	async update(id: string, data: UpdateAssetInput): Promise<void> {
		execute(
			'UPDATE assets SET name=?, value=?, type=?, notes=?, as_of=? WHERE id=?',
			[data.name, data.value, data.type, data.notes ?? null, data.as_of, id]
		);
		logAudit({ entity_type: 'asset', entity_id: id, action: 'update' });
		await save();
	}

	async delete(id: string): Promise<void> {
		execute('DELETE FROM assets WHERE id=?', [id]);
		logAudit({ entity_type: 'asset', entity_id: id, action: 'delete' });
		await save();
	}
}
