# VIBE - AI Development Platform

**One Ecosystem, Four Focused Products**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌟 Products

### 1. [Vibe CLI](./vibe-cli) - Terminal AI Assistant
- **Install:** `npm install -g vibe-ai-cli`
- **Use:** `vibe` in terminal
- **Features:** 35+ commands, memory system, git integration

### 2. [Vibe VS Code](./vibe-code) - Extension
- **Install:** VS Code Marketplace → "Vibe VS Code"
- **Use:** Ctrl+Shift+V in VS Code
- **Features:** CLI parity, 40+ models, autonomous coding

### 3. [Vibe Web](./vibe-web) - Documentation Hub
- **Visit:** https://vibe-ai.vercel.app
- **Purpose:** Docs, installation guides, tutorials
- **Deploy:** Static site (Vercel/Netlify)

### 4. Vibe Chat - AI Website Builder
- **Repository:** Separate repo (independent)
- **Purpose:** AI-powered website generation
- **Deploy:** Standalone web application

## 🚀 Quick Start

```bash
# CLI
npm install -g vibe-ai-cli
vibe

# VS Code Extension
# Install from marketplace, press Ctrl+Shift+V

# Documentation
# Visit https://vibe-ai.vercel.app
```

## 🏗️ Architecture

Each product is completely independent:
- Own dependencies
- Own deployment
- Own lifecycle
- Own documentation

## 📦 Publishing

- **CLI:** npm + GitHub Releases + Binaries
- **VS Code:** Marketplace + Open VSX
- **Web:** Vercel + Netlify + GitHub Pages
- **Chat:** Separate repository

## 🔧 Development

```bash
# CLI
cd vibe-cli && npm install && npm start

# VS Code Extension  
cd vibe-code && npm install && npm run compile

# Web Documentation
cd vibe-web && npm install && npm run dev
```

## 📄 License

MIT © VIBE Team
