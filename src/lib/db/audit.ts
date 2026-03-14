import { execute } from './connection.svelte.js';

export type AuditEntityType =
	| 'scenario'
	| 'income_source'
	| 'expense'
	| 'asset'
	| 'liability'
	| 'property'
	| 'vehicle';

export type AuditAction =
	| 'create'
	| 'update'
	| 'delete'
	| 'bulk_delete';

export function logAudit(params: {
	entity_type: AuditEntityType;
	entity_id: string;
	action: AuditAction;
	changes?: Record<string, { old: unknown; new: unknown }>;
}): void {
	execute(
		`INSERT INTO audit_log (id, entity_type, entity_id, action, changes) VALUES (?, ?, ?, ?, ?)`,
		[
			crypto.randomUUID(),
			params.entity_type,
			params.entity_id,
			params.action,
			params.changes ? JSON.stringify(params.changes) : '{}'
		]
	);
}

export function computeChanges(
	oldObj: Record<string, unknown>,
	newObj: Record<string, unknown>,
	fields: string[]
): Record<string, { old: unknown; new: unknown }> {
	const changes: Record<string, { old: unknown; new: unknown }> = {};
	for (const field of fields) {
		const oldVal = oldObj[field];
		const newVal = newObj[field];
		if (oldVal !== newVal) {
			changes[field] = { old: oldVal, new: newVal };
		}
	}
	return changes;
}
