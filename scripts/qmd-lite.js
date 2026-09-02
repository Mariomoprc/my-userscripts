#!/usr/bin/env node
// qmd-lite.js — 纯文件 FTS 搜索引擎（零模型、零服务、<5MB）
// 适配 Windows GBK：所有文件按 UTF-8 读写，无 BOM
// 索引：~/.cache/qmd-lite/index.json + .state.json（mtime指纹）
// 用法：
//   node qmd-lite.js --init                # 全量建索引
//   node qmd-lite.js --update              # 增量（mtime 比对）
//   node qmd-lite.js "关键词"              # 搜索（默认 Top5）
//   node qmd-lite.js "关键词" --limit 10 --json
//   node qmd-lite.js "DNS坑" --no-rg       # 禁 rg 兜底

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "fs"
import path from "path"
import { spawnSync } from "child_process"

const home = process.env.USERPROFILE || process.env.HOME || ""
const CONFIG_DIR = path.join(home, ".config", "opencode")
const CACHE_DIR = path.join(home, ".cache", "qmd-lite")
const INDEX_FILE = path.join(CACHE_DIR, "index.json")
const STATE_FILE = path.join(CACHE_DIR, ".state.json")

// 索引源：只扫高价值小本本 + 规则，避免扫大文件
const SOURCE_DIRS = [
  path.join(CONFIG_DIR, ".learnings"),
  path.join(CONFIG_DIR, "skills"),
]
const SOURCE_FILES = [
  path.join(CONFIG_DIR, "AGENTS.md"),
]
const IGNORE_DIRS = new Set(["node_modules", ".git", "backups", "backups_local", "pending", ".cache", ".turso-migrated"])
const IGNORE_FILES = new Set([".backup-state.json", ".upgrade-state.json", ".cleanup-state.json"])
const MAX_FILE_BYTES = 300 * 1024 // 单文件超 300KB 跳过（防大归档）
const TITLE_WEIGHT = 2.0
const RECENT_BOOST = 1.2
const RECENT_DAYS = 30

function ensureCache() {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })
}

function tokenize(text) {
  if (!text) return []
  const raw = text.toLowerCase().match(/[\w\u4e00-\u9fff]+/g) || []
  const out = []
  for (const t of raw) {
    // 过滤单字噪音（"3"、"a" 等单字符在 849 段里出现上千次，会污染 IP 搜索）
    if (t.length === 1) continue
    if (/^\d+$/.test(t) && t.length <= 2) continue // 过滤 1-2 位纯数字
    out.push(t)
    if (/[\u4e00-\u9fff]{4,}/.test(t) && t.length <= 12) {
      for (let i = 0; i < t.length - 1; i++) out.push(t.slice(i, i + 2))
    }
  }
  return out
}

