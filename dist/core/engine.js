"use strict";
/**
 * VIBE-CLI v0.0.1 - Core Engine
 * Main orchestrator for the CLI
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VibeCoreEngine = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const chalk_1 = __importDefault(require("chalk"));
const module_loader_1 = require("./module.loader");
const router_1 = require("../providers/router");
const memory_1 = require("../memory");
const config_1 = require("../config");
const tui_1 = require("../tui");
const agents_1 = require("../agents");
class VibeCoreEngine {
    moduleLoader;
    provider;
    memory;
    configManager;
    agentExecutor = null;
    session = null;
    cli = null;
    initialized = false;
    modulesLoaded = false;
    VERSION = '0.0.1';
    constructor(config) {
        const modulesDir = config?.modulesDir || path.join(__dirname, '..', 'modules');
        this.moduleLoader = new module_loader_1.ModuleLoader(modulesDir);
        this.provider = new router_1.VibeProviderRouter();
        this.memory = new memory_1.VibeMemoryManager();
        this.configManager = new config_1.VibeConfigManager(this.provider);
    }
    /**
     * Initialize the engine
     */
    async initialize() {
        console.log(chalk_1.default.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   V I B E   v${this.VERSION}                                        ║
║   Initializing Core Engine...                                 ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `));
        try {
            // Step 1: Load configuration
            console.log(chalk_1.default.gray('  1/6 Loading configuration...'));
            this.configManager = new config_1.VibeConfigManager(this.provider);
            this.configManager.loadConfig();
            console.log(chalk_1.default.green('    ✓ Configuration loaded'));
            // Step 2: Initialize provider
            console.log(chalk_1.default.gray('  2/6 Initializing AI provider...'));
            const status = this.provider.getStatus();
            const keyStatus = this.provider.isProviderConfigured(status.provider)
                ? chalk_1.default.green('configured')
                : chalk_1.default.yellow('not configured');
            console.log(chalk_1.default.green(`    ✓ Provider: ${status.provider}/${status.model} (${keyStatus})`));
            // Step 3: Initialize memory
            console.log(chalk_1.default.gray('  3/6 Initializing memory...'));
            const memoryCount = this.memory.getEntryCount();
            console.log(chalk_1.default.green(`    ✓ Memory: ${memoryCount} entries`));
            // Step 4: Load modules (unless skipped)
            console.log(chalk_1.default.gray('  4/6 Loading modules...'));
            await this.moduleLoader.loadAll();
            this.modulesLoaded = true;
            const stats = this.moduleLoader.getStats();
            console.log(chalk_1.default.green(`    ✓ Modules: ${stats.loaded}/${stats.total} loaded`));
            // Step 5: Initialize Agent System
            console.log(chalk_1.default.gray('  5/6 Initializing agent system...'));
            this.agentExecutor = new agents_1.VibeAgentExecutor(this.provider, this.memory);
            console.log(chalk_1.default.green(`    ✓ Agent System: v0.0.1 ready`));
            // Step 6: Create session
            console.log(chalk_1.default.gray('  6/6 Creating session...'));
            this.session = this.loadOrCreateSession();
            console.log(chalk_1.default.green(`    ✓ Session: ${this.session.id}`));
            this.initialized = true;
            console.log(chalk_1.default.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ✓ Initialization complete!                                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
      `));
            return true;
        }
        catch (error) {
            console.error(chalk_1.default.red('\n✗ Initialization failed:'), error);
            return false;
        }
    }
    /**
     * Load or create a session
     */
    loadOrCreateSession() {
        const sessionDir = path.join(process.cwd(), '.vibe');
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }
        const sessionFile = path.join(sessionDir, 'session.json');
        if (fs.existsSync(sessionFile)) {
            try {
                const data = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
                return {
                    ...data,
                    lastActivity: new Date(),
                };
            }
            catch (e) {
                // Fallback to new session
            }
        }
        const session = {
            id: `session-${Date.now()}`,
            projectRoot: process.cwd(),
            createdAt: new Date(),
            lastActivity: new Date(),
        };
        this.saveSession(session);
        return session;
    }
    /**
     * Save session
     */
    saveSession(session) {
        const sessionDir = path.join(process.cwd(), '.vibe');
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }
        fs.writeFileSync(path.join(sessionDir, 'session.json'), JSON.stringify(session, null, 2));
    }
    /**
     * Start interactive mode
     */
    async startInteractiveMode() {
        if (!this.initialized) {
            const success = await this.initialize();
            if (!success) {
                console.error(chalk_1.default.red('Failed to initialize engine'));
                process.exit(1);
            }
        }
        // Run first-time setup if needed
        await this.configManager.runFirstTimeSetup();
        await this.configManager.checkAndPromptForKeys();
        // Create CLI engine
        this.cli = new tui_1.CLIEngine(this.provider, this.memory);
        // Start CLI
        await this.cli.start();
    }
    /**
     * Get engine status
     */
    getStatus() {
        const providerStatus = this.provider.getStatus();
        const moduleStats = this.moduleLoader.getStats();
        return {
            initialized: this.initialized,
            modulesLoaded: this.modulesLoaded,
            sessionActive: this.session !== null,
            moduleCount: moduleStats.loaded,
            provider: providerStatus.provider,
            model: providerStatus.model,
            version: this.VERSION,
        };
    }
    /**
     * Execute a command through the agent pipeline
     */
    async executeCommand(input) {
        if (!this.initialized || !this.agentExecutor) {
            return { success: false, error: 'Engine not initialized' };
        }
        try {
            const result = await this.agentExecutor.executePipeline({
                task: input,
                context: {},
                approvalMode: 'prompt',
            });
            return {
                success: result.success,
                result: {
                    output: result.output,
                    artifacts: result.artifacts,
                    steps: result.steps,
                },
                error: result.error,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Get provider
     */
    getProvider() {
        return this.provider;
    }
    /**
     * Get memory
     */
    getMemory() {
        return this.memory;
    }
    /**
     * Get agent executor
     */
    getAgentExecutor() {
        return this.agentExecutor;
    }
    /**
     * Shutdown engine
     */
    async shutdown() {
        console.log(chalk_1.default.cyan('\nShutting down VIBE...'));
        if (this.session) {
            this.session.lastActivity = new Date();
            this.saveSession(this.session);
        }
        console.log(chalk_1.default.green('  ✓ Session saved'));
        console.log(chalk_1.default.green('  ✓ Memory persisted'));
        console.log(chalk_1.default.green('  ✓ Engine shut down\n'));
        console.log(chalk_1.default.cyan('Goodbye! Happy coding! 👋\n'));
    }
}
exports.VibeCoreEngine = VibeCoreEngine;
//# sourceMappingURL=engine.js.map