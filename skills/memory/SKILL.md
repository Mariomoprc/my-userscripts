---
name: memory
description: "记忆技能：捕获/沉淀/检索 learnings 与 errors，自动晋级。 Use when: (1) A command or operation fails unexpectedly, (2) User corrects Claude ('No, that's wrong...', 'Actually...'), (3) User requests a capability that doesn't exist, (4) An external API or tool fails, (5) Claude realizes its knowledge is outdated or incorrect, (6) A better approach is discovered for a recurring task. Also review learnings before major tasks."
version: "4.1.0"
metadata:
---

# Memory Skill

记忆技能：捕获、沉淀、检索 learnings 与 errors，自动晋级到 AGENTS.md。Log learnings and errors to markdown files for continuous improvement. Agents can later process these into fixes, and important learnings get promoted to workspace memory. This version of the skill is adapted for OpenCode — for other agents, see the original multi-agent version at https://github.com/pskoett/pskoett-ai-skills.

## First-Use Initialisation

Before logging anything, ensure the `.learnings/` directory and files exist in the project or workspace root. If any are missing, create them:

```bash
mkdir -p .learnings
[ -f .learnings/LEARNINGS.md ] || printf "# Learnings\n\nCorrections, insights, and knowledge gaps captured during development.\n\n**Categories**: correction | insight | knowledge_gap | best_practice\n\n---\n" > .learnings/LEARNINGS.md
[ -f .learnings/ERRORS.md ] || printf "# Errors\n\nCommand failures and integration errors.\n\n---\n" > .learnings/ERRORS.md
[ -f .learnings/FEATURE_REQUESTS.md ] || printf "# Feature Requests\n\nCapabilities requested by the user.\n\n---\n" > .learnings/FEATURE_REQUESTS.md
```

Never overwrite existing files. This is a no-op if `.learnings/` is already initialised.

Do not log secrets, tokens, private keys, environment variables, or full source/config files unless the user explicitly asks for that level of detail. Prefer short summaries or redacted excerpts over raw command output or full transcripts.

