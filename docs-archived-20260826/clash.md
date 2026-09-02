# FlClash 配置指南

FlClash v0.8.93，基于 clash-meta 内核。

## 安装路径

| 项目 | 路径 |
|------|------|
| 程序文件 | `C:\Program Files\FlClash\` |
| 主配置目录 | `%USERPROFILE%\.config\clash\` |
| Profiles 数据 | `%APPDATA%\com.follow\clash\profiles\` |

## 主配置目录 `%USERPROFILE%\.config\clash\`

| 文件/目录 | 用途 |
|-----------|------|
| `config.yaml` | 内核基础配置（端口、secret） |
| `profiles/1777887752042.yml` | 默认启动的订阅配置 |
| `profiles/list.yml` | 订阅列表及分组选择状态 |
| `start_flclash.bat` | 手动启动内核 |
| `Country.mmdb` | GeoIP 数据库 |
| `cfw-settings.yaml` | FlClash 界面设置 |
| `cache.db` | 缓存 |
| `service/` | Windows 服务 |

## Profiles 数据目录 `%APPDATA%\com.follow\clash\profiles\`

FlClash GUI 管理的配置文件，文件名为数字 ID。

| 文件 | 名称（在 UI 中） | 说明 |
|------|-------------------|------|
| `320141250697105408.yaml` | 魔戒 | 单订阅 |
| `320141415218679808.yaml` | XFLTD(没有AI优化节点) | 单订阅 |
| `323413412883206144.yaml` | 三合一 通用 | proxy-providers 合并订阅 |
| `333064163368636416.yaml` | 精靈學院 | 单订阅 |

### 结构说明

**proxy-providers 模式（三合一）：**
```yaml
proxy-providers:
  provider1:    # XFLTD
    type: http
    url: "订阅地址"
  provider3:    # 魔戒
    type: http
    url: "订阅地址"
  provider5:    # 精靈學院
    type: http
    url: "订阅地址"

proxy-groups:
  - name: "✈️ XFLTD(自动/手动)"
    use:
      - provider1     # 引用 provider1 的节点
  - name: "🔮 魔戒(自动/手动)"
    use:
      - provider3
```

**直接内联模式（单订阅）：**
```yaml
proxies:
  - { name: "节点名", ... }

proxy-groups:
  - name: "代理组"
    proxies:
      - "节点名"

rules:
  - DOMAIN-SUFFIX,google.com,代理组
