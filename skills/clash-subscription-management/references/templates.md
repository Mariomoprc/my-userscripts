### Region Grouping Override Script（地区分组覆写脚本模板）

FlClash 覆写脚本，通过 emoji 国旗 + 地区名正则匹配自动创建地区分组：

```javascript
const REGIONS = [
  { name: "🇭🇰 香港", match: /🇭🇰 香港/ },
  { name: "🇸🇬 新加坡", match: /🇸🇬 新加坡/ },
  { name: "🇯🇵 日本",   match: /🇯🇵 日本/ },
  { name: "🇺🇸 美国",   match: /🇺🇸 美国/ },
  { name: "🇨🇦 加拿大", match: /🇨🇦 加拿大/ },
];

const main = (config) => {
  config["proxy-groups"] ??= [];
  const allProxyNames = config.proxies.map(p => p.name);

  for (const region of REGIONS) {
    const proxies = allProxyNames.filter(n => region.match.test(n));
    if (!proxies.length) continue;

    const exists = config["proxy-groups"].some(g => g.name === region.name);
    if (!exists) {
      config["proxy-groups"].push({
        name: region.name,
        type: "select",
        url: "http://www.gstatic.com/generate_204",
        interval: 120,
        proxies,
      });
    }
  }

  // 将地区分组插入到主组，并过滤掉单独节点
  const xfltd = config["proxy-groups"].find(g => g.name === "XFLTD");
  if (xfltd) {
    const insertIdx = xfltd.proxies.indexOf("故障转移") + 1;
    const regionNames = REGIONS.map(r => r.name).filter(n => !xfltd.proxies.includes(n));
    xfltd.proxies.splice(insertIdx, 0, ...regionNames);
    xfltd.proxies = xfltd.proxies.filter(p => !allProxyNames.includes(p));
  }

  return config;
};
```

**注意事项**：
- FlClash 的 QuickJS 引擎支持 `const`、箭头函数、`Array.filter/map/some/includes` 等现代语法
- 正则中的 emoji 国旗（🇭🇰、🇸🇬 等）必须与节点实际名称完全一致
- `select` 类型分组需要加 `url/interval` 才能显示延迟
- 主分组过滤 `filter(p => !allProxyNames.includes(p))` 只保留分组引用

### Complete Override Script Template（完整覆写脚本模板）

整合多机场分组、节点过滤、规则注入、分组排序的完整模板：

```javascript
function main(config) {
  // === 1. 节点过滤 ===
  var welfareRe = "福利|0\\.1x|仅限emby|剩余流量|套餐[到期过期]|已[到过]期|美国USLA-A|流量|过期|重置|到期|限速|堵车|官网";
  var providers = config["proxy-providers"];
  if (providers) {
    for (var key in providers) {
      if (Object.prototype.hasOwnProperty.call(providers, key)) {
        providers[key]["exclude-filter"] = welfareRe;
      }
    }
  }

  // === 2. 新增 Provider（file 类型） ===
  if (!config["proxy-providers"]) config["proxy-providers"] = {};
  config["proxy-providers"]["provider4"] = {
    type: "file",
    path: "C:\\Users\\pass\\AppData\\Roaming\\com.follow\\clash\\profiles\\<profile-id>.yaml",
    "exclude-filter": welfareRe
  };

  // === 3. 创建机场分组 ===
  var groups = config["proxy-groups"];
  if (!groups) return config;

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

  // === 4. 修改现有分组 ===
  for (var g = 0; g < groups.length; g++) {
    if (groups[g].name === "🚀 手动切换") {
      groups[g].proxies = [
        "✈️ XFLTD(自动/手动)", "🐱 猫熊(自动/手动)", "🔮 魔戒(自动/手动)",
        "🇭🇰 香港(自动/手动)", "🇺🇸 美国(自动/手动)", "🇯🇵 日本(自动/手动)",
        "🇸🇬 新加坡(自动/手动)", "🇹🇼 台湾(自动/手动)",
        "♻️ 自动选择", "DIRECT"
      ];
    }
    if (groups[g].name === "♻️ 自动选择") {
      groups[g].use = ["provider2", "provider3", "provider4"];
      groups[g].interval = 120;
      groups[g].tolerance = 20;
    }
    if (groups[g].name === "🇺🇸 美国(自动/手动)") {
      groups[g].type = "fallback";
      groups[g].url = "http://www.gstatic.com/generate_204";
      groups[g].interval = 120;
      delete groups[g].tolerance;
    }
    // 隐藏分组（可选）
    // if (groups[g].name === "xxx") groups[g].hidden = true;
  }

  // === 5. 插入新分组 ===
  var autoIdx = -1;
  for (var g = 0; g < groups.length; g++) {
    if (groups[g].name === "♻️ 自动选择") { autoIdx = g; break; }
  }
  if (autoIdx >= 0) {
    groups.splice(autoIdx + 1, 0, xfldGroup);
    groups.splice(autoIdx + 2, 0, maoxiangGroup);
    groups.splice(autoIdx + 3, 0, mejieGroup);
  }

  // === 6. 排序（可选） ===
  var sortOrder = [
    "🚀 手动切换", "✈️ XFLTD(自动/手动)", "🐱 猫熊(自动/手动)", "🔮 魔戒(自动/手动)",
    "♻️ 自动选择", "🇭🇰 香港(自动/手动)", "🇺🇸 美国(自动/手动)",
    "🇯🇵 日本(自动/手动)", "🇸🇬 新加坡(自动/手动)", "🇹🇼 台湾(自动/手动)"
  ];
  var orderMap = {};
  for (var i = 0; i < sortOrder.length; i++) orderMap[sortOrder[i]] = i;
  groups.sort(function(a, b) {
    var ai = orderMap[a.name] !== undefined ? orderMap[a.name] : 999;
    var bi = orderMap[b.name] !== undefined ? orderMap[b.name] : 999;
    return ai - bi;
  });

  return config;
}
```

