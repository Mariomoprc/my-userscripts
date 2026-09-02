#!/usr/bin/env node
// model-whitelist.mjs - 智能模型白名单筛选（元数据实时评分）
// 用法: opencode models --verbose | node model-whitelist.mjs <config-path> [--or-free <file>] [extra-in-use-model...]
// 只负责评分+筛选，不修改配置。输出 JSON { whitelist: { providerId: [modelId...] } }（modelId 不带 provider 前缀）
// stderr 输出评分明细 + [人工确认] 警告。仅做白名单，不含 plan/build 模型分工。

import fs from 'node:fs';

// ---------- JSONC 去注释（保留字符串内 // 如 URL） ----------
function stripComments(src) {
  let out = '';
  let inString = false;
  let inLine = false;
  let inBlock = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const n = src[i + 1];
    if (inLine) {
      if (c === '\n') { inLine = false; out += c; }
      continue;
    }
    if (inBlock) {
      if (c === '*' && n === '/') { inBlock = false; i++; }
      continue;
    }
    if (inString) {
      out += c;
      if (c === '\\') { out += n; i++; }
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') { inString = true; out += c; continue; }
    if (c === '/' && n === '/') { inLine = true; i++; continue; }
    if (c === '/' && n === '*') { inBlock = true; i++; continue; }
    out += c;
  }
  return out;
}

// ---------- 读取配置中的在用模型 ----------
function readConfigModels(configPath) {
  const models = new Set();
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const cfg = JSON.parse(stripComments(raw));
    if (cfg.model) models.add(cfg.model);
    if (cfg.small_model) models.add(cfg.small_model);
    if (cfg.agent) {
      for (const a of Object.values(cfg.agent)) {
        if (a && a.model) models.add(a.model);
      }
    }
  } catch (e) {
    console.error(`[warn] 读取配置失败: ${e.message}`);
  }
  return models;
}

// ---------- 解析 verbose 输出（模型ID行 + JSON对象，支持同行或分行） ----------
function parseVerbose(text) {
  const lines = text.split('\n');
  const models = [];
  let curId = null, depth = 0, buf = [];
  for (const line of lines) {
    const t = line.trim();
    if (depth === 0 && t && !t.startsWith('{')) {
      // 检查同行格式：modelId {json...}
      const sp = t.indexOf(' ');
      if (sp > 0 && t[sp + 1] === '{') {
        curId = t.slice(0, sp);
        const jsonPart = line.slice(line.indexOf('{'));
        depth = 0;
        for (const ch of jsonPart) { if (ch === '{') depth++; if (ch === '}') depth--; }
        if (depth === 0) {
          try { const o = JSON.parse(jsonPart); o._id = curId; models.push(o); } catch (e) { /* skip */ }
        } else {
          depth = Math.max(1, depth);
          buf = [jsonPart];
        }
        continue;
      }
      curId = t;
      continue;
    }
    if (t.startsWith('{')) { depth = 1; buf = [line]; continue; }
    if (depth > 0) {
      buf.push(line);
      for (const ch of line) { if (ch === '{') depth++; if (ch === '}') depth--; }
      if (depth === 0) {
        try {
          const o = JSON.parse(buf.join('\n'));
          o._id = curId;
          models.push(o);
        } catch (e) { /* 跳过无法解析的 */ }
        buf = [];
      }
    }
  }
  return models;
}

// ---------- 从 OpenRouter 数据建立 opencode 模型 ID → AA Intelligence Index 映射 ----------
function buildIntelMap(orModelsFile) {
  const map = new Map();
  const noVersionMap = new Map(); // 无版本后缀 → 最高分
  try {
    const raw = fs.readFileSync(orModelsFile, 'utf8');
    const data = JSON.parse(raw);
    if (!data.data || !Array.isArray(data.data)) return map;
    // 按创建时间排序（新版本优先）
    const sorted = [...data.data].sort((a, b) => (b.created || 0) - (a.created || 0));
    for (const m of sorted) {
      const orId = (m.id || '').toLowerCase();
      const aa = m.benchmarks?.artificial_analysis;
      if (!aa || aa.intelligence_index == null) continue;
      if (orId.includes(':batch')) continue;
      const modelId = orId.includes('/') ? orId.split('/').slice(1).join('/') : orId;
      const intel = aa.intelligence_index;
      const noVersion = modelId.replace(/-\d{4,6}$/, '');
      // 有版本后缀的：记录最高分到 noVersionMap
      if (noVersion !== modelId) {
        if (!noVersionMap.has(noVersion) || intel > noVersionMap.get(noVersion)) {
          noVersionMap.set(noVersion, intel);
        }
      }
      // 直接设置（不覆盖已有的更高分）
      if (!map.has(modelId) || intel > map.get(modelId)) {
        map.set(modelId, intel);
      }
    }
    // 无版本后缀使用最高分（覆盖直接映射）
    for (const [k, v] of noVersionMap) {
      if (!map.has(k) || v > map.get(k)) map.set(k, v);
    }
  } catch (e) {
    console.error(`[warn] 读取 OpenRouter 模型数据失败: ${e.message}`);
  }
  return map;
}

