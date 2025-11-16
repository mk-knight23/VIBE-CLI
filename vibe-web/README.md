# Vibe Web

Marketing, onboarding, and (future) documentation surface for the Vibe ecosystem. Built with Next.js (App Router), Tailwind CSS, Radix UI, and lightweight component utilities.

## 1. Purpose

- Present high-level feature overview for Vibe CLI and Vibe Code extension.
- Provide installation & quick start guidance.
- Host future MDX documentation (roadmap).
- Offer an easily deployable static site (Vercel-friendly).

## 2. Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Next.js 16 (App Router) | Fast builds (Turbopack), static pre-rendering |
| Styling | Tailwind CSS 4 | Utility-first; minimal bespoke CSS |
| UI Library | Radix UI | Accessible primitives (accordion, tabs, dialog, etc.) |
| Icons | `lucide-react` | Dynamic icon set |
| Carousel | `embla-carousel-react` | Marketing carousel interactions |
| Internal Utils | `src/lib/utils.ts` | Class merge, generic helpers |

## 3. Directory Structure

```
vibe-web/
├─ package.json
├─ next.config.mjs
├─ tailwind.config.cjs
├─ postcss.config.cjs
├─ next-env.d.ts
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx
│  │  ├─ page.tsx                    # Landing
│  │  ├─ commands/page.tsx           # CLI command showcase
│  │  ├─ installation/page.tsx       # Setup flow
│  │  ├─ quick-start/page.tsx        # Accelerated usage guide
│  ├─ components/
│  │  ├─ header.tsx
│  │  ├─ footer.tsx
│  │  ├─ logo.tsx
│  │  ├─ code-block.tsx
│  │  ├─ marketing/
│  │  │  ├─ hero-section.tsx
│  │  │  ├─ features-section.tsx
│  │  │  ├─ pricing-section.tsx
│  │  │  ├─ testimonials-section.tsx
│  │  │  ├─ capabilities-tabs-section.tsx
│  │  ├─ ui/                         # Radix + custom wrappers
│  │  │  ├─ accordion.tsx
│  │  │  ├─ button.tsx
│  │  │  ├─ card.tsx
│  │  │  ├─ carousel.tsx
│  │  │  ├─ input.tsx
│  │  │  ├─ progress.tsx
│  │  │  ├─ separator.tsx
│  │  │  ├─ sheet.tsx
│  │  │  ├─ sidebar.tsx
│  │  │  ├─ skeleton.tsx
│  │  │  ├─ tabs.tsx
│  │  │  ├─ toast.tsx
│  │  │  ├─ toaster.tsx
│  │  │  ├─ tooltip.tsx
│  ├─ hooks/
│  │  ├─ use-mobile.tsx
│  │  ├─ use-toast.ts
│  ├─ lib/
│     ├─ utils.ts
│     ├─ placeholder-images.ts
│     ├─ placeholder-images.json
```

## 4. Setup

```bash
cd vibe-web
npm install
npm run dev
```

Open http://localhost:3000

Production build:

```bash
npm run build
npm start
```

## 5. Pages

| Page | Path | Component |
|------|------|-----------|
| Landing | `/` | [`src/app/page.tsx`](vibe-web/src/app/page.tsx:1) |
| Commands | `/commands` | [`src/app/commands/page.tsx`](vibe-web/src/app/commands/page.tsx:1) |
| Installation | `/installation` | [`src/app/installation/page.tsx`](vibe-web/src/app/installation/page.tsx:1) |
| Quick Start | `/quick-start` | [`src/app/quick-start/page.tsx`](vibe-web/src/app/quick-start/page.tsx:1) |

## 6. Components Highlights

- Hero: [`hero-section.tsx`](vibe-web/src/components/marketing/hero-section.tsx:1)
- Features list: [`features-section.tsx`](vibe-web/src/components/marketing/features-section.tsx:1)
- Testimonials: [`testimonials-section.tsx`](vibe-web/src/components/marketing/testimonials-section.tsx:1)
- Pricing placeholder: [`pricing-section.tsx`](vibe-web/src/components/marketing/pricing-section.tsx:1)
- Capability tabs: [`capabilities-tabs-section.tsx`](vibe-web/src/components/marketing/capabilities-tabs-section.tsx:1)

Utility: [`lib/utils.ts`](vibe-web/src/lib/utils.ts:1) centralizes class name merges.

## 7. Styling & Tailwind