function walkDocs() {
  const docs = []
  let id = 0
  const addFile = (file) => {
    try {
      const st = statSync(file)
      if (st.size > MAX_FILE_BYTES) return
      if (IGNORE_FILES.has(path.basename(file))) return
      if (!file.endsWith(".md")) return
      const raw = readFileSync(file, "utf8")
      // 按 ## 切段，每段一个 doc（带标题加权）
      const sections = raw.split(/^## /m)
      // 第0段是文件头（无 ##）
      const header = sections[0] || ""
      if (header.trim()) {
        const title = path.basename(file)
        docs.push({ id: id++, path: file, title, body: header, mtime: st.mtimeMs, lineStart: 1 })
      }
      let line = (header.match(/\n/g) || []).length + 1
      for (let i = 1; i < sections.length; i++) {
        const sec = "## " + sections[i]
        const title = sec.split("\n")[0].replace(/^##\s*/, "").slice(0, 80)
        const body = sec
        const lines = (body.match(/\n/g) || []).length
        docs.push({ id: id++, path: file, title, body, mtime: st.mtimeMs, lineStart: line })
        line += lines
      }
    } catch {}
  }
  for (const f of SOURCE_FILES) if (existsSync(f)) addFile(f)
  const walk = (dir) => {
    if (!existsSync(dir)) return
    for (const name of readdirSync(dir)) {
      if (IGNORE_DIRS.has(name)) continue
      const full = path.join(dir, name)
      try {
        const st = statSync(full)
        if (st.isDirectory()) walk(full)
        else addFile(full)
      } catch {}
    }
  }
  for (const d of SOURCE_DIRS) walk(d)
  return docs
}

function buildIndex() {
  ensureCache()
  const docs = walkDocs()
  const inv = {} // token -> { docId: tf }
  for (const doc of docs) {
    const tokens = tokenize(doc.title + " " + doc.body)
    const freq = {}
    for (const t of tokens) freq[t] = (freq[t] || 0) + 1
    for (const [t, c] of Object.entries(freq)) {
      if (!inv[t]) inv[t] = {}
      inv[t][doc.id] = c
    }
  }
  const state = {}
  for (const d of docs) state[d.path] = d.mtime
  writeFileSync(INDEX_FILE, JSON.stringify({ docs, inv }, null, 0), "utf8")
  writeFileSync(STATE_FILE, JSON.stringify({ mtime: state, builtAt: Date.now() }, null, 0), "utf8")
  return { docs: docs.length, tokens: Object.keys(inv).length }
}

function loadIndex() {
  if (!existsSync(INDEX_FILE)) return null
  try { return JSON.parse(readFileSync(INDEX_FILE, "utf8")) } catch { return null }
}

function needsUpdate() {
  if (!existsSync(INDEX_FILE) || !existsSync(STATE_FILE)) return true
  try {
    const st = JSON.parse(readFileSync(STATE_FILE, "utf8"))
    const cur = {}
    const collect = (dir) => {
      if (!existsSync(dir)) return
      for (const name of readdirSync(dir)) {
        if (IGNORE_DIRS.has(name)) continue
        const full = path.join(dir, name)
        try {
          const s = statSync(full)
          if (s.isDirectory()) collect(full)
          else if (full.endsWith(".md") && s.size <= MAX_FILE_BYTES) cur[full] = s.mtimeMs
        } catch {}
      }
    }
    for (const d of SOURCE_DIRS) collect(d)
    for (const f of SOURCE_FILES) if (existsSync(f)) try { cur[f] = statSync(f).mtimeMs } catch {}
    return JSON.stringify(cur) !== JSON.stringify(st.mtime)
  } catch { return true }
}

function search(query, opts = {}) {
  const limit = opts.limit || 5
  let idx = loadIndex()
  if (!idx) {
    buildIndex()
    idx = loadIndex()
  }
  const qTokens = tokenize(query)
  if (!qTokens.length) return []
  const qLower = query.toLowerCase()
  const scores = new Map() // docId -> score
  const now = Date.now()
  const recentCut = now - RECENT_DAYS * 24 * 3600 * 1000
  for (const t of qTokens) {
    const postings = idx.inv[t]
    if (!postings) continue
    for (const [docIdStr, tf] of Object.entries(postings)) {
      const docId = Number(docIdStr)
      const doc = idx.docs[docId]
      if (!doc) continue
      let s = tf
      // 标题命中加权
      if (doc.title.toLowerCase().includes(t)) s *= TITLE_WEIGHT
      // 近期加权
      if (doc.mtime > recentCut) s *= RECENT_BOOST
      scores.set(docId, (scores.get(docId) || 0) + s)
    }
  }
  // 短语精确 bonus
  for (const [docId, s] of scores) {
    const doc = idx.docs[docId]
    if (doc.body.toLowerCase().includes(qLower) || doc.title.toLowerCase().includes(qLower)) {
      scores.set(docId, s + 5)
    }
  }
  // 同义扩展小词典（本地常见口语 → 规范词）
  const synonymMap = {
    "dns": ["dns", "wlan", "3.100", "主路由", "屏蔽", "githubusercontent"],
    "主路由": ["主路由", "192.168.3.1", "屏蔽"],
    "屏蔽": ["屏蔽", "0.0.0.0", "fake-ip"],
  }
  for (const [k, syns] of Object.entries(synonymMap)) {
    if (qLower.includes(k)) {
      for (const syn of syns) if (syn !== k && idx.inv[syn]) {
        for (const [docIdStr, tf] of Object.entries(idx.inv[syn])) {
          const docId = Number(docIdStr)
          if (!scores.has(docId)) scores.set(docId, tf * 0.5)
        }
      }
    }
  }
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
  const out = ranked.map(([docId, score]) => {
    const d = idx.docs[docId]
    const snippet = d.body.slice(0, 220).replace(/\n/g, " ").replace(/\s+/g, " ").trim()
    const rel = path.relative(CONFIG_DIR, d.path).replace(/\\/g, "/")
    return { score: Number(score.toFixed(2)), path: d.path, rel, title: d.title, line: d.lineStart, snippet }
  })
  // 无结果时可选 rg 兜底
  if (out.length === 0 && !opts.noRg) {
    try {
      const rg = spawnSync("rg", ["-n", "--no-heading", "-i", "-m", String(limit), query, path.join(CONFIG_DIR, ".learnings")], { encoding: "utf8", timeout: 8000 })
      if (rg.stdout) {
        for (const line of rg.stdout.split("\n").slice(0, limit)) {
          if (!line.trim()) continue
          const m = line.match(/^(.+?):(\d+):(.*)$/)
          if (m) out.push({ score: 0.5, path: m[1], rel: path.relative(CONFIG_DIR, m[1]).replace(/\\/g, "/"), title: "", line: Number(m[2]), snippet: m[3].slice(0, 180) })
        }
      }
    } catch {}
  }
  return out
}

function fixQuery(q) {
  if (!q || !q.includes("�")) return q
  try {
    // PowerShell 5.1 GBK 误读 UTF-8 的恢复（binary → utf8）
    const fixed = Buffer.from(q, "binary").toString("utf8")
    if (fixed && !fixed.includes("�") && fixed.trim()) return fixed
  } catch {}
  return q
}

function printResults(results, opts) {
  if (opts.json) {
    console.log(JSON.stringify(results, null, 2))
    return
  }
  if (!results.length) {
    console.log("无结果。试试更短关键词或 --no-rg 禁 rg 兜底后重建索引：node qmd-lite.js --init")
    return
  }
  for (const r of results) {
    console.log(`[${r.score}] ${r.rel}:${r.line} — ${r.title}`)
    console.log(`  ${r.snippet}`)
    console.log("")
  }
  const idx = loadIndex()
  if (idx) console.log(`# 索引 ${idx.docs.length} 段 / ${Object.keys(idx.inv).length} 词 · ${CACHE_DIR}`)
}

function help() {
  console.log(`qmd-lite — 纯文件 FTS 搜索引擎
用法：
  node qmd-lite.js --init                 全量建索引
  node qmd-lite.js --update               增量（mtime 比对，有变更才重建）
  node qmd-lite.js "关键词"               搜索 Top5
  node qmd-lite.js "DNS坑" --limit 10 --json
  node qmd-lite.js --help

索引：${INDEX_FILE}
源：.learnings/*.md + skills/*.md + AGENTS.md（<300KB/文件）
`)
}

const args = process.argv.slice(2)
if (!args.length || args.includes("--help") || args.includes("-h")) { help(); process.exit(0) }
if (args.includes("--init")) {
  const r = buildIndex()
  console.log(`已建索引：${r.docs} 段 / ${r.tokens} 词 → ${INDEX_FILE}`)
  process.exit(0)
}
if (args.includes("--update")) {
  if (needsUpdate()) {
    const r = buildIndex()
    console.log(`已增量重建：${r.docs} 段 / ${r.tokens} 词`)
  } else console.log("无变更，跳过")
  process.exit(0)
}
// 正确解析 query（跳过 --limit 的值），支持 --query-file 和 GBK 修复
let queryParts = []
let queryFile = null
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--limit") { i++; continue }
  if (args[i] === "--query-file") { queryFile = args[i + 1]; i++; continue }
  if (args[i].startsWith("--")) continue
  queryParts.push(args[i])
}
let query = queryParts.join(" ").trim()
if (queryFile && existsSync(queryFile)) {
  try { query = readFileSync(queryFile, "utf8").trim() } catch {}
}
query = fixQuery(query)
const limitIdx = args.indexOf("--limit")
const limit = limitIdx !== -1 ? Number(args[limitIdx + 1]) || 5 : 5
const useJson = args.includes("--json")
const noRg = args.includes("--no-rg")
if (!query) { help(); process.exit(1) }
const results = search(query, { limit, noRg })
printResults(results, { json: useJson })
