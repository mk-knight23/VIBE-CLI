# Vibe Web v2.0 - Documentation Hub

Clean, interactive documentation platform for the VIBE AI development ecosystem.

## 🏗️ Architecture

**Production-ready React application** built with:
- **Vite** - Fast build tool and dev server
- **React 19** - Latest React with concurrent features
- **TypeScript** - Type safety and developer experience
- **Tailwind CSS** - Utility-first styling
- **Wouter** - Lightweight client-side routing
- **Framer Motion** - Smooth animations and interactions

## 📁 Folder Structure

```
src/
├── components/
│   ├── navigation/     # Navbar and navigation components
│   ├── marketing/      # Hero and landing page components
│   └── ui/            # Reusable UI primitives (15 components)
├── pages/             # Route components (5 pages)
├── hooks/             # Custom React hooks (2 hooks)
├── lib/               # Utilities and configurations
└── App.tsx           # Main application component
```

## 🎯 Features

### ✅ Working Features
- **Responsive Navigation** - Mobile-friendly navbar with smooth interactions
- **Interactive Hero** - Copy-to-clipboard install commands with feedback
- **Tabbed Content** - Installation guides and feature showcases
- **FAQ Accordion** - Collapsible Q&A sections
- **Smooth Animations** - Framer Motion powered transitions
- **Clean UI** - Consistent design system with hover states
- **Fast Performance** - Optimized bundle size and loading

### 🧹 Cleaned Up
- **Removed 32 unused UI components** (kept only 15 essential ones)
- **Removed 1 unused feature component**
- **Cleaned up 15+ unused dependencies**
- **Organized components into logical folders**
- **Enhanced interactions and hover states**

## 🚀 Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run typecheck
```

## 📊 Bundle Analysis

**Production build:**
- **CSS:** 41.35 kB (7.78 kB gzipped)
- **JS:** 483.34 kB (153.18 kB gzipped)
- **Total:** ~525 kB (~160 kB gzipped)

## 🎨 UI Components

**Core UI Components (15 used):**
- accordion, button, card, dialog, input, label, separator, sheet, skeleton, tabs, textarea, toast, toaster, toggle, tooltip

**Removed unused components (32):**
- alert-dialog, alert, aspect-ratio, avatar, badge, breadcrumb, button-group, checkbox, collapsible, command, context-menu, dropdown-menu, empty, field, hover-card, input-group, item, kbd, menubar, navigation-menu, pagination, popover, progress, radio-group, scroll-area, select, sidebar, slider, spinner, switch, table, toggle-group

## 🔗 Routes

- `/` - Home page with hero and CTA sections
- `/installation` - CLI and VS Code installation guides
- `/features` - Feature showcase with interactive tabs
- `/faq` - Frequently asked questions with accordion
- `/*` - 404 not found page

## 🎯 Ecosystem Integration

Links to other VIBE products:
- **Vibe CLI** - Terminal AI assistant
- **Vibe VS Code** - Editor extension
- **Vibe Chat** - AI website builder
- **GitHub Repository** - Source code and documentation

## 📈 Performance

- **Zero console errors**
- **Mobile responsive**
- **Keyboard accessible**
- **Fast loading times**
- **Smooth interactions**
- **SEO optimized**

## 🔧 Configuration

- **Vite config** - Modern build setup
- **TypeScript** - Strict type checking
- **Tailwind** - Utility-first CSS
- **PostCSS** - CSS processing
- **Vercel** - Deployment ready

## 📝 Maintenance

The codebase is now:
- **Clean** - No unused code or dependencies
- **Organized** - Logical folder structure
- **Interactive** - Enhanced user experience
- **Maintainable** - Clear component boundaries
- **Documented** - Comprehensive README

---

**Status:** ✅ Production Ready | 🧹 Fully Audited | 🎨 UI Enhanced | 📦 Dependencies Cleaned
