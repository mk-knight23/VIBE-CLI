# Vibe Web

**Marketing & Documentation Website** - Built with Vite + React + Tailwind CSS

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vite](https://img.shields.io/badge/Vite-7.2.7-646CFF)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.2.0-61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue)](https://www.typescriptlang.org/)

## 🌟 Overview

Vibe Web is the official marketing and documentation website for the VIBE AI Development Platform. It provides:

- **Homepage** - Hero section, features overview, and call-to-action
- **Installation Guides** - CLI and VS Code extension setup instructions
- **Features** - Detailed feature showcase for both CLI and VS Code
- **FAQ** - Comprehensive questions and answers for both CLI and VS Code

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🏗️ Tech Stack

- **Framework**: Vite + React 19
- **Styling**: Tailwind CSS 4.1
- **UI Components**: Radix UI primitives
- **Animations**: Framer Motion
- **Routing**: Wouter
- **Icons**: Lucide React
- **TypeScript**: Full type safety

## 📁 Project Structure

```
vibe-web/
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── ui/        # Base UI primitives
│   │   ├── hero.tsx   # Hero section
│   │   ├── features.tsx # Features showcase
│   │   └── navbar.tsx # Navigation
│   ├── pages/         # Page components
│   │   ├── home.tsx   # Homepage
│   │   ├── installation.tsx # Installation guide
│   │   ├── features.tsx # Features showcase
│   │   ├── faq.tsx    # FAQ page
│   │   └── not-found.tsx # 404 page
│   ├── lib/           # Utilities and configs
│   ├── hooks/         # Custom React hooks
│   ├── App.tsx        # Main app component
│   ├── main.tsx       # Entry point
│   └── index.css      # Global styles
├── public/            # Static assets
├── dist/              # Build output
└── package.json       # Dependencies and scripts
```

## 🎨 Design System

The website uses a warm, organic design inspired by Claude Code UI:

- **Colors**: Terracotta primary, warm grays, off-white backgrounds
- **Typography**: Inter (sans), Libre Baskerville (serif), JetBrains Mono (code)
- **Components**: Radix UI primitives with custom styling
- **Animations**: Subtle Framer Motion transitions

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run typecheck` - Run TypeScript type checking
- `npm run smoke` - Quick build test

### Environment Setup

No environment variables required. The website is fully static.

### Adding New Pages

1. Create component in `src/pages/`
2. Add route in `src/App.tsx`
3. Update navigation in `src/components/navbar.tsx`

## 📦 Deployment

### Vercel (Recommended)

```bash
# Deploy to Vercel
vercel --prod
```

### Static Hosting

```bash
# Build static files
npm run build

# Deploy dist/ folder to any static host
```

### Build Output

- `dist/index.html` - Main HTML file
- `dist/assets/` - CSS and JS bundles
- `dist/` - Static assets

## 🔗 Links

- **Live Site**: https://vibe-ai.vercel.app
- **Main Repo**: https://github.com/mk-knight23/vibe
- **CLI Package**: https://www.npmjs.com/package/vibe-ai-cli
- **VS Code Extension**: Search "Vibe VS Code" in marketplace

## 📄 License

MIT © VIBE Team

---

**Version:** 2.0.1 | **Framework:** Vite + React | **Status:** Production Ready
