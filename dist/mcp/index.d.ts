/**
 * VIBE-CLI v0.0.1 - MCP Manager
 * Model Context Protocol backbone for structured context
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { EventEmitter } from 'events';
export interface MCPServerConnection {
    client: Client;
    transport: StdioClientTransport;
    name: string;
}
export declare class VibeMCPManager extends EventEmitter {
    private connections;
    constructor();
    initialize(): Promise<void>;
    private connectToServer;
    shutdown(): Promise<void>;
    listServers(): string[];
    isConnected(name: string): boolean;
}
export declare const mcpManager: VibeMCPManager;
//# sourceMappingURL=index.d.ts.map