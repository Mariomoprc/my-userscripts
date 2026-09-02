/**
 * docs 迁移脚本：把 docs/*.md + clash-subscription-management/LOG.md
 * 按 `##` 章节拆条目写入笔记本 opencode-mem。
 *
 * 幂等：每条带唯一 tag doc-id:{file}:{slug}，重跑自动跳过已存在条目。
 * 用法：node scripts/migrate-docs.mjs [--dry-run]
 */

import { readFileSync, readdirSync, statSync } from "fs"
import { join } from "path"

const BASE = "C:/Users/pass/.config/opencode"
const DOCS_DIR = `${BASE}/docs`
const EXTRA_FILES = [
  { path: `${BASE}/skills/clash-subscription-management/LOG.md`, name: "clash-log" },
]
const API = "http://127.0.0.1:4747"
const TOKEN = "8a1218eba2a02c6e20f17ed9aa44d89a90b8ae4a9d150e5040169ec8acc04c37"
const CONTAINER_TAG = "opencode_project_6e29824f2ef30d80" // 笔记本 opencode 配置项目 shard

const DRY_RUN = process.argv.includes("--dry-run")

function slug(s) {
  return s.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}-]/gu, "").slice(0, 40) || "root"
}

// 收集待迁移文件
const files = []
for (const f of readdirSync(DOCS_DIR)) {
  const p = join(DOCS_DIR, f)
  if (statSync(p).isFile() && f.endsWith(".md")) files.push({ path: p, name: f.replace(/\.md$/, "") })
}
for (const e of EXTRA_FILES) {
  try { statSync(e.path); files.push({ path: e.path, name: e.name }) } catch {}
}

// 拆分：按 ## 标题；无 ## 则整文件一条
function splitEntries(name, raw) {
  const lines = raw.replace(/\r\n/g, "\n").split("\n")
  const sections = []
  let cur = { title: null, body: [] }
  for (const line of lines) {
    const m = line.match(/^##\s+(.+)$/)
    if (m) {
      if (cur.title !== null || cur.body.some(l => l.trim())) sections.push(cur)
      cur = { title: m[1].trim(), body: [] }
    } else {
      cur.body.push(line)
    }
  }
  if (cur.title !== null || cur.body.some(l => l.trim())) sections.push(cur)

  return sections.map(s => {
    const body = s.body.join("\n").trim()
    const header = s.title ? `[DOC-${name}] ${s.title}` : `[DOC-${name}] 概览`
    return {
      content: `${header}\n\n${body}`.trim(),
      uid: `doc-id:${name}:${s.title ? slug(s.title) : "root"}`,
    }
  }).filter(e => e.content.length > 30) // 跳过过短无信息条目
}

async function api(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json", "x-opencode-mem-token": TOKEN },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok && !(method === "POST" && res.status === 400)) {
    throw new Error(`${method} ${path} -> ${res.status}: ${(await res.text()).slice(0, 150)}`)
  }
  return res.json()
}

// 已有 doc-id 集合（幂等）
console.log("fetching existing memories for dedup...")
const existing = new Set()
{
  let page = 1
  for (;;) {
    const r = await api("GET", `/api/memories?page=${page}&pageSize=200`)
    for (const m of r.data?.items ?? []) {
      for (const t of Array.isArray(m.tags) ? m.tags : []) {
        if (t.startsWith("doc-id:")) existing.add(t)
      }
    }
    const tp = r.data?.totalPages ?? 1
    if (page >= tp || !(r.data?.items ?? []).length) break
    page++
  }
}
console.log(`existing doc-id entries: ${existing.size}`)

let created = 0, skipped = 0, failed = 0
for (const f of files) {
  const raw = readFileSync(f.path, "utf-8")
  const entries = splitEntries(f.name, raw)
  console.log(`\n[${f.name}] ${entries.length} entries`)
  for (const e of entries) {
    if (existing.has(e.uid)) { skipped++; continue }
    if (DRY_RUN) {
      console.log(`  [DRY] ${e.uid} (${e.content.length} chars)`)
      continue
    }
    try {
      const res = await api("POST", "/api/memories", {
        content: e.content,
        containerTag: CONTAINER_TAG,
        tags: ["doc", `doc:${f.name}`, e.uid],
        type: "fact",
      })
      if (res.success) { created++; existing.add(e.uid) }
      else { failed++; console.error(`  FAIL ${e.uid}: ${JSON.stringify(res).slice(0, 120)}`) }
    } catch (err) {
      failed++
      console.error(`  ERR ${e.uid}: ${err.message}`)
    }
  }
}

console.log(`\n=== done: created=${created} skipped=${skipped} failed=${failed}${DRY_RUN ? " (DRY RUN)" : ""} ===`)
