# Vibe AI VS Code Extension

An AI agent for VS Code.

## Security Warning: API Key Management

**Never commit your API keys to a Git repository.**

This extension requires an OpenRouter API key. While you can set it in `settings.json`, this is insecure for source-controlled projects.

For secure, production use, we recommend:
1.  **VS Code Secrets API:** Store the key using `context.secrets.store`. The extension should be updated to read from this.
2.  **.env File:** (If running in a local-only environment) Load the key via `process.env.OPENROUTER_API_KEY`.

The current implementation uses the fallback key from `settings.json` for development.

## Debugging

If you encounter issues:
1.  Open the Command Palette (`Ctrl+Shift+P`) and select **Developer: Toggle Developer Tools** to check the webview console.
2.  Open the **Output** panel (View > Output) and select **Vibe** from the dropdown. All extension-side errors and logs are printed here.

## Features (Kilo UI)

It provides:

- Chat and Agent panels running on **OpenRouter** FREE models (default: `z-ai/glm-4-5-air:free` - GLM-4.5-Air, top performer for agents).
- Multiple **modes** and **personas** to emulate tools like Kilo Code, RooCode, Cline, Claude, Copilot, etc.
- Project-aware context (reads from open editors) with a **Context** button.
- Keyboard shortcuts to rotate modes:  
  - Next mode: `⌘ + .` (macOS) / `Ctrl + .` (others)  
  - Previous mode: `⌘ + ⇧ + .` / `Ctrl + ⇧ + .`

Core implementation is in [`src/extension.ts`](src/extension.ts:1). Extension metadata is in [`package.json`](package.json:1).

---

## Features

### Modes

Modes are managed in the extension backend and surfaced in the webview:

- Architect (🏗️) — plan and design.
- Code (💻) — write & refactor code.
- Ask (❓) — Q&A and explanations.
- Debug (🪲) — diagnose & fix issues.
- Orchestrator (🪃) — coordinate multi-step workflows.
- Project Research (🔍) — analyze and summarize the codebase.

Mode state is stored in the extension host and updated via webview messages (see mode handling in [`src/extension.ts`](src/extension.ts:131)).

### Personas

Personas tailor the assistant behavior per mode:

- Balanced — general purpose.
- System Architect — high-level design.
- Pair Programmer — implementation-focused.
- Debug Doctor — debugging expert.
- Research Analyst — codebase research.

Personas are defined in [`src/extension.ts`](src/extension.ts:80) and applied in a synthesized system prompt per request.

### Chat vs Agent Tabs

The webview UI provides:

- **Chat** tab — direct conversational usage.
- **Agent** tab — agent-style behavior, emphasizing checkpoints & todo planning.

Agent/tab selection is handled fully in the webview script and included in the message payload to the backend (see `isAgent` handling in [`src/extension.ts`](src/extension.ts:640)).

### OpenRouter Integration

## API Key Security Protocol

**🚨 NEVER COMMIT API KEYS. Use VS Code secrets (CMD+SHIFT+P → 'Preferences: Open Settings (JSON)') or .env files. Hardcoded keys are for development ONLY.**

You can provide your API key via:
1. Environment variable: `OPENROUTER_API_KEY`
2. VS Code setting: `vibe.openRouter.apiKey`
3. Hardcoded fallback (development only)

Example (macOS/Linux):
```bash
export OPENROUTER_API_KEY="your-openrouter-api-key"
```

**Loading Priority:**
1. `process.env.OPENROUTER_API_KEY`
2. VS Code setting: `"vibe.openRouter.apiKey"`
3. Hardcoded fallback (development only)

**Validation:** Fail activation if no valid key found (except in debug mode)

- Uses `fetch` from Node 18+ to call `https://openrouter.ai/api/v1/chat/completions`.
- Default model: `z-ai/glm-4-5-air:free` (GLM-4.5-Air - top performer for agents).
- Allowed FREE models are hardcoded (see `FREE_MODELS` in [`src/llmService.ts`](src/llmService.ts:41)):
  - `z-ai/glm-4-5-air:free` (DEFAULT - top performer for agents)
  - `deepseek/deepseek-coder-v2-lite-instruct:free`
  - `qwen/qwen2.5-coder-7b-instruct:free`
  - `microsoft/phi-3-mini-128k-instruct:free`
  - `tng/deepseek-r1t2-chimera:free` (Additional free option)
 