```

### 缓存数据

`providers/<profile_id>/proxies/` - 各节点缓存
`providers/<profile_id>/rules/` - 规则集缓存

## 端口

| 端口 | 用途 |
|------|------|
| 7890 | HTTP/SOCKS5 混合代理 |
| 7891 | SOCKS5 代理 |
| 1053 | DNS |
| 9090 | 外部控制 API |

## 常用操作

### 手动重载配置
在 FlClash GUI 中切换到配置再切回，或重启 FlClash。

### 查看当前选中组
查看 `list.yml` 的 `selected` 字段。

### 从合并配置移除一个机场
1. 定位到 profiles 目录
2. 编辑对应的 .yaml 文件
3. 删除对应 provider 定义
4. 删除对应代理组引用
5. 从各故障转移组中移除引用
6. 在 FlClash 中重载配置

### 直接切换配置文件
`start_flclash.bat` 命令行中通过 `-f` 参数指定配置文件。

## 常见问题排查

### Android Edge Copilot 不可用（PC 正常）

**症状**：同一 FlClash 配置在 PC 上可以正常使用 Edge Copilot，但在 Android 手机上 Google 能访问、Copilot 报网络错误。

**根因**：Android Edge 检测到中国区域，使用 `cn.bing.com` 域名访问 Copilot。如果配置中有 `DOMAIN,cn.bing.com,DIRECT` 规则，Copilot 的请求会被直连，而其后端 API 需访问微软海外服务器。

**解决方案**：在覆写脚本中修复路由规则：
```javascript
// 将 cn.bing.com DIRECT 改为走代理
config["rules"] = config["rules"].map(r =>
  r === "DOMAIN,cn.bing.com,DIRECT" ? "DOMAIN,cn.bing.com,XFLTD" : r
);
// 添加 Copilot 核心 API 域名走代理
config["rules"].unshift(
  "DOMAIN-SUFFIX,copilot.microsoft.com,XFLTD",
  "DOMAIN-SUFFIX,edgeservices.bing.com,XFLTD",
);
```

**通用排查思路**：遇到"PC 能用、手机不能用"的代理问题时，先检查手机浏览器/App 是否使用不同的子域名（如 `cn.bing.com` vs `bing.com`），然后在覆写脚本中处理跨平台域名差异。

### OneDrive 无法登录/同步

**症状**：OneDrive 显示"正在登录"一直转圈，或备份扫描后提示"连接到 OneDrive 服务时遇到问题，请重试"。

**关键结论**：
- **OneDrive 必须走代理**（XFLTD/自动选择），直连（DIRECT）反而无法登录——微软服务在国内直连不稳定
- 与 Windows 小组件（天气/新闻）**可直连**相反，两类服务要区分处理

**排查步骤**：

1. **确认覆写脚本引用正确的分组名**（参考 XFLTD 实际配置，无 emoji 前缀：`自动选择`、`故障转移`、`XFLTD`）：
   ```
   报错 proxy group[...]: ... '♻️ 自动选择' not found
   → 说明引用了其他配置的分组名，改为实际存在的分组名
   ```

2. **检查实际路由链**（不要只看规则配置）：
   ```bash
   curl.exe -s http://127.0.0.1:9090/connections | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf-8'));for(const c of d.connections||[]){const m=c.metadata||{};if(/onedrive|sync/i.test(m.process||'')){console.log(m.host,'→',(c.chains||[]).join(' → '))}}"
   ```
   应看到 `OneDrive直连/微软服务 → 自动选择 → 具体节点` 的链路。若 `storage.live.com`、`g.live.com` 走代理，是预期行为（OneDrive 需要代理）。

3. **确认 OneDrive 进程实际通过代理连接**：
   ```bash
   netstat -ano | Select-String ":7890.*ESTABLISHED"
   ```
   查找 OneDrive.exe 的 PID 是否有到 7890 的连接。

4. **覆写脚本验证**（不依赖 FlClash 加载）：
   ```bash
   node --check "<script>.js"
   node -e "const fs=require('fs');const src=fs.readFileSync('<script>.js','utf8');const main=new Function(src+'\nreturn main;')();const cfg=main({proxies:[],'proxy-groups':[],rules:[]});console.log(JSON.stringify(cfg,null,2))"
   ```

**覆盖域名**（放规则最前面）：`onedrive`、`onedrive.com`、`live.com`（含 `storage.live.com`/`g.live.com`）、`live.net`、`microsoftonline.com`、`office.com`、`office365.com`、`microsoftpersonalcontent.com`、`sharepoint.com`、`sharepointonline.com`、`msauth.net`、`msftconnecttest.com`。

**覆写脚本位置**：`%APPDATA%\com.follow\clash\scripts\<script_id>.js`（脚本 ID，不是 profile ID）。



### Steam 专属分组 + 节点切换

**场景**：Steam 下载慢，需要为 Steam 单独控制走线（默认直连，需要时切代理节点）。

**方案**：覆写脚本创建「🎮 Steam 下载」select 组 + 域名规则置顶：
```javascript
const steamGroupName = "🎮 Steam 下载";
if (!config["proxy-groups"].some(g => g.name === steamGroupName)) {
  config["proxy-groups"].push({
    name: steamGroupName, type: "select",
    url: "http://www.gstatic.com/generate_204", interval: 120,
    proxies: ["DIRECT", "🇭🇰 香港", "🇸🇬 新加坡", "🇯🇵 日本", "🇺🇸 美国", "🇨🇦 加拿大", "XFLTD", "自动选择"],
  });
}
config["rules"].unshift(
  "DOMAIN-SUFFIX,steampowered.com,🎮 Steam 下载",
  "DOMAIN-SUFFIX,steamcontent.com,🎮 Steam 下载",
  "DOMAIN-SUFFIX,steamstatic.com,🎮 Steam 下载",
  "DOMAIN-SUFFIX,steamserver.net,🎮 Steam 下载",
  "DOMAIN-SUFFIX,steamcommunity.com,🎮 Steam 下载",
  "DOMAIN-KEYWORD,steamusercontent,🎮 Steam 下载",
);
```
**select 组默认选中 = proxies 列表第一个**。要"默认直连"就把 DIRECT 放第一位。

**9090 API 切换节点**（curl 传 emoji 节点名会 400 "Body invalid"，必须用 Python 脚本文件）：
```python
# switch_node.py
import json, urllib.request, urllib.parse
url = 'http://127.0.0.1:9090/proxies/' + urllib.parse.quote('XFLTD')
body = json.dumps({"name": "🇺🇸 美国"}).encode('utf-8')
req = urllib.request.Request(url, data=body, method='PUT')
req.add_header('Content-Type', 'application/json')
urllib.request.urlopen(req, timeout=5)  # 204 = 成功
```

**节点测速选优**（必须 `-L` 跟随重定向，否则 GitHub 302 测到 0）：
```bash
curl -s -L -x http://127.0.0.1:7890 -o file --max-time 10 <下载URL>  # 看 10 秒下载量
```
**经验**：GitHub 大文件用美国/加拿大节点最快（实测 28.8MB/10s vs 香港 2.3MB/10s）；谷歌类用香港/日本（延迟 77-80ms）。

### 国外站点走代理打不开（DNS fallback 被墙）

**症状**：某国外站点（微软/谷歌/GitHub）直连正常但走 FlClash 代理失败（TLS 握手失败/超时）；FlClash 内部 DNS 解析该域名超时。

**根因**：生效 profile 的 `dns.fallback: [1.1.1.1, 8.8.8.8]` 是明文 UDP:53，国内被 GFW 阻断。`fallback-filter: {geoip: CN, geosite: [gfw]}` 使所有解析结果非中国 IP 的域名触发 fallback → 超时 → 整体解析失败。

**诊断三步**：
```bash
# 1. 对比直连 vs 代理（直连正常 + 代理失败 = FlClash 内部问题）
curl.exe -s -o NUL -w "%{http_code}" --max-time 8 --noproxy "*" "https://example.com"
curl.exe -s -o NUL -w "%{http_code}" --max-time 8 --proxy http://127.0.0.1:7890 "https://example.com"

# 2. 测 FlClash 内部 DNS（国内正常 + 国外超时 = fallback 问题）
curl.exe -s "http://127.0.0.1:9090/dns/query?name=www.baidu.com"       # 返回 IP
curl.exe -s "http://127.0.0.1:9090/dns/query?name=www.microsoft.com"     # context deadline exceeded

# 3. 确认 fallback DNS UDP:53 被墙（ReceiveTimeout 后超时）
```

**修复**：覆写脚本 `%APPDATA%\com.follow\clash\scripts\<script_id>.js` 中增量修改 fallback（不整体替换 dns）：
```javascript
function main(config) {
  if (config["dns"]) {
    config["dns"]["fallback"] = ["https://doh.pub/dns-query"];  // 国内可直连，实测 200
  }
  return config;
}
```
改后在 FlClash GUI 重新应用配置触发覆写脚本重跑。

**注意**：GUI `shared_preferences.json` 中 `overrideDns:false` 时，GUI 里的 DNS 设置不生效，覆写脚本是唯一入口。FlClash 数据实际在 `%APPDATA%\com.follow\clash\`（含 `scripts/`、`profiles/`、`shared_preferences.json`、`config.yaml`），`.config\clash\` 是内核/启动配置。
