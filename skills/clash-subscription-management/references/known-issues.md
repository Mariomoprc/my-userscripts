## Known Issues & Fixes (append here as encountered)

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Empty proxy groups | `$httpClient`/`fetch` silent-fail in boa_engine | Rewrite to name-regex only |
| YAML octet confusion | `short-id: 09561058` parsed as number | Quote in YAML output or remove proxy |
| `loop is detected` in Verge import | Script.js creates `其他地区` referencing groups that reference back | Remove group-to-group refs from `其他地区`; don't add `其他地区` to `自动选择` |
| MMDB download failure during `-t` | No internet or proxy conflict | Pre-download geoip.metadb or set proxy env vars |
| FlClash覆写脚本模式vs Verge Script.js | JS 引擎不同，FlClash 支持现代语法 | FlClash: `const`/箭头函数可用；Verge: 只支持 `var` `function` `indexOf` |
| Provider HTTP 下载无声失败 | GFW 阻断 / URL 超时 / 过期 | 检查 provider hash 文件是否实际存在于磁盘；回退到 `type: file` |
| Provider URL 返回了错误的订阅内容 | URL 过期或重定向 | 用 `type: file` 指向本地已缓存的 profile 文件 |
| FLClash 启动后重写 provider `path` | 自动生成新的 profile ID | 无需手动维护路径，但 `type: http` 指向的 hash 文件可能不存在 |
| `filter:` 正则过窄导致节点遗漏 | filter 只匹配了部分 provider 的命名风格 | 对照所有 provider 的节点名，用 `|` 并列多种命名变体 |
| `fallback` 组有残留 `tolerance` | 从 `url-test` 改 `fallback` 后未清理 | `delete groups[g].tolerance` |
| `select` 组有残留 `url`/`interval` | 从 `fallback` 改 `select` 后未清理 | 设为空串或 `delete` |
| 覆写脚本用 `(?i)` 正则崩溃 | JS 不支持 `(?i)` 内联标志 — Go/PCRE 语法 | 直接写字符串 `"福利|0\\.1x"` 让 mihomo 的 Go 引擎处理 |
| 覆写脚本文件名用 profile ID 被忽略 | 误以为脚本文件名 = profile ID | 查 `SELECT id, script_id FROM profiles` 获取正确的 script_id |
| scripts/ 目录有残留 .js 文件未被加载 | 之前用 profile ID 命名或旧版本遗留 | 对照数据库清理无引用的孤立脚本文件 |
| FlClash UI 标签栏与脚本修改不一致 | 覆写脚本修改后需切换配置刷新 | 手动切换到另一配置再切回来，或重启 FlClash |
| 覆写脚本的 `proxies` 属性兼容性 | 某些 JS 引擎不支持 `delete` 操作符 | 用 `groups[g].proxies = []` 替代 `delete` |
| AI 分组名包含 emoji 导致匹配失败 | FlClash JS 引擎对 emoji 编码处理不同 | 用 `indexOf("ChatGPT")` 替代精确匹配 |
| FlClash 脚本文件名用错 ID | 用 profile ID 找脚本文件导致找不到 | 查数据库 `SELECT id, script_id FROM profiles` 获取正确的 script_id |
| 自动选择里出现官网/流量节点 | exclude-filter 未覆盖 `官网` 模式 | 在 welfareRe 中加入 `官网`，过滤机场信息节点 |
| `relay` 策略不可用 | `relay` 已被 mihomo 弃用 | 改用出站代理的 `dialer-proxy` 字段实现链式代理 |
| `include-all-providers` 与 `use:` 冲突 | `include-all-providers` 会使 `use:` 失效 | 二选一：要么用 `include-all-providers`，要么用 `use:` 手动列举 |
| `filter` 仅作用于 `use:` 引入的节点 | `filter` 对 `proxies:` 中的节点无效 | 需通过 `use:` 或 `include-all-proxies` 引入节点后 `filter` 才生效 |
| `exclude-type` 仅作用于 `proxies:` 引入的节点 | `exclude-type` 对 `use:` 引入的节点无效 | 通过 `use:` 引入的节点需用 `exclude-filter` 替代 |
| XFLTD 订阅链接 10 分钟过期 | XFLTD 官网刷新页面后获取的链接仅 10 分钟有效 | 关闭自动更新（更新间隔设 0 + 关闭三个开关），需要时手动刷新复制新链接 |
| File 类型 provider 不会自动更新 | `vehicleType: File` 从本地文件加载，不依赖网络 | 需在 FlClash UI 手动刷新对应配置，或通过 API `PUT /providers/proxies/<name>` 触发更新 |
| "三合一" 等合并配置不是独立 provider | FlClash 的合并配置只是把多个 provider 的节点合在一起 | 各 provider 需独立更新，合并配置本身无法单独更新 |
| File 类型 provider 无法同步到 Android | File 类型读本地文件，Android 上不存在该路径 | 同步前将 provider 改为 `type: http` + 在线订阅链接 |
| 重命名组后 `not found` 错误 | 只改了组名，没改规则和其他组中的引用 | 重命名后必须全局替换所有引用（rules + 所有 groups 的 proxies） |
| `fallback` → `url-test` 后残留属性 | `tolerance` 对 `url-test` 无意义 | `delete groups[g].tolerance` |
| 订阅组名多种变体 | emoji 前缀、无前缀、纯中文等 | fallbackGroups 数组覆盖所有变体 |
| 国内 AI 服务走代理变慢 | 没有配置直连规则 | 覆写脚本添加直连规则 + no_proxy 环境变量 |
| Google 检测异常流量 | 代理节点 IP 被标记 | 过滤问题节点或切换节点 |
| 唤醒后 Windows 小组件天气不加载 | FlClash 系统代理不可用 | 覆写脚本添加 microsoft.com 等域名直连规则 |
| 注册表 ProxyOverride 被覆盖 | FlClash 重新加载时重写注册表 | 直连规则写到覆写脚本，不写注册表 |
| 覆写脚本覆盖 YAML 的 DNS 配置 | 脚本中设 `config["dns"] = {...}` 完全替换了 YAML 的 DNS | 不要覆盖已有 DNS，只做增量补充（如 `config["dns"]["fake-ip-filter"] = [...]`） |
| 覆写脚本重复设置 YAML 已有字段 | 脚本设 `tcp-concurrent` 等，但 YAML 已有 | 先检查 YAML 是否已配置该字段；YAML 负责持久配置，脚本做通用增量 |
| URLTest/Fallback 节点全部 Timeout | DNS `respect-rules: true` + 路由规则 intercept 了健康检查域名（如 gstatic.com） | 在 rules 最前面加 `"DOMAIN,www.gstatic.com,DIRECT"`，比 AI 等规则优先匹配；不要改健康检查 URL |
| `select` 分组不显示节点延迟 | select 类型默认不做健康检测 | 添加 `url: "http://www.gstatic.com/generate_204"` 和 `interval: 120` 字段即可显示延迟 |
| FlClash GUI 和内核使用不同 profiles 目录 | GUI 在 AppData 下管理，start_flclash.bat 在 ~/.config/clash/profiles/ 下 | 编辑 GUI 管理的配置去 `%APPDATA%\com.follow\clash\profiles\`；启动配置在 `.config\clash\profiles\`；两套不自动同步 |
| `cn.bing.com,DIRECT` 导致 Android Edge Copilot 不可用 | PC Edge 和 Android Edge 使用不同子域名访问 Copilot（Android 用 `cn.bing.com`），直连规则拦截了 Copilot 请求 | 覆写脚本中改 `cn.bing.com,DIRECT` → `cn.bing.com,XFLTD`，添加 `copilot.microsoft.com` 和 `edgeservices.bing.com` 走代理；详见覆写脚本示例 |
| 覆写脚本引用不存在的分组名 → `proxy group not found` | 引用了其他配置（另一套 profiles 目录）的分组名，如 XFLTD 配置用 `自动选择` 但脚本引用 `♻️ 自动选择` | 引用分组前先确认当前激活配置的实际分组名（`GET /proxies` API 或读 YAML）；不要凭经验猜 emoji 前缀 |
| OneDrive 直连无法登录/同步（`live.com` 子域名连不上） | 微软服务在国内直连不稳定，OneDrive 同步/认证需走代理 | 微软服务分组默认走代理（XFLTD），保留 DIRECT 备选；区分"小组件直连"与"OneDrive 需代理"两类服务 |
| 国外站点走代理打不开（DNS fallback 明文 IP 被墙） | `dns.fallback: [1.1.1.1, 8.8.8.8]` 明文 UDP:53 国内被 GFW 阻断；`fallback-filter: geoip CN` 使所有国外 IP 域名触发 fallback → 超时 → 解析失败 | 覆写脚本增量改 `config["dns"]["fallback"] = ["https://doh.pub/dns-query"]`（直连 200 OK）；诊断：`/dns/query?name=` 国外全超时 + `curl --noproxy` 直连正常；详见 SKILL.md「DNS Fallback 明文 IP 被墙」 |

## Quick Reference

```bash
# Copy Script.js to profiles
Copy-Item Script.js "$env:APPDATA\io.github.clash-verge-rev.clash-verge-rev\profiles\Script.js" -Force

