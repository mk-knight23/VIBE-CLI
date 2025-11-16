---
name: "Feature Request"
about: "Propose a new capability or improvement for Vibe CLI, Vibe Web, or Vibe Code extension"
title: "[feat] Concise feature title"
labels: enhancement
assignees: mk-knight23
---

## Target Package
<!-- Select one (or more) -->
- [ ] Vibe CLI (`vibe-cli`)
- [ ] Vibe Web (`vibe-web`)
- [ ] Vibe Code (VS Code Extension) (`vibe-code`)

## Problem / Motivation
<!-- What user problem does this feature solve? Why is it valuable? -->

## Proposed Solution
<!-- High-level description of the feature. Avoid implementation minutiae unless critical. -->

## User Workflow Impact
<!-- Describe how a user would interact with this new capability. Provide example commands / UI steps. -->
CLI Example (if applicable):
```bash
# e.g.
vibe metrics report --format json
```
Extension Example (if applicable):
```
Open sidebar -> New 'Metrics' view -> Click 'Generate Usage Report'
```
Web Example (if applicable):
```
Add docs section /docs/metrics with interactive charts component
```

## Scope Boundaries
- In Scope: <!-- list items -->
- Out of Scope / Future Follow-ups: <!-- list items -->

## Acceptance Criteria
<!-- Bullet list of verifiable criteria -->
- [ ] Feature exposed via documented command / setting / page
- [ ] Help / README updated
- [ ] No breaking changes to existing commands
- [ ] Basic smoke test or usage scenario validated

## Security / Privacy Considerations
<!-- Any data collection, external calls, key usage changes? -->

## Dependencies / Related Issues
<!-- Link other issues or PRs -->

## Alternatives Considered
<!-- Brief notes on other approaches and why they were not chosen -->

## Additional Context
<!-- Diagrams, pseudo-code, references (optional) -->

---

### Optional: Rough Implementation Sketch
<!-- Provide pseudo-code or task breakdown if you have one -->

```text
1. Add new CLI subcommand folder: vibe-cli/metrics/
2. Implement command router entry in bin/vibe.cjs
3. Provide docs page: vibe-web/src/app/docs/metrics/page.tsx
4. Add extension view container contributes->views with id 'vibe.metricsView'
```

---

Thank you for helping improve the Vibe ecosystem. Please keep requests focused and actionable so they can be evaluated quickly.