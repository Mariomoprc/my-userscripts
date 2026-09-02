### Service-Based Grouping Pattern（按服务分类模式）

现代代理配置通常按服务类型分组，而非仅按地区。以下是最新的推荐架构：

#### 推荐架构（2025+）

```
GLOBAL (定义所有组的顺序)
├── 🚀 手动切换 (select)
│   ├── 🇭🇰 香港(自动/手动) (url-test)
│   ├── 🇺🇸 美国(自动/手动) (fallback)
│   ├── 🇯🇵 日本(自动/手动) (url-test)
│   ├── 🇸🇬 新加坡(自动/手动) (url-test)
│   ├── ♻️ 自动选择 (url-test, include-all-providers: true)
│   └── 🎯 全球直连 (DIRECT)
├── 🤖 AI 服务 (select)
│   ├── 🇺🇸 ChatGPT/Claude (fallback) ← 优先美国节点
│   ├── 🇯🇵 Gemini (url-test) ← 日本可用
│   └── 🇭🇰 Copilot (url-test) ← 香港可用
├── 🎬 流媒体 (select)
│   ├── 🇺🇸 Netflix (fallback) ← 美区优先
│   ├── 🇭🇰 Disney+ (url-test)
│   └── 🇯🇵 ABEMA (url-test)
├── 🎮 游戏加速 (url-test) ← 低延迟优先
├── 📱 国内直连 (DIRECT)
└── 🛑 漏网之鱼 (DIRECT)
```

#### AI 服务分组示例

```yaml
proxy-groups:
  # AI 服务总入口
  - name: "🤖 AI 服务"
    type: select
    proxies:
      - "🇺🇸 ChatGPT/Claude"
      - "🇯🇵 Gemini"
      - "🇭🇰 Copilot"
      - "♻️ 自动选择"
      - "DIRECT"

  # ChatGPT/Claude：美国节点优先，fallback 模式
  - name: "🇺🇸 ChatGPT/Claude"
    type: fallback
    include-all-providers: true
    filter: "美国|🇺🇸|US|us|US-LA|LA-优化"
    url: 'https://www.gstatic.com/generate_204'
    interval: 60

  # Gemini：日本节点优先
  - name: "🇯🇵 Gemini"
    type: url-test
    include-all-providers: true
    filter: "日本|🇯🇵|JP|jp"
    url: 'https://www.gstatic.com/generate_204'
    interval: 300

  # Copilot：香港节点优先
  - name: "🇭🇰 Copilot"
    type: url-test
    include-all-providers: true
    filter: "香港|🇭🇰|HK|hk"
    url: 'https://www.gstatic.com/generate_204'
    interval: 300
```

#### 流媒体分组示例

```yaml
proxy-groups:
  - name: "🎬 流媒体"
    type: select
    proxies:
      - "🇺🇸 Netflix"
      - "🇭🇰 Disney+"
      - "🇯🇵 ABEMA"
      - "DIRECT"

  # Netflix：美国区优先（需要解锁节点）
  - name: "🇺🇸 Netflix"
    type: fallback
    include-all-providers: true
    filter: "美国|🇺🇸|US|us|Netflix|解锁"
    url: 'https://www.gstatic.com/generate_204'
    interval: 60

  # Disney+：香港区优先
  - name: "🇭🇰 Disney+"
    type: url-test
    include-all-providers: true
    filter: "香港|🇭🇰|HK|hk|Disney"
    url: 'https://www.gstatic.com/generate_204'
    interval: 300
```

#### 游戏加速分组

```yaml
proxy-groups:
  - name: "🎮 游戏加速"
    type: url-test
    include-all-providers: true
    filter: "游戏|Game|加速|低延迟|IPLC|专线"
    url: 'https://www.gstatic.com/generate_204'
    interval: 60
    tolerance: 50  # 容差 50ms，避免频繁切换
```

#### 覆写脚本：动态添加 AI 服务分组

