# Vibe Web - Documentation & Chat Platform

**Version 2.0.0** | **Next.js 16** | **React 19** | **Tailwind CSS 4** | **Production Ready**

🌐 Modern web platform providing comprehensive documentation, interactive chat, and onboarding for the VIBE AI development ecosystem.

## 🎯 Purpose of Vibe Web

Vibe Web serves as the **central hub** for the VIBE ecosystem, offering:

- **📚 Complete Documentation**: Detailed guides for CLI and VS Code extension
- **💬 Interactive AI Chat**: Browser-based chat with multi-provider support
- **🚀 Onboarding Experience**: Step-by-step tutorials and quick starts
- **📱 Responsive Design**: Optimized experience across all devices
- **⚡ Performance-First**: Fast loading with modern web technologies

**Key Features:**
- Interactive documentation with syntax highlighting
- Live AI chat interface (OpenRouter + MegaLLM)
- Comprehensive FAQ and troubleshooting
- Feature comparison and pricing information
- Mobile-first responsive design
- SEO optimized with proper meta tags

---

## 📦 Installation & Setup

### Local Development
```bash
cd vibe-web
npm install
npm run dev
# Open http://localhost:3000
```

### Production Build
```bash
npm run build
npm start
```

### Requirements
- **Node.js**: >=18.0.0
- **Next.js**: 16.0.2
- **React**: 19.2.0
- **TypeScript**: 5.7.2

---

## 🗂️ Pages & Navigation

### Main Pages

| Page | Route | Purpose |
|------|-------|---------|
| **Landing** | `/` | Hero section, features, testimonials |
| **Chat** | `/chat` | Interactive AI chat interface |
| **Commands** | `/commands` | CLI command reference |
| **Installation** | `/installation` | Setup guides for all platforms |
| **Quick Start** | `/quick-start` | Accelerated onboarding |
| **Documentation** | `/docs` | Comprehensive guides |
| **FAQ** | `/faq` | Common questions and answers |
| **Pricing** | `/pricing` | Feature comparison and plans |

### Navigation Structure
```
Vibe Web
├── Home (/)
├── Chat (/chat)
├── Commands (/commands)
├── Installation (/installation)
├── Quick Start (/quick-start)
├── Docs (/docs)
├── FAQ (/faq)
└── Pricing (/pricing)
```

---

## 📚 Documentation Structure

### Content Organization
- **CLI Documentation**: Complete command reference and usage examples
- **VS Code Extension**: Installation, configuration, and feature guides
- **API Integration**: Provider setup and model selection
- **Troubleshooting**: Common issues and solutions
- **Best Practices**: Optimization and security tips

### Interactive Features
- **Tabbed Interfaces**: Organized content by tool (CLI vs Extension)
- **Copy-to-Clipboard**: Code examples with one-click copying
- **Syntax Highlighting**: Code blocks with theme support
- **Search Functionality**: Find content quickly
- **Responsive Design**: Optimized for all screen sizes

---

## 🚀 Deployment Instructions

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production URL
# https://your-project.vercel.app
```

### Manual Deployment
```bash
# Build for production
npm run build

# Serve static files
npx serve .next
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 🌍 Environment Variables

### Required Variables
```bash
# AI Chat Functionality
OPENROUTER_API_KEY=your_openrouter_key
MEGALLM_API_KEY=your_megallm_key

# Analytics (Optional)
NEXT_PUBLIC_VIBE_ANALYTICS=true
```

### Configuration
```bash
# Site Configuration
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_VIBE_VERSION=2.0.0

# Feature Flags
NEXT_PUBLIC_VIBE_DOCS_MODE=true
NEXT_PUBLIC_VIBE_CHAT_ENABLED=true
```

---

## ⚡ Performance & SEO

### Performance Metrics
- **First Contentful Paint**: <1.5s
- **Largest Contentful Paint**: <2.5s
- **Cumulative Layout Shift**: <0.1
- **Bundle Size**: <500KB gzipped

### SEO Optimization
- **Meta Tags**: Dynamic meta tags for each page
- **Structured Data**: JSON-LD for rich snippets
- **Open Graph**: Social media sharing optimization
- **Sitemap**: Automatic sitemap generation
- **Robots.txt**: Search engine crawling rules

### Core Web Vitals
- ✅ **Lighthouse Score**: 95+ across all metrics
- ✅ **Mobile-Friendly**: Responsive design validated
- ✅ **Fast Loading**: Optimized images and fonts
- ✅ **Accessibility**: WCAG 2.1 AA compliant

---

## 🚧 Limitations (Browser-Side AI)

