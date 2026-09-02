### External Controller（外部控制器）

FlClash 支持通过外部控制器 API（端口 9090）程序化控制 Clash 内核。

**架构**：
- FlClash.exe（GUI 前端）↔ FlClashCore.exe（mihomo 内核，端口 9090）
- FlClashCore 通过命名管道 `\\.\pipe\FlClashCore_6430` 与 GUI 通信
- 配置存储在 FlClash 内部数据库（Flutter 持久化存储），无直接可编辑的配置文件

#### 开启方式

FlClash → 工具 → 基本配置 → 外部控制器 → 开启

#### API 接口

基础地址：`http://127.0.0.1:9090`

| 接口 | 方法 | 说明 |
|------|------|------|
| `/proxies` | GET | 获取所有代理组和节点 |
| `/proxies/:name` | GET | 获取指定代理组详情 |
| `/proxies/:name` | PUT | 切换代理组选中的节点 |
| `/proxies/:name/delay` | GET | 测试节点延迟（需 `?timeout=5000`） |
| `/connections` | GET | 获取当前连接 |
| `/connections` | DELETE | 关闭所有连接 |
| `/configs` | PATCH | 部分更新配置 |
| `/configs` | PUT | 完整覆盖配置 |
| `/rules` | GET | 获取规则列表 |
| `/traffic` | GET | 实时流量（SSE） |
| `/logs` | GET | 实时日志（SSE） |

#### 使用示例

```bash
# 获取所有代理组
curl http://127.0.0.1:9090/proxies

# 切换手动切换到指定节点
curl -X PUT http://127.0.0.1:9090/proxies/%F0%9F%9A%80%20%E6%89%8B%E5%8A%A8%E5%88%87%E6%8D%A2 \
  -H "Content-Type: application/json" \
  -d '{"name": "🇭🇰 香港 01 [V]"}'

# 测试节点延迟
curl "http://127.0.0.1:9090/proxies/%F0%9F%87%AF%F0%9F%87%B5%20%E6%97%A5%E6%9C%AC(%E8%87%AA%E5%8A%A8/%E6%89%8B%E5%8A%A8)/delay?timeout=5000&url=http://www.gstatic.com/generate_204"
```

#### Python 脚本示例

```python
import requests

BASE = "http://127.0.0.1:9090"

# 获取代理组列表
proxies = requests.get(f"{BASE}/proxies").json()

# 找到手动切换组并切换节点
group_name = "🚀 手动切换"
requests.put(f"{BASE}/proxies/{group_name}", json={"name": "🇭🇰 香港 01 [V]"})
```

#### 注意事项

- 需在 FlClash 设置中手动开启外部控制器
- 默认端口 9090，可通过配置修改
- API 无认证，局域网内需注意安全
- 代理组名称需 URL 编码（emoji 需 UTF-8 编码）

#### 实战踩坑（2026-08 验证）

1. **Windows 下 curl 传 emoji 节点名会 400 "Body invalid"**：
   ```bash
    # ❌ Windows PowerShell 下失败（控制台编码把 emoji 字节搞坏）
    curl -X PUT http://127.0.0.1:9090/proxies/XFLTD -d '{"name":"🇺🇸 美国"}'
    # → {"message":"Body invalid"} HTTP 400
    ```
   **解法**：用 Python 脚本文件（UTF-8 写入临时文件再执行），不要内联 curl：
   ```python
   # switch_node.py
   import json, urllib.request, urllib.parse
   url = 'http://127.0.0.1:9090/proxies/' + urllib.parse.quote('XFLTD')
   body = json.dumps({"name": "🇺🇸 美国"}).encode('utf-8')
   req = urllib.request.Request(url, data=body, method='PUT')
   req.add_header('Content-Type', 'application/json')
   urllib.request.urlopen(req, timeout=5)  # 204 = 成功
   ```
   Python 内联 `-c` 也会遇到 PS 引号转义问题，务必写文件。

2. **测节点实际下载速度必须 `-L` 跟随重定向**：
   ```bash
   # ❌ 直接下载测到 0（GitHub release 302 到 objects.githubusercontent.com）
   curl -x http://127.0.0.1:7890 -o NUL -w "%{speed_download}" URL
   # ✅ 加 -L 才真实
   curl -s -L -x http://127.0.0.1:7890 -o file --max-time 10 URL
   ```
   GitHub release 的 302 目标域名不同，不跟随重定向测不到真实速度。

3. **节点速度差异巨大，按目标选节点**：
   - GitHub（CDN 在美国）：美国/加拿大节点最快（实测 28.8MB/10s vs 香港 2.3MB/10s）
   - 谷歌/通用：香港/日本延迟低（77-80ms）
   - 下载大文件前先对各节点跑 10s 测速选最优

4. **判断节点是否真正生效**：切换后查 `/connections`，确认连接的 `chains` 里包含预期节点链（如 `['🇺🇸 美国 01 [V]', 'XFLTD']`），以及 `/rules` 中命中规则的 hitCount 增长。

#### Provider 类型检测

通过 API 可以检测每个 provider 的类型和订阅信息：

```bash
# 获取所有 provider 列表及类型
Invoke-RestMethod -Uri "http://127.0.0.1:9090/providers/proxies" -Method GET

# 获取单个 provider 详情（含订阅信息）
Invoke-RestMethod -Uri "http://127.0.0.1:9090/providers/proxies/<provider-name>" -Method GET
```

**vehicleType 字段含义**：

| vehicleType | 说明 | 行为 |
|-------------|------|------|
| `File` | 本地文件 provider | 从本地 .yaml/.yml 文件加载，**不会自动远程更新**，需在 UI 手动刷新 |
| `HTTP` | 在线订阅链接 | 从远程 URL 拉取，可自动更新 |
| `Compatible` | 默认/内存分组 | 内置代理组，非订阅 provider |

**subscriptionInfo 字段**：

```json
{
  "Upload": 4839046904,      // 已上传流量（bytes）
  "Download": 74033264780,   // 已下载流量（bytes）
  "Total": 418759311360,     // 总流量（bytes）
  "Expire": 0                // 到期时间（Unix timestamp），0 = 长期有效
}
```

**updatedAt 字段**：节点最后刷新时间，判断 provider 是否过期的关键指标。