```javascript
function main(config) {
  var groups = config["proxy-groups"];
  if (!groups) return config;

  // 创建 AI 服务子分组
  var chatgptGroup = {
    name: "🇺🇸 ChatGPT/Claude",
    type: "fallback",
    "include-all-proxies": true,
    filter: "美国|US|us|US-LA",
    url: "http://www.gstatic.com/generate_204",
    interval: 60
  };
  var geminiGroup = {
    name: "🇯🇵 Gemini",
    type: "url-test",
    "include-all-proxies": true,
    filter: "日本|JP|jp",
    url: "http://www.gstatic.com/generate_204",
    interval: 300
  };
  var aiGroup = {
    name: "🤖 AI 服务",
    type: "select",
    proxies: ["🇺🇸 ChatGPT/Claude", "🇯🇵 Gemini", "♻️ 自动选择", "DIRECT"]
  };

  // 插入到手动切换后面
  var insertIdx = 1;
  groups.splice(insertIdx, 0, aiGroup, chatgptGroup, geminiGroup);

  return config;
}
```

### Multi-Airport Independent Groups Pattern（多机场独立分组模式）

当用户有多个机场订阅，且希望每个机场作为独立分组可手动/自动切换时，使用此模式。

#### 架构设计

```
🚀 手动切换
├── ✈️ XFLTD(自动/手动)  ← url-test, use: [provider4]
├── 🐱 猫熊(自动/手动)    ← url-test, use: [provider2]
├── 🔮 魔戒(自动/手动)    ← url-test, use: [provider3]
├── 🇭🇰 香港(自动/手动)   ← url-test, filter 正则
├── 🇺🇸 美国(自动/手动)   ← fallback
├── ...
├── ♻️ 自动选择           ← use: [provider2, provider3, provider4]
└── DIRECT

♻️ 自动选择
└── 包含所有机场节点（provider2 + provider3 + provider4）
```

#### 覆写脚本示例

```javascript
function main(config) {
  // 1. 新增 provider（file 类型读缓存）
  if (!config["proxy-providers"]) config["proxy-providers"] = {};
  config["proxy-providers"]["provider4"] = {
    type: "file",
    path: "C:\\Users\\pass\\AppData\\Roaming\\com.follow\\clash\\profiles\\<profile-id>.yaml"
  };

  // 2. 创建机场独立分组
  var xfldGroup = {
    name: "✈️ XFLTD(自动/手动)",
    type: "url-test",
    use: ["provider4"],
    url: "http://www.gstatic.com/generate_204",
    interval: 120,
    tolerance: 20
  };
  var maoxiangGroup = {
    name: "🐱 猫熊(自动/手动)",
    type: "url-test",
    use: ["provider2"],
    url: "http://www.gstatic.com/generate_204",
    interval: 120,
    tolerance: 20
  };
  var mejieGroup = {
    name: "🔮 魔戒(自动/手动)",
    type: "url-test",
    use: ["provider3"],
    url: "http://www.gstatic.com/generate_204",
    interval: 120,
    tolerance: 20
  };

  // 3. 修改手动切换，加入机场分组
  var groups = config["proxy-groups"];
  for (var g = 0; g < groups.length; g++) {
    if (groups[g].name === "🚀 手动切换") {
      groups[g].proxies = [
        "✈️ XFLTD(自动/手动)", "🐱 猫熊(自动/手动)", "🔮 魔戒(自动/手动)",
        "🇭🇰 香港(自动/手动)", "🇺🇸 美国(自动/手动)", "🇯🇵 日本(自动/手动)",
        "♻️ 自动选择", "DIRECT"
      ];
    }
    // 4. 修改自动选择，包含所有机场
    if (groups[g].name === "♻️ 自动选择") {
      groups[g].use = ["provider2", "provider3", "provider4"];
    }
  }

  // 5. 插入新分组（在自动选择后面）
  var autoIdx = -1;
  for (var g = 0; g < groups.length; g++) {
    if (groups[g].name === "♻️ 自动选择") { autoIdx = g; break; }
  }
  if (autoIdx >= 0) {
    groups.splice(autoIdx + 1, 0, xfldGroup);
    groups.splice(autoIdx + 2, 0, maoxiangGroup);
    groups.splice(autoIdx + 3, 0, mejieGroup);
  }

  return config;
}
```

#### 关键点

