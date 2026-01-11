import { BasePrimitive, PrimitiveResult } from './types';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../utils/structured-logger';

const execAsync = promisify(exec);
const logger = new Logger('SearchPrimitive');

export class SearchPrimitive extends BasePrimitive {
    public id = 'search';
    public name = 'Search Primitive';

    public async execute(input: { query: string; path?: string }): Promise<PrimitiveResult> {
        logger.info(`Searching for: "${input.query}"`);
        const searchPath = input.path || '.';

        try {
            // Use grep -r for cross-platform basic search (should work on mac/linux)
            // Excluding node_modules and .git
            const { stdout } = await execAsync(
                `grep -rIl "${input.query}" ${searchPath} --exclude-dir={node_modules,.git,.vibe,dist}`
            );

            const files = stdout.split('\n').filter(f => f.trim().length > 0);

            return {
                success: true,
                data: {
                    query: input.query,
                    files: files.slice(0, 20), // Limit to top 20 files
                    matchCount: files.length
                }
            };
        } catch (error: any) {
            // grep returns exit code 1 if no matches found
            if (error.code === 1) {
                return {
                    success: true,
                    data: {
                        query: input.query,
                        files: [],
                        matchCount: 0
                    }
                };
            }
            return { success: false, error: error.message };
        }
    }
}
