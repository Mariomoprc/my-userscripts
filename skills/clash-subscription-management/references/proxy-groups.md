### mihomo 官方代理组类型参考

基于 [mihomo 官方文档](https://wiki.metacubex.one/config/proxy-groups/)，mihomo 支持以下代理组类型：

| 类型 | 说明 | 适用场景 |
|------|------|---------|
| `select` | 手动选择节点 | 主入口、地区分组 |
| `url-test` | 自动测速，选延迟最低的节点 | 地区自动选择 |
| `fallback` | 按顺序故障转移，前一个不可用时切下一个 | 质量优先（如 AI 服务） |
| `load-balance` | 负载均衡 | 大流量场景 |
| `relay` | **已弃用** → 改用 `dialer-proxy` | 链式代理 |

#### 通用字段

所有代理组类型共享以下字段：

```yaml
proxy-groups:
  - name: "proxy"           # 必须，策略组名字
    type: select             # 必须，策略组类型
    proxies:                 # 引入出站代理或其他策略组
      - DIRECT
    use:                     # 引入代理集合 (proxy-providers)
      - provider1
    url: 'https://www.gstatic.com/generate_204'  # 健康检查地址
    interval: 300            # 健康检查间隔（秒），0 禁用定时测试
    lazy: true               # 懒惰模式，未选中时不测试（默认 true）
    timeout: 5000            # 健康检查超时（毫秒）
    max-failed-times: 5      # 最大失败次数，超过触发强制健康检查
    disable-udp: true        # 禁用 UDP
    empty-fallback: COMPATIBLE  # 组为空时的回退节点
    expected-status: 200/302    # 健康检查期望 HTTP 状态码
    hidden: true             # 隐藏该策略组（需前端适配）
    icon: "xxx"              # 自定义图标（需前端适配）
    include-all: false       # 引入所有代理 + 代理集合（按名称排序）
    include-all-proxies: false  # 引入所有代理（不含策略组）
    include-all-providers: false  # 引入所有代理集合
    filter: "(?i)港|hk"      # 正则筛选节点名
    exclude-filter: "美|日"  # 正则排除节点名
    exclude-type: "Shadowsocks|Http"  # 按节点类型排除
```

**注意**：`filter` / `exclude-filter` / `exclude-type` 仅作用于 `use:` 引入的代理集合和 `include-all-proxies` 引入的代理。

#### load-balance 负载均衡策略

`load-balance` 支持三种分配策略：

| 策略 | 说明 |
|------|------|
| `round-robin` | 轮询分配（默认） |
| `consistent-hashing` | 相同目标地址分配到同一节点 |
| `sticky-sessions` | 相同来源+目标分配到同一节点（10分钟缓存） |

```yaml
proxy-groups:
  - name: "load-balance"
    type: load-balance
    proxies:
      - ss1
      - ss2
      - vmess1
    url: 'https://www.gstatic.com/generate_204'
    interval: 300
    strategy: consistent-hashing  # 或 round-robin / sticky-sessions
```

**适用场景**：`sticky-sessions` 适合需要会话保持的场景（如电商登录、银行操作）；`consistent-hashing` 适合相同站点走相同节点的场景。

#### include-all 系列简化写法

mihomo 提供 `include-all` 系列字段，无需手动列举所有 provider：

```yaml
proxy-groups:
  # 方案 A：include-all（引入所有代理 + 所有代理集合，按名称排序）
  - name: "♻️ 自动选择"
    type: url-test
    include-all: true
    url: 'https://www.gstatic.com/generate_204'
    interval: 300

  # 方案 B：include-all-proxies（仅引入所有出站代理，不含策略组）
  - name: "🚀 手动切换"
    type: select
    include-all-proxies: true

  # 方案 C：include-all-providers（仅引入所有代理集合）
  - name: "♻️ 自动选择"
    type: url-test
    include-all-providers: true
    url: 'https://www.gstatic.com/generate_204'
    interval: 300

  # 方案 D：混合使用（include-all + 手动添加其他策略组）
  - name: "🚀 手动切换"
    type: select
    include-all-proxies: true
    proxies:
      - "♻️ 自动选择"   # 手动添加其他策略组
      - "DIRECT"
```

**与 `use:` 的关系**：
- `include-all-providers` 会使 `use:` 失效
- `include-all` 包含 `include-all-proxies` + `include-all-providers`
- 如果需要同时使用 `use:` 和手动列表，不要用 `include-all-providers`

#### dialer-proxy 链式代理（替代已弃用的 relay）

`relay` 策略已弃用，改用出站代理的 `dialer-proxy` 字段实现链式代理：

```yaml
# ❌ 已弃用的 relay 写法
proxy-groups:
  - name: "relay"
    type: relay
    proxies:
      - "vmess-node"
      - "ss-node"

# ✅ 现代写法：dialer-proxy
proxies:
  - name: "vmess-over-ss"
    type: vmess
    server: example.com
    port: 443
    dialer-proxy: "ss-node"  # 先通过 ss-node 连接，再通过 vmess 出站
```

**适用场景**：需要通过一个代理节点连接到另一个代理节点（如内网穿透、多层代理）。

#### 高级过滤特性

| 特性 | 说明 | 示例 |
|------|------|------|
| `expected-status` | 健康检查期望 HTTP 状态码 | `200/302` 或 `400-503` |
| `empty-fallback` | 组为空时的回退节点 | `COMPATIBLE`（默认） |
| `exclude-type` | 按节点类型排除 | `Shadowsocks\|Http` |
| `max-failed-times` | 最大失败次数后强制健康检查 | `5`（默认） |
| `timeout` | 健康检查超时（毫秒） | `5000` |

```yaml
proxy-groups:
  - name: "🇭🇰 香港(自动/手动)"
    type: url-test
    use: [provider1, provider2]
    filter: "香港|🇭🇰|HK|hk"
    exclude-type: "Shadowsocks|Http"  # 排除 SS 和 HTTP 节点
    expected-status: 200/302           # 只认 200 和 302 为可用
    empty-fallback: "DIRECT"           # 组为空时回退到直连
    timeout: 3000                      # 3秒超时
```

#### 内置代理组 (GLOBAL)

mihomo 内置 `GLOBAL` 策略组，默认填充所有代理组和代理节点。web 面板和部分客户端使用 GLOBAL 内的策略组顺序进行排序。自定义 GLOBAL 时建议书写完整当前配置所有的策略组。

### Native filter Field (ProxyGroup Name Regex) — 首选方案

Clash Meta 原生支持在 `use:` 代理组上通过 `filter:` 按节点名字正则过滤，**不需要写脚本**。

```yaml
proxy-groups:
  - name: "🇭🇰 香港(自动/手动)"
    type: url-test
    use: [provider1, provider2, provider3]
    filter: "香港|🇭🇰|HK|hk"    # 只显示节点名匹配这些关键字的节点
```

**推荐写法（使用 include-all-providers 简化）**：

```yaml
proxy-groups:
  # 自动选择：引入所有 provider，filter 只匹配香港节点
  - name: "🇭🇰 香港(自动/手动)"
    type: url-test
    include-all-providers: true
    filter: "香港|🇭🇰|HK|hk"
    url: 'https://www.gstatic.com/generate_204'
    interval: 300
```

#### 三机场混合场景 filter 参考表

| 分组 | provider1 (XFLTD)命名 | provider2 (猫熊)命名 | provider3 (魔戒)命名 | filter 正则 |
|------|----------------------|---------------------|---------------------|------------|
| 🇭🇰 香港 | `🇭🇰 香港 01 [V]` | `香港HK-A-Gemini` | `🇭🇰 直连-V103-香港-1x` | `香港\|🇭🇰\|HK\|hk` |
| 🇺🇸 美国 | `🇺🇸 美国 01 [V]` | `美国US-LA-优化-GPT` | `🇺🇸 直连-V110-美国-1x` | `美国\|🇺🇸\|US\|us\|US-LA\|LA-优化` |
| 🇯🇵 日本 | `🇯🇵 日本 01 [V]` | `日本-优化` | `🇯🇵 直连-V104-日本-1x` | `日本\|🇯🇵\|JP\|jp` |
| 🇸🇬 新加坡 | `🇸🇬 新加坡 01 [V]` | `新加坡SG-HY2` | `🇸🇬 直连-V101-新加坡-1x` | `新加坡\|🇸🇬\|SG\|sg` |
| 🇹🇼 台湾 | — | — | `🇹🇼 直连-V106-台湾-1x` | `台湾\|🇹🇼\|TW\|tw` |
| 专线 | — | — | `🇯🇵 IPLC-V111-日本-1x` | `IPLC\|iplc\|专线` |

**原则**：filter 要覆盖所有 provider 的命名风格，用 `|` 并列关键词。🛡️ 手动切换 / ♻️ 自动选择 / 🎯 全球直连 等不分地区的组**不加 filter**，以显示全量节点。

### Provider 福利节点过滤（exclude-filter 三种方案对比）

| 方案 | 写入位置 | 被 FLClash 吞掉？ | 说明 |
|------|---------|------------------|------|
| YAML 直接写 | provider 上 `exclude-filter:` | ❌ FLClash 重写文件时删除 | 不可靠，FLClash 不保留 |
| YAML 直接写 | proxy-group 上 `exclude-filter:` | ✅ 保留（同 `filter:`） | 可行但需加到每个组 |
| main() 脚本注入 | 在脚本中给 provider 加 | ✅ 内存生效，写入与否不影响 | **推荐**，一次写好永久生效 |

#### 推荐方案：main() 脚本注入 `exclude-filter`

```javascript
function main(config) {
  var welfareRe = "福利|0\\.1x|仅限emby|剩余流量|套餐到期|套餐过期|已到期|已过期|美国USLA-A|官网";
  var providers = config["proxy-providers"];
  if (providers) {
    for (var key in providers) {
      if (Object.prototype.hasOwnProperty.call(providers, key)) {
        providers[key]["exclude-filter"] = welfareRe;
      }
    }
  }
  return config;
}
```

**注意事项**：
- `exclude-filter` 不能在 JS 中通过 `new RegExp("(?i)...")` 使用 `(?i)` 内联标志 —— JS 不支持，需通过 `new RegExp(pattern, "i")` 传第二个参数或直接写字符串让 Go 引擎处理
- `(?i)` 在 YAML 的 `exclude-filter` 字段中有效（mihomo 的 Go regexp 支持），但 JS 里不要写 `(?i)` 开头
- 必须 `return config;`，否则 FLClash 拿不到结果
- 避免修改 `config.proxies` 或 `group.proxies` —— 使用 `use:` 的组没有 `proxies` 字段，且误删可能导致只剩指定节点
- `官网` 模式过滤机场官网信息节点（如 `官网: XFLTD.NET / XFLTD.Win`），这些是 Shadowsocks 类型的占位节点，不是真实代理