| 要素 | 说明 |
|------|------|
| 分组类型 | `url-test`（自动测速）或 `select`（纯手动） |
| 分组命名 | 带 `(自动/手动)` 后缀，和地区组风格一致 |
| provider 分配 | 每个机场分组只用自己 provider，不混用 |
| 自动选择 | 用 `include-all-providers: true` 或 `use` 包含所有 provider |
| 手动切换 | `proxies` 列表加入所有机场分组 |
| hidden 属性 | 设 `hidden: true` 可隐藏标签栏但保留功能 |

#### 简化写法（使用 include-all-providers）

当不需要精细控制 provider 顺序时，可用 `include-all-providers` 替代手动列举：

```yaml
# 旧写法：手动列举所有 provider
proxy-groups:
  - name: "♻️ 自动选择"
    type: url-test
    use: [provider1, provider2, provider3]
    url: 'https://www.gstatic.com/generate_204'
    interval: 300

# 新写法：自动引入所有 provider
proxy-groups:
  - name: "♻️ 自动选择"
    type: url-test
    include-all-providers: true
    url: 'https://www.gstatic.com/generate_204'
    interval: 300
```

### Adding New Provider via Override Script（通过覆写脚本添加新 Provider）

当订阅链接失效或需要添加新机场时，通过覆写脚本注入 `type: file` 的 provider。

#### 前提条件

1. 目标机场的 profile 文件已缓存在 `profiles/` 目录下
2. 知道缓存文件的文件名（即 profile ID）

#### 查找缓存文件

```bash
# 列出 FlClash profiles 目录
ls "$env:APPDATA\com.follow\clash\profiles\*.yaml"

# 或通过数据库查询
python -c "import sqlite3; conn = sqlite3.connect(r'$env:APPDATA\com.follow\clash\database.sqlite'); print(conn.execute('SELECT id, label FROM profiles').fetchall())"
```

#### 脚本注入

```javascript
// 在 main() 中添加
if (!config["proxy-providers"]) config["proxy-providers"] = {};
config["proxy-providers"]["provider4"] = {
  type: "file",
  path: "C:\\Users\\pass\\AppData\\Roaming\\com.follow\\clash\\profiles\\<profile-id>.yaml",
  "exclude-filter": "福利|剩余流量|套餐到期|官网"  // 可选：过滤非节点内容
};
```

#### 注意事项

- FLClash 会自动重写 `path:` 中的 profile ID，无需手动维护
- `type: file` 不依赖网络，适合订阅链接易失效的机场
- 确认目标 `.yaml` 文件确实存在，否则 provider 为空

### FlClash Script ID 注意事项

FlClash 覆写脚本的文件名使用的是 **scripts 表的 `id`**（script_id），**不是** profiles 表的 `id`（profile ID）。

> **更正** (2026-07-19)：之前文档记录为"使用 profile ID 定位脚本文件"，但实测不成立。profile `三合一 通用` 的 profile ID=323413412883206144、script_id=323404916661948416，使用 profile ID 命名脚本文件不被加载，改用 script_id 后立即生效。

#### 验证方法

```python
import sqlite3
db_path = r"C:\Users\pass\AppData\Roaming\com.follow\clash\database.sqlite"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 脚本文件名 = scripts.id，不是 profiles.id
cursor.execute("SELECT p.id AS profile_id, p.label, p.script_id FROM profiles p")
for row in cursor.fetchall():
    print(f"Profile: {row[1]} (profile_id={row[0]}, script_id={row[2]})")
    # 脚本文件: %APPDATA%/com.follow/clash/scripts/{script_id}.js
```

#### 文件路径映射

| 内容 | 路径 |
|------|------|
| Profile 文件 | `%APPDATA%/com.follow/clash/profiles/<profile-id>.yaml` |
| 覆写脚本 | `%APPDATA%/com.follow/clash/scripts/<script_id>.js` |
| Provider 缓存 | `%APPDATA%/com.follow/clash/profiles/providers/<profile-id>/` |

#### 常见错误

- ❌ 用 profile `id` 找脚本文件 → 文件不被加载
- ✅ 用 `script_id` 命名脚本文件

### Override Script Configuration Layering（覆写脚本配置分层模式）

**原则**：YAML 负责持久配置，覆写脚本负责通用规则。两者分工明确，不重复不覆盖。

#### 架构设计

