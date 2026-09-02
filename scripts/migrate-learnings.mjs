/**
 * 迁移脚本：.learnings/ → opencode-mem
 *
 * 用法：在 opencode 新会话中执行，或手动 node migrate-learnings.mjs
 * 
 * 功能：
 * 1. 解析 .learnings/ 下所有 .md 文件的条目
 * 2. 按类型分类（learning/error/feature/memo）
 * 3. 调用 opencode-mem Web API 写入数据库
 * 
 * 前提：opencode-mem worker 已启动（http://127.0.0.1:4747）
 */

import { readFileSync, readdirSync, existsSync } from "fs"
import { join } from "path"
import { homedir } from "os"

const LEARNINGS_DIR = join(homedir(), ".config", "opencode", ".learnings")
const API_BASE = "http://127.0.0.1:4747/api"

// 读取 auth token
const AUTH_TOKEN = readFileSync(join(homedir(), ".opencode-mem", ".auth-token"), "utf-8").trim()

// --- 解析条目 ---

function parseEntries(filePath, content) {
  const entries = []
  const fileName = filePath.split(/[/\\]/).pop()

  // ## [LRN-YYYYMMDD-NNN] 或 ## [ERR-YYYYMMDD-NNN] 或 ## [FR-YYYYMMDD-NNN]
  const structured = content.split(/^## \[/m).slice(1)
  for (const block of structured) {
    const headerMatch = block.match(/^((?:LRN|ERR|FR)-\d{8}-\d+)\]\s*(.+)/)
    if (!headerMatch) continue

    const id = headerMatch[1]
    const title = headerMatch[2].trim()
    const type = id.startsWith("LRN") ? "learning" : id.startsWith("ERR") ? "error" : "feature"
    const lines = block.split("\n").slice(1).filter(l => l.trim())

    // 提取 Summary 和 Details
    let summary = ""
    let details = ""
    let currentSection = ""
    for (const line of lines) {
      if (line.startsWith("### Summary")) { currentSection = "summary"; continue }
      if (line.startsWith("### Details")) { currentSection = "details"; continue }
      if (line.startsWith("###") || line.startsWith("## ")) { currentSection = ""; continue }
      if (line.startsWith("**") && line.endsWith("**")) continue // metadata headers
      if (line.startsWith("- ") || line.startsWith("  - ")) {
        const clean = line.replace(/^[-\s]+/, "")
        if (currentSection === "summary") summary += clean + " "
        else if (currentSection === "details") details += clean + " "
      }
    }

    // 提取 tags
    const tagsMatch = block.match(/Tags?:\s*(.+)/i)
    const tags = tagsMatch ? tagsMatch[1].split(",").map(t => t.trim()).filter(Boolean) : []

    // 提取 Scope
    const scopeMatch = block.match(/Scope:\s*(.+)/i)
    if (scopeMatch) tags.push(`scope:${scopeMatch[1].trim()}`)

    const content = `[${id}] ${title}\n${summary.trim()}${details ? "\n\n" + details.trim() : ""}`

    entries.push({
      content,
      type,
      tags: [type, ...tags, "migrated"],
      source: `learnings/${fileName}`,
    })
  }

  // - @YYYY-MM-DD 格式（MEMO 条目）
  const memoEntries = content.match(/^- @\d{4}-\d{2}-\d{2}.+$/gm) || []
  for (const line of memoEntries) {
    const dateMatch = line.match(/@(\d{4}-\d{2}-\d{2})/)
    const date = dateMatch ? dateMatch[1] : ""
    const clean = line.replace(/^-\s*/, "")

    // 提取 #tags
    const hashTags = [...clean.matchAll(/#(\S+)/g)].map(m => m[1])
    const text = clean.replace(/#\S+/g, "").replace(/\s+/g, " ").trim()

    entries.push({
      content: text,
      type: "memo",
      tags: ["memo", ...hashTags, "migrated"],
      source: `learnings/${fileName}`,
    })
  }

  return entries
}

function readAllLearnings() {
  if (!existsSync(LEARNINGS_DIR)) {
    console.error(`目录不存在: ${LEARNINGS_DIR}`)
    return []
  }

  const files = readdirSync(LEARNINGS_DIR).filter(f => f.endsWith(".md"))
  const allEntries = []

  for (const file of files) {
    const filePath = join(LEARNINGS_DIR, file)
    const content = readFileSync(filePath, "utf-8")
    const entries = parseEntries(filePath, content)
    allEntries.push(...entries)
    console.log(`  ${file}: ${entries.length} 条`)
  }

  return allEntries
}

// --- 写入 opencode-mem ---

async function addMemory(entry) {
  try {
    const res = await fetch(`${API_BASE}/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-opencode-mem-token": AUTH_TOKEN },
      body: JSON.stringify({
        content: entry.content,
        containerTag: "opencode_project_6e29824f2ef30d80",
        tags: entry.tags,
        type: entry.type,
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      return { ok: false, error: `${res.status}: ${text}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// --- 主流程 ---

async function main() {
  console.log("=== .learnings/ → opencode-mem 迁移 ===\n")

  // 检查 opencode-mem 是否在线
  try {
    const res = await fetch(`${API_BASE}/health`, { headers: { "x-opencode-mem-token": AUTH_TOKEN } })
    if (!res.ok) throw new Error(`status ${res.status}`)
    console.log("✅ opencode-mem worker 在线\n")
  } catch (err) {
    console.error(`❌ opencode-mem worker 未启动: ${err.message}`)
    console.error("请先启动 opencode（插件会自动启动 worker），然后重试")
    process.exit(1)
  }

  // 解析所有条目
  console.log("读取 .learnings/ 文件：")
  const entries = readAllLearnings()
  console.log(`\n共 ${entries.length} 条待迁移\n`)

  if (entries.length === 0) {
    console.log("没有条目需要迁移")
    return
  }

  // 写入
  let success = 0
  let fail = 0
  const errors = []

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const result = await addMemory(entry)

    if (result.ok) {
      success++
    } else {
      fail++
      errors.push({ index: i, error: result.error, content: entry.content.slice(0, 80) })
    }

    // 进度
    if ((i + 1) % 50 === 0 || i === entries.length - 1) {
      process.stdout.write(`\r进度: ${i + 1}/${entries.length} (✅${success} ❌${fail})`)
    }
  }

  console.log(`\n\n=== 迁移完成 ===`)
  console.log(`成功: ${success}`)
  console.log(`失败: ${fail}`)

  if (errors.length > 0) {
    console.log(`\n失败详情（前 10 条）：`)
    errors.slice(0, 10).forEach(e => {
      console.log(`  #${e.index}: ${e.error} — ${e.content}...`)
    })
  }
}

main()
