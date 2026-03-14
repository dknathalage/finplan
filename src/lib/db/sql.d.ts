declare module 'sql.js' {
	export interface SqlJsStatic {
		Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
	}

	export interface Database {
		run(sql: string, params?: BindParams): Database;
		exec(sql: string): QueryExecResult[];
		prepare(sql: string): Statement;
		export(): Uint8Array;
		close(): void;
		getRowsModified(): number;
	}

	export interface Statement {
		bind(params?: BindParams): boolean;
		step(): boolean;
		getAsObject(params?: BindParams): Record<string, SqlValue>;
		free(): boolean;
		reset(): void;
	}

	export interface QueryExecResult {
		columns: string[];
		values: SqlValue[][];
	}

	export type SqlValue = number | string | Uint8Array | null;
	export type BindParams = SqlValue[] | Record<string, SqlValue> | null;

	export default function initSqlJs(config?: { locateFile?: (file: string) => string }): Promise<SqlJsStatic>;
}