The request wrapper lives in streaming implementation inside [`src/llmService.ts`](src/llmService.ts:124).

### Settings

Extension settings (via VS Code Settings UI or `settings.json`):

- `vibe.openRouter.apiKey` (string) — your OpenRouter API key (or set `OPENROUTER_API_KEY` env var).
- `vibe.model` (string) — selected FREE model id (default `z-ai/glm-4-5-air:free` - GLM-4.5-Air).
- `vibe.maxContextFiles` (number) — maximum files considered for context collection.
- `vibe.memory.enabled` (boolean) — enable persistent memory bank.
- `vibe.memory.maxItems` (number) — cap memory entries per scope.
- `vibe.diff.autoReveal` (boolean) — auto show diff suggestions panel.
- `vibe.orchestrator.maxParallelAgents` (number) — planned future concurrency cap.
- `vibe.token.warnThreshold` (number) — approximate token usage warning boundary.
- `vibe.customModes` (array) — user-defined extra modes `{ "name": "...", "prompt": "..." }`.

Configuration schema is defined in [`package.json`](package.json:26).

### Context Button

- **Context** button collects snippets from visible editors (URI, language, first 4k chars) and surfaces them in the sidebar.
- Implementation: `handleRequestContext` in [`src/extension.ts`](src/extension.ts:355).

This mimics Vibe-CLI’s context injection but is scoped to open editors to keep it safe and predictable.

---

## Commands & Keybindings

Commands are contributed in [`package.json`](package.json:75):

- `Vibe: Focus Chat Sidebar` (`vibe.openChat`) — focuses the main Vibe chat view.
- `Vibe: Focus Orchestrator View` (`vibe.openOrchestrator`) — focuses the orchestration task tree.
- `Vibe: Next Mode` (`vibe.switchNextMode`) — cycle to the next mode.
- `Vibe: Previous Mode` (`vibe.switchPrevMode`) — cycle to the previous mode.
- `Vibe: Apply Last Diff` (`vibe.applyDiff`) — apply a suggested diff from the last response.
- `Vibe: Regenerate Response` (`vibe.regenResponse`) — regenerate the last assistant reply.
- `Vibe: Switch to Architect Mode` (`vibe.switchToArchitect`)
- `Vibe: Reload Chat View` (`vibe.reloadChat`)
- `Vibe: Developer Diagnostics Dump` (`vibe.devDump`)
- `Vibe: Test Chat (Hello)` (`vibe.testChat`)
- `Vibe: Test Orchestrator` (`vibe.testOrchestrate`)

Keybindings (when the Vibe panel is visible):

- Next mode: `⌘ + .` (macOS) / `Ctrl + .`
- Previous mode: `⌘ + ⇧ + .` / `Ctrl + ⇧ + .`
- Switch to Architect: `⌘ + ⌥ + A` / `Ctrl + Alt + A`

See the registration logic in `activate(...)` in [`src/extension.ts`](src/extension.ts:45).

---

## Building & Running

From this subdirectory (`vibe-code/`):

```bash
npm install
npm run compile      # builds to ./dist
```

To develop or debug in VS Code:

1. Open this folder in VS Code.
2. Run **"Launch Extension"** debug configuration (you may need to create `.vscode/launch.json`).
3. In the Extension Development Host:
   - Open the Command Palette.
   - Run `Vibe: Open Chat` or `Vibe: Open Agent Panel`.
   - Set your `vibe.openRouter.apiKey` in Settings and start chatting.

---

## Packaging for Marketplace

To build a `.vsix` package:

```bash
npm run compile
npx @vscode/vsce package
```

That will produce `vibe-code-*.vsix`, which you can:

- Install locally:  
  Command Palette → `Extensions: Install from VSIX...`
- Upload to the VS Code Marketplace under your publisher (`mk-knight23` as in [`package.json`](package.json:4)).

---

## Debugging