### merge_subs.py (轻量多机场合并)
纯 YAML 合并，无需网络探测：

- **依赖**：仅 `pip install pyyaml`
- **不需要**：mihomo 子进程、网络、权限
- **逻辑**：读取多个订阅文件 → 以第一个为模板（保留 proxy-groups/rules）→ 去重合并 proxies → 输出 YAML
- **适用场景**：FlClash 用户做本地配置合并（配合覆写脚本使用）
- **修复**：自动处理 YAML octal 问题（`short-id: 09561058` → `short-id: '09561058'`）
- **输出**：导入 FlClash 作为本地配置（File 模式），不会被订阅更新覆盖

### proxy-provider type: file (离线回退)

当 `type: http` 下载失败时（GFW 阻断 / 超时 / URL 过期），改用 `type: file` 指向本地已缓存的 profile 文件：

```yaml
proxy-providers:
  provider1:
    type: file
    path: "C:\\Users\\pass\\AppData\\Roaming\\com.follow\\clash\\profiles\\320141415218679808.yaml"
```

**原理**：FLClash 每次拉取订阅时会在 `profiles/` 下缓存完整的 `.yaml` 文件。proxy-provider `type: file` 能从中提取 `proxies:` 段，效果等同于 HTTP 下载但不受网络限制。profile 文件会随订阅刷新而更新，所以节点数据仍然是新的。

**注意**：FLClash 加载配置时会自动重写 `path:` 中的 profile ID（路径中的数字段自动更新），所以无需手动维护路径。但务必确认目标文件确实存在——`type: http` 可能无声失败，磁盘上没有任何 hash 文件。

## Proxy Group Loop Detection

**CRITICAL:** Verge runs Script.js AFTER loading the subscription. The merged config can have loops from THREE sources:

| Source | How cycles form |
|--------|----------------|
| **Script.js** | Creates `其他地区` group that references `全球直连`/`自动选择`, AND adds `其他地区` to `手动切换`/`自动选择`/`漏网之鱼` |
| **Verge user-defined groups** | User's custom proxy groups that cross-reference subscription groups |

**Fix principles:**
1. `全球直连` should ONLY have `DIRECT` + individual proxy nodes (NO group references)
2. `其他地区`'s proxy list should ONLY contain individual proxy nodes (NO group references)
3. Script.js should NOT inject `其他地区` into `自动选择`—only into `手动切换` and `漏网之鱼`
4. Always verify with `mihomo -t -f <config>` before importing

## Optimization Patterns（优化模式）

### Region Group Fallback Pattern（地区分组故障转移模式）

推荐地区分组使用 `fallback` 类型，定义 provider 优先级：

```yaml
proxy-groups:
  # 机场分组：保持 url-test（自动选最快）
  - name: "✈️ XFLTD(自动/手动)"
    type: url-test
    use: [provider1]
    url: "http://www.gstatic.com/generate_204"
    interval: 120
    tolerance: 20

  # 地区分组：使用 fallback（按优先级故障转移）
  - name: "🇭🇰 香港(故障转移)"
    type: fallback
    filter: "香港|🇭🇰|HK|hk"
    use:
      - provider1   # 第1优先
      - provider2   # 第2优先
      - provider3   # 第3优先
    url: "http://www.gstatic.com/generate_204"
    interval: 60
    proxies: []
```

**命名约定（中文项目）：**
- 机场分组：`✈️ XFLTD(自动/手动)` — 保持 "(自动/手动)"
- 地区分组：`🇭🇰 香港(故障转移)` — 标注 "(故障转移)"