# Run lightweight merge (no mihomo needed)
python merge_subs.py

# Fix YAML octal short-id issue
python -c "import re; open('config.yaml','w').write(re.sub(r'^(\s+short-id:\s*)(0[0-9a-fA-F]+)\s*$', r\"\1'\2'\", open('config.yaml').read(), flags=re.MULTILINE))"
```

## Verification Method（覆写脚本生效验证）

修改覆写脚本后，通过 FlClash API 查询当前生效的规则，比看配置文件更可靠：

```bash
# 1. 获取当前所有规则
Invoke-RestMethod -Uri "http://127.0.0.1:9090/rules" -Method GET

# 2. 检查新添加的规则是否出现
# 例如检查 opencode.ai 直连规则是否生效
Invoke-RestMethod -Uri "http://127.0.0.1:9090/rules" -Method GET | \
  ConvertFrom-Json | Select-Object -ExpandProperty rules | \
  Where-Object { $_.payload -match "opencode|deepseek|mimo" }

# 3. 检查代理组当前选择
Invoke-RestMethod -Uri "http://127.0.0.1:9090/proxies" -Method GET
```

**注意**：FlClash API 返回中文可能因终端编码问题乱码，可通过 Python 或保存到 UTF-8 文件再查看。

## Orphaned Script Cleanup（清理残留脚本文件）

FlClash 的 `scripts/` 目录可能残留没有数据库引用的 .js 文件，这些文件不会被加载但会造成混淆：

```bash
# 1. 列出所有脚本文件
ls "%APPDATA%/com.follow/clash/scripts/*.js"

