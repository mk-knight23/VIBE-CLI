"use strict";
/**
 * VIBE-CLI v0.0.1 - Shared Readline Interface
 *
 * SINGLETON: Only one readline interface for the entire application.
 * Prevents duplicate input / character echo issues.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rl = void 0;
exports.setCompleter = setCompleter;
exports.prompt = prompt;
exports.promptYesNo = promptYesNo;
exports.promptNumber = promptNumber;
exports.writeStreamChunk = writeStreamChunk;
exports.drawBox = drawBox;
const readline_1 = __importDefault(require("readline"));
let completer = (line) => [[], line];
exports.rl = readline_1.default.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    completer: (line) => completer(line),
});
/**
 * Update the completer function
 */
function setCompleter(newCompleter) {
    completer = newCompleter;
}
/**
 * Prompt helper - uses the shared readline interface
 */
function prompt(question) {
    return new Promise((resolve) => {
        exports.rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}
/**
 * Yes/No prompt helper
 */
function promptYesNo(question) {
    return new Promise((resolve) => {
        exports.rl.question(`${question} (y/n) `, (answer) => {
            resolve(answer.toLowerCase().startsWith('y'));
        });
    });
}
/**
 * Number prompt helper
 */
function promptNumber(question, min, max) {
    return new Promise((resolve) => {
        exports.rl.question(`${question} [${min}-${max}]: `, (answer) => {
            const num = parseInt(answer, 10);
            if (isNaN(num) || num < min || num > max) {
                resolve(promptNumber(question, min, max));
            }
            else {
                resolve(num);
            }
        });
    });
}
/**
 * Write a chunk to stdout without a newline
 */
function writeStreamChunk(chunk) {
    process.stdout.write(chunk);
}
/**
 * Draw a decorative box around text
 */
function drawBox(text, color = (s) => s) {
    const lines = text.split('\n');
    const width = Math.max(...lines.map((l) => l.length)) + 4;
    const top = color('╔' + '═'.repeat(width - 2) + '╗');
    const bottom = color('╚' + '═'.repeat(width - 2) + '╝');
    console.log(top);
    for (const line of lines) {
        console.log(color('║ ') + line.padEnd(width - 4) + color(' ║'));
    }
    console.log(bottom);
}
//# sourceMappingURL=ui.js.map