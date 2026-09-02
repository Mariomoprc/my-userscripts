#!/usr/bin/env node
// or-free-discover.mjs - 从 OpenRouter API 发现最新免费模型
// 输出格式与 `opencode models --verbose` 一致（每行 modelId {json}），可直接管道合并
// stderr 输出发现摘要

const API_URL = 'https://openrouter.ai/api/v1/models';

async function main() {
  let data;
  try {
    const resp = await fetch(API_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    data = await resp.json();
  } catch (e) {
    console.error(`[or-free-discover] API 请求失败: ${e.message}`);
    process.exit(1);
  }

  if (!data.data || !Array.isArray(data.data)) {
    console.error('[or-free-discover] API 返回格式异常');
    process.exit(1);
  }

  const free = data.data.filter(m => {
    const p = m.pricing || {};
    return Number(p.prompt) === 0 && Number(p.completion) === 0;
  });

  const lines = [];
  for (const m of free) {
    const arch = m.architecture || {};
    const inputMods = arch.input_modalities || [];
    const cap = {
      input: {},
      reasoning: /thinking|reasoning/i.test(m.id),
    };
    if (inputMods.includes('image')) cap.input.image = true;
    if (inputMods.includes('audio')) cap.input.audio = true;
    if (inputMods.includes('video')) cap.input.video = true;

    const obj = {
      cost: { input: 0, output: 0 },
      limit: { context: m.context_length || 128000 },
      capabilities: cap,
      _id: m.id,
    };
    lines.push(`${m.id} ${JSON.stringify(obj)}`);
  }

  // stdout: 与 opencode models --verbose 格式一致
  console.log(lines.join('\n'));

  // stderr: 摘要
  console.error(`[or-free-discover] 发现 ${free.length} 个免费模型（共 ${data.data.length} 个模型）`);
  const vision = free.filter(m => (m.architecture?.input_modalities || []).includes('image'));
  console.error(`  其中支持识图: ${vision.length} 个`);
  for (const m of free) {
    const mods = m.architecture?.input_modalities || [];
    const tag = mods.includes('image') ? ' [识图]' : '';
    console.error(`  ${m.id} (${m.context_length || '?'} ctx)${tag}`);
  }
}

main();
