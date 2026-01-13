/**
 * VIBE-CLI v0.0.1 - MCP Manager
 * Model Context Protocol backbone for structured context
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { configManager } from "../core/config-system";
import { Logger } from "../utils/structured-logger";
import { toolRegistry } from "../tools/registry/index";
import { EventEmitter } from 'events';

const logger = new Logger("VibeMCPManager");

export interface MCPServerConnection {
  client: Client;
  transport: StdioClientTransport;
  name: string;
}

export class VibeMCPManager extends EventEmitter {
  private connections: Map<string, MCPServerConnection> = new Map();

  constructor() {
    super();
  }

  public async initialize(): Promise<void> {
    const config = configManager.getConfig();
    const servers = (config as any).mcpServers || {};

    for (const [name, serverConfig] of Object.entries(servers)) {
      if ((serverConfig as any).disabled) continue;

      try {
        await this.connectToServer(name, serverConfig as any);
      } catch (error: any) {
        logger.error(`Failed to connect to MCP server ${name}: ${error.message}`);
      }
    }
  }

  private async connectToServer(name: string, config: { command: string; args: string[]; env?: Record<string, string> }): Promise<void> {
    logger.info(`Connecting to MCP server: ${name} (${config.command})`);

    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
        if (value !== undefined) env[key] = value;
    }
    if (config.env) {
        Object.assign(env, config.env);
    }

    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: env
    });

    const client = new Client(
      {
        name: "vibe-ai-teammate",
        version: "0.0.2",
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);
    this.connections.set(name, { client, transport, name });

    // Register tools from this server
    try {
        const { tools } = await client.listTools();
        for (const tool of tools) {
            toolRegistry.register({
                name: `${name}_${tool.name}`,
                description: tool.description || "",
                category: "code",
                schema: {
                    type: "object",
                    properties: (tool.inputSchema as any).properties || {},
                    required: (tool.inputSchema as any).required || []
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
    } catch (e) {
        logger.warn(`Connected to ${name} but failed to list tools`);
    }

    this.emit('connect', { server: name });
  }

  public async shutdown(): Promise<void> {
    for (const connection of this.connections.values()) {
      await connection.transport.close();
    }
    this.connections.clear();
  }

  public listServers(): string[] {
    return Array.from(this.connections.keys());
  }

  public isConnected(name: string): boolean {
    return this.connections.has(name);
  }
}

// Export singleton
export const mcpManager = new VibeMCPManager();
