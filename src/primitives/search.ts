import { BasePrimitive, PrimitiveResult } from './types';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../utils/structured-logger';

const execAsync = promisify(exec);
const logger = new Logger('SearchPrimitive');

export class SearchPrimitive extends BasePrimitive {
    public id = 'search';
    public name = 'Search Primitive';

    public async execute(input: {
        query?: string;
        path?: string;
        task?: string;
        step?: number;
        primitive?: string;
    }): Promise<PrimitiveResult> {
        // Use task as query if query is not provided (for orchestration)
        const query = input.query || this.extractSearchTermFromTask(input.task);

        if (!query) {
            return {
                success: false,
                error: 'No query or task provided for search primitive',
            };
        }

        logger.info(`Searching for: "${query}"`);
        const searchPath = input.path || '.';

        try {
            // Use grep -r for cross-platform basic search (should work on mac/linux)
            // Excluding node_modules and .git
            const { stdout } = await execAsync(
                `grep -rIl "${query}" ${searchPath} --exclude-dir={node_modules,.git,.vibe,dist}`
            );

            const files = stdout.split('\n').filter(f => f.trim().length > 0);

            return {
                success: true,
                data: {
                    query,
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
                        query,
                        files: [],
                        matchCount: 0
                    }
                };
            }
            return { success: false, error: error.message };
        }
    }

    /**
     * Extract search terms from a task description.
     * Examples:
     * - "Find documentation for Stripe integration" -> "Stripe"
     * - "Search for payment processing" -> "payment"
     */
    private extractSearchTermFromTask(task?: string): string | undefined {
        if (!task) return undefined;

        const taskLower = task.toLowerCase();

        // Common patterns to extract search terms
        // "find X", "search for X", "look for X", "documentation for X", "integrate X"
        const patterns = [
            /(?:find|search for|look for|documentation for|integrate|integrating)\s+["']?([a-zA-Z0-9_-]+)/i,
            /([a-zA-Z0-9_-]+)\s+(?:documentation|integration|api|sdk)/i,
        ];

        for (const pattern of patterns) {
            const match = task.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        // Fallback: extract notable keywords
        const keywords = ['stripe', 'paypal', 'auth', 'database', 'api', 'payment', 'login', 'user'];
        for (const keyword of keywords) {
            if (taskLower.includes(keyword)) {
                return keyword;
            }
        }

        // Last resort: use first significant word from task
        const words = task.split(/\s+/).filter(w => w.length > 4);
        return words[0] || undefined;
    }
}

