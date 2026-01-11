/**
 * VIBE-CLI v0.0.1 - Shared Readline Interface
 *
 * SINGLETON: Only one readline interface for the entire application.
 * Prevents duplicate input / character echo issues.
 */
import readline from 'readline';
export declare let rl: readline.Interface;
/**
 * Update the completer function
 */
export declare function setCompleter(newCompleter: readline.Completer): void;
/**
 * Prompt helper - uses the shared readline interface
 */
export declare function prompt(question: string): Promise<string>;
/**
 * Yes/No prompt helper
 */
export declare function promptYesNo(question: string): Promise<boolean>;
/**
 * Number prompt helper
 */
export declare function promptNumber(question: string, min: number, max: number): Promise<number>;
/**
 * Write a chunk to stdout without a newline
 */
export declare function writeStreamChunk(chunk: string): void;
/**
 * Draw a decorative box around text
 */
export declare function drawBox(text: string, color?: (s: string) => string): void;
//# sourceMappingURL=ui.d.ts.map