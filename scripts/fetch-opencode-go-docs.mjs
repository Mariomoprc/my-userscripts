#!/usr/bin/env node
// fetch-opencode-go-docs.mjs - 抓取 OpenCode Go 官方文档，提取模型额度与定价
// 用法: node fetch-opencode-go-docs.mjs
// 输出: JSON 对象 { "modelId": { "tier": "$15/$30/$60", "input": 0.14, "output": 0.28, "cachedRead": 0.0028, "cachedWrite": 0, "monthlyRequests": 150400, "multimodal": false } }
// 失败时输出 {} 并退出码 1

import https from 'https';

async function fetchOpenCodeGoDocs() {
  const url = 'https://opencode.ai/docs/go/';
  
  try {
    const response = await new Promise((resolve, reject) => {
      const req = https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OpenCode-CLI)',
          'Accept': 'text/html'
        }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => { resolve(data); });
      });
      req.on('error', reject);
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('请求超时'));
      });
    });
    
    // 提取表格行辅助函数
    function extractTableRows(html, tableIndex) {
      let pos = 0;
      for (let i = 0; i < tableIndex; i++) {
        pos = html.indexOf('</table>', pos);
        if (pos === -1) return [];
        pos += 8;
      }
      const tableStart = html.indexOf('<table>', pos);
      if (tableStart === -1) return [];
      const tableEnd = html.indexOf('</table>', tableStart);
      const table = html.slice(tableStart, tableEnd + 8);
      
      const tbodyStart = table.indexOf('<tbody>');
      const tbodyEnd = table.indexOf('</tbody>', tbodyStart);
      if (tbodyStart === -1 || tbodyEnd === -1) return [];
      const tbody = table.slice(tbodyStart, tbodyEnd + 8);
      
      const trRegex = /<tr[^>]*>.*?<\/tr>/gs;
      const rows = [];
      let match;
      while ((match = trRegex.exec(tbody)) !== null) {
        const tdRegex = /<td[^>]*>(.*?)<\/td>/gs;
        const cells = [];
        let tdMatch;
        while ((tdMatch = tdRegex.exec(match[0])) !== null) {
          cells.push(tdMatch[1].replace(/<[^>]+>/g, '').trim());
        }
        if (cells.length > 0) rows.push(cells);
      }
      return rows;
    }
    
    // 提取第一个表格（请求数量）
    const reqRows = extractTableRows(response, 0);
    
    // 提取第二个表格（定价信息）
    const priceRows = extractTableRows(response, 1);
    
    // 构建模型映射
    const models = {};
    
    // 从请求数量表构建基础数据
    for (const row of reqRows) {
      if (row.length < 4) continue;
      const modelName = row[0].trim();
      const monthlyRequests = parseInt(row[3].replace(/,/g, ''), 10) || 0;
      
      // 标准化模型ID
      const modelId = modelName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/\(.*\)/g, '')
        .replace(/-$/, '');
      
      if (!models[modelId]) {
        models[modelId] = {
          tier: '',
          input: 0,
          output: 0,
          cachedRead: 0,
          cachedWrite: 0,
          monthlyRequests,
          multimodal: false
        };
      } else {
        models[modelId].monthlyRequests = monthlyRequests;
      }
    }
    
    // 从定价表补充价格信息
    for (const row of priceRows) {
      if (row.length < 6) continue;
      const modelName = row[0].trim();
const input = parseFloat(row[1].replace(/\$/g, '')) || 0;
      const output = parseFloat(row[2].replace(/\$/g, '')) || 0;
      const cachedRead = parseFloat(row[3].replace(/\$/g, '')) || 0;
      const cachedWrite = row[4] === '-' ? 0 : (parseFloat(row[4].replace(/\$/g, '')) || 0);
      const usage = row[5].replace(/\$/g, '').trim();
      
      // 标准化模型ID
      const modelId = modelName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/\(.*\)/g, '')
        .replace(/-$/, '');
      
      if (models[modelId]) {
        models[modelId].tier = `$${usage}`;
        models[modelId].input = input;
        models[modelId].output = output;
        models[modelId].cachedRead = cachedRead;
        models[modelId].cachedWrite = cachedWrite;
      }
    }
    
    // 修正多模态标记（根据实际模型名匹配）
    const multimodalKeywords = ['luna', 'vision', 'spark', 'glm', 'kimi', 'longcat', 'minimax', 'qwen'];
    for (const [id, m] of Object.entries(models)) {
      if (multimodalKeywords.some(kw => id.includes(kw))) {
        m.multimodal = true;
      }
    }
    // 排除纯文本模型
    if (models['deepseek-v4-pro'] || models['deepseek-v4-flash']) {
      if (models['deepseek-v4-pro']) models['deepseek-v4-pro'].multimodal = false;
      if (models['deepseek-v4-flash']) models['deepseek-v4-flash'].multimodal = false;
    }
    if (models['hy3']) models['hy3'].multimodal = false;
    if (models['hy4-preview']) models['hy4-preview'].multimodal = false;
    
    // 如果没找到任何模型，输出空对象
    if (Object.keys(models).length === 0) {
      console.error('[fetch-opencode-go-docs] 未解析到任何模型数据');
      console.log('{}');
      process.exit(1);
    }
    
    console.log(JSON.stringify(models, null, 2));
    
  } catch (error) {
    console.error(`[fetch-opencode-go-docs] 抓取失败: ${error.message}`);
    console.log('{}');
    process.exit(1);
  }
}

fetchOpenCodeGoDocs();