1. Press **F5** to launch the **Extension Development Host** using the provided `Launch Extension` configuration.
2. In the Extension Development Host, open the Command Palette and run **`Vibe: Test Chat (Hello)`**. This sends a `"Hello"` prompt through the default free model and should stream a response into the sidebar.
3. Open **View → Output → Vibe** to inspect logs from the sidebar webview and any LLM errors.
4. To exercise the orchestrator, run **`Vibe: Test Orchestrator`**. The **Vibe Orchestrator** tree should populate with subtasks and update their status as they execute.

If the webview appears blank or fails to load, run **`Vibe: Reload Chat View`** and re-check the `Vibe` output channel for details.

## New Kilo-Style UI & Features (v0.1.0)

This upgraded release implements a Kilo-inspired unified sidebar:

### Sidebar Layout
- Activity Bar container "Vibe" with primary Chat webview and Orchestrator tree view.
- Top header: Mode selector, FREE model dropdown (hardcoded list), Clear / Regen / Plan / Run buttons.
- Streaming assistant responses with incremental token usage display (heuristic).
- Diff suggestion panel (supervised edits) extracted from fenced code blocks:
  ```diff path=relative/file.ts
  ...diff / replacement content...
  ```
  or
  ```vibe-edit path=relative/file.ts
  (new file content)
  ```
  Each suggestion can be applied or rejected individually. Backups are kept for rollback (last 30 edits).

### Free Models Only (Strict Enforcement)
Hardcoded allowed models (settings `vibe.model` enum):
- `z-ai/glm-4-5-air:free` (DEFAULT - top performer for agents)
- `deepseek/deepseek-coder-v2-lite-instruct:free`
- `qwen/qwen2.5-coder-7b-instruct:free`
- `microsoft/phi-3-mini-128k-instruct:free`
- `tng/deepseek-r1t2-chimera:free` (Additional free option)

Any attempt to set a non-listed model is rejected with explicit error: "Only free tier models allowed. Current free models: GLM-4.5-Air (default), DeepSeek Coder Lite, Qwen2.5 Coder, Phi-3 Mini"

### Memory Bank
Persistent workspace/global memory with:
- Manual additions (`vibe.addMemory`)
- Query / recall (`vibe.recallMemory`)
- Automatic pruning (importance + access frequency)
Used to enrich system prompt with relevant context. See implementation in [`src/memory.ts`](src/memory.ts:1). A snapshot of the top recent workspace memories is now injected into the Orchestrator plan tree as informational, auto-completed nodes for quick recall.

### Orchestrator
Generates a task plan (JSON) and builds a tree (`vibe.orchestratorView`). Each subtask executes with retry + hallucination file grounding:
- Planning: [`src/orchestrator.ts`](src/orchestrator.ts:1) `planFromPrompt`
- Execution: `executeAll` (verifies referenced files exist)
Failed subtasks provide error tooltips in tree.

### Sidebar Icons

The chat view attempts dynamic assignment of light/dark SVG icons located at `src/icons/vibe-sidebar.svg` and `src/icons/vibe-sidebar-dark.svg` (see runtime reflective assignment in [`src/extension.ts`](src/extension.ts:55)). VS Code’s `WebviewView` type does not declare `iconPath`, so assignment uses a cast.

### Hallucination Grounding
`vibe.hallucinationCheck` scans last assistant message for file paths and reports existing vs missing.

### Rollback / Backups
Every applied diff saves a backup (`workspaceState.vibe.backups`). Command `vibe.rollbackLast` restores the last edit.

### Custom Modes
`vibe.customModes` configuration allows user-defined modes:
```json
"vibe.customModes": [
  { "name": "Security", "prompt": "Audit for vulnerabilities and propose fixes." },
  { "name": "Perf", "prompt": "Profile and optimize performance hotspots." }
]
```
These appear in the mode dropdown as `Security`, `Perf` with prompts injected into the system prompt.

### Usage Tracking & Token Budget
- Parse `x-openrouter-usage-estimated-tokens` header from all responses for accurate usage tracking
- Real-time usage display in chat footer: "Tokens used: X/Y (free tier limit)"
- Heuristic token estimator (`chars/4`) as fallback
- Warning threshold configurable via `vibe.token.warnThreshold`
- Appears in:
  - Status bar: "Vibe Tokens: X"
  - Chat footer: `Tokens: X`

### Rate Limit Handling
Streaming detects HTTP 429 and surfaces a chunk with error message and aborts gracefully.