### Auto-Select Filter Optimization（自动选择过滤优化）

自动选择只保留热门地区，通过覆写脚本动态修改 filter：

```javascript
// 修改自动选择的 filter，移除冷门地区
var groups = config["proxy-groups"];
if (groups) {
  for (var g = 0; g < groups.length; g++) {
    if (groups[g].name === "♻️ 自动选择") {
      groups[g].filter = "美国|🇺🇸|US|us|日本|🇯🇵|JP|jp|新加坡|🇸🇬|SG|sg|台湾|🇹🇼|TW|tw";
      break;
    }
  }
}
```

**好处**：YAML 保持完整 filter 作为备份，脚本运行时动态修改，想恢复时删掉代码即可。

### Google Group Pattern（Google 分组模式）

合并 FCM 到更广泛的 Google 分组：

```yaml
proxy-groups:
  - name: "🌐 Google"
    proxies:
      - "🚀 手动切换"
      - "🇭🇰 香港(故障转移)"
      - "🇺🇸 美国(故障转移)"
      - "🎯 全球直连"
      - "♻️ 自动选择"
    type: select
    include-all-providers: true
```

```yaml
rules:
  - "RULE-SET,fcm_1,🌐 Google"  # FCM 规则引用 Google 分组
```

### Rule Optimization Patterns（规则优化模式）

| 规则类型 | 推荐目标 | 说明 |
|---------|---------|------|
| Telegram | ♻️ 自动选择 | 不应放在手动切换，应自动选择 |
| PikPak | ♻️ 自动选择 | 下载工具，应自动选择 |
| ProxyLite | ♻️ 自动选择 | 通用代理规则，应自动选择 |
| 国内流媒体 | 🎯 全球直连 | B站、优酷、爱奇艺等应直连 |

### Recommended Online Rule-Providers（推荐在线规则源）

| 规则名 | 内容 | URL |
|--------|------|-----|
| china_media | 国内流媒体 | `https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/ChinaMedia.yaml` |
| rule_11 | 国内域名 | `https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/ChinaDomain.yaml` |
| rule_12 | 国内 IP | `https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/classical/cn.yaml` |

### Complete Three-Airport Template（完整三机场模板）

整合所有优化的完整配置模板：

```yaml
# Providers
proxy-providers:
  provider1:  # XFLTD
    type: file
    path: "C:\\...\\320141415218679808.yaml"
  provider2:  # 猫熊
    type: http
    url: "https://..."
  provider3:  # 魔戒
    type: http
    url: "https://..."

# Groups
proxy-groups:
  - name: "🚀 手动切换"
    type: select
    proxies:
      - "✈️ XFLTD(自动/手动)"
      - "🐱 猫熊(自动/手动)"
      - "🔮 魔戒(自动/手动)"
      - "🇭🇰 香港(故障转移)"
      - "🇺🇸 美国(故障转移)"
      - "🇯🇵 日本(故障转移)"
      - "🇸🇬 新加坡(故障转移)"
      - "🇹🇼 台湾(故障转移)"
      - "♻️ 自动选择"
      - "DIRECT"

  - name: "♻️ 自动选择"
    type: url-test
    include-all-providers: true
    filter: "美国|🇺🇸|US|us|日本|🇯🇵|JP|jp|新加坡|🇸🇬|SG|sg|台湾|🇹🇼|TW|tw"
    url: "http://www.gstatic.com/generate_204"
    interval: 120
    tolerance: 20

  - name: "🇭🇰 香港(故障转移)"
    type: fallback
    filter: "香港|🇭🇰|HK|hk"
    use: [provider1, provider2, provider3]
    url: "http://www.gstatic.com/generate_204"
    interval: 60
    proxies: []
```

### Override Script Template（覆写脚本模板）

```javascript
function main(config) {
  // 节点过滤（福利/官网）
  var welfareRe = "福利|0\\.1x|仅限emby|剩余流量|套餐[到期过期]|已[到过]期|美国USLA-A|流量|过期|重置|到期|限速|堵车|官网";
  var providers = config["proxy-providers"];
  if (providers) {
    for (var key in providers) {
      if (Object.prototype.hasOwnProperty.call(providers, key)) {
        providers[key]["exclude-filter"] = welfareRe;
      }
    }
  }

  // 修改自动选择的 filter，移除冷门地区
  var groups = config["proxy-groups"];
  if (groups) {
    for (var g = 0; g < groups.length; g++) {
      if (groups[g].name === "♻️ 自动选择") {
        groups[g].filter = "美国|🇺🇸|US|us|日本|🇯🇵|JP|jp|新加坡|🇸🇬|SG|sg|台湾|🇹🇼|TW|tw";
        break;
      }
    }
  }

  return config;
}
```
