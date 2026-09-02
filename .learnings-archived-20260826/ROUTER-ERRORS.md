# 软路由错误记录（ROUTER-ERRORS）

> 本文件由**软路由 OpenClash 环境**产生，经 syncthing 同步到笔记本。每条带 `Env: softrouter-openclash` 标记，与笔记本端 `ERRORS.md` 区分。
> 每条同时标 `Scope: router-only | laptop-only | cross-env`（适用范围）。
> 编号格式：`ERR-YYYYMMDD-NNN`（RNN 在 ROUTER 文件内自增）。

---

## [ERR-20260808-021] egress-ip-as30058-bad-reputation-blocks-free-render-services

**Logged**: 2026-08-08T22:30:00+08:00
**Priority**: high
**Status**: resolved
**Env**: softrouter-openclash
**Area**: network

### Error
软路由出口 IP（AS30058，山东机房/数据中心）被多家"无 key 免费渲染服务"按 IP 信誉拉黑：
```
r.jina.ai 匿名           → 401 AuthenticationRequiredError (blocked ... bad network reputation (AS30058))
Firecrawl Keyless 无key   → 403 "your IP address looks suspicious"
anybrowse 免费            → 402 Free tier limit reached (50 scrapes/day)  ← 公共 IP 池已耗尽
wayback (archive.org)     → 429 Too Many Requests（IP 级限流）
```

### Context
- 软路由出口走 OpenClash，出口 IP 固定为 AS30058（机房 IP 段，信誉差）
- 所有按 IP 信誉限流的免费服务（无 key 模式）对软路由都不可用，与目标页面无关（对 example.com 同样被拒）
- anybrowse 的"50 scrapes/day"是**公共 IP 池共享**额度，首次调用即提示已用完，不可依赖

### Resolution
1. **注册账号带 key**：Firecrawl 免费 key 实测成功绕开（按账号限流，不再看 IP），抓知乎完整正文（LRN-20260808-022）。r.jina.ai 同理需注册免费 key（一次性 1,000 万 token，不按月恢复）
2. 备选：Cloudflare Worker 自建代理（从 CF 边缘网络出口抓取，IP 信誉好），已调研未搭建
3. 主力策略：curl 直抓 SSR/静态站（零成本）+ `tavily extract advanced`（云端渲染、带 key 无此问题）
4. 防御：优先 webfetch/curl（本地出口），渲染类服务统一走带 key 账号通道

### Metadata
- Source: error
- Tags: egress-ip, reputation, as30058, firecrawl, rjina, anybrowse, scraping
- Reproducible: yes

---

## [ERR-20260809-001] notebook-opencode-db-compact-replacement-corrupted-db

**Logged**: 2026-08-09T18:30:00+08:00
**Priority**: high
**Status**: resolved
**Env**: softrouter-openclash
**Area**: opencode-maintenance

### Error
清理笔记本 opencode.db 膨胀时，用压缩副本（compacted3，3.6MB）替换主库后库损坏、服务崩溃：
```
PRAGMA integrity_check → SQLITE_CORRUPT: "Tree N page M: btreeInitPage() returns error code 11"
当前 opencode.db 仅剩 5 会话 / 77 message，历史几乎删光
HTTP 4096 无响应（serve 未监听），但 5 个 OpenCode 进程残留
```

### Context
- 前序 LRN-20260809-004 清理任务执行时：先杀进程再删原库、替换 compacted3，随后启动 serve
- 但替换出的 3.6MB 库**实际损坏**（比 compacted3 少一个会话、freelist 对不上，疑似替换时进程/WAL 未彻底干净，WAL 残留 206MB 与 3.6MB 主库不一致）
- 备份齐全是唯一救回数据的因素：pre-cleanup-mod-20260809(378MB/20会话)、backup(351MB/13会话)、1319(1.49GB/39会话) 等 8 个备份

### Resolution
1. **先保全现场**：把损坏的 opencode.db + WAL + shm 复制为 `.corrupt-snapshot-*` 存档，再动任何文件
2. **停服**：`Get-Process -Name OpenCode | Stop-Process -Force`，确认无残留进程
3. **工作副本**：把 integrity `ok` 的 `pre-cleanup-mod-20260809` 复制为独立工作库，在上面做清理（绝不在原备份上直接改）
4. **清理**：SQL 删除 8 个临时会话（7 个 subagent + 1 个 review），先删 `event_sequence`（级联 event，该表无 FK 到 session 不会自动级联），再删 `session`（级联 message/part/todo/session_message/session_input/session_context_epoch）；删前检查 parent_id 孤儿引用置 NULL
5. **VACUUM + integrity_check 验证**后，停进程替换主库（删旧 db/wal/shm → Move 工作副本为 opencode.db）
6. **用计划任务重启** serve，验证 `HTTP 4096 → 401`（需认证即正常）