# 2. 查询数据库中实际引用的 script_id
python -c "
import sqlite3, os
db = os.path.expandvars(r'%APPDATA%/com.follow/clash/database.sqlite')
conn = sqlite3.connect(db)
used = set()
for row in conn.execute('SELECT script_id FROM profiles WHERE script_id IS NOT NULL'):
    used.add(str(row[0]))
print('Used script IDs:', used)

# 检查 scripts 表中的所有 ID
for row in conn.execute('SELECT id FROM scripts'):
    used.add(str(row[0]))
print('Registered script IDs:', used)
"

# 3. 删除不在 used 集合中的文件
```

## Common Mistakes

### Clash Verge Rev Specific
- Forgetting to copy Script.js to BOTH `<workdir>` and `<profiles>` dir after changes
- Using `let`/`const`/arrow functions in boa_engine-compatible Script.js (use `var` / `function` instead)
- Not accounting for Verge's extension script adding groups AFTER config validation
- Assuming `mihomo -t` without MMDB is sufficient validation (need network for GeoIP-dependent rules)

### FlClash Specific
- Forgetting to save after pasting script in 覆写 → 脚本模式 (click save icon top-right)
- Using `include-all` / `exclude-filter` inside JS thinking they're runtime filters—they're YAML proxy-group fields
- Writing Verge-style `var` / `String.prototype` patterns when FlClash supports modern JS
- Confusing FlClash profile dir (`com.follow/clash/profiles`) with Verge's (`io.github.clash-verge-rev`)
- Applying `exclude-filter` to `proxy-providers` without checking it's non-null — `proxy-providers: null` means the entire block is dead code
- Using `group["filter"]` (regex on name) when you need explicit node whitelist — use `group.proxies = [...]` instead
- 以为 `type: http` 一定成功；磁盘上可能没有对应 hash 文件，需检查 `profiles/providers/<id>/proxies/`
- 在 `type: http` 的 provider 里用绝对路径做 `path:`；FLClash 会重写这些路径，无需手动指定

### Override Script (FlClash 覆写脚本模式)
- 忘记 `return config;` —— FLClash 拿到 `undefined` 可能回退到缓存配置
- JS 里用 `(?i)` 内联正则标志 —— `new RegExp("(?i)xxx")` 在 JS 中**不支持**，会抛 SyntaxError，导致脚本崩溃
- `config.proxies` 在使用 `use:` 的配置中可能为空数组；修改它不会影响 provider 节点，但可能导致 FLClash 回退到旧配置
- `group.proxies` 在 `use:` 组中为 `undefined`，不需要也不能清理
- 推荐做法：只动 `providers[key]["exclude-filter"]`，不动 `config.proxies` 和 `group.proxies`

### General
- YAML short-id with leading zero (`09561058`) parsed as octal → always quote or regex-fix after dump
- Multi-airport merge without dedup by name causes duplicate proxy errors

## Renaming Proxy Groups（重命名代理组）

**CRITICAL:** 重命名代理组时必须同时替换所有引用，否则配置加载失败。

### 错误示例

```javascript
// ❌ 只改了组名，没改引用
groups[g].name = "🇺🇸 美国(自动/手动)";
// 结果：规则和其他组仍引用 "🇺🇸 美国(故障转移)" → not found 错误
```

### 正确示例

```javascript
// ✅ 重命名 + 全局替换引用
// 1. 重命名组本身
groups[g].name = groups[g].name.replace("(故障转移)", "(自动/手动)");