```
YAML 文件（配置专用）
├── proxy-providers          ← provider 定义（type: http + url）
├── rule-providers           ← 规则集（RULE-SET）
├── proxy-groups             ← 地区分组（filter + use）
├── dns                      ← DNS 配置（DOH/DoT、fake-ip、use-hosts）
├── tun                      ← TUN 模式
└── rules                    ← 路由规则

覆写脚本（通用规则 → 多个机场共享）
├── keep-alive-interval      ← 长连接保持
├── exclude-filter           ← 节点过滤（遍历所有 provider）
└── AI 直连规则              ← 国内 AI 服务通行
```

#### 脚本模板：适用于合并配置

```javascript
function main(config) {
  // 通用：长连接
  config["keep-alive-interval"] = 30;

  // === 节点过滤 ===
  var welfareRe = "福利|0\\.1x|仅限emby|限速|堵车";
  var expireRe = "剩余流量|套餐到期|重置|已[到过]期|官网|邮箱客服|支持AI";
  var excludeRe = welfareRe + "|" + expireRe;

  if (config["proxy-providers"]) {
    for (var name in config["proxy-providers"]) {
      var p = config["proxy-providers"][name];
      if (p["exclude-filter"]) {
        p["exclude-filter"] += "|" + excludeRe;
      } else {
        p["exclude-filter"] = excludeRe;
      }
    }
  }

  // === AI 直连 ===
  var directRules = [
    "DOMAIN-SUFFIX,opencode.ai,🎯 全球直连",
    "DOMAIN-SUFFIX,deepseek.com,🎯 全球直连",
    "DOMAIN-SUFFIX,api.deepseek.com,🎯 全球直连",
    "DOMAIN-SUFFIX,xiaomimimo.com,🎯 全球直连",
    "DOMAIN-SUFFIX,api.xiaomimimo.com,🎯 全球直连",
    "DOMAIN-SUFFIX,token-plan-cn.xiaomimimo.com,🎯 全球直连",
    "DOMAIN-SUFFIX,dashscope.aliyuncs.com,🎯 全球直连",
    "DOMAIN-SUFFIX,qwen.ai,🎯 全球直连",
    "DOMAIN-SUFFIX,zhipuai.cn,🎯 全球直连",
    "DOMAIN-SUFFIX,api.zhipuai.cn,🎯 全球直连",
    "DOMAIN-SUFFIX,bigmodel.cn,🎯 全球直连",
    "DOMAIN-SUFFIX,open.bigmodel.cn,🎯 全球直连",
    "DOMAIN-SUFFIX,moonshot.cn,🎯 全球直连",
    "DOMAIN-SUFFIX,api.moonshot.cn,🎯 全球直连",
    "DOMAIN-SUFFIX,moonshot.ai,🎯 全球直连",
    "DOMAIN-SUFFIX,api.moonshot.ai,🎯 全球直连",
    "DOMAIN-SUFFIX,baichuan-ai.com,🎯 全球直连",
    "DOMAIN-SUFFIX,api.baichuan-ai.com,🎯 全球直连",
    "DOMAIN-SUFFIX,lingyiwanwu.com,🎯 全球直连",
    "DOMAIN-SUFFIX,api.lingyiwanwu.com,🎯 全球直连",
    "DOMAIN-SUFFIX,tencentcloudapi.com,🎯 全球直连",
    "DOMAIN-SUFFIX,hunyuan.tencentcloudapi.com,🎯 全球直连"
  ];

  var rules = config["rules"];
  if (rules) {
    var matchIndex = -1;
    for (var i = 0; i < rules.length; i++) {
      if (rules[i].startsWith("MATCH,")) {
        matchIndex = i;
        break;
      }
    }
    if (matchIndex >= 0) {
      var args = [matchIndex, 0].concat(directRules);
      rules.splice.apply(rules, args);
    }
  }

  return config;
}
```

#### 关键原则

| 原则 | 说明 |
|------|------|
| 不覆盖 DNS | YAML 的 DNS 通常更完善，脚本只做增量补充 |
| 不重复设置 | 检查 YAML 是否已有（如 `tcp-concurrent`），有则跳过 |
| 过滤规则通用化 | exclude-filter 放在脚本中，所有 provider 和机场复用 |
| 配置专用化 | 地区分组、rule-providers 留在 YAML，脚本不做 |
