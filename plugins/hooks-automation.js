// hooks-automation.js
// OpenCode plugin: hooks 自动化
// 1. experimental.chat.system.transform — 每次请求注入最近 learnings 摘要（标题级，省 token）
// 2. event session.next.compaction.started — 压缩前自动写 HANDOFF（防上下文丢失）
// 3. event session.next.step.failed — 步骤失败自动记录 ERRORS.md（补充 tool.execute.after 未覆盖场景）

import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from "fs"
import path from "path"

const home = process.env.USERPROFILE || process.env.HOME || ""
const CONFIG_DIR = path.join(home, ".config", "opencode")
const LEARNINGS_DIR = path.join(CONFIG_DIR, ".learnings")
const ERRORS_FILE = path.join(LEARNINGS_DIR, "ERRORS.md")
const LEARNINGS_FILE = path.join(LEARNINGS_DIR, "LEARNINGS.md")
const HANDOFF_DIR = path.join(CONFIG_DIR, ".opencode", "plans")
const HANDOFF_FILE = path.join(HANDOFF_DIR, "HANDOFF.md")

// 读取最近 N 条 learnings 摘要（标题级）
function recentLearnings(n = 5) {
  try {
    if (!existsSync(LEARNINGS_FILE)) return ""
    const text = readFileSync(LEARNINGS_FILE, "utf8")
    const entries = text.split(/^### \[/m).filter((e) => e.trim())
    const recent = entries.slice(-n)
    return recent
      .map((e) => {
        const title = e.split("\n")[0].trim().slice(0, 120)
        return `- ${title}`
      })
      .join("\n")
  } catch {
    return ""
  }
}

// 脱敏：key/token 打码
function redact(text) {
  return text
    .replace(/(sk-[A-Za-z0-9]{8,})/g, "sk-***")
    .replace(/(m0-[A-Za-z0-9]{8,})/g, "m0-***")
    .replace(/(Bearer\s+[A-Za-z0-9._-]{8,})/gi, "Bearer ***")
    .replace(/(api[_-]?key["']?\s*[:=]\s*["']?[A-Za-z0-9]{8,})/gi, "$1***")
    .replace(/(token["']?\s*[:=]\s*["']?[A-Za-z0-9._-]{8,})/gi, "$1***")
}

// 去重：同摘要前 60 字符已存在则跳过
function alreadyLogged(excerpt) {
  try {
    const content = readFileSync(ERRORS_FILE, "utf8")
    return content.includes(excerpt.slice(0, 60))
  } catch {
    return false
  }
}

function appendError(source, detail) {
  try {
    if (!existsSync(LEARNINGS_DIR)) mkdirSync(LEARNINGS_DIR, { recursive: true })
    if (!existsSync(ERRORS_FILE)) appendFileSync(ERRORS_FILE, "# Errors\n\nCommand failures and integration errors.\n\n---\n", "utf8")
    const safe = redact(detail).slice(0, 200)
    if (alreadyLogged(safe)) return
    const now = new Date()
    const ymd = now.toISOString().slice(0, 10).replace(/-/g, "")
    const id = `ERR-${ymd}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`
    const entry = `\n## [${id}] auto-detected\n\n**Logged**: ${now.toISOString()}\n**Priority**: medium\n**Status**: pending\n**Area**: infra\n\n### Summary\nAuto-detected step failure (source: ${source})\n\n### Error\n\`\`\`\n${safe}\n\`\`\`\n\n### Metadata\n- Source: auto-detected\n- Pattern-Key: runtime.step-failed\n- Recurrence-Count: 1\n\n---\n`
    appendFileSync(ERRORS_FILE, entry, "utf8")
  } catch {
    // 静默失败，不影响主流程
  }
}

// 压缩前写 HANDOFF：保存当前任务进度摘要
function writeHandoff(event) {
  try {
    if (!existsSync(HANDOFF_DIR)) mkdirSync(HANDOFF_DIR, { recursive: true })
    const now = new Date().toISOString()
    const sessionID = event.sessionID || "unknown"
    const content = `# HANDOFF (auto-saved before compaction)\n\n- **时间**: ${now}\n- **会话**: ${sessionID}\n- **说明**: 上下文即将压缩，此文件为自动保存的进度锚点。若后续任务中断，先读此文件续跑，避免从头重做。\n\n---\n`
    writeFileSync(HANDOFF_FILE, content, "utf8")
  } catch {}
}

export const HooksAutomationPlugin = async () => {
  return {
    "experimental.chat.system.transform": async (input, output) => {
      // 注入最近 learnings 摘要（标题级，省 token）
      try {
        const recent = recentLearnings(5)
        if (recent) {
          output.system.push(`<recent-memory>最近记忆（标题级摘要，详细内容用 grep .learnings/ 或 qmd-lite 检索）：\n${recent}\n</recent-memory>`)
        }
      } catch {}
    },
    event: async ({ event }) => {
      // 压缩前自动写 HANDOFF
      if (event.type === "session.next.compaction.started") {
        writeHandoff(event)
      }
      // 步骤失败自动记录（补充 tool.execute.after 未覆盖场景）
      if (event.type === "session.next.step.failed") {
        const detail = JSON.stringify(event).slice(0, 300)
        appendError("step.failed", detail)
      }
    },
  }
}