// 2. 替换规则中的引用
var rules = config["rules"];
if (rules) {
  for (var r = 0; r < rules.length; r++) {
    if (typeof rules[r] === "string") {
      rules[r] = rules[r].replace("(故障转移)", "(自动/手动)");
    } else if (rules[r] && rules[r].proxy) {
      rules[r].proxy = rules[r].proxy.replace("(故障转移)", "(自动/手动)");
    }
  }
}

// 3. 替换所有组的 proxies 列表中的引用
for (var g = 0; g < groups.length; g++) {
  if (groups[g].proxies) {
    for (var p = 0; p < groups[g].proxies.length; p++) {
      if (typeof groups[g].proxies[p] === "string") {
        groups[g].proxies[p] = groups[g].proxies[p].replace("(故障转移)", "(自动/手动)");
      }
    }
  }
}
```

### 重命名 + 类型变更完整模板

```javascript
// 将故障转移组改为 url-test 并重命名
var fallbackGroups = ["🇭🇰 香港(故障转移)","🇺🇸 美国(故障转移)","🇯🇵 日本(故障转移)","🇸🇬 新加坡(故障转移)","🇹🇼 台湾(故障转移)","HK 香港(故障转移)","US 美国(故障转移)","JP 日本(故障转移)","SG 新加坡(故障转移)","TW 台湾(故障转移)"];
for (var g = 0; g < groups.length; g++) {
  if (fallbackGroups.indexOf(groups[g].name) >= 0) {
    groups[g].name = groups[g].name.replace("(故障转移)", "(自动/手动)");
    groups[g].type = "url-test";
    groups[g].url = "http://www.gstatic.com/generate_204";
    groups[g].interval = 300;
    delete groups[g].tolerance;
  }
}
// 全局替换引用（见上方代码）
```

### 注意事项
- 订阅配置中组名可能有多种变体（emoji 前缀、无前缀、纯中文）
- 必须覆盖所有变体：`🇭🇰 香港(故障转移)`、`HK 香港(故障转移)`、`香港(故障转移)`
- `fallback` → `url-test` 时需清理 `tolerance` 残留属性

## Domestic AI Service Direct Connection（国内 AI 服务直连）

### 问题场景
国内 AI 服务（DeepSeek、MiMo、OpenCode 等）被 FlClash 路由到海外代理，导致速度慢。

### 解决方案：覆写脚本 + 环境变量 + no_proxy（双重保障）

#### 1. 覆写脚本：添加直连规则

```javascript
// 在 main() 中添加
if (!config["rules"]) config["rules"] = [];
var cnAiRules = [
  "DOMAIN-SUFFIX,opencode.ai,DIRECT",
  "DOMAIN-SUFFIX,deepseek.com,DIRECT",
  "DOMAIN-SUFFIX,api.deepseek.com,DIRECT",
  "DOMAIN-SUFFIX,xiaomimimo.com,DIRECT",
  "DOMAIN-SUFFIX,api.xiaomimimo.com,DIRECT",
  "DOMAIN-SUFFIX,token-plan-cn.xiaomimimo.com,DIRECT",
  "DOMAIN-SUFFIX,aliyuncs.com,DIRECT",
  "DOMAIN-SUFFIX,dashscope.aliyuncs.com,DIRECT",
  "DOMAIN-SUFFIX,qwen.ai,DIRECT",
  "DOMAIN-SUFFIX,zhipuai.cn,DIRECT",
  "DOMAIN-SUFFIX,api.zhipuai.cn,DIRECT",
  "DOMAIN-SUFFIX,bigmodel.cn,DIRECT",
  "DOMAIN-SUFFIX,open.bigmodel.cn,DIRECT",
  "DOMAIN-SUFFIX,moonshot.cn,DIRECT",
  "DOMAIN-SUFFIX,api.moonshot.cn,DIRECT",
  "DOMAIN-SUFFIX,moonshot.ai,DIRECT",
  "DOMAIN-SUFFIX,api.moonshot.ai,DIRECT",
  "DOMAIN-SUFFIX,baichuan-ai.com,DIRECT",
  "DOMAIN-SUFFIX,api.baichuan-ai.com,DIRECT",
  "DOMAIN-SUFFIX,developer.open-douyin.com,DIRECT",
  "DOMAIN-SUFFIX,developer.toutiao.com,DIRECT",
  "DOMAIN-SUFFIX,lingyiwanwu.com,DIRECT",
  "DOMAIN-SUFFIX,api.lingyiwanwu.com,DIRECT",
  "DOMAIN-SUFFIX,tencentcloudapi.com,DIRECT",
  "DOMAIN-SUFFIX,hunyuan.tencentcloudapi.com,DIRECT",
  "DOMAIN-SUFFIX,xf-yun.com,DIRECT",
  "DOMAIN-SUFFIX,spark-api-open.xf-yun.com,DIRECT"
];
for (var i = 0; i < cnAiRules.length; i++) {
  config["rules"].unshift(cnAiRules[i]);
}
```

#### 2. 系统环境变量：代理 + no_proxy

```powershell
# 代理环境变量（访问海外网站）
[System.Environment]::SetEnvironmentVariable('HTTP_PROXY', 'http://127.0.0.1:7890', 'User')
[System.Environment]::SetEnvironmentVariable('HTTPS_PROXY', 'http://127.0.0.1:7890', 'User')