Configuration:
- Tailwind config: [`tailwind.config.cjs`](vibe-web/tailwind.config.cjs:1)
- Global CSS: [`src/app/globals.css`](vibe-web/src/app/globals.css:1)

Design principles:
- Prefer composable primitives (Radix) + Tailwind utilities.
- Skeleton placeholders: [`skeleton.tsx`](vibe-web/src/components/ui/skeleton.tsx:1).

## 8. Toast & UI Interactions

Toast system:
- Hook: [`use-toast.ts`](vibe-web/src/hooks/use-toast.ts:1)
- Container: [`toaster.tsx`](vibe-web/src/components/ui/toaster.tsx:1)

Accordions, sheets, tooltips wrap Radix primitives for consistent class usage.

## 9. Placeholder Media

Image metadata lives in [`placeholder-images.json`](vibe-web/src/lib/placeholder-images.json:1) and typed in [`placeholder-images.ts`](vibe-web/src/lib/placeholder-images.ts:1).

Use cases:
```tsx
import { placeholders } from "@/lib/placeholder-images";
// or relative import if alias disabled: ../lib/placeholder-images
```

(Note: Current path alias resolution uses root `tsconfig.json` mapping `@/*` → `vibe-web/src/*`. If IDE issues occur, fallback to relative imports.)

## 10. Environment Variables

Present / future usage (for SSR enhancements):

| Variable | Purpose | Status |
|----------|---------|--------|
| `OPENROUTER_API_KEY` | Potential future server-side model calls | Planned |
| `NEXT_PUBLIC_VIBE_ANALYTICS` | Front-end instrumentation toggle | Planned |
| `NEXT_PUBLIC_VIBE_DOCS_MODE` | Enable MDX docs section | Planned |

Currently site is static; no runtime secret usage.

## 11. Deployment (Vercel)

Recommended steps:

1. Import GitHub repo in Vercel.
2. Root directory: `vibe-web`.
3. Build command: `npm run build`.
4. Output: `.next` (standard).
5. Environment variables (future): set `OPENROUTER_API_KEY` if adding SSR LLM routes.

Static export note:
- If switching to static export, set `output: 'export'` in [`next.config.mjs`](vibe-web/next.config.mjs:1) and add required polyfills for App Router limitations.

## 12. CI Workflow

Tag-based build triggers:
- `vibe-web-vX.Y.Z` → [`web-build.yml`](.github/workflows/web-build.yml:1)

Workflow artifacts:
- Uploads `.next/` build summary (size introspection).
- Release attaches JSON route metadata.

## 13. Versioning

Independent version maintained in [`package.json`](vibe-web/package.json:1).

Tag prefix:
```
vibe-web-vX.Y.Z
```

Release process:
```bash
(cd vibe-web && npm version patch)
git add vibe-web/package.json
git commit -m "vibe-web: bump to 0.1.1"
git tag vibe-web-v0.1.1
git push origin vibe-web-v0.1.1
```

Reference: [`VERSIONING.md`](VERSIONING.md:1) and root [`README.md`](README.md:1).

## 14. Future Roadmap

| Feature | Description |
|---------|-------------|
| MDX Docs | Integrate `/docs/*` with content collections |
| Live Demos | Embed interactive CLI playground via WASI sandbox |
| Search | Local client-side full-text search over docs |
| Analytics | Lightweight privacy-first metrics (optional) |
| Theme Toggle | Add dark/light switch (component-level readiness) |

## 15. Contributing (Web Package)

1. Branch naming: `feat/web-<topic>` or `fix/web-<issue>`.
2. Keep dependencies minimal; avoid adding heavy analytics prematurely.
3. For new sections:
   - Create route: `src/app/<section>/page.tsx`
   - Add marketing piece under `components/marketing/`.
4. Update this README with new major page entries.

## 16. Troubleshooting

| Issue | Resolution |
|-------|------------|
| Path alias failing (`@/`) | Confirm root `tsconfig.json` has `paths` mapping; restart TS server |
| Tailwind class not applied | Ensure file under `src/` for content scan; check config `content` patterns |
| Build fails on Vercel | Confirm Node version >= 18 & lock file integrity |
| Icons not rendering | Verify `lucide-react` dependency and import style |
| Image placeholders undefined | Validate JSON file shape & import path correctness |

## 17. License

MIT — see root [`LICENSE`](LICENSE:1).

---

Focus on clarity & performance: small bundle, pre-rendered pages, minimum JS for static marketing. Add dynamic/interactive features only when they improve onboarding or documentation experience.