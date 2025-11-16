---
name: "Pull Request"
about: "Submit changes to Vibe CLI / Vibe Web / Vibe Code extension"
title: "[pkg] Short summary (e.g. vibe-cli: add metrics command)"
---

## Package Scope
<!-- Tick all that apply -->
- [ ] Vibe CLI (`vibe-cli`)
- [ ] Vibe Web (`vibe-web`)
- [ ] Vibe Code Extension (`vibe-code`)
- [ ] Multiple (list paths)

## Change Type
- [ ] Feature
- [ ] Bug Fix
- [ ] Refactor
- [ ] Docs
- [ ] CI / Meta
- [ ] Other (describe)

## Summary
<!-- High-level overview of what this PR does. Keep it concise. -->

## Detailed Explanation
<!-- If needed, provide deeper technical notes, design decisions, trade-offs. -->

## Related Issues
<!-- Link issue numbers (e.g. Closes #12) -->

## Implementation Notes
<!-- Bullet list of key implementation details -->
- Entry point changed: [`vibe-cli/bin/vibe.cjs`](vibe-cli/bin/vibe.cjs:1)
- Core logic touched: [`vibe-cli/core/openrouter.ts`](vibe-cli/core/openrouter.ts:1)
- Extension API updated: [`vibe-code/src/extension.ts`](vibe-code/src/extension.ts:1)
- Web component added: [`vibe-web/src/components/marketing/features-section.tsx`](vibe-web/src/components/marketing/features-section.tsx:1)

## Screenshots / CLI Output (Optional)
<details>
<summary>Output / UI</summary>

```bash
# Example CLI invocation
vibe generate "demo"
```
</details>

## Breaking Changes
- [ ] No breaking changes
- [ ] Yes (explain impact and migration steps)

## Security / Privacy
- [ ] No security-impacting changes
- [ ] Potential impact (explain)
- [ ] Added new external call (document endpoint & reason)

## Test / Verification
<!-- Describe how you manually verified functionality -->
- CLI smoke: `node vibe-cli/cli.cjs help` OK
- Web build: `cd vibe-web && npm run build` OK
- Extension compile: `cd vibe-code && npm run compile` OK

## Checklist
- [ ] Code compiles (TypeScript)
- [ ] No unused dependencies added
- [ ] README / docs updated if needed
- [ ] Version bump considered (if release-worthy)
- [ ] CI workflows unaffected or updated
- [ ] No secret leakage (API keys, tokens)

## Follow-Up Tasks (Optional)
<!-- List any subsequent improvements or deferred items -->

---

Reviewer Guidance:
Focus review on correctness, simplicity, and alignment with existing patterns (see `openrouter` model routing and CLI diff confirmation flow). Avoid unneeded abstractions.