### Lesson
- **替换主库前必须先停干净所有 opencode 进程并删掉旧 wal/shm**，否则 WAL 与主库不一致直接损坏
- 备份库多且全时，优先选 integrity `ok` 且含事故前完整历史的最接近快照恢复，而非最新（最新可能已删过头）
- 所有对库的写操作先在副本上演练 + integrity 验证，通过后才替换

### Metadata
- Source: error
- Tags: opencode-db, sqlite-corrupt, compaction, recovery, notebook
- Reproducible: no

---

## [ERR-20260809-001] opencode-local-mcp-file-env-interpolation-not-supported

**Logged**: 2026-08-09T14:40:00+08:00
**Priority**: high
**Status**: resolved
**Env**: softrouter-openclash

### 现象
opencode.json 里 local MCP 配置 `"env": {"GEMINI_API_KEY": "{file:/root/.gemini_key}"}`，`opencode mcp list` 显示 `gemini failed / Connection closed`，log 里 gemini/context7/tavily 三个 npx 型 MCP 全 failed（firecrawl 正常）。

### 根因
opencode local MCP 的 `env` 字段中 `{file:path}` **不插值**，原样字符串传给子进程；`{env:VAR}` 也只读 opencode 进程自身已有的环境变量（如 docker 注入的 EXA_API_KEY），不会去读任意变量。gemini MCP 启动时 `validateConfig()` 要求 GEMINI_API_KEY，拿到字面量 `{file:...}` 即抛 `Configuration validation failed` 崩溃。

### 修复
改用 firecrawl 已验证的 bash 注入模式（在 command 里读文件后 exec），实测 connected：
```json
"gemini": {
  "type": "local",
  "command": ["bash", "-c", "export GEMINI_API_KEY=\"$(cat /root/.gemini_key)\"; export GEMINI_IMAGE_OUTPUT_DIR=/root/gemini-output; exec gemini-mcp"],
  "enabled": true,
  "timeout": 120000
}
```
关键命令：`opencode mcp list` 可实时验证连接状态（独立进程重新加载配置，无需重启 serve）。

### 教训
- 以后配 local MCP 的 secret：一律用 `bash -c "export K=\"$(cat /path)\"; exec <cmd>"` 模式，别用 `{file:...}`/`{env:...}` 插值（仅 remote headers 支持插值）
- npx 型 MCP 首次启动慢（拉包），建议 `npm install -g` 后用 bin 命令，避免 30s timeout

---

## [ERR-20260809-022] chromium-proxy-server-url-embedded-auth-407

**Logged**: 2026-08-09T22:45:00+08:00
**Priority**: high
**Status**: resolved
**Env**: softrouter-openclash
**Area**: tablet-proxy

### Error
给平板 headless Chromium 加 `--proxy-server=http://Clash:vOknt8m0@192.168.3.100:7890`（URL 内嵌认证），结果**所有请求全失败**（连 example.com 都 `chrome-error://chromewebdata/`），而同凭据 curl 走代理正常（google 200）。

### 根因
Chromium 的 `--proxy-server` 参数**不支持 URL 内嵌 userinfo 认证**（user:pass@ 被忽略/解析异常），headless 无认证对话框，所有经 7890 的请求被 OpenClash Basic 认证 407 拒绝。

### 修复
1. 关闭 OpenClash 代理认证：`uci set openclash.@authentication[0].enabled='0'` + commit + `/etc/init.d/openclash restart`（备份 `/root/openclash.uci.bak.20260809224251`）
2. Chromium 参数去掉 userinfo：`--proxy-server=http://192.168.3.100:7890`

### 教训
- **Chromium/Chrome 命令行代理不支持内嵌密码**，带认证的 HTTP/SOCKS 代理在 headless 下无法直接配；要么代理端免认证，要么另想剥认证方案
- 排查代理是否生效：先 curl `-x` 同参数验证代理本身通不通，再区分"代理不通" vs "Chromium 不认"（本案例 curl 通、Chromium 全 407）
- 加了代理后务必用 bypass-list 保国内站直连，否则海外机房 IP 会让 Google/Bing 全部触发验证码（见 LRN-20260809-009）

---

## [ERR-20260809-002] npx-launched-mcp-timeout-fix-global-bin