### Browser Constraints
- **No Server-Side Processing**: All AI calls made from browser
- **CORS Limitations**: API calls restricted by browser security
- **Rate Limiting**: Subject to browser and API provider limits
- **Local Storage Only**: No server-side data persistence

### Workarounds Implemented
- **API Key Management**: Secure key storage in browser
- **Fallback Providers**: Automatic provider switching
- **Caching Strategy**: Local response caching
- **Error Handling**: Graceful degradation on failures

### Recommended Usage
- **Development**: Full feature access with API keys
- **Demo Purposes**: Limited functionality without keys
- **Production**: Use CLI or VS Code extension for full features

---

## 🛠️ Technology Stack

### Core Framework
- **Next.js 16**: App Router with Turbopack
- **React 19**: Latest React with concurrent features
- **TypeScript 5.7.2**: Full type safety

### Styling & UI
- **Tailwind CSS 4**: Utility-first styling
- **Radix UI**: Accessible component primitives
- **Framer Motion**: Smooth animations
- **Lucide React**: Icon library

### Content & Features
- **React Syntax Highlighter**: Code highlighting
- **React Markdown**: Markdown rendering
- **Next Themes**: Dark/light mode
- **React Hook Form**: Form handling

---

## 🎨 Design System

### Themes
- **Light Mode**: Clean, professional appearance
- **Dark Mode**: Easy on the eyes for long sessions
- **System Preference**: Automatic theme detection
- **Manual Toggle**: User-controlled theme switching

### Components
- **Reusable Primitives**: Consistent design language
- **Responsive Grid**: Mobile-first layout system
- **Interactive Elements**: Hover states and animations
- **Accessibility**: Screen reader support

---

## 🤝 Contributing (Web Package)

### Development Guidelines
1. **Branch Naming**: `feat/web-<feature>` or `fix/web-<issue>`
2. **Code Style**: Follow existing TypeScript and React patterns
3. **Testing**: Ensure responsive design across breakpoints
4. **Performance**: Monitor Core Web Vitals

### Adding New Content
1. Create route: `src/app/<section>/page.tsx`
2. Add component: `src/components/marketing/<section>.tsx`
3. Update navigation in header component
4. Test across all device sizes

### Component Development
1. Use Radix primitives as base
2. Extend with Tailwind utilities
3. Ensure accessibility (ARIA labels, keyboard navigation)
4. Test in both light and dark themes

---

## 🔧 Troubleshooting

### Common Issues

**Build Failures**
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

**Styling Issues**
```bash
# Check Tailwind config
npm run dev
# Verify class names in browser dev tools
```

**TypeScript Errors**
```bash
# Check tsconfig.json
npm run type-check
```

**Deployment Issues**
```bash
# Check build output
npm run build
ls -la .next/
```

### Performance Issues
- **Large Bundle**: Check imported components
- **Slow Loading**: Optimize images and fonts
- **Layout Shift**: Fix CSS issues
- **Accessibility**: Run lighthouse audit

---

## 📊 Analytics & Monitoring

### Built-in Analytics
- **Core Web Vitals**: Performance monitoring
- **User Interactions**: Click tracking (optional)
- **Error Boundaries**: JavaScript error catching
- **Loading Performance**: Bundle size monitoring

### External Monitoring
- **Vercel Analytics**: Deployment metrics
- **Google Analytics**: User behavior (optional)
- **Sentry**: Error tracking (optional)

---

## 📈 Roadmap

### Planned Features
- **MDX Documentation**: Content collections integration
- **Interactive CLI Demo**: WebAssembly-based CLI simulation
- **Advanced Search**: Full-text search with filters
- **User Authentication**: Account management
- **API Documentation**: Interactive API explorer

### Performance Improvements
- **Edge Runtime**: Global CDN deployment
- **Static Generation**: Pre-rendered pages
- **Image Optimization**: Next.js Image component
- **Bundle Splitting**: Code splitting optimization

---

## 📄 License

MIT © VIBE Team

---

## 🔗 Links

- **🌐 Live Site**: https://vibe-ai.vercel.app
- **📚 CLI Docs**: [../vibe-cli/README.md](../vibe-cli/README.md)
- **🧩 Extension Docs**: [../vibe-code/README.md](../vibe-code/README.md)
- **🐙 GitHub**: https://github.com/mk-knight23/vibe
- **🐛 Issues**: https://github.com/mk-knight23/vibe/issues

---

**Version:** 2.0.0 | **Status:** Production Ready | **Next.js:** 16.0.2 | **React:** 19.2.0
