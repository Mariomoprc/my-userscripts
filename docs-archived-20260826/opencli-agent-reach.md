# OpenCLI & Agent Reach

- **OpenCLI 来源**：https://github.com/jackwener/opencli
- **Agent Reach 来源**：https://github.com/Panniantong/Agent-Reach
- **OpenCLI 安装路径**：npm global (`npm install -g @jackwener/opencli`)
- **Agent Reach skill 路径**：`~/.config/opencode/skills/agent-reach/`
- **OpenCLI 版本**：v1.8.6（2026-07-27）
- **用途**：让 AI Agent 通过真实浏览器（Edge/Chrome）操作已登录的社交平台

## 架构

```
用户请求（"帮我搜小红书"）
    ↓
Agent Reach SKILL.md（路由层）
    ├── 平台判断 → 路由到对应后端
    ├── 零配置：Exa / GitHub / V2EX / B站基础 / YouTube / RSS
    └── 需登录态：小红书 / Reddit / Facebook / Instagram / Twitter
              ↓
OpenCLI CLI（执行层）
    ├── browser 命令 → Browser Bridge 扩展 → 浏览器
    └── 独立 CLI 命令 → 直接调用平台 API
```

## 安装

### 1. 安装 OpenCLI CLI

需要 Node.js >= 18。

```powershell
npm install -g @jackwener/opencli
```

安装后 daemon 自动启动，默认端口 19825。

### 2. 安装 Browser Bridge 扩展

**Chrome Web Store：**
搜索 "OpenCLI" 安装即可，Edge 也可以安装 Chrome Web Store 的扩展。

**手动安装：**
从 https://github.com/jackwener/opencli/releases 下载 `opencli-extension-v{version}.zip`，解压后：
1. 打开 `chrome://extensions`
2. 开启开发者模式
3. 加载解压的扩展文件夹

### 3. 验证连接

```powershell
opencli doctor
```

期望输出：
```
[OK] Daemon: running on port XXXXX (vX.X.X)
[OK] Extension: connected (profile: xxxxxxxx)
[OK] Connectivity: passed
```

### 4. 安装 Agent Reach skill

将 SKILL.md 和 references 复制到 OpenCode skills 目录：

```
~/.config/opencode/skills/agent-reach/
├── SKILL.md
└── references/
    ├── search.md
    ├── social.md
    ├── career.md
    ├── dev.md
    ├── web.md
    └── video.md
```

## 可用平台

| 平台 | 访问方式 | 登录需求 |
|------|---------|---------|
| Exa 搜索 | MCP 工具 | 无（API Key） |
| GitHub | gh CLI / MCP | 无（已认证） |
| V2EX | 公开 API | 无 |
| B站 | bili-cli（若无则走 OpenCLI browser） | 无需登录（基础搜索） |
| YouTube | yt-dlp | 无 |
| RSS | curl | 无 |
| 小红书 | `opencli xiaohongshu` | Edge 登录态 |
| Reddit | `opencli reddit` | Edge 登录态 |
| Facebook | `opencli facebook` | Edge 登录态 |
| Instagram | `opencli instagram` | Edge 登录态 |
| Twitter/X | `opencli browser` 或 twitter-cli | Edge 登录态（browser）或 Cookie（CLI） |

## 关键命令

```powershell
# 诊断
opencli doctor

# 重启 daemon（扩展会自动重连）
opencli daemon restart

# 查看已注册命令
opencli list

# 社交媒体（复用 Edge 登录态）
opencli xiaohongshu search "query" -f yaml
opencli reddit search "query" -f yaml
opencli facebook search "query" -f yaml
opencli hackernews top --limit 5
opencli bilibili hot --limit 5
```

## Steam Workshop 订阅（2026-08-08 实测，见 LRN-20260808-132/134/135）

用 OpenCLI 浏览器（Edge 登录态）订阅 PZ/游戏 Workshop mod 的完整流程：

```powershell
# 1. 导航到 mod 详情页
opencli browser <session> open "https://steamcommunity.com/sharedfiles/filedetails/?id=<ID>"

# 2. 检查订阅状态（class 含 "toggled" = 已订阅）
#    用 eval 读按钮 onclick 确认函数签名
#    onclick="SubscribeItem( '<id>', '108600' )"

# 3. 订阅：opencli click 的合成点击不触发 Steam 的 onclick，必须 eval 调用
#    eval 代码：() => { SubscribeItem('<id>', '108600'); return 'called'; }

# 4. 有必需依赖的 mod：点击后弹"额外必需物品"框，必须再点"全部订阅"
#    按钮是 div.btn_blue_steamui（DIV 非 a/button）：
#    eval 代码：() => { document.querySelectorAll('.newmodal_buttons div.btn_blue_steamui').forEach(el=>{ if((el.textContent||'').trim()==='全部订阅') el.click(); }); }

# 5. 验证：等 Steam 下载（检查 workshop\content\108600\<id> 目录 + appworkshop_108600.acf）
#    诊断：opencli browser <session> network --since 60s 看订阅请求是否发出
```

**关键坑**（全在 steam-tools skill「常见错误」）：
- JS 传参含中文/正则/`?` 会被 PowerShell 转义破坏 → **写临时文件再 `Get-Content -Raw` 传给 eval**
- `SubscribeItem()` 对带必需依赖的 mod 静默失败 → 必须处理"全部订阅"弹窗
- opencli eval 不支持 async Promise 返回值 → 用同步 XHR/两步法

## 注意事项

- 使用 OpenCLI browser 命令时，平台必须已在浏览器中登录
- daemon 自动启动，无需手动管理
- 切换 Edge 浏览器时无需重复配置
- Agent Reach skill 中引用的 `agent-reach doctor` 命令（Python CLI）在 OpenCode 环境中未安装，请使用 `opencli doctor` 替代
