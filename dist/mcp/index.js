"use strict";
/**
 * VIBE-CLI v0.0.1 - MCP Manager
 * Model Context Protocol backbone for structured context
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mcpManager = exports.VibeMCPManager = void 0;
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/client/stdio.js");
const config_system_1 = require("../core/config-system");
const structured_logger_1 = require("../utils/structured-logger");
const index_1 = require("../tools/registry/index");
const events_1 = require("events");
const logger = new structured_logger_1.Logger("VibeMCPManager");
class VibeMCPManager extends events_1.EventEmitter {
    connections = new Map();
    constructor() {
        super();
    }
    async initialize() {
        const config = config_system_1.configManager.getConfig();
        const servers = config.mcpServers || {};
        for (const [name, serverConfig] of Object.entries(servers)) {
            if (serverConfig.disabled)
                continue;
            try {
                await this.connectToServer(name, serverConfig);
            }
            catch (error) {
                logger.error(`Failed to connect to MCP server ${name}: ${error.message}`);
            }
        }
    }
    async connectToServer(name, config) {
        logger.info(`Connecting to MCP server: ${name} (${config.command})`);
        const env = {};
        for (const [key, value] of Object.entries(process.env)) {
            if (value !== undefined)
                env[key] = value;
        }
        if (config.env) {
            Object.assign(env, config.env);
        }
        const transport = new stdio_js_1.StdioClientTransport({
            command: config.command,
            args: config.args,
            env: env
        });
        const client = new index_js_1.Client({
            name: "vibe-ai-teammate",
            version: "0.0.2",
        }, {
            capabilities: {},
        });
        await client.connect(transport);
        this.connections.set(name, { client, transport, name });
        // Register tools from this server
        try {
            const { tools } = await client.listTools();
            for (const tool of tools) {
                index_1.toolRegistry.register({
                    name: `${name}_${tool.name}`,
                    description: tool.description || "",
                    category: "code",
                    schema: {
                        type: "object",
                        properties: tool.inputSchema.properties || {},
                        required: tool.inputSchema.required || []
                    },
                    riskLevel: "medium",
                    requiresApproval: true,
                    handler: async (args) => {
                        const result = await client.callTool({
                            name: tool.name,
                            arguments: args
                        });
                        return {
                            success: !result.isError,
                            output: JSON.stringify(result.content, null, 2),
                            duration: 0
                        };
                    }
                });
            }
            logger.info(`Connected to ${name} and registered ${tools.length} tools`);
        }
        catch (e) {
            logger.warn(`Connected to ${name} but failed to list tools`);
        }
        this.emit('connect', { server: name });
    }
    async shutdown() {
        for (const connection of this.connections.values()) {
            await connection.transport.close();
        }
        this.connections.clear();
    }
    listServers() {
        return Array.from(this.connections.keys());
    }
    isConnected(name) {
        return this.connections.has(name);
    }
}
exports.VibeMCPManager = VibeMCPManager;
// Export singleton
exports.mcpManager = new VibeMCPManager();
//# sourceMappingURL=index.js.map