**Logged**: 2026-08-09T14:50:00+08:00
**Priority**: medium
**Status**: resolved
**Env**: softrouter-openclash

### 现象
opencode local MCP 用 `npx -y @upstash/context7-mcp` / `npx -y @mcptools/mcp-tavily` 启动，`opencode mcp list` 显示 `failed / Operation timed out after 30000ms`；但包本身没问题（全局已装 bin，直接跑 INIT/工具全 OK）。

### 根因
非"docker 不能跑 MCP"（exa/firecrawl 一直 connected）。是 `npx -y` 启动层在这容器里不稳：npx 先查 registry/下载再 exec，stdio 管道握手时序异常导致 opencode 30s 超时。实测直接命令 2s 内握手成功。

### 修复
全局已装好 bin（`context7-mcp` / `mcp-tavily` / `exa-mcp-server`），配置 command 直接写 bin 名去掉 `npx -y`：
```json
"context7": { "command": ["context7-mcp"], ... },
"tavily": { "command": ["mcp-tavily"], ... }
```
`opencode mcp list` 验证全 connected。

### 教训
- local MCP 一律优先用**已全局安装的 bin 命令**，避免 `npx -y`（本容器 npx 启动 MCP 握手不稳）
- 诊断顺序：`opencode mcp list` 看状态 → 直接跑 bin 测 INIT → 换启动方式

---

## [ERR-20260811-023] host-backup-tar-leaks-opencode-auth-json

**Logged**: 2026-08-11T12:00:00+08:00
**Priority**: high
**Status**: resolved
**Env**: softrouter-openclash
**Area**: backup

### Error
宿主旧备份 `/mnt/usb4-1/Backup/opencode-config-20260809-221914.tar.gz` 内包含 `opencode/auth.json` 和 `opencode/data/auth.json`（opencode API key 明文），因 robocopy/tar 默认包含隐藏文件而泄露。

### Context
- 旧包是手动 tar 生成，无排除规则，把配置目录下的 auth.json（两个位置）都打进去了
- 新备份脚本 `/root/opencode-backup.sh` 已排除 `opencode/auth.json`、`opencode/data`、`node_modules`、`.git`、`*.stversions*`、`*.bak*`，生成干净包仅 780K
- 旧泄露包已移至 `Backup/quarantine/`；cron 每日 04:00 自动备份，保留最近 7 份
- ⚠️ 该 API key 曾在明文 tar 包中存在 → 建议下次轮换 key（auth.json 用环境变量 OPENCODE_API_KEY 或更新值）

### Suggested Action
- 定期用 `tar -tzf <包> | grep -i auth.json` 复检备份内容
- 轮换泄露过的 API key

---

## [ERR-20260824-001] mcp-binaries-missing-after-container-rebuild

**Logged**: 2026-08-24T22:50:00+08:00
**Priority**: high
**Status**: resolved
**Env**: softrouter-openclash
**Area**: mcp

### Error
opencode.json配置了5个MCP（exa、context7、github、tavily、firecrawl），但web界面显示：
- exa MCP：连接失败
- github MCP：token expired or invalid
- context7 MCP：服务器连接失败
- "My Stars"插件不可用

### Context
- 容器重建后，npm全局包未安装
- context7-mcp、mcp-tavily、firecrawl-mcp二进制文件不存在于PATH中
- exa和github是remote类型MCP，配置正确，key/token有效
- local类型MCP（context7、tavily、firecrawl）因二进制缺失无法启动

### Resolution
1. 安装缺失的MCP二进制：
   ```bash
   npm install -g @upstash/context7-mcp @mcptools/mcp-tavily firecrawl-mcp
   ```
2. 验证安装：
   ```bash
   which context7-mcp mcp-tavily firecrawl-mcp
   ```
3. 重启opencode serve：
   ```bash
   pkill -f "opencode serve"
   opencode serve --hostname 0.0.0.0 --port 4096 > /tmp/opencode.log 2>&1 &
   ```
4. 验证health：
   ```bash
   curl -s "http://192.168.3.100:4096/api/health" -H "Authorization: Basic ..." → {"healthy":true}
   ```

### Lesson
- 容器重建后必须检查MCP二进制是否安装（npm全局包不随镜像保留）
- 诊断顺序：检查`which <mcp-binary>` → 测试初始化 → 重启opencode serve
- remote MCP（exa、github）配置正确时通常自动连接，local MCP依赖本地二进制

### Metadata
- Source: error
- Tags: mcp, npm, container-rebuild, binary-missing
- Reproducible: yes（容器重建后必现）