# no_proxy（国内 AI 服务绕过代理直连）
$noProxy = "localhost,127.0.0.1,.local,opencode.ai,deepseek.com,api.deepseek.com,xiaomimimo.com,api.xiaomimimo.com,token-plan-cn.xiaomimimo.com,dashscope.aliyuncs.com,qwen.ai,zhipuai.cn,api.zhipuai.cn,bigmodel.cn,open.bigmodel.cn,moonshot.cn,api.moonshot.cn,moonshot.ai,api.moonshot.ai,baichuan-ai.com,api.baichuan-ai.com,developer.open-douyin.com,developer.toutiao.com,lingyiwanwu.com,api.lingyiwanwu.com,tencentcloudapi.com,hunyuan.tencentcloudapi.com,xf-yun.com,spark-api-open.xf-yun.com"
[System.Environment]::SetEnvironmentVariable('no_proxy', $noProxy, 'User')
```

### 效果
- 国内 AI 服务 → 匹配 no_proxy → 直连
- 海外网站 → 走代理 → 正常访问
- 覆写脚本规则 → 双重保障

### 验证方法
```powershell
# 测试直连
curl.exe -s -o /dev/null -w "%{http_code} %{time_total}s %{remote_ip}" "https://api.deepseek.com/v1/models" -H "Authorization: Bearer test"

# 测试代理
curl.exe -s -o /dev/null -w "%{http_code} %{time_total}s %{remote_ip}" "https://www.google.com"
```

### 在现有覆写脚本中添加规则

如果已有覆写脚本（如包含节点过滤、分组重建等功能），需要在合适的位置插入规则：

```javascript
// 1. 先读取现有脚本内容
// 2. 找到 config["rules"].unshift() 调用的位置（通常在脚本前部）
// 3. 在其后插入国内AI服务直连规则
config["rules"].unshift("RULE-SET,adblock,🛡️ 去广告");