// ---------- 评分（优先 AA Intelligence Index） ----------
function score(m, intelMap) {
  const id = (m._id || '').toLowerCase();
  const modelId = id.includes('/') ? id.split('/').slice(1).join('/') : id;

  // 优先使用 AA Intelligence Index
  if (intelMap && intelMap.has(modelId)) {
    return intelMap.get(modelId);
  }

  // 降级：无 AA 数据时用多维评分（兼容无 OpenRouter 数据的场景）
  const c = m.cost || {};
  const l = m.limit || {};
  const cap = m.capabilities || {};
  const inp = c.input, out = c.output;
  const hasMeta = inp !== undefined && l.context !== undefined;

  // 无 AA 数据的模型基础分降低（避免降级评分高于有 AA 数据的模型）
  let s = 0;
  if (hasMeta) {
    if (inp === 0 && out === 0) s += 20;
    else s += Math.max(0, 15 - inp * 10 - out * 3);
    const ctx = l.context || 0;
    if (ctx >= 1000000) s += 8;
    else if (ctx >= 200000) s += 4;
    else s += 1;
  } else {
    s += 5;
  }
  if (cap.reasoning) s += 5;
  if (/pro|max|ultra|opus|thinking/.test(id)) s += 4;
  if (/flash|lite|nano|mini|lightning/.test(id)) s += 4;
  if (cap.input && cap.input.image) s += 6;
  if (cap.input && (cap.input.audio || cap.input.video)) s += 2;
  return s;
}

// ---------- 排除 OCR/专用工具模型 ----------
function isToolModel(id) {
  const low = id.toLowerCase();
  return /ocr|safeguard|content-safety|oss-20b|oss-120b/.test(low);
}

// ---------- 识别允许使用请求数据训练的模型（标注，不排除） ----------
function isTrainingModel(id) {
  const low = id.toLowerCase();
  return /muse-spark-1\.2-contributor|mimo-v2\.5-free|hy3-free|big-pickle|ox-alpha-free/.test(low);
}

// ---------- 获取训练模型标注 ----------
function getTrainingTag(id) {
  return isTrainingModel(id) ? ' ⚠️[训练]' : '';
}

// ---------- 筛选 ----------
function filter(models, inUse, intelMap) {
  const byProvider = new Map();
  for (const m of models) {
    const full = m._id;
    if (!full) continue;
    const idx = full.indexOf('/');
    if (idx < 0) continue;
    const provider = full.slice(0, idx);
    const id = full.slice(idx + 1);
    if (isToolModel(id)) continue;
    if (!byProvider.has(provider)) byProvider.set(provider, []);
    byProvider.get(provider).push({ full, id, score: score(m, intelMap), m });
  }

  const result = {};
  const hiddenCount = {};
  const details = [];
  for (const [provider, list] of byProvider) {
    list.sort((a, b) => b.score - a.score);
    const keep = new Set();
    // 1. 强制保留：在用模型（精确匹配 + 同系列前缀匹配，如 deepseek-v4-flash 与 DeepSeek-V4-Flash）
    for (const item of list) {
      if (inUse.has(item.full)) keep.add(item.id);
      else {
        for (const u of inUse) {
          const uSeries = u.split('/').pop().toLowerCase().replace(/[-_]/g, '');
          const iSeries = item.id.toLowerCase().replace(/[-_]/g, '');
          if (uSeries && iSeries.startsWith(uSeries)) { keep.add(item.id); break; }
        }
      }
    }
    // 2. 免费最强：免费模型中按分数取 Top 3（不叠加 Top N，避免全保留）
    const free = list.filter(i => i.id.includes('-free') || i.id.includes(':free'));
    for (const item of free.slice(0, 3)) keep.add(item.id);
    // 3. 全模态：支持 image 输入的对话模型按分数取 Top 5（避免 VL 系列全保留）
    const vision = list.filter(i => i.m.capabilities && i.m.capabilities.input && i.m.capabilities.input.image);
    for (const item of vision.slice(0, 5)) keep.add(item.id);
    // 4. Top N：每 provider 按分数取 Top 6（含已保留的）
    for (const item of list.slice(0, 6)) keep.add(item.id);
    // 5. openrouter 的 ~ latest 系列
    if (provider === 'openrouter') {
      for (const item of list) if (item.id.startsWith('~')) keep.add(item.id);
    }
    // 6. 单 provider 上限 10 个，超出按分数截断
    if (keep.size > 10) {
      const sorted = [...keep].map(id => list.find(i => i.id === id)).filter(Boolean).sort((a, b) => b.score - a.score);
      const truncated = new Set(sorted.slice(0, 10).map(i => i.id));
      // 确保在用模型不被截掉
      for (const item of list) {
        if (inUse.has(item.full) && !truncated.has(item.id) && truncated.size < 10) truncated.add(item.id);
      }
      // 如果仍超10，取分数最高的10个
      if (truncated.size > 10) {
        const reSorted = [...truncated].map(id => list.find(i => i.id === id)).filter(Boolean).sort((a, b) => b.score - a.score);
        keep.clear();
        for (const item of reSorted.slice(0, 10)) keep.add(item.id);
      } else {
        keep.clear();
        for (const id of truncated) keep.add(id);
      }
    }
    if (keep.size > 0) {
      // 按分数降序排列（而非字母序）
      result[provider] = [...keep]
        .map(id => list.find(i => i.id === id))
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)
        .map(i => i.id);
      hiddenCount[provider] = list.length - keep.size;
    } else {
      hiddenCount[provider] = list.length;
    }
    // 评分明细（Top 8）
    details.push(`[${provider}] 共${list.length}个，保留${keep.size}个${keep.size >= 10 ? ' (已达上限10)' : ''}`);
    for (const item of list.slice(0, 8)) {
      const mark = keep.has(item.id) ? '✓' : ' ';
      const trainingTag = getTrainingTag(item.id);
      details.push(`  ${mark} ${String(item.score).padEnd(6)} ${item.id}${trainingTag}`);
    }
  }
  return { result, hiddenCount, details };
}

