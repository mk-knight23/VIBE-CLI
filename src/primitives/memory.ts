import Database from 'better-sqlite3';
import { BasePrimitive, PrimitiveResult } from './types';
import path from 'path';
import fs from 'fs';

export class MemoryPrimitive extends BasePrimitive {
    public id = 'memory';
    public name = 'Memory Primitive';
    private db: Database.Database;

    constructor() {
        super();
        const dbDir = path.join(process.cwd(), '.vibe');
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        this.db = new Database(path.join(dbDir, 'vibe.db'));
        this.init();
    }

    private init() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory (
        id TEXT PRIMARY KEY,
        key TEXT,
        value TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    }

    public async execute(input: { action: 'store' | 'retrieve' | 'search'; key?: string; value?: string; query?: string }): Promise<PrimitiveResult> {
        try {
            if (input.action === 'store') {
                const id = Math.random().toString(36).substring(7);
                const stmt = this.db.prepare('INSERT INTO memory (id, key, value) VALUES (?, ?, ?)');
                stmt.run(id, input.key, input.value);
                return { success: true, data: { id } };
            } else if (input.action === 'retrieve') {
                const stmt = this.db.prepare('SELECT * FROM memory WHERE key = ? ORDER BY timestamp DESC');
                const results = stmt.all(input.key);
                return { success: true, data: results };
            } else if (input.action === 'search') {
                const stmt = this.db.prepare('SELECT * FROM memory WHERE value LIKE ? OR key LIKE ? ORDER BY timestamp DESC');
                const results = stmt.all(`%${input.query}%`, `%${input.query}%`);
                return { success: true, data: results };
            }
            return { success: false, error: 'Invalid memory action' };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