If you want automatic reminders and session-end error detection, enable the opt-in hook described in [Optional: Enable Hook](#optional-enable-hook).

## Quick Reference

| Situation | Action |
|-----------|--------|
| Command/operation fails | Log to `.learnings/ERRORS.md` |
| User corrects you | Log to `.learnings/LEARNINGS.md` with category `correction` |
| User wants missing feature | Log to `.learnings/FEATURE_REQUESTS.md` |
| API/external tool fails | Log to `.learnings/ERRORS.md` with integration details |
| Knowledge was outdated | Log to `.learnings/LEARNINGS.md` with category `knowledge_gap` |
| Found better approach | Log to `.learnings/LEARNINGS.md` with category `best_practice` |
| Simplify/Harden recurring patterns | Log/update `.learnings/LEARNINGS.md` with `Source: simplify-and-harden` and a stable `Pattern-Key` |
| Similar to existing entry | Grep by `Pattern-Key` first, link with `**See Also**`, bump `Recurrence-Count` |
| Workflow improvements | Promote to `AGENTS.md` (workspace) |
| Tool gotchas | Promote to `AGENTS.md` (workspace) |
| Behavioral patterns | Promote to `AGENTS.md` (workspace) |

## OpenCode Setup

OpenCode uses workspace-based prompt injection with automatic skill loading.

### Installation

**Via OpenCode's built-in installer** — installs into the active OpenCode workspace:
```bash
# Skills are automatically loaded from ~/.config/opencode/skills/
# No manual installation needed - just place the skill folder in the skills directory
```

**Manual** (the skill lives in the repo's `memory/` subfolder):
```bash
# Copy the skill to OpenCode's skills directory
cp -r /path/to/memory ~/.config/opencode/skills/memory
```

### Workspace Structure

OpenCode injects these files into every session:

```
~/.config/opencode/
├── AGENTS.md          # Global behavior and session rules
├── .learnings/        # This skill's log files
│   ├── LEARNINGS.md
│   ├── ERRORS.md
│   └── FEATURE_REQUESTS.md
└── skills/            # Skills directory
    └── memory/
        └── SKILL.md
```

### Create Learning Files

```bash
mkdir -p ~/.config/opencode/.learnings
```

Then create the log files:
- `LEARNINGS.md` — corrections, knowledge gaps, best practices
- `ERRORS.md` — command failures, exceptions
- `FEATURE_REQUESTS.md` — user-requested capabilities

### Promotion Targets

When learnings prove broadly applicable, promote them to workspace files:

| Learning Type | Promote To | Example |
|---------------|------------|---------|
| Behavioral patterns | `AGENTS.md` | "Be concise, avoid disclaimers" |
| Workflow improvements | `AGENTS.md` | "Spawn sub-agents for long tasks" |
| Tool gotchas | `AGENTS.md` | "Git push needs auth configured first" |

### OpenCode Features

OpenCode provides built-in features for memory management:

- **自动记录** — `self-improvement.js` 插件自动注入检查指令，任务结束后模型自动写入 `.learnings/`（无需手动命令）；模型抽取候选先落 `.learnings/pending/`（`ERR-*`/`FEAT-*`/LRN 格式），任务前扫一次确认后 promote 到正式文件
- **OneDrive backup** — 自动备份（`.learnings/` 有变更时，`session.idle` 触发）：本地 `~/.local/share/opencode/backups_local/` 保留 3 份全量 + OneDrive `tools/系统_清理_优化/OpenCode-编程助手/` 保留 1 份 latest 快照
- **Router sync** — 已停止（软路由已无 opencode 容器，2026-08-30）
- **Watcher** — Automatic file change detection (configurable in `opencode.jsonc`)
- **MCP search tools** — Use Exa/Firecrawl/Tavily for web searches (see AGENTS.md 第2节)

### 本地检索（qmd-lite）

本地文件可能含答案时，**先搜本地再上网**。执行：

```bash
node ~/.config/opencode/scripts/qmd-lite.js "你的问句"        # Top5，<0.3秒
node ~/.config/opencode/scripts/qmd-lite.js "DNS坑" --limit 10  # 更多
node ~/.config/opencode/scripts/qmd-lite.js --update            # 有变更时增量重建
```

索引：`~/.cache/qmd-lite/index.json`（<5MB，FTS5 标题加权+近期加权+同义扩展，`rg` 兜底），源为 `.learnings/*.md + skills/*.md + AGENTS.md`。`self-improvement.js` 每周自动增量重建索引（mtime 比对，无变更跳过，状态存 `.learnings/.qmd-lite-state.json`）。

### Hooks

OpenCode 通过 plugins 实现 hooks。本技能配套的 OpenCode plugin 位于
`~/.config/opencode/plugins/self-improvement.js`，实现六个自动触发：

| OpenCode Hook | 对应原版脚本 | 功能 |
|---------------|-------------|------|
| `experimental.chat.system.transform` | `activator.sh` | 每次请求注入 `.learnings/` 检查提醒 + 自动记忆/skill/配置/晋级指令 |
| `tool.execute.after` | `error-detector.sh` | 检测 bash 工具错误 → 写入 `ERRORS.md`（去重+脱敏+Pattern-Key） |
| `event`（`session.error`） | openclaw session-end sweep | 会话出错时写入 `ERRORS.md` |
| `event`（`session.idle`） | — | `.learnings/` 有变更时自动备份（本地 3 份 + OneDrive 1 份 latest，节流） |
| `event`（`session.idle`） | — | 每周自动升级 superpowers 技能（节流） |
| `event`（`session.idle`） | — | 定期归档 ERRORS.md 迁移垃圾 + 自动晋级 Recurrence-Count ≥3 条目到 AGENTS.md |

**启用**：plugin 文件放入 `~/.config/opencode/plugins/` 后重启 opencode 即生效。
**验证**：故意运行一个失败命令，检查 `.learnings/ERRORS.md` 是否新增 `auto-detected` 条目。
**关闭**：删除或重命名 plugin 文件。

> 原版 `references/openclaw-integration.md` 是 OpenClaw 网关专用，OpenCode 不使用。

## Logging Format

### Learning Entry

Append to `.learnings/LEARNINGS.md`:

```markdown
## [LRN-YYYYMMDD-XXX] category

**Logged**: ISO-8601 timestamp
**Priority**: low | medium | high | critical
**Status**: pending
**Area**: frontend | backend | infra | tests | docs | config

### Summary
One-line description of what was learned

### Details
Full context: what happened, what was wrong, what's correct

### Suggested Action
Specific fix or improvement to make

### Metadata
- Source: conversation | error | user_feedback
- Source-Config: fingerprint e.g. go2-image-v2 (opencode.jsonc hash, optional)
- Valid-Until: YYYY-MM-DD (+30天，过期自动 outdated)
- Related Files: path/to/file.ext
- Tags: tag1, tag2
- See Also: LRN-20250110-001 (if related to existing entry)
- Pattern-Key: area.symptom (recommended; e.g. deps.module-not-found, simplify.dead_code — see Pattern-Key Taxonomy)
- Recurrence-Count: 1 (optional)
- First-Seen: 2025-01-15 (optional)
- Last-Seen: 2025-01-15 (optional)

---
```

### Error Entry

Append to `.learnings/ERRORS.md`:

```markdown
## [ERR-YYYYMMDD-XXX] skill_or_command_name

**Logged**: ISO-8601 timestamp
**Priority**: high
**Status**: pending
**Area**: frontend | backend | infra | tests | docs | config

### Summary
Brief description of what failed

### Error
```
Actual error message or output
```

### Context
- Command/operation attempted
- Input or parameters used
- Environment details if relevant
- Summary or redacted excerpt of relevant output (avoid full transcripts and secret-bearing data by default)

### Suggested Fix
If identifiable, what might resolve this

### Metadata
- Reproducible: yes | no | unknown
- Related Files: path/to/file.ext
- See Also: ERR-20250110-001 (if recurring)
- Pattern-Key: area.symptom (recommended; e.g. net.connection-refused — see Pattern-Key Taxonomy)
- Recurrence-Count: 1 (optional)
- First-Seen: 2025-01-15 (optional)
- Last-Seen: 2025-01-15 (optional)

---
```

### Feature Request Entry

Append to `.learnings/FEATURE_REQUESTS.md`:

```markdown
## [FEAT-YYYYMMDD-XXX] capability_name

**Logged**: ISO-8601 timestamp
**Priority**: medium
**Status**: pending
**Area**: frontend | backend | infra | tests | docs | config

### Requested Capability
What the user wanted to do

### User Context
Why they needed it, what problem they're solving

### Complexity Estimate
simple | medium | complex

### Suggested Implementation
How this could be built, what it might extend

### Metadata
- Frequency: first_time | recurring
- Related Features: existing_feature_name
- Pattern-Key: area.symptom (optional — features usually dedupe by capability name; use a key only for recurring themes, e.g. api.missing-endpoint)

---
```

## ID Generation

Format: `TYPE-YYYYMMDD-XXX`
- TYPE: `LRN` (learning), `ERR` (error), `FEAT` (feature)
- YYYYMMDD: Current date
- XXX: Sequential number or random 3 chars (e.g., `001`, `A7B`)

Examples: `LRN-20250115-001`, `ERR-20250115-A3F`, `FEAT-20250115-002`

## Resolving Entries

When an issue is fixed, update the entry:

1. Change `**Status**: pending` → `**Status**: resolved`
2. Add resolution block after Metadata:

```markdown
### Resolution
- **Resolved**: 2025-01-16T09:00:00Z
- **Commit/PR**: abc123 or #42
- **Notes**: Brief description of what was done
```

Other status values:
- `in_progress` - Actively being worked on
- `wont_fix` - Decided not to address (add reason in Resolution notes)
- `promoted` - Elevated to a workspace file (`AGENTS.md`)

## Promoting to Workspace Memory

When a learning is broadly applicable (not a one-off fix), promote it to a workspace file so every session inherits it.

### When to Promote

- Learning applies across multiple files/features
- Knowledge any contributor (human or AI) should know
- Prevents recurring mistakes
- Documents project-specific conventions

### Promotion Targets

| Target | What Belongs There |
|--------|-------------------|
| `AGENTS.md` | Workflows, delegation patterns, automation rules（本工作区唯一晋级目标） |

> 通用模板另有 `SOUL.md`（行为准则/沟通风格）与 `TOOLS.md`（工具能力/集成坑），本工作区未使用，统一晋级到 `AGENTS.md`。

When the learning is specific to a project repo you work in (not the
workspace), promote to that project's own agent file (e.g. its `AGENTS.md`)
instead.

### How to Promote

1. **Distill** the learning into a concise rule or fact
2. **Add** to appropriate section in target file (create file if needed)
3. **Update** original entry:
   - Change `**Status**: pending` → `**Status**: promoted`
   - Add `**Promoted**: AGENTS.md`

### Promotion Examples

**Learning** (verbose):
> Project uses pnpm workspaces. Attempted `npm install` but failed. 
> Lock file is `pnpm-lock.yaml`. Must use `pnpm install`.

**In AGENTS.md** (concise):
```markdown
## Build & Dependencies
- Package manager: pnpm (not npm) - use `pnpm install`
```

**Learning** (verbose):
> When modifying API endpoints, must regenerate TypeScript client.
> Forgetting this causes type mismatches at runtime.

**In AGENTS.md** (actionable):
```markdown
## After API Changes
1. Regenerate client: `pnpm run generate:api`
2. Check for type errors: `pnpm tsc --noEmit`
```

## Pattern-Key Taxonomy

`Pattern-Key` is the stable dedup and recurrence key for entries in all three
log files: keyword grep misses semantically identical but differently-worded
entries, a shared key does not — and reliable keys are what make
`Recurrence-Count` and the promotion rule work.

**Format**: `area.symptom` — exactly two levels, lowercase, hyphenated
(e.g. `deps.module-not-found`). Keep symptoms generic enough to recur: no
file names, versions, or hostnames in keys.

| Area | Scope | Example Keys |
|------|-------|--------------|
| `api` | External API/service behavior | `api.rate-limit`, `api.schema-mismatch`, `api.missing-endpoint` |
| `auth` | Credentials, tokens, scopes | `auth.token-expired`, `auth.missing-scope` |
| `build` | Compilation, bundling, CI | `build.type-error`, `build.missing-artifact` |
| `config` | Config files, env vars, settings | `config.missing-env`, `config.invalid-json` |
| `deps` | Package managers, dependencies | `deps.module-not-found`, `deps.npm-error`, `deps.version-conflict` |
| `fs` | Filesystem | `fs.no-such-file`, `fs.permission-denied` |
| `net` | Network connectivity | `net.connection-refused`, `net.timeout` |
| `runtime` | Language/runtime errors not covered above | `runtime.type-error`, `runtime.python-exception` |
| `shell` | Shell/CLI mechanics | `shell.command-not-found`, `shell.nonzero-exit` |
| `vcs` | Git and other version control | `vcs.fatal-error`, `vcs.merge-conflict` |
| `simplify` / `harden` | Code-quality patterns from the simplify-and-harden feed | `simplify.dead_code`, `harden.input_validation` |

**Rules:**

1. **Reuse before minting**: `grep -rh "Pattern-Key:" .learnings/ | sort -u` —
   a near-match beats a new key.
2. **One key per manual entry**; auto-swept entries may carry
   several — reduce to one when triaging.
3. **Mint new areas sparingly** — only when several entries would share one.
4. **Generic sweep keys** (`runtime.error`, `runtime.failure`) mean
   "unclassified" — replace with a specific key during triage.

## Recurring Pattern Detection

If logging something similar to an existing entry:

1. **Search by key first**: `grep -n "Pattern-Key: area.symptom" .learnings/*.md`
   — this is the default dedup check and catches rewordings that keyword
   search misses
2. **Fallback keyword search**: `grep -ri "keyword" .learnings/` for entries
   logged without a key
3. **Fold, don't duplicate**: on a hit, update the existing entry — bump
   `Recurrence-Count`, set `Last-Seen`, add `**See Also**` — instead of
   creating a new one
4. **Bump priority** if issue keeps recurring
5. **Consider systemic fix**: Recurring issues often indicate:
   - Missing knowledge (→ promote to `AGENTS.md`)
   - Missing automation (→ add to `AGENTS.md`)
   - Architectural problem (→ create tech debt ticket)

## Simplify & Harden Feed

Use this workflow to ingest recurring patterns from the `simplify-and-harden`
skill and turn them into durable prompt guidance.

### Ingestion Workflow

1. Read `simplify_and_harden.learning_loop.candidates` from the task summary.
2. For each candidate, use `pattern_key` as the stable dedupe key.
3. Search `.learnings/LEARNINGS.md` for an existing entry with that key:
   - `grep -n "Pattern-Key: <pattern_key>" .learnings/LEARNINGS.md`
4. If found:
   - Increment `Recurrence-Count`
   - Update `Last-Seen`
   - Add `See Also` links to related entries/tasks
5. If not found:
   - Create a new `LRN-...` entry
   - Set `Source: simplify-and-harden`
   - Set `Pattern-Key`, `Recurrence-Count: 1`, and `First-Seen`/`Last-Seen`

### Promotion Rule (System Prompt Feedback)

Promote recurring patterns into agent context/system prompt files when all are true:

- `Recurrence-Count >= 3`
- Seen across at least 2 distinct tasks
- Occurred within a 30-day window

Promotion targets: `AGENTS.md` (workspace)，或项目自身的 agent 文件（当模式为项目特定时）。

Write promoted rules as short prevention rules (what to do before/while coding),
not long incident write-ups.

## Periodic Review

Review `.learnings/` at natural breakpoints:

### When to Review
- Before starting a new major task
- After completing a feature
- When working in an area with past learnings
- Weekly during active development

### Quick Status Check
```bash
# Count pending items
grep -h "Status\*\*: pending" .learnings/*.md | wc -l

# List pending high-priority items
grep -B5 "Priority\*\*: high" .learnings/*.md | grep "^## \["

# Find learnings for a specific area
grep -l "Area\*\*: backend" .learnings/*.md
```

### Review Actions
- Resolve fixed items
- Promote applicable learnings
- Link related entries
- Escalate recurring issues

## Detection Triggers

Automatically log when you notice:

**Corrections** (→ learning with `correction` category):
- "No, that's not right..."
- "Actually, it should be..."
- "You're wrong about..."
- "That's outdated..."

**Feature Requests** (→ feature request):
- "Can you also..."
- "I wish you could..."
- "Is there a way to..."
- "Why can't you..."

**Knowledge Gaps** (→ learning with `knowledge_gap` category):
- User provides information you didn't know
- Documentation you referenced is outdated
- API behavior differs from your understanding

**Errors** (→ error entry):
- Command returns non-zero exit code
- Exception or stack trace
- Unexpected output or behavior
- Timeout or connection failure

## Priority Guidelines

| Priority | When to Use |
|----------|-------------|
| `critical` | Blocks core functionality, data loss risk, security issue |
| `high` | Significant impact, affects common workflows, recurring issue |
| `medium` | Moderate impact, workaround exists |
| `low` | Minor inconvenience, edge case, nice-to-have |

## Area Tags

Use to filter learnings by codebase region:

| Area | Scope |
|------|-------|
| `frontend` | UI, components, client-side code |
| `backend` | API, services, server-side code |
| `infra` | CI/CD, deployment, Docker, cloud |
| `tests` | Test files, testing utilities, coverage |
| `docs` | Documentation, comments, READMEs |
| `config` | Configuration files, environment, settings |

## Best Practices

1. **Log immediately** - context is freshest right after the issue
2. **Be specific** - future agents need to understand quickly
3. **Include reproduction steps** - especially for errors
4. **Link related files** - makes fixes easier
5. **Suggest concrete fixes** - not just "investigate"
6. **Use consistent categories** - enables filtering
7. **Promote aggressively** - if in doubt, add to `AGENTS.md`
8. **Review regularly** - stale learnings lose value

## Gitignore Options

**Keep learnings local** (per-developer):
```gitignore
.learnings/
```

This repo uses that default to avoid committing sensitive or noisy local logs by accident.

**Track learnings in repo** (team-wide):
Don't add to .gitignore - learnings become shared knowledge.

**Hybrid** (track templates, ignore entries):
```gitignore
.learnings/*.md
!.learnings/.gitkeep
```

## Upgrading & Uninstalling

Read `CHANGELOG.md` before upgrading — it carries per-version notes, and
hook changes require re-copying the hook and restarting the gateway.
To disable or remove the skill, follow `references/uninstall.md`:
`.learnings/` is user data (review before deleting), and content promoted to
`AGENTS.md` stays until removed manually.

## Automatic Skill Extraction

When a learning is valuable enough to become a reusable skill, extract it using the provided helper.

### Skill Extraction Criteria

A learning qualifies for skill extraction when ANY of these apply:

| Criterion | Description |
|-----------|-------------|
| **Recurring** | Has `See Also` links to 2+ similar issues |
| **Verified** | Status is `resolved` with working fix |
| **Non-obvious** | Required actual debugging/investigation to discover |
| **Broadly applicable** | Not project-specific; useful across codebases |
| **User-flagged** | User says "save this as a skill" or similar |

### Extraction Workflow

1. **Identify candidate**: Learning meets extraction criteria
2. **Run helper** (or create manually):
   ```bash
   # For OpenCode: Create the skill directory manually
   mkdir -p ~/.config/opencode/skills/skill-name
   # Then create SKILL.md with the learning content
   ```
3. **Customize SKILL.md**: Fill in template with learning content
4. **Update learning**: Set status to `promoted_to_skill`, add `Skill-Path`
5. **Verify**: Read skill in fresh session to ensure it's self-contained

### Manual Extraction

If you prefer manual creation:

1. Create `skills/<skill-name>/SKILL.md`
2. Use template from `assets/SKILL-TEMPLATE.md`
3. Follow [Agent Skills spec](https://agentskills.io/specification):
   - YAML frontmatter with `name` and `description`
   - Name must match folder name
   - No README.md inside skill folder

### Extraction Detection Triggers

Watch for these signals that a learning should become a skill:

**In conversation:**
- "Save this as a skill"
- "I keep running into this"
- "This would be useful for other projects"
- "Remember this pattern"

**In learning entries:**
- Multiple `See Also` links (recurring issue)
- High priority + resolved status
- Category: `best_practice` with broad applicability
- User feedback praising the solution

### Skill Quality Gates

Before extraction, verify:

- [ ] Solution is tested and working
- [ ] Description is clear without original context
- [ ] Code examples are self-contained
- [ ] No project-specific hardcoded values
- [ ] Follows skill naming conventions (lowercase, hyphens)
