/**
 * Default MCP Servers for VIBE
 * Based on 2026 industry standards
 */
export const DEFAULT_MCP_SERVERS = {
  "sequential-thinking": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"],
    "description": "Sequential Thinking: Core server for step-by-step problem solving"
  },
  "filesystem": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
    "description": "Filesystem: Secure access to local directories"
  },
  "memory": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-memory"],
    "description": "Memory Bank: Maintain project-specific context"
  },
  "puppeteer": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-puppeteer"],
    "description": "Puppeteer: Browser automation and web interaction"
  },
  "bright-data": {
    "command": "npx",
    "args": ["-y", "@brightdata/mcp-server"],
    "description": "Bright Data: Production-scale data extraction"
  },
  "brave-search": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-brave-search"],
    "description": "Brave Search: Real-time web search capabilities"
  },
  "github": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "description": "GitHub: Manage repositories, PRs, and issues"
  },
  "chrome-devtools": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-chrome-devtools"],
    "description": "Chrome DevTools: Browser inspection and metrics"
  },
  "context7": {
    "command": "npx",
    "args": ["-y", "context7-mcp"],
    "description": "Context7: Up-to-date documentation and code examples"
  },
  "figma": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-figma"],
    "description": "Figma: Bridge design and code"
  },
  "zapier": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-zapier"],
    "description": "Zapier: Connect to 6,000+ apps"
  },
  "markitdown": {
    "command": "npx",
    "args": ["-y", "markitdown-mcp"],
    "description": "MarkItDown: Universal document to Markdown converter"
  }
};
