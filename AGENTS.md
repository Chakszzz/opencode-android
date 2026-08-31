# Mobile App - AGENTS.md

## Retrospectives (read before related work)

See [`.agents/retro.md`](.agents/retro.md) for lessons from past tasks. Read entries related to your current work before starting — they document mistakes that cost hours and how to avoid them.

## Agent Operating Rules (read first)

**CRITICAL: NEVER execute destructive Git commands:**
- **STRICTLY FORBIDDEN**: `git checkout -- <file>`, `git checkout <file>`, `git restore <file>`, `git reset`, `git clean`, `git stash drop`, or any command that discards uncommitted working directory changes.
- The workspace constantly contains uncommitted local changes, newly implemented features, and SDK methods across multiple files. Running `git checkout` or `git restore` wipes valid code and breaks dependent components.
- If you made a syntax error or wrong edit, fix the code using file editing tools (`replace_file_content` / `write_to_file`) or manually revert only the specific lines you modified. NEVER use Git to reset/checkout files.

**Failure taxonomy — classify every failure before acting. Escalate cheapest-first; never skip a rung or repeat one:**
- **transient** (network blip, flaky): retry at most 2×.
- **code** (your bug, wrong path, bad arg): fix, then retry.
- **tool-usage-gated** (you called a *working* tool wrong): fix the *call*, not the tool. Cheapest fix — try this before assuming the tool is broken. Example: chrome-devtools `new_page` with `isolatedContext` opens a cookieless context; instead use `list_pages` → `select_page` to drive the existing authenticated tab.
- **tooling-gated** (the tool's *source* is genuinely broken): **diagnose before fixing** — verify it's actually broken (read the code, reproduce). If broken, spawn a fix-it subagent to patch + rebuild it, then retry. Do NOT stop.
- **infra** (CI runner, emulator boot timeout): report it; do not try to "fix" someone else's infrastructure.
- **human-gated** (only when no automated path exists): emit ONE precise instruction for the human, mark the task **BLOCKED**, and continue all other automatable work. Never re-attempt across turns.

**Diagnose before fixing:** Before patching or replacing any tool, confirm it is actually the cause. Copilot burned 39h assuming chrome-devtools-mcp was broken — it wasn't (it already drives the authenticated default context via `browser.defaultBrowserContext()`/`browser.pages()`). A 3-minute diagnostic subagent would have caught this.

**Known gated steps:**
- Play Console **API-access grant** to the service account — *was* the blocker; now granted (publish run 26662900471 succeeded, AAB on internal track, versionCode 19). One-time path if re-needed: Play Console → Setup → API access → link GCP project `opencode-mobile-deploy` → grant `playstore-deploy@opencode-mobile-deploy.iam.gserviceaccount.com` Admin/Release-manager.
- **Add internal testers** (Play Console → Internal testing → Testers): the genuinely human-gated residual. Google's anti-automation blocks CDP-controlled Chrome sign-in, so this UI step needs a human (or a real, non-CDP browser session).

**Stop discipline:** If a tool returns the same error 3× (or no new artifact/commit is produced across several turns), STOP. Print a BLOCKED summary with the single human action needed. A vague "please do X and let me know" that leaves you idle is worse than a clean stop — don't do it.

**Work-tracking discipline:**
- Track multi-step/upgrade work in the **related GitHub issue**, updated via `gh issue comment` — NOT by repeatedly editing AGENTS.md and NOT in scratch files under `/tmp` (e.g. no `/tmp/playconsole-fill.md`). Keep reference material (listing copy, form answers) in the repo under `distribution/` or as issue comments.
- AGENTS.md is for durable conventions only; do not churn it with task status.
- **Never claim a step done without verifying it in the real channel** (e.g. an app exists only if it appears in the Play Console app-list; an AAB is the right package only if its manifest says so). Do not invent IDs.
- **Driving web UIs:** snapshot → act on the *current* uids → re-snapshot. Never fire batched/guessed clicks; if a page shows "Loading"/an error toast, wait and re-snapshot rather than clicking blind.

## Overview

React Native / Expo mobile client for opencode. Connects to an opencode server instance via HTTP + SSE for real-time updates.

**Repo**: `dzianisv/opencode-mobile` (standalone, not part of opencode monorepo)
**Package name**: `cc.agentlabs.opencode`

## Architecture

```
app/                    # Expo Router file-based routing
├── (tabs)/             # Tab navigation (sessions, connections, settings)
├── session/[id].tsx    # Chat screen (composer, messages, slash popover, bottom sheets)
└── connection/         # Add/edit connection screens
src/
├── components/         # Reusable UI components
│   ├── chat/           # Chat & interactive bottom sheets
│   │   ├── SlashPopover.tsx          # Slash command palette (/)
│   │   ├── FileMentionPopover.tsx    # File/folder mention autocomplete (@)
│   │   ├── ConnectProviderSheet.tsx  # AI provider, custom provider (Ollama/vLLM), & API keys
│   │   ├── OpenCodeSettingsSheet.tsx # Native server config & opencode.json editor
│   │   ├── McpSheet.tsx              # MCP servers & tools toggle
│   │   ├── StatusSheet.tsx           # Context tokens, model info, health stats
│   │   ├── SkillsSheet.tsx           # Available skills browser & prompt injector
│   │   ├── ReviewDiffSheet.tsx       # Visual Git diff viewer with line quoting
│   │   ├── SubagentsSheet.tsx        # Child subagent sessions drawer
│   │   ├── AgentPickerSheet.tsx      # Agent mode switcher (build, plan, etc.)
│   │   ├── DirectoryBrowserSheet.tsx # Server filesystem workspace browser
│   │   ├── TodoSheet.tsx             # Interactive task checklist tracker (/todo, todowrite)
│   │   ├── TodoDock.tsx              # Live task progress & checklist dock above composer
│   │   ├── FollowupDock.tsx          # Context-aware smart follow-up suggestions dock
│   │   ├── RevertDock.tsx            # Session rollback banner with instant restore/undo
│   │   ├── SessionsSheet.tsx         # In-chat session switcher drawer (/sessions, /switch)
│   │   ├── DiffView.tsx              # Line-by-line visual diff renderer & patch parser
│   │   ├── context-breakdown.ts      # Context breakdown token distribution estimator
│   │   ├── turn-grouping.ts          # Turn-based conversation grouper (merges assistant turn parts & errors)
│   │   ├── ModelPicker.tsx           # Model selector sheet
│   │   └── VariantPicker.tsx         # Reasoning effort / model variants
│   ├── markdown/       # Markdown renderer (wraps react-native-marked)
│   │   ├── Markdown.tsx              # Keyed block renderer
│   │   └── CodeBlock.tsx             # Syntax-highlighted code block with line numbers & copy
│   └── AuthGate.tsx    # Biometric auth gate
├── lib/
│   ├── sdk.ts          # Full HTTP + SSE client for OpenCode server API
│   ├── types.ts        # Re-exported types
│   ├── scroll-config.ts # Shared horizontal scroll configs for wide code & diffs
│   └── i18n/           # Internationalization & translation dictionary
│       ├── en.json     # English strings
│       ├── id.json     # Indonesian strings (Bahasa Indonesia)
│       └── zh-Hans.json# Simplified Chinese strings (简体中文)
└── stores/             # Zustand state stores
    ├── sessions.ts     # Session list, messages, parts, subagents
    ├── connections.ts  # Server connections, client lifecycle
    ├── events.ts       # SSE event stream, status tracking, permissions, questions
    ├── catalog.ts      # Providers, models, agents, commands catalog
    └── auth.ts         # Biometric auth
scripts/
└── android-cua-smoke.py  # LLM-powered CUA E2E test
```

## Key Patterns

- **SSE for real-time**: The `events.ts` store connects to `/global/event` and dispatches to other stores.
- **Fire-and-forget sends**: `sendMessage` posts to `/session/:id/prompt_async` without awaiting response; SSE events drive all UI updates.
- **Native Slash Commands**: Slash commands (`/compact`, `/skills`, `/init`, `/review`, `/diff`, `/subagents`, `/settings`, `/status`, `/connect`, `/mcps`, `/workspaces`, `/todo`, `/sessions`, `/switch`) are wired directly to native OpenCode server endpoints and bottom sheets:
  - `/review`: Executes the native OpenCode AI Code Review command on the server via `POST /session/:id/command`.
  - `/diff`: Opens the visual Git diff bottom sheet (`ReviewDiffSheet`) with interactive line tapping to quote diff lines directly into composer.
  - `/todo`: Opens `TodoSheet` displaying active task progress, subtasks, and completion checkmarks parsed from `todowrite` tool parts.
  - `/sessions` / `/switch`: Opens `SessionsSheet` allowing instant switching across sessions and projects without exiting the chat view.
  - `/status`: Opens `StatusSheet` with live health latency, token metrics, and Context Distribution breakdown.
  - `/connect`: Opens `ConnectProviderSheet` supporting both preset providers and custom OpenAI-compatible endpoints (Ollama, vLLM, LMStudio, OpenRouter).
- **Composer Mentions (`@` and `/`)**:
  - `@`: Triggers `FileMentionPopover` fetching the server filesystem index via `client.file.list` to autocomplete file paths.
  - `/`: Triggers `SlashPopover` to autocomplete commands.
- **Tool Call Grouping & Collapsing**:
  - When a message contains 3+ tool calls, `MessageBubble` collapses them into a summary badge (`⚡ N tools executed • Show/Hide`) with accessibility controls, auto-expanding whenever a tool is actively running.
- **Session Actions**:
  - **Fork from Message**: Long-pressing any user or assistant message allows branching the session from that point into a new session.
  - **Revert / Edit Message**: Rolls back session state on the server and restores previous text and attachments into composer.
  - **Export Transcript**: Shares or copies formatted markdown transcript to clipboard.
- **Bottom Sheet Gestures**: Always use `@gorhom/bottom-sheet` with:
  - `enableContentPanningGesture={false}` + `enableHandlePanningGesture={true}` to prevent scroll-to-close conflicts.
  - Always use `BottomSheetScrollView`, `BottomSheetFlatList`, and `BottomSheetTextInput` inside bottom sheets.
  - Always include a dedicated close (`X`) button in the sheet header.
- **Markdown & Code Blocks**: `Markdown.tsx` uses `cloneElement` with array keys for stable block rendering; `CodeBlock.tsx` provides multi-language syntax highlighting, line numbers gutter, and copy action.

## Internationalization (i18n)

- **Supported Languages**:
  - `en` (English - default)
  - `id` (Bahasa Indonesia)
  - `zh-Hans` (Simplified Chinese)
- **Rules**:
  - Never hardcode user-facing strings; always use `useTranslation()` (`const { t } = useTranslation()`).
  - When adding new translation keys, **ALL THREE** translation files (`src/lib/i18n/en.json`, `id.json`, `zh-Hans.json`) must be updated in tandem.
  - Key parity across all locales is strictly enforced by unit test `src/lib/i18n/catalog-parity.test.ts`.

## Design & Color Conventions

- **Monochrome Clean Theme**: Strictly **NO PURPLE / VIOLET** (`#8b5cf6`, `#6d28d9`, `#f5f3ff`, `#1e1b4b`, etc.).
  - Primary text & accents: `#0a0a0a` (Light) / `#ffffff` (Dark).
  - Backgrounds & cards: `#ffffff` / `#f5f5f5` / `#f9fafb` (Light) and `#0a0a0a` / `#141414` / `#1c1c1c` (Dark).
  - Borders & dividers: `#e5e7eb` / `#e1e4e8` (Light) and `#262626` / `#30363d` (Dark).
  - Badges & chips: `#f0f0f0` (Light) / `#222222` (Dark).
- **Semantic Accents Only**:
  - Green (`#16a34a` / `#22c55e`): Connected status, Git additions `+N`, success states.
  - Red (`#dc2626` / `#ef4444`): Git deletions `-N`, errors, destructive actions.
  - Blue (`#0969da` / `#3b82f6` / `#58a6ff`): Web URLs, markdown links, file paths in tool cards, code functions/identifiers.
  - Amber (`#d97706` / `#f59e0b`): Warnings, reconnecting banners.

## Style Guide

- Prefer `const` over `let`
- Avoid `else` statements, use early returns
- Prefer single-word variable names
- Avoid `try/catch` where possible
- Avoid `any` type
- Use Bun APIs where applicable (for scripts, not in RN runtime)

## Running

```bash
npm install
npx expo start        # Expo dev server
npx expo run:android  # Android emulator
```

## Connecting

Run `opencode serve --hostname 0.0.0.0 --port 4096` on your machine, then add a connection in the app with your machine's local IP and port 4096.

**Dev server**: `100.108.64.76:4096` (Tailscale, hostname `openclaw-dev-1`)

## Android Emulator (local dev)

**IMPORTANT: Do NOT install SDK/AVD on the system disk. Use the external disk.**

```bash
export ANDROID_HOME=/Volumes/Dzianis-3/macbook2020/android-sdk
export ANDROID_AVD_HOME=/Volumes/Dzianis-3/macbook2020/android-avd
export GRADLE_USER_HOME=/Volumes/Dzianis-3/macbook2020/gradle-cache
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

emulator -avd test -no-window -no-audio -no-boot-anim -gpu swiftshader_indirect -no-snapshot -port 5554
adb wait-for-device
# Wait for boot:
timeout 120 bash -c 'while [ "$(adb shell getprop sys.boot_completed 2>/dev/null)" != "1" ]; do sleep 2; done'
```

SDK location: `/Volumes/Dzianis-3/macbook2020/android-sdk` (API 34, arm64-v8a system image).
AVD location: `/Volumes/Dzianis-3/macbook2020/android-avd`.
Gradle cache: `/Volumes/Dzianis-3/macbook2020/gradle-cache` (or symlink from `/Volumes/GradleCache/gradle-home`).

## CUA Smoke Test (E2E via Vision LLM)

The script `scripts/android-cua-smoke.py` drives the emulator via ADB using a vision model loop (screenshot → LLM → action → repeat).

### Run modes

**`--showcase` (default, regression guard)**
```bash
source ~/.env.d/azure-openai.env
python3 scripts/android-cua-smoke.py --model gpt-5.4 --include-xml
```
Runs: connect → sessions load (pre-created session MUST appear) → new session → sessions reload → TypeScript task → settings.

**`--e2e` (full coding task, project dir, model picker)**
```bash
source ~/.env.d/azure-openai.env
python3 scripts/android-cua-smoke.py --e2e \
  --opencode-url http://100.108.64.76:4096 \
  --e2e-project-dir ~/workspace/opencode-mobile \
  --e2e-model-hint deepseek \
  --e2e-task "Write a hello_world.py file that prints 'Hello World' to stdout." \
  --e2e-filename hello_world.py
```
Phases: connect → long-press FAB → enter project dir → select deepseek model → submit task → **DETERMINISTIC** API poll for idle → **DETERMINISTIC** API scan for filename → **DETERMINISTIC** ADB uiautomator check.

**`--query` (natural-language test description)**
```bash
source ~/.env.d/azure-openai.env
python3 scripts/android-cua-smoke.py \
  --opencode-url http://100.108.64.76:4096 \
  --query "Open android app. Setup against remote opencode server. Go to sessions. \
           Open a new project inside ~/workspace/opencode-mobile. \
           Choose opencode/deepseek model. Start a new session. \
           Ask to write hello_world.py. Validate that agent completed task." \
  --eval-output /tmp/eval-report.json
```
The LLM plans phases from the query, executes them, runs deterministic checks, and prints a scored evaluation report (overall/score/phases/recommendations).

### Available models on dev server (100.108.64.76:4096)

Key models: `deepseek-v4-flash-free` (opencode), `claude-fable-5` (anthropic), `gpt-5.4` (github-copilot), `gemini-3.5-flash` (github-copilot)

Use `--e2e-model-hint deepseek` to select `deepseek-v4-flash-free` (free quota, good for coding tasks).

### Azure OpenAI credentials

The correct Azure AI Services endpoint (with actual deployments) is:
- **Endpoint**: `https://info-mjnxtt51-eastus2.cognitiveservices.azure.com`
- **Env file**: `~/.env.d/azure-openai.env`
- **Available vision models**: `gpt-5.4`, `gpt-5.2`, `gpt-5.1`, `gpt-4.1`

> **WARNING**: The `vibe-dev-ai.cognitiveservices.azure.com` resource has NO deployments (only a model catalog). Do NOT use it for inference. Always use `info-mjnxtt51-eastus2`.

### API notes for gpt-5.x models

- Use `max_completion_tokens` (NOT `max_tokens`) — the older param is rejected.
- Use `AzureOpenAI` client from the `openai` Python SDK with `api_version="2024-08-01-preview"`.
- Vision works: pass `image_url` with `data:image/png;base64,...` in user message content array.

### CI

GitHub Actions workflow: `.github/workflows/cua-smoke.yml`
Secrets required: `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT` (already set on `dzianisv/opencode-mobile`).

**Triggers**: Runs on push to `main` (with path filters) AND on `v*` tags (releases).

**Dispatch inputs** (workflow_dispatch):
- `scenario`: `showcase` (default) | `e2e`
- `query`: natural-language test description (enables `--query` mode, overrides scenario)
- `opencode_url`: override server URL (use Tailscale URL for live server)
- `e2e_project_dir`, `e2e_model_hint`, `e2e_task`, `e2e_filename`: e2e mode params

### When to run CUA test

**MANDATORY**: Run the CUA smoke test before any merge to `main` or release:
1. Before merging a PR that touches `src/**`, `app/**`, or `scripts/android-cua-smoke.py`
2. After creating a release tag — CI runs it automatically
3. When debugging UI issues — run locally with `--include-xml` for richer context
4. When validating a specific AI coding task — use `--e2e` or `--query`

If the CUA test fails, do NOT merge or release until fixed.

## Secrets Management

All project secrets are stored in Bitwarden vault under folder **`opencode-mobile`**.

Use the `bitwarden-cli` skill to read/write secrets. Quick reference:

```bash
# Unlock (needs BW_PASSWORD in env or ~/.bitwarden_credentials)
source ~/.bitwarden_credentials
export BW_SESSION=$(bw unlock --passwordenv BW_PASSWORD --raw)
bw sync --session "$BW_SESSION"

# Get a secret
bw get notes "EXPO_PUBLIC_SENTRY_DSN" --session "$BW_SESSION"

# List all secrets in the folder
FOLDER_ID=$(bw list folders --session "$BW_SESSION" | jq -r '.[] | select(.name=="opencode-mobile") | .id')
bw list items --session "$BW_SESSION" | jq --arg f "$FOLDER_ID" '[.[] | select(.folderId==$f) | {name}]'
```

Secrets stored in vault:
- `EXPO_PUBLIC_SENTRY_DSN` — Sentry ingest DSN (embedded in APK at build time)
- `SENTRY_AUTH_TOKEN` — sentry-cli upload token (source maps, releases)
- `SENTRY_ORG` — `vibetechnologies`
- `SENTRY_PROJECT` — `opencode-mobile`

These same secrets are set as GitHub Actions secrets on `dzianisv/opencode-mobile` for CI builds.

**Do NOT store secrets in `.env` files committed to the repo.** `.env` is gitignored — local copy only.

## VibeBrowser CLI (Browser Automation)

Use `@vibebrowser/cli` against the authenticated remote browser relay. Do not
register or use the retired `chrome-devtools` MCP server in Copilot.

Keep the relay URL outside the repository:

```bash
export VIBEBROWSER_REMOTE_URL='wss://relay.api.vibebrowser.app/<session-id>'
npx -y @vibebrowser/cli@0.2.12 \
  --remote "$VIBEBROWSER_REMOTE_URL" --json status
```

List tabs first, then pass `--page-id` on every command so automation does not
switch or disturb the user's active tab:

```bash
npx -y @vibebrowser/cli@0.2.12 \
  --remote "$VIBEBROWSER_REMOTE_URL" --json tabs
npx -y @vibebrowser/cli@0.2.12 \
  --remote "$VIBEBROWSER_REMOTE_URL" --page-id <id> --json snapshot
```

## GitHub Auth

For pushes/gh CLI on this repo: `source ~/.env.d/github-dzianisv.env`

## Google Account

**ALL Google operations** (Play Console, GCP Console, YouTube, Firebase, etc.) use **`vibeteaichnologies@gmail.com`** — the VIBE TECHNOLOGIES, LLC account. `dzianisvv@gmail.com` is the personal account and does NOT have access to the project GCP resources, Play Console, or YouTube channel. Always verify the active account in the top-right corner before making changes. If GCP console shows `dzianisvv@gmail.com`, switch accounts via the avatar menu.

## Google Play Console

- **Developer account**: VIBE TECHNOLOGIES, LLC (ID: `8842655543970815326`), Google login `vibeteaichnologies@gmail.com`. The `/u/N/` index is NOT stable — if a console URL bounces to accept-terms/create-developer-account you're on the wrong Google account (e.g. `dzianisvv@gmail.com` hits a ToS gate); use the developer-account chooser to reach VIBE.
- **Rebrand (2026-05-30)**: package renamed `ai.opencode.mobile` → `cc.agentlabs.opencode`. **App IS live on Play Store internal track** (v0.4.6, versionCode 33). CI publishes updates automatically via the service account after the first manual upload was completed. CI `packageName` = `cc.agentlabs.opencode`. NOTE: CI publish build needs the "Purge stale generated sources" step (commit 67e4c1f) or cached old-package autolinking breaks compile.
- **Legacy app (orphaned)**: `ai.opencode.mobile`, app ID `4975545755653045321` — published v19 to internal track (run 26662900471), superseded by the rebrand.
- **Track**: Internal testing (no review required, up to 100 testers)
- **Service account**: `playstore-deploy@opencode-mobile-deploy.iam.gserviceaccount.com` (account-level API access already granted)

## Related Issues

- Upstream: `anomalyco/opencode#10288`
- Branch on upstream fork: `feat/android-backbone-10288` on `dzianisv/opencode`