// === 国内AI服务直连 ===
var cnAiRules = [
  "DOMAIN-SUFFIX,opencode.ai,DIRECT",
  "DOMAIN-SUFFIX,deepseek.com,DIRECT",
  "DOMAIN-SUFFIX,api.deepseek.com,DIRECT",
  "DOMAIN-SUFFIX,xiaomimimo.com,DIRECT",
  "DOMAIN-SUFFIX,api.xiaomimimo.com,DIRECT",
  "DOMAIN-SUFFIX,token-plan-cn.xiaomimimo.com,DIRECT",
  "DOMAIN-SUFFIX,dashscope.aliyuncs.com,DIRECT",
  "DOMAIN-SUFFIX,qwen.ai,DIRECT",
  "DOMAIN-SUFFIX,zhipuai.cn,DIRECT",
  "DOMAIN-SUFFIX,api.zhipuai.cn,DIRECT",
  "DOMAIN-SUFFIX,bigmodel.cn,DIRECT",
  "DOMAIN-SUFFIX,open.bigmodel.cn,DIRECT",
  "DOMAIN-SUFFIX,moonshot.cn,DIRECT",
  "DOMAIN-SUFFIX,api.moonshot.cn,DIRECT",
  "DOMAIN-SUFFIX,moonshot.ai,DIRECT",
  "DOMAIN-SUFFIX,api.moonshot.ai,DIRECT"
];
for (var i = 0; i < cnAiRules.length; i++) {
  config["rules"].unshift(cnAiRules[i]);
}
```

**注意**：
- 规则需要在 `config["rules"].unshift()` 之后添加
- 使用 `DOMAIN-SUFFIX` 匹配域名后缀
- 规则格式：`DOMAIN-SUFFIX,example.com,DIRECT`
- 确保规则插入到最前面（使用 `unshift` 而不是 `push`）

## Google IP Blocking（Google IP 拦截）

### 问题
代理节点 IP 被 Google 识别为可疑流量，返回"检测到异常流量"拦截页面。

### 原因
- 共享 IP 被多人使用，触发反爬虫机制
- 代理节点 IP 被 Google 标记

### 解决方案

#### 1. 覆写脚本过滤问题节点

```javascript
// 在 exclude-filter 中添加问题节点关键词
var welfareRe = "福利|0\\.1x|仅限emby|剩余流量|套餐[到期过期]|已[到过]期|流量|过期|重置|到期|限速|堵车|官网|邮箱客服|支持AI|日本|NF&HBO&Disney";
```

#### 2. 手动切换节点
- 在 FlClash 代理页面切换到其他节点
- 或使用自动测速组（url-test）自动选择最快节点

#### 3. 登录 Google 账号
- 使用 Google 账号登录后重试
- 可以减少被拦截的概率

## Windows Widgets Direct Connection（Windows 小组件直连）

### 问题场景
电脑唤醒后，Windows 11 左下角小组件（天气、新闻等）不加载。

### 根本原因
- FlClash 设置了系统代理（`ProxyEnable=1`，`ProxyServer=127.0.0.1:7890`）
- 唤醒后 FlClash 未完全恢复，代理不可用
- Windows 小组件请求数据时代理连接失败

### 解决方案
在覆写脚本中添加直连规则：

```javascript
// Windows 小组件（解决唤醒后天气不显示）
"DOMAIN-SUFFIX,microsoft.com,DIRECT",
"DOMAIN-SUFFIX,windows.com,DIRECT",
"DOMAIN-SUFFIX,msn.com,DIRECT",
"DOMAIN-SUFFIX,live.com,DIRECT",
"DOMAIN-SUFFIX,msedge.net,DIRECT",
"DOMAIN-SUFFIX,office.com,DIRECT"
```

### 注意事项
- **不要写到注册表 ProxyOverride**：FlClash 重新加载配置时会覆盖注册表
- 应写到覆写脚本中，由 FlClash 统一管理
- 这些域名是微软官方服务，直连不影响功能

> ⚠️ **与 OneDrive 的区别**：此处"微软域名直连"仅适用于 Windows 小组件（天气/新闻）、msn.com 等**静态资源服务**。**OneDrive 同步、微软账号认证（login.live.com）需要走代理**，不能直连。添加微软直连规则时要区分这两类服务，避免把 OneDrive 也直连导致无法登录。详见 SKILL.md「微软服务/OneDrive 分组」。