// ---------- 合并 web 发现的免费模型 ----------
function mergeDiscovered(models, discoverFile) {
  try {
    const raw = fs.readFileSync(discoverFile, 'utf8');
    const discovered = parseVerbose(raw);
    const existingIds = new Set(models.map(m => m._id));
    let added = 0;
    for (const m of discovered) {
      if (!existingIds.has(m._id)) {
        models.push(m);
        added++;
      }
    }
    if (added > 0) {
      console.error(`[merge] 从 web 发现中合并了 ${added} 个新模型`);
    }
  } catch (e) {
    console.error(`[merge] 读取发现文件失败: ${e.message}，跳过合并`);
  }
  return models;
}

// ---------- 主流程 ----------
const args = process.argv.slice(2);
let configPath, orFreeFile, orModelsFile, balanceFile, extraInUse;

// 解析参数：configPath [--or-free <file>] [--or-models <file>] [--balance <file>] [extra-in-use...]
configPath = args[0];
orFreeFile = null;
orModelsFile = null;
balanceFile = null;
extraInUse = new Set();
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--or-free' && args[i + 1]) {
    orFreeFile = args[i + 1];
    i++;
  } else if (args[i] === '--or-models' && args[i + 1]) {
    orModelsFile = args[i + 1];
    i++;
  } else if (args[i] === '--balance' && args[i + 1]) {
    balanceFile = args[i + 1];
    i++;
  } else {
    extraInUse.add(args[i]);
  }
}

const stdin = fs.readFileSync(0, 'utf8');
let models = parseVerbose(stdin);

// 合并 web 发现的免费模型
if (orFreeFile) {
  models = mergeDiscovered(models, orFreeFile);
}

// 构建 AA Intelligence Index 映射（从 OpenRouter 数据）
const intelMap = orModelsFile ? buildIntelMap(orModelsFile) : null;
if (intelMap && intelMap.size > 0) {
  console.error(`[intel] 从 OpenRouter 加载了 ${intelMap.size} 个模型的 AA Intelligence Index`);
}

const inUse = readConfigModels(configPath);
for (const m of extraInUse) inUse.add(m);

const { result, hiddenCount, details } = filter(models, inUse, intelMap);

// 人工确认警告：某 provider 模型多但保留少
const report = [];
for (const [provider, list] of Object.entries(hiddenCount)) {
  const total = models.filter(m => m._id && m._id.startsWith(provider + '/')).length;
  if (total > 5 && (result[provider] || []).length <= 2) {
    report.push(`⚠️ ${provider}: ${total} 个模型仅建议保留 ${(result[provider] || []).length} 个，请人工确认`);
  }
}

console.error('=== 评分明细 ===');
for (const d of details) console.error(d);

// 读取余额数据（如果提供）
let balance = {};
if (balanceFile) {
  try {
    let raw = fs.readFileSync(balanceFile, 'utf8').replace(/^\uFEFF/, '');
    balance = JSON.parse(raw);
  } catch (e) {
    console.error(`[warn] 读取余额文件失败: ${e.message}`);
  }
}

// 输出：whitelist + 余额
const output = {
  whitelist: result,
  balance: balance
};
console.log(JSON.stringify(output, null, 2));
if (report.length) {
  console.error('\n[人工确认]');
  for (const r of report) console.error(r);
}
