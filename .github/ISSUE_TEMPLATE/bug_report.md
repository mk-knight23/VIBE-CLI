---
name: "Bug Report"
about: "Report a defect in Vibe CLI, Vibe Web, or Vibe Code extension"
title: "[bug] Short descriptive title"
labels: bug
assignees: mk-knight23
---

<!--
Provide a clear, minimal reproduction. Attach logs / screenshots where relevant.
-->

## Affected Package
<!-- Select one (or more) -->
- [ ] Vibe CLI (`vibe-cli`)
- [ ] Vibe Web (`vibe-web`)
- [ ] Vibe Code (VS Code Extension) (`vibe-code`)

## Version / Tag
<!-- Provide the package version(s) or git tag used -->
CLI Version: (see `vibe --version`)
Web Version: (from deployed footer or `package.json`)
Extension Version: (VS Code Extensions panel)

## Environment
| Aspect | Value |
|--------|-------|
| OS | e.g. macOS 15 / Windows 11 / Ubuntu 22.04 |
| Node.js | output of `node -v` |
| VS Code | output of `code --version` (if extension) |
| Terminal | bash / zsh / PowerShell / etc. |
| Deployment | Local dev / Vercel / Other |

## Description
<!-- What is the bug? Clear, concise description. -->

## Expected Behavior
<!-- What should have happened? -->

## Actual Behavior
<!-- What actually happened? Include full error text (paste), not paraphrase. -->

## Reproduction Steps
<!-- Numbered list leading to the failure -->
1. ...
2. ...
3. ...

## Minimal Repro Snippet / Command
<!-- CLI command, code block, or route causing issue -->
```bash
# Example
vibe generate "example" --flag
```

## Logs / Screenshots
<!-- Paste relevant excerpts only; use fenced blocks -->
<details>
<summary>CLI Output</summary>

```
(paste here)
```
</details>

<details>
<summary>Extension Console / DevTools</summary>

```
(paste here)
```
</details>

## Configuration / Settings
<!-- If extension: list key custom settings (apiKey omitted / masked) -->
- `vibe.model`: (value)
- `vibe.maxContextFiles`: (value)

## Related Files (Optional)
<!-- Link directly to suspected files (use clickable format) -->
[`vibe-cli/bin/vibe.cjs`](vibe-cli/bin/vibe.cjs)
[`vibe-code/src/extension.ts`](vibe-code/src/extension.ts)
[`vibe-web/src/app/page.tsx`](vibe-web/src/app/page.tsx)

## Attempted Mitigations
<!-- What did you try already? -->

## Additional Context
<!-- Any other context that might help (recent refactors, OS updates, etc.) -->

---

### Severity
- [ ] Low (cosmetic / minor)
- [ ] Moderate (affects workflow but workaround exists)
- [ ] High (blocks critical usage)
- [ ] Critical (security / data loss / cannot run)

### Security Impact
Does this involve a security concern?
- [ ] No
- [ ] Potential vulnerability (explain)
- [ ] Confirmed vulnerability (explain privately via email first)

---

Thank you for the report. Provide the most minimal reproduction you can; this greatly speeds up resolution.