### Example Settings Snippet
See suggested workspace settings (will be provided in example file):
```json
{
  "vibe.openRouter.apiKey": "sk-or-***",
  "vibe.model": "z-ai/glm-4-5-air:free",
  "vibe.maxContextFiles": 30,
  "vibe.memory.enabled": true,
  "vibe.memory.maxItems": 200,
  "vibe.diff.autoReveal": true,
  "vibe.orchestrator.maxParallelAgents": 3,
  "vibe.token.warnThreshold": 14000,
  "vibe.customModes": [
    { "name": "Security", "prompt": "Audit for vulnerabilities and propose actionable fixes." }
  ]
}
```

### Test Workflow Sample
Provided JSON (to be added) can be fed to orchestrator:
```json
{
  "prompt": "Debug this function: authenticateUser(token) throwing 'Invalid signature' intermittently. Identify root cause and propose fix.",
  "expectedSubtasks": [
    "Review function source",
    "Trace token validation path",
    "Identify race condition or encoding issue",
    "Propose diff patch",
    "Validate fix"
  ]
}
```

### Future Enhancements
- Inline diff patching (apply only changed hunks instead of full file replace).
- Parallel agent execution with concurrency limit (`vibe.orchestrator.maxParallelAgents`).
- Test runner integration (invoke `vscode.tasks.executeTask` on suggested test tasks).
- Smarter token counting via lightweight BPE (while keeping bundle size <5MB).

---

Most behavior is now modular (LLM streaming in [`src/llmService.ts`](src/llmService.ts:1), memory in [`src/memory.ts`](src/memory.ts:1), orchestration in [`src/orchestrator.ts`](src/orchestrator.ts:1), UI provider in [`src/chatProvider.ts`](src/chatProvider.ts:1), wiring in [`src/extension.ts`](src/extension.ts:1)). Extend via new commands & configuration without altering core architecture.
## Versioning & Release

This extension is versioned independently using semantic versioning in its own [package.json](vibe-code/package.json:1).

### Tag Prefix

Use the per-package tag pattern:

```
vibe-code-vX.Y.Z
```

Old tags (`code-vX.Y.Z`) are deprecated; do not create new ones with the old prefix.

### Release Steps (Manual)

```bash
# 1. Bump version (patch/minor/major as needed)
(cd vibe-code && npm version patch)

# 2. Stage and commit
git add vibe-code/package.json
git commit -m "vibe-code: bump to &lt;new-version&gt;"

# 3. Create tag with new prefix
git tag vibe-code-v&lt;new-version&gt;

# 4. Push tag
git push origin vibe-code-v&lt;new-version&gt;
```

Example:

```bash
(cd vibe-code && npm version patch)   # suppose bumps to 0.3.1
git add vibe-code/package.json
git commit -m "vibe-code: bump to 0.3.1"
git tag vibe-code-v0.3.1
git push origin vibe-code-v0.3.1
```

### CI Workflow Mapping

Tag pattern `vibe-code-v*` triggers the extension packaging workflow ([extension-publish.yml](.github/workflows/extension-publish.yml:1)) which:

- Validates presence of VSCE token (`VSCODE_PUBLISH_TOKEN`) if marketplace publish is desired.
- Runs `npm run compile` (see build script in [package.json](vibe-code/package.json:36)).
- Packages VSIX via `vsce package` (script in [package.json](vibe-code/package.json:39)) and attaches artifact.
- Publishes to Marketplace only when token is set and tag matches prefix.

### Smoke Test Before Tagging

Run:

```bash
(cd vibe-code && npm install && npm run smoke)
```

This ensures `dist/extension.js` exists before creating the tag.

### Retag Procedure (Correction)

If you mis-tag:

```bash
git push --delete origin vibe-code-v0.3.1
git tag -d vibe-code-v0.3.1
# Fix version or commit
git tag vibe-code-v0.3.1
git push origin vibe-code-v0.3.1
```

### Checklist Prior to Tagging

- [ ] Version bumped in [package.json](vibe-code/package.json:5)
- [ ] `npm run compile` succeeds
- [ ] No uncommitted changes
- [ ] VSCE PAT available (optional) for marketplace publish
- [ ] README updated if new features added

---