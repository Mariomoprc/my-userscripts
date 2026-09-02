# MEMO（笔记本备忘录）

对话中出现**有长期价值的信息**（配置变更、决策、偏好、账号/IP/目录等）时，AI **自动**追加到这里；用户说"记住 XX"也立即写。每条一行，短而具体，可加标签。

**格式**：`- @YYYY-MM-DD [笔记本] <内容> #标签`

**检索**：用户问"以前记住的 XX"时，先 grep 本文件 + 软路由端 `ROUTER-MEMO.md` 再回答。

---

- @2026-08-10 [笔记本] 初始化本备忘录文件 #备忘
- @2026-08-10 [笔记本] 小黑盒登录墙突破：Jina Reader + API link/tree 可拿未登录正文，imgheybox CDN 图片直连；mod 中文名需搜索匹配 Steam Workshop（评论区常带英文名线索） #经验 #小黑盒
- @2026-08-10 [笔记本] opencode-tray.ps1 需显式注入 GITHUB_PERSONAL_ACCESS_TOKEN/GITHUB_TOKEN（与 OPENCODE_SERVER_PASSWORD 同理），否则计划任务启动的 serve 进程读不到 User env → github MCP 连不上 #配置 #MCP #坑
- @2026-08-10 [笔记本] PZ 全面优化：JVM 统一 12G ParallelGC（json+bat，bat 去 ZGC）、default.txt 51→31 mod 清 14 个失效引用、AutoLoot PerfMode 0→200、ModernStatus 高频降频 300ms、DynamicBackpacks 裸%→全角％；ERROR 1272→6，31 mod 全加载无崩溃。备份 *.bak-20260810-144509 #游戏 #优化 #PZ
- @2026-08-10 [笔记本] opencode.jsonc 顶层添加 model=opencode-go/deepseek-v4-flash，固定 DS V4 Flash 为主力模型 #配置 #模型
- @2026-08-10 [笔记本] 识图插件 opencode-vision（JochenYang/opencode-vision）已学习并记录到 docs/opencode-vision.md：本机 subagent 模式，发图由 @image-reader 子代理用 mimo-v2.5 分析，无需 VISION_API_KEY #识图 #配置 #服务
- @2026-08-10 [笔记本] microsoftedge.microsoft.com/addons 打不开根因：uhf.microsoft.com(Akamai CDN)有AAAA记录，本机无公网IPv6(Tailscale ULA只有fd7a地址)，IPv6优先级40>IPv4的35致浏览器优先走IPv6超时。已修复：netsh interface ipv6 set prefixpolicy ::ffff:0:0/96 46 4（IPv4优先级提到46，永久） #网络 #配置
- @2026-08-11 [笔记本] 安装 Windows-MCP 0.8.5（uv tool install，exe 在 ~\.local\bin\windows-mcp.exe），已配入 opencode.jsonc（environment: ANONYMIZED_TELEMETRY=false + WINDOWS_MCP_DISABLE_FLASH=1，--exclude-tools PowerShell,Registry 排除高风险工具），配套 skill windows-computer-use 已装；3 用例测试全过。注意：App.executable 需绝对路径、Wait.duration 单位秒、Type 需 loc/label、Clipboard mode 用 get/set、Process mode 用 list/kill、calc 实际进程名 CalculatorApp.exe #配置 #服务 #工具
- @2026-08-11 [笔记本] windows-mcp + 识图插件结合已验证：主模型无视觉看不了 MCP 返回的截图（vision-helper 插件只处理用户粘贴图，不处理 tool 图片结果，直接报 Cannot read image），正确用法是委托 @image-reader 子代理（mimo-v2.5 原生视觉）直接调 windows-mcp_Screenshot 截图并自己看图返回中文描述；日常观察仍用 Snapshot 文本树 #工具 #配置 #经验
- @2026-08-11 [笔记本] 视觉闭环固化完成：agents/image-reader.md 加 'windows-mcp_*: allow' 权限 + 实时截图看图节（Screenshot→直看→失败回退 Snapshot）；skills/windows-computer-use/SKILL.md 加《看图（视觉闭环）》节（含委托模板，日常仍用 Snapshot）。opencode agent list 已确认新权限解析成功，重启 TUI 后完全生效 #配置 #工具
- @2026-08-11 [笔记本] windows-mcp 控制真实浏览器已验证（无需任何插件）：App switch Edge→Snapshot use_dom=True 读真实页面 DOM；导航用 Ctrl+L 聚焦地址栏→Clipboard set URL→Ctrl+V→Enter 最可靠（Type 强制要求 loc/label 不认焦点；浏览器 chrome 不进 DOM 树；use_dom=True 只读前台窗口，TUI 抢焦点时切完需立刻读） #工具 #经验
- @2026-08-11 [笔记本] 三层桌面控制架构确定（三工具全保留）：windows-mcp=桌面底座(UIA~0.5s/步)、OpenCLI browser=真实Edge浏览器通道(CDP亚秒级+登录态,session=edge绑定当前标签页)、Playwright=无头隔离。已固化进 windows-computer-use skill《工具分工路由》章。OpenCLI 实测：open/state/find --css/type(中文OK)/click/eval/keys/wait(仅selector/text/time/xhr/download)；bing 搜索框 Enter 被联想吞→用 eval form.submit() 提交 #配置 #工具 #架构
- @2026-08-11 [笔记本] windows-mcp 辅助 OpenCLI 协作模式已固化进 windows-computer-use skill：OpenCLI 管页面内、windows-mcp 管系统层（系统对话框 UIA 操作/跨应用 Clipboard 桥接/App 窗口管理/全桌面截图/Snapshot 验证/异常恢复）；示例：网页数据→Clipboard→Excel 粘贴→另存为对话框 UIA 填路径 #配置 #工具
- @2026-08-11 [笔记本] PZ(LWJGL) 主菜单无法被合成输入操作（实测）：mouse_event/SendInput/keybd_event/AttachThreadInput 强制聚焦全部被 DirectInput 层过滤，windows-mcp 对 LWJGL/OpenGL 游戏主菜单无效（UIA 也读不到）。截图/日志分析/文件修复仍可用。测 PZ 需用户手动点进游戏后接手 #工具 #限制 #游戏
- @2026-08-11 [笔记本] opencode 默认 subagent_depth=1，禁止嵌套子代理（executor→image-reader 报 Subagent depth limit reached），需在 opencode.json 调高后才有三层委托 #配置 #opencode
- @2026-08-11 [笔记本] 记忆自动化+备份大升级：①主模型固化 mimo-v2.5（规划/视觉直看）→长任务委托 executor(ds)→遇图嵌套 image-reader；②AGENTS.md 加模型分工/记忆写入归属/记忆库治理(300KB归档)/Promotion/review/skill抽取规则；③executor.md 禁止写记忆文件；④/记住 加 promotion+治理环节；⑤backup.ts 补顶层文件+agents+commands+plugins+真实 self-improving 源，加 /XA:SH 排除 .env/.git（robocopy 默认会复制隐藏文件，/XD /XF 对隐藏项无效需 /XA:SH）。OneDrive 备份验证通过 #配置 #记忆 #备份
- @2026-08-11 [笔记本] 记忆/备份二次修复：①backup.ts 排除杂项目录（chub-zh/cyoa/data/icons/images/projects/rpg/temp/tools 等），备份聚焦核心（顶层文件+agents+commands+plugins+skills+docs+learnings+self-improving），getContentHash 补 config.json；②LEARNINGS.md 384KB 超限→按日期归档最早126条(50%)到 archive/LEARNINGS-archive-20260811.md，活跃文件降至175KB(保留最新126条)。手动 robocopy 验证通过 #配置 #备份 #治理
- @2026-08-11 [笔记本] PZ模组排查：看到日志前缀（如[MSR_ShopData]）不要直接归到同名模组，要先从 default.txt 拿 mod ID → Workshop ID 映射，再查 mod.info 确认。MSR 商店报错实际来自 Shop Extension（3711250417），不是 MSR 本体（3632195933） #PZ #模组 #教训
- @2026-08-11 [笔记本] 主模型改回 deepseek-v4-flash（mimo 主对话太慢），executor 子代理已移除（长任务回归主模型直接执行），subagent_depth:2 保留（深层嵌套隔离上下文防膨胀）；遇图/截图仍委托 @image-reader（mimo 看图）；backup.ts 排除 syncthing 元数据（.stfolder/.stversions/.stignore） #配置 #架构
- @2026-08-11 [笔记本] PZ商店扩展%d刷屏修复改为AutoEverything翻译覆盖：还原了Workshop直接修改，在AutoEverything CN/EN UI.json加UI_Shop_BuyPrice等4键（纯文本去%d），default.txt把AutoEverything移到myspatialrefuge_shop之后（翻译合并后加载覆盖先加载，汉化排序置底同理）；管道here-string中文会变??，改Python脚本文件处理 #PZ #模组 #翻译
- @2026-08-11 [笔记本] opencode 1.18.14→1.18.16 升级（配置容错增强）；.env 加 OPENCODE_ENABLE_EXA=1（启用内置 Exa 搜索）+ OPENCODE_EXPERIMENTAL_PLAN_MODE=1（实验性 plan 模式）；exa MCP 改 remote（https://mcp.exa.ai/mcp?exaApiKey={env:EXA_API_KEY}）替代 npx local。调研结论：compaction 的 tail_turns 是官方有效字段；DCP 插件不推荐（1M 上下文收益低+AGPL+开发停滞转 Sleev） #配置 #升级
- @2026-08-11 [笔记本] opencode 平台调研结论（多源：GitHub releases 下载量/npm 213万周下载/官方文档/Reddit/中文社区）：①Windows 原生用户不小众（npm 主渠道+Win 是开发者第一大 OS），官方 170 个 windows commit 持续优化（创始人亲修 CLI 稳定性），自动升级在 Win 有已知 bug（#28072 更新后打不开/#6035 exe锁）故保持 npm 手动升级；②WSL 更稳但用户能力栈（windows-mcp 桌面控制/OpenCLI 浏览器/游戏/OneDrive/PowerShell）绑定 Win，迁移=退化，决策：保持 Windows 原生+opencode(193k stars 最受欢迎开源) #决策 #调研
- @2026-08-11 [笔记本] 软路由 opencode 容器 30 分钟前被 docker stop 手动停止（Exited 137/SIGKILL），已 docker start 恢复，4096 返回 401 正常 #服务 #修复
- @2026-08-11 [笔记本] 软路由 opencode 升级 1.18.15→1.18.16：重新构建镜像 opencode-arm64:1.18.16（node:20-slim + GitHub release linux-arm64 二进制），容器已重建并验证 4096 服务/API/session 正常；旧 1.18.16-keep 快照与 1.18.15 镜像保留作回退 #服务 #升级 #配置
- @2026-08-11 [笔记本] opencode-vision 插件发图不回复根因：vision-helper.ts 用 Bun.file/Bun.write，Node 加载插件时 Bun 未定义抛 ReferenceError，委托 image-reader 提示注入失败，模型卡死；已改 Node 原生 fs.stat/fs.writeFile 修复，重启后生效 #识图 #opencode #bug
- @2026-08-11 [笔记本] Tailscale 突然断网已修复：1.102 Windows 前端驱动 bug（会话事件触发 client disconnected→私钥清零→无 GUI 无法自愈），启动 tailscale-ipn.exe GUI 即恢复；建议开无人值守 tailscale up --unattended 防复发 #网络 #Tailscale #修复
- @2026-08-11 [笔记本] 软路由 opencode 1.18.16 修复：新镜像缺 ssh/scp/curl（原 1.18.15 Dockerfile 有 apt 装 openssh-client 等），容器内 apt 补装 + 恢复 /root/.ssh 软链到 data/ssh-backup/id_ed25519（opencode-container 密钥认证笔记本）+ ssh config 后 commit 成 opencode-arm64:1.18.16-full（579MB）重建容器；验证 ssh/scp 到笔记本 AUTH_OK、300KB 传输完整、4096 服务正常 #服务 #修复 #升级 #坑
- @2026-08-11 [笔记本] Tailscale 笔记本已开启 exit node 指向 istoreos 软路由（--exit-node=100.97.187.104 --exit-node-allow-lan-access --accept-dns=false），家里/外面通用，免手动改 WiFi DNS，经软路由 OpenClash 科学上网已验证生效；切换回直连：托盘→Exit node→None #网络 #Tailscale #配置
- @2026-08-11 [软路由] OpenClash 核心已从 alpha-g9ae1cc2 切到稳定版 Mihomo v1.19.29（经软路由本地代理 127.0.0.1:7890 下载 github release 替换 /etc/openclash/core/clash_meta，旧 alpha 备份 /root/clash_meta.alpha.bak）；另启用 zram swap 512MB（zram_enabled=1）防内存峰值 OOM #软路由 #OpenClash #配置
- @2026-08-11 [笔记本] 已删除 opencode 识图插件（agents/image-reader.md + plugins/vision-helper.ts + tools/vision.ts + docs/opencode-vision.md，备份在 %TEMP%\opencode\vision-plugin-backup），并清理 AGENTS.md 与 windows-computer-use SKILL 的引用；主模型 deepseek-v4-flash 无视觉，以后截图需用户文字描述 #opencode #插件 #决策
- @2026-08-12 [笔记本] 软路由 WD Elements 硬盘掉盘事件：根因=两 USB 口同时接硬盘+平板供电不足 + USB autosuspend 休眠卡死（SCSI Unit Not Ready/ASC 0x44）。解法：拔平板 + 智能插座断电重启彻底复位；已把 dockerd dataroot 改回 /mnt/usb4-1/docker、系统盘 /opt/docker 清理释放 881MB（83%→37%）、rc.local 加 USB 防挂起规则（vendor 1058 设 control=on/autosuspend=-1）。教训：平板用完即拔，避免与硬盘抢供电 #服务 #坑 #硬件 #配置
- @2026-08-12 [笔记本] Tailscale 连不上软路由问题排查：根因=7:13 USB 硬盘掉盘致软路由短暂不可达，Tailscale 服务连续重启 8 次失败后停止（access permissions / WFP 拦截日志），非软路由问题（OpenClash 7890 代理正常 200）。修复：服务手动启动恢复 + 服务设 AUTO_START + 托盘 GUI tailscale-ipn 加 HKCU Run 开机自启（用户要求托盘可控非服务无人值守）；exit node selected 指向 istoreos #网络 #修复 #服务
- @2026-08-12 [笔记本] Tailscale 开启 accept-routes：笔记本经软路由 subnet route(192.168.3.0/24) 可访问整个局域网；ExitNodeAllowLANAccess=true 保证本地子网走直连不被隧道劫持（实测到 192.168.3.100 仅 1 跳 2ms 直达） #网络 #配置
- @2026-08-12 [笔记本] 软路由 opencode 彻底移除识图功能（方案C）：删除 plugins/vision-helper.ts + tools/vision.ts + agents/image-reader.md（未在 opencode.json 启用过，是死文件），AGENTS.md 删 mimo 识图行，重启容器生效（agent list 仅 build），4096 正常。备份在容器数据目录 vision-plugin-backup。软路由与笔记本一致：主模型 deepseek-v4-flash 无视觉，发图需文字描述 #软路由 #插件 #决策
- @2026-08-12 [笔记本] opencode 懒人更新方案落地：①新增 /更新 命令（commands/更新.md）——自动升级 windows-mcp/playwright/context7/superpowers 等 MCP+工具+skill 检查，opencode 本体只检测版本提示不自动升（Windows exe 锁会 EBUSY 失败，官方 bug #6035/#13335/#28072）；②移除无效 auto-updater.ts 插件（本地 skill 无 _meta.json，插件实际零作用），备份在 %TEMP%\opencode；③opencode.jsonc 加 autoupdate:notify（有新版本时通知但不自动升） #配置 #升级 #命令
- @2026-08-12 [笔记本] 记忆保鲜机制上线：AGENTS.md 新增'记忆保鲜规则'，时效性信息写入带 #时效 标签+源URL，回答时先校验（Exa→Tavily→Firecrawl 降级，失败降级答旧+标注'未验证'）；笔记本与软路由两端 AGENTS.md 已同步 #记忆 #决策
- @2026-08-12 [笔记本] 软路由 SSH 免密修复：~/.ssh/config 新增 Host router/istoreos/192.168.3.100 → User root + IdentityFile ~/.ssh/id_router + IdentitiesOnly，以后 ssh router 免密直达（软路由 AGENTS.md 备份为 AGENTS.md.bak-fresh） #配置 #SSH #修复
- @2026-08-12 [笔记本] AGENTS.md 新增'记忆备份（防丢失）'小节：3 层冗余清单（Syncthing+stversions / OneDrive backup.ts / 软路由每日 tar），用户问备份在哪直接查表回答，两端已同步 #记忆 #备份 #配置
- @2026-08-12 [笔记本] 恢复软路由↔笔记本 docs/ 双向同步（folder opencode-docs，syncthing REST API 热加载，无需重启）：软路由旧残留 .stversions/旧文件已清空重建，笔记本推送全量 37 文件，双向写回验证通过。learnings 同步此前 08-10/11 已实际恢复。AGENTS.md/opencode.json/auth.json 仍各自独立。文档 opencode-web-mobile.md §10 已同步更新 #服务 #决策 #配置
- @2026-08-12 [笔记本] 浏览器新标签页加载慢修复：OpenClash DNS nameserver 含 8.8.8.8/1.1.1.1 走代理失败导致 DNS 卡死；已重建 UCI dns_servers（nameserver=114.114.114.114/119.29.29.29/doh.pub/dns.alidns.com，fallback=dns.google/dns.cloudflare.com DoH，default=国内IP）+ enable_custom_dns=1 生效 #网络 #OpenClash #DNS #修复
- @2026-08-12 [软路由] 浏览器新标签页慢根因=OpenClash DNS nameserver 含 8.8.8.8/1.1.1.1 走代理超时；修复=重建 UCI dns_servers（nameserver 国内直连 114/119/doh.pub/alidns + fallback DoH google/cloudflare + default 纯IP），重启 OpenClash 生效。坑：批量删 dns_servers 索引会误删启用的 nameserver 组 #网络 #OpenClash #DNS #配置
- @2026-08-12 [笔记本] opencode-vision 识图插件已重装：修复 tools/vision.ts 残留 Bun.file→Node fs（vision-helper 已 Node 化，tools 漏改，同款坑）；4 文件就位 plugins/tools/agents/docs；SKILL.md 看图章节回填视觉闭环版；AGENTS.md 加文档表行+模型分工识图说明；agent list 确认 image-reader 注册，opencode run 验证插件加载无报错。需重启 TUI 后实测发图链路 #识图 #插件 #配置
- @2026-08-12 [笔记本] /更新 命令新增「四-b 软路由 oc 更新」模块：软路由 opencode 是 Docker 镜像可完整升级（笔记本 exe 不行），流程=下载新版 linux-arm64 二进制重建镜像(保留 apt 工具层)→高可用重建容器(新名起来验证后切换,避免 stop/rm/run 窗口期无服务)→验证 4096 health。env 注入 OPENCODE_SERVER_PASSWORD+EXA/GITHUB/TAVILY/CONTEXT7。软路由不配 /更新 命令 #配置 #命令 #软路由
- @2026-08-12 [笔记本] opencode-vision 重装后实测通过：发图→自动存 %TEMP%\opencode-vision\image1\hash.png→注入 [opencode-vision:] 路径提示→主模型直接委托 @image-reader→中文描述返回；不回复问题（Bun 修复）确认解决，找图痛点（路径注入）解决；旧残留 image1-4 已清理 #识图 #插件 #经验
- @2026-08-12 [笔记本] 软路由识图插件已装（笔记本侧 ssh 部署）：scp 笔记本修复版 vision-helper.ts/vision.ts（已除 Bun）+软路由原版 image-reader.md（无 windows-mcp）到 /etc/opencode/{plugins,tools,agents}；AGENTS.md 加「识图（opencode-vision）」节（awk/script 插入避开引号坑）；容器 restart 后 agent list 确认 image-reader 注册、/tmp/opencode-vision 已创建、日志无 Bun/Ref 报错（仅 MaxListeners 警告无关）。关键发现：容器内实际 opencode 是 /usr/local/bin/opencode 1.18.16（与笔记本同版），/usr/bin/opencode 0.0.55 是误导性旧二进制 #识图 #软路由 #插件 #配置
- @2026-08-12 [笔记本] 全量编码审计+防乱码落地：①双端扫描确认所有中文内容文件合法 UTF-8 无损坏，软路由 BOM 全净、笔记本清 11 个 BOM（.learnings/ERRORS+FEATURE_REQUESTS、docs/project-zomboid、skills/tavo-operations 全家、configuration SKILL）；②发现 .playwright-mcp 3 个 Tavo 卡片文件名中文已不可逆损坏为?（内容完好，已按内容重命名）；③AGENTS.md 双端各加「编码纪律」规则（笔记本规则14/软路由规则7）+ scripts/encoding-audit.ps1（笔记本）/encoding-audit.js（软路由 node 版）工具；④核心认知：PowerShell 控制台 GBK 显示乱码≠文件坏，确认编码用字节检查；scp 二进制安全；ssh 命令行禁内联中文 #编码 #防乱码 #配置 #工具
- @2026-08-12 [笔记本] code review 修复：①encoding-audit.ps1 过滤 bug（TrimStart('*') 残留点号致扫描恒空，改 TrimStart('*','.')+contains；顺带清掉真实遗留 BOM scripts/opencode-tray.ps1）；②ssh_run.py 硬编码软路由 root 密码 918821 → 改密钥优先（~/.ssh/id_router，paramiko Ed25519Key 显式加载，config 里指定）+ ROUTER_PASS env 兜底，双路径实测通过；③.gitignore 大补（playwright-mcp/skills.backup/syncthing/bak/clash-代理/SELECT 垃圾等，防 git add -A 误收）；④修 stale 引用（configuration SKILL auto-updater→superpowers、README proxy-detector 路径、删 test-plugin.js）；⑤pin superpowers#v6.2.0 #review #安全 #编码 #git
- @2026-08-12 [�ʼǱ�] ����Ӧ�� AI �Ѳ���Ollama 0.32.8 + qwen3-vl:8b��6.1GB, Q4_K_M, �������ã�+ Chatbox 1.22.3 ����ǰ�ˣ�Ollama provider ���� localhost:11434����**Intel Arc B390 ���� GPU ���ٹؼ�**��Ollama Ĭ�϶������ԣ������� User ���������� OLLAMA_IGPU_ENABLE=1 + OLLAMA_VULKAN=1 + OLLAMA_INTEL_GPU=1 + OLLAMA_NUM_GPU_LAYERS=99��������� ollama serve ��Ч��ollama ps ��ʾ 100% GPU����ģ��ʶ��ͼ OCR ʵ��ͨ����32B ��ȡ����opencode ������� #���� #���� #���� #ģ��
- @2026-08-12 [笔记本] 本地应急模型已换无审查版：huihui_ai/qwen3-vl-abliterated:8b-instruct-q4_K_M（6.1GB，Qwen3-VL abliteration 去审查，不再拒答，识图/GPU 保留）。原版已删。内存优化 OLLAMA_CONTEXT_LENGTH=8192 + OLLAMA_KV_CACHE_TYPE=q8_0：llama-server 12.2→7GB，可用内存 0.4→13.2GB；重启/重复加载会残留多 llama-server 进程需按父进程清理。Chatbox 需手动改模型名 #配置 #模型 #内存
- @2026-08-12 [笔记本] 本地模型已接入 opencode（不再需要独立前端，Chatbox 已卸载，Cherry Studio 未装）：opencode.jsonc 加 provider local-ollama（@ai-sdk/openai-compatible, baseURL http://localhost:11434/v1），模型 huihui_ai/qwen3-vl-abliterated:8b-instruct-q4_K_M。联网搜索直接用 opencode 已配的 Tavily/Exa MCP（无需额外配置，Tavily key 在 User 环境变量 tvly-dev-...）。opencode 重启后模型列表可切本地模型应急 #配置 #模型 #服务 #决策
- @2026-08-12 [笔记本] 决策：不装 CapsWriter-Offline（小黑盒帖推荐的本地离线语音输入法）。理由：用户核心需求是豆包式「很小声说话也识别准」，本地离线方案（Paraformer/SenseVoice/Fun-ASR-Nano/Qwen3-ASR）均达不到该水平——豆包靠云端大模型+实时AGC，本地模型无音量标准化/耳语优化（有 deepwiki 调研佐证）。若坚持小声识别只能回云端方案（豆包/讯飞），与完全离线互斥 #决策 #语音输入
- @2026-08-12 [笔记本] 下载偏好：使用代理下载大文件/模型时，只用 xf 机场的节点下载（软路由 OpenClash 里有多个机场，选 xf 机场节点，而非其他机场） #偏好 #网络
- @2026-08-12 [笔记本] **代理下载规则**：以后需要走代理下载（模型/大文件等海外资源）时，统一用 xf 机场的节点，不用其他代理 #偏好 #代理 #下载
- @2026-08-12 [笔记本] 本地应急模型升级为 huihui_ai/qwen3-abliterated:14b（纯文本9GB，无审查，Q4_K_M，Intel官方推荐甜点尺寸），8B VL 已删。**关键坑**：Qwen3 默认开 thinking 思考链，opencode 用 v1 端点无法用 think:false 关（只有 /api/chat 原生端点认），导致每次响应 70s。**解法**：opencode.jsonc 里 model 加 options:{reasoning_effort:none} + reasoning:false，v1 端点认这个参数，关思考后 2.9s 响应且工具调用正常。14B 内存占用 ~17.5GB（可用内存 3.5GB，偏高但应急可接受）。Intel 核显 MoE 会崩，只能选 dense 模型 #配置 #模型 #经验
- @2026-08-12 [笔记本] 清理代理残留：WinINET ProxyServer 与 git 全局 http/https.proxy 均残留旧 FlClash 死端口 127.0.0.1:7890，已清除；透明代理/7893 出口均正常 #配置 #代理
- @2026-08-12 [笔记本] 软路由 OpenClash 清理失效订阅 Provider_08814A(cctvclient 403)：从源配置 /etc/openclash/config/二合一.yaml 删除定义段+10处引用(备份 /root/二合一.yaml.bak_20260812)，删 change 强制完整模式后重启，API 确认消失(provider 26→25)，现仅剩 88EB03(42节点)+BC90B8(44节点) #配置 #代理 #软路由
- @2026-08-12 [笔记本] Open WebUI 托盘图标已换 Open WebUI 官方图标（从 GitHub static/favicon.png 下载转 64x64 ico，存 icons/openwebui.ico；raw.githubusercontent 被墙用 api.github.com base64 下载）。托盘脚本 openwebui-tray.ps1 已修：①Start-Process 必须加 -WorkingDirectory C:\Users\pass（否则计划任务在 system32 起、Open WebUI 写 .webui_secret_key 报 PermissionError 启动失败）②脚本英文注释避免 UTF-8 无 BOM 中文乱码坑。坑：多杀/多次启动会残留多个托盘实例，需按 openwebui-tray 命令行匹配清理 #配置 #服务 #图标 #坑
- @2026-08-12 [笔记本] Open WebUI 部署完成：uvx --python 3.11 open-webui serve --port 3000（Python 3.14 不兼容需隔离 3.11）。连 Ollama 14B 无审查 + Tavily Web 搜索。账号 local@opencode.local（首次注册走 /api/v1/auths/signup）。Web 搜索开关在输入框扩展菜单（每对话开启，14B 优先用知识库工具，需提示用联网搜索）。Qwen3 思考链显示为灰色思考块不影响功能。托盘脚本 openwebui-tray.ps1 + 计划任务，图标换 Open WebUI 官方。坑：计划任务需 WorkingDirectory 用户目录否则写 .webui_secret_key 报 PermissionError #配置 #模型 #服务 #托盘
- @2026-08-12 [笔记本] **托盘脚本编码大坑**：opencode-tray.ps1 含中文注释且为 UTF-8 无 BOM，PowerShell 5.1 按 GBK 解析会乱码导致括号错乱、计划任务启动静默失败（Start后 task=Ready 非 Running、无托盘进程）。**解法**：用 [IO.File]::WriteAllText 转 GBK(936) 保存后语法 OK。**退出机制验证**：托盘 Exit 菜单用 Stop-OcService 按端口(4096/3000)杀监听进程（不能只杀自己 Start 的，否则孤儿服务残留），已验证退出托盘=停服务、计划任务可恢复。opencode-tray.ps1 的 Stop-OcService 已改为按端口杀 #坑 #服务 #托盘
- @2026-08-12 [笔记本] Open WebUI 弹窗结论：正常计划任务+托盘脚本启动时 uvx 链（uvx→uv→open-webui→python）**不会弹终端窗口**（无 conhost，-WindowStyle Hidden 生效）。之前看到的终端窗口是调试期用 WMI/直接 Start-Process 等临时启动方式产生的。若启动命令无 -WindowStyle Hidden 或经 WMI/Win32_Process.Create 启动才会弹窗。Open WebUI 完整启动需 40-60s（embedding 模型加载） #服务 #托盘 #经验
- @2026-08-12 [笔记本] Open WebUI 启用联网搜索：引擎 Tavily（复用已有 TAVILY_API_KEY 环境变量）。要点：① Open WebUI 数据目录在 uv cache 包内 open_webui/data/webui.db（非 ~/.open-webui，uvx 方式）；② 服务端 DB config 是权威值，env 注入的 key 会同步但 enable 不覆盖旧 DB 值，需直接 UPDATE webui.db 的 web.search.enable='true'、engine='"tavily"'、bypass_embedding_and_retrieval='true'；③ API 更新 /api/v1/retrieval/config/update 是整块覆盖，只传部分字段会把其他 web 配置清成 null（踩坑）；④ 每次会话要手动开 UI 输入框旁 +号→扩展功能→联网搜索 开关；⑤ 纯 API 调用不带 session_id 不会注入 search_web 工具，UI 才行 #配置 #服务- @2026-08-12 [笔记本] 本次对话经验已正式归档：LRN-20260812-001~006（Intel iGPU Ollama 加速 / Qwen3 reasoning_effort / PS5.1 GBK 编码坑 / 托盘计划任务模式 / Open WebUI uvx 部署 / qwen3-thinking）+ ERR-20260812-001~004（计划任务缺 Hidden 弹窗 / .webui_secret_key PermissionError / 孤儿进程 / 已归档）+ FEAT-20260812-001。已提升：托盘模式→opencode-maintenance skill；本地应急 AI→AGENTS.md 第12条；openwebui 托盘要点→docs/openwebui.md #记忆 #归档
- @2026-08-12 [笔记本] Open WebUI 手机无法访问 192.168.3.53:3000 排查：服务正常（0.0.0.0:3000 监听），根因是 Windows 防火墙放行规则只覆盖 python314\python.exe，实际监听进程是 uv 的 cpython-3.11\python.exe 路径不匹配被拦（本机访问走回环不受影响）。已新增入站规则 'Open WebUI 3000' 放行 TCP 3000（Private,Public）。UAC 提权在 opencode 会话内触发不生效，需用脚本文件 Start-Process -Verb RunAs 方式 #故障 #防火墙 #openwebui
- @2026-08-12 [笔记本] 软路由 20:41 整机重启，opencode 容器随系统自启（Up 1min），重启窗口约 1 分钟内连不上属正常；20:42 后 LAN/Tailscale 双通道带密码 health 均 200 恢复。重启原因不明（非 03:00 定时） #服务 #事故 #软路由
- @2026-08-12 [笔记本] 软路由 20:41/21:10 两次重启根因排查：CPU 过热。thermal_zone0(cpu) 持续 88-94°C 逼近 critical 95°C(trip_point_2)，GPU 85°C，无风扇被动散热，CPU 满载(load 6-8/4核，tailscaled 24%+clash 14%+opencode)。pstore 无 panic=有序过热关机/重启。R66S 是 RK3568 被动散热，长期满载易过热 #事故 #根因 #软路由 #硬件
- @2026-08-13 [笔记本] 30B-A3B 实测结论：MoE 64专家 Intel 核显可跑（官方34t/s）但32GB内存是瓶颈（30B-A3B需19GB，加载后仅剩1GB）；且 19GB 下载遇 R2 不稳定反复断连（卡96%），已放弃，流量消耗大。**维持 14B dense 最优**。经验已归档 LRN-20260812-007 + ERR-20260812-005（含 Ollama 代理注入坑：opencode shell 设 env Start-Process 不继承，需 cmd 包装或 User 级） #模型 #决策 #网络 #下载
- @2026-08-13 [笔记本] **Open WebUI 已完全移除**：用户决定不再使用。已删：3000 服务/托盘进程、计划任务 OpenWebUI Web Tray、脚本 openwebui-tray.ps1/.cmd、快捷方式 Open WebUI.lnk、图标 openwebui.ico/.png、uv 缓存 4 个 open_webui 环境（~8.3GB）、docs/openwebui.md、AGENTS.md 引用（第65/199行）、opencode-maintenance skill 章节改为仅 opencode。保留：Ollama + 14B 无审查模型（local-ollama provider）作为本地应急，opencode 4096 托盘服务。经验：托盘脚本加 ShowWindow 自隐藏防弹窗 + .cmd 启动器避开火绒误报 #服务 #配置 #决策 #清理
- @2026-08-13 [笔记本] 本地模型定位定案（混合模式）：opencode 主模型 deepseek-v4-flash（云端）自主搜+调工具，本地 14B 无审查只作断网/隐私/无审查应急兜底（简单问答+总结）。调研结论：本地小模型（≤14B）自主工具调用不现实（glukhov 实测 Qwen3-14B Fail，官方需 Gemma4 26B+），LRN-20260812-008 #模型 #决策 #调研
- @2026-08-13 [笔记本] PZ 已移除本地 mod AutoEverything（含自动吃喝/感应灯/自动关窗/无限背包/负重归零等缝合功能），default.txt 只留 Workshop 在线 mod，备份 default.txt.bak-20260813 #配置
- @2026-08-13 [笔记本] **本地生图部署完成**：ComfyUI（C:\Users\pass\ComfyUI，PyTorch XPU，Arc B390 识别）+ Juggernaut XL v9 GGUF Q4_K（2.76GB）+ SDXL 双CLIP（clip_l+sdxl_clip_g）+ sdxl_vae，文生图验证成功（红裙女人海边，画质专业）。启动：START_ComfyUI.bat → localhost:8188。**sd-prompt 脚本**（scripts/sd-prompt.py）把中文想法转英文提示词（无审查，14B，验证通过）；因 opencode 全局 prompt 干扰 14B，不能用 opencode agent 做，必须独立脚本。模型下载源：offgrid-ai/juggernaut-xl-v9-GGUF + HyperX-Sentience/SDXL-GGUF + stabilityai/sdxl-vae。LRN-20260813-001 #生图 #服务 #模型 #配置
- @2026-08-13 [笔记本] 一键生图脚本：scripts/generate-image.py（中文描述→本地14B自动转提示词→ComfyUI出图→自动打开图片）。用法：python generate-image.py + 描述 + 可选--width/--height。已实测赛博朋克城市夜景出图成功画质优秀，用户无需碰ComfyUI界面 #生图 #工具 #脚本
- @2026-08-13 [笔记本] 生图保脸方案定案：**IP-Adapter 在 Intel Arc 核显彻底黑图（无解）**，fp16 模型也黑图（核显只兼容 GGUF+bf16）。改用 **GGUF Juggernaut + img2img + denoise 0.35 + 匹配原图比例尺寸（竖图768x1152）**，人脸相似度 85-95% 无畸形（验证通过）。已整合网页生图（上传参考图自动选尺寸，denoise 档位 0.25/0.35/0.5/0.65）。保脸/换装权衡：0.35保脸90%换装弱，0.5换装明显。LRN-20260813-002 #生图 #保脸 #配置
- @2026-08-13 [软路由] OpenClash 失效 Provider_08814A(cctvclient 403)复发根治：写 /etc/openclash/custom/openclash_custom_overwrite.sh 自动剔除（完整模式配置生成时 init.d 调用，awk 删定义块+引用，注意键名含连字符 proxy-groups 需用 [A-Za-z0-9_-]+ 匹配，否则误删后续整段）；另清残留无引用 provider 文件 284C95/2B40D9/CEA6A4（含 XFLTD=xf 机场历史缓存，备份 /root/openclash_provider_backup_20260813）；UI 旧标签=localStorage 缓存 sub_info_二合一，刷新即消 #软路由 #OpenClash #配置 #修复
- @2026-08-13 [笔记本] Windows 11 家庭版 25H2（无 RDP host 服务端，远程桌面方案需第三方软件）；Tailscale 已含 3 节点：笔记本 laptop-0fat5c1b 100.71.42.119、软路由 istoreos 100.97.187.104(exit node)、华为手机 noh-an00 100.90.174.118 #环境 #账号 #服务
- @2026-08-13 [笔记本] 手机远程看电脑方案：RustDesk 1.4.9 已装笔记本端（MSI 服务模式，开机自启，ID 335525478），走 Tailscale 直连（笔记本 100.71.42.119）；手机端华为纯净模式拦截 APK 误报（已验证官方文件），用户决定放弃安装 #决策 #服务
- @2026-08-13 [笔记本] RustDesk 已全部卸载（笔记本 MSI + 手机 APK），临时文件已清；手机远程看电脑方案暂时搁置 #决策
- @2026-08-13 [笔记本] ReActor 换脸节点完整部署成功：comfyui_venv 装 onnxruntime+依赖（清华源会降级 XPU torch 需 --force-reinstall 恢复 2.15.0.dev+xpu）；inswapper_128.onnx 必须 554MB 完整版（13MB 损坏版 Protobuf 报错）；buffalo_l.zip 解压到 models/insightface/models/buffalo_l/；facerestore_models 4 个模型预下载否则 object_info 500。下载全走本机 FlClash 7890 xf 机场。已实测换脸成功（target_00001+swap_00001）。#配置 #ComfyUI
- @2026-08-13 [笔记本] image-web.py 已接入 ReActor 网页换脸：上传参考图+勾选换脸=img2img换衣+ReActor换脸，返回 web_swap_*.png（swap=1 需配 ref）。_run_job 需优先返回 swap 输出（按文件名前缀 web_swap 匹配），否则返回的是 web_gen。translate 调 14B 冷启动>60s 属正常。#配置 #ComfyUI
- @2026-08-13 [笔记本] ComfyUI 黑图 bug 修复：黑图根因是残留的 uv python 旧进程抢占 8188 端口（正常应为 venv 进程 spawn 的子进程，PPID=venv 主进程），其 ReActor 全局缓存了损坏的 inswapper_128.onnx 导致换脸输出 512x512 纯黑。修法：杀全部 main.py 进程后重启单个 venv 实例。判断进程归属看 PPID 是否为 venv 主进程，而非仅看 CommandLine。#配置 #ComfyUI
- @2026-08-14 [笔记本] 本地应急模型从 qwen3-14b 换成 qwen3.5-abliterated:9b（6.6GB，Arc Vulkan 100% GPU）：工具调用更强（BFCL 0.661），轻量应急+单步工具调用；旧 14b 已删释放 9GB。注意：Ollama serve 是后台进程，代理环境变量要在 serve 启动时注入（FlClash TUN 模式下无需 7890 端口，透明代理自动生效）。#配置 #本地模型

- @2026-08-14 [笔记本] 参考分享对话 opncd.ai/share/pecqiTp8 优化：新增 plugins/compaction-memory.ts（压缩前注入会话快照，hook 签名 experimental.session.compacting 已核对 d.ts）+ opencode.jsonc plugin 数组显式声明；AGENTS.md 新增「会话管理（稳定性）」小节并修正记忆库治理过期表述。AGENTS.md 瘦身/skills 审查结论：笔记本版已精简无需改动 #配置 #决策- @2026-08-14 [笔记本] 本地 agent 模型确定为 qwen3.6:27b（17GB，Arc Vulkan 100% GPU）：中文好+多步工具调用完美（中文自动翻译+拆多构图+搜索后正确串联生图）。gpt-oss:20b（13GB）多步需明确指令且中文弱，弃用为候选。**坑**：qwen3.6 必须加 think:false 参数否则 content 永远为空（Ollama 0.32.8 吞 thinking 不吐 content）；已配进 local-ollama provider。**下载坑**：Ollama 大模型下载必须 serve 带 7890 代理重启才稳定（FlClash TUN 对 Ollama 下载通道不生效），17GB 文件会 EOF 需多次断点续传。模型已配：qwen3.5-9b(应急)+qwen3.6:27b(agent)。#配置 #本地模型
- @2026-08-14 [笔记本] qwen3.6:27b(16GB) 与 ComfyUI 生图可共存，无需调 Shared GPU Memory Override！实测生图峰值仅 2.14GB（SDXL GGUF Q4 按需加载），合计约 18.1GB < 16.45GB 可用显存。之前 OOM 是双进程混乱(uv旧进程+reserve-vram干扰)假象。**进程坑**：ComfyUI venv 主进程会 spawn uv python 子进程占 8188（PYTHONPATH 继承 venv 包，属正常架构，勿当残留杀）；启动前先杀所有 main.py 确保单实例。共存实测：qwen3.6 加载时生图 74s 正常出图。#ComfyUI #本地模型
- @2026-08-14 [笔记本] 补充：qwen3.6 与生图共存时 ComfyUI 必须用标准启动参数（--lowvram --bf16-unet --async-offload --disable-smart-memory），不要加 --reserve-vram（会误导显存计算）；启动前杀干净所有 main.py 进程。#ComfyUI
- @2026-08-14 [笔记本] 状态更新：qwen3.6:27b 与 gpt-oss:20b 均已删除（ollama rm 释放 30GB）。原因：27B 占内存 ~18GB（32GB 机只剩 3.7GB），且需 think:false。本地模型最终只留 qwen3.5-9b（6.6GB）应急。opencode.jsonc local-ollama provider 已同步移除 27b 条目。经验：本地 ≤9B 只够轻量/单步工具调用，完整多步 agent 靠云端。#配置 #本地模型
- @2026-08-14 [笔记本] opencode 4096 端口僵尸事故：双托盘实例并发 Stop-OcService 竞态→serve 进程非正常终止 socket 未回收→端口永远无响应需重启系统；已给 opencode-tray.ps1 加单实例 Mutex 防重入 #服务 #事故
- @2026-08-14 [笔记本] opencode serve 从托盘方案迁移到 NSSM 系统服务（服务名 opencode-web，Auto+自愈 AppExit Restart 2s节流，ObjectName .\pass 继承User env）；托盘计划任务已禁用，install 脚本 scripts/install-nssm-opencode.ps1 #服务 #决策
- @2026-08-14 [笔记本] **本地应急 AI 全部清除**：Ollama 已卸载（unins001.exe 静默卸载，应用目录已删、无服务/无计划任务）、qwen3.5-abliterated:9b 模型已删（6.1GB，.ollama 目录已删）、local-ollama provider 已从 opencode.jsonc 移除、AGENTS.md 第 12 条同步更新为「本地应急 AI：已移除」。原因：9b 太傻留着没用，本地小模型均不够用，完整 agent 靠云端 deepseek-v4-flash。 #决策 #模型
- @2026-08-14 [笔记本] NSSM 服务方案失败回退：①CloudAP 微软账户不能做服务登录（1069）→ 改 LocalSystem；②AppEnvironmentExtra 分号分隔会把含分号值拆错、REG_MULTI_SZ 写入也失败 → 折腾 4 次提权后用户放弃，回退托盘方案（已恢复运行，端口 4096 health 200）；教训：托盘方案虽然脆弱但有 Mutex 已防双实例，NSSM 迁移不值得 #服务 #决策
- @2026-08-14 [笔记本] 托盘脚本稳定性加固：①单实例 Mutex 挡重复启动（实测有效）；②新增 60s 健康自检定时器，连续 2 次失败自动重启 serve；③僵尸端口预检测（不干等50秒，直接提示需重启系统）；④重启逻辑改后台线程防 UI 冻结 #服务 #配置
- @2026-08-15 [笔记本] opencode 4096 托盘脚本升级（借鉴 DS Harness 桌面壳）：Stop-OcService 改 Ctrl+C 优雅关停（AttachConsole+GenerateConsoleCtrlEvent，实测端口干净释放）、健康自检指数退避(60s~480s)+4轮熔断、托盘菜单加 Auto-Start 开机自启开关、就绪判定改轮询 health 200；脚本 scripts/opencode-tray.ps1 备份在 scripts/backup/ #服务 #配置
- @2026-08-16 [笔记本] 安装 DSH (DeepSeek Harness) 全局版 @deepseek-ai/dsh@0.1.0-rc.6，接 opencode-go (OC Go) provider：~/.dsh/settings.yaml 配 llm-pi-ai.providers.opencode-go.apiKeyEnv=OPENCODE_API_KEY + agent-default-model=deepseek-v4-flash；凭据在 ~/.dsh/.credentials.yaml（key 复用 opencode auth.json 的 opencode-go key）。web UI http://127.0.0.1:3080（dsh web），headless 用 dsh --profile headless。自动更新：计划任务 dsh-auto-update 每周日 03:00 跑 ~/.dsh/update-dsh.ps1。 #配置 #服务 #DSH
- @2026-08-16 [笔记本] DSH 固定工作目录 C:\Users\pass\dsh-workspace，启动脚本 start-dsh.ps1（固定目录跑 dsh web + 自动开浏览器），桌面快捷方式 DSH.lnk。注意：PowerShell 里 Start-Process 不能直接跑 dsh（npm 的 dsh.ps1 包装器），要用 cmd /c dsh web；ps1 脚本内中文注释在 PS5.1 会乱码破坏语法，需纯 ASCII。 #配置 #DSH #服务
- @2026-08-16 [笔记本] DSH 固定工作目录方案已回退（用户觉得麻烦）：删除了 dsh-workspace 目录、start-dsh.ps1、桌面 DSH.lnk。DSH 本身保留全局安装 + opencode-go 配置，日常直接 dsh web 即可。 #配置 #DSH #决策
- @2026-08-16 [笔记本] DSH (DeepSeek Harness) 已完全卸载：npm uninstall -g @deepseek-ai/dsh + 删 ~/.dsh 配置目录 + 删计划任务 dsh-auto-update。理由：日常用 opencode 已够，dsh 尝鲜后觉得没价值。 #配置 #DSH #决策
- @2026-08-16 [笔记本] Edge 无法自动更新：机器级 EdgeUpdate 组件损坏（服务装不上 0x80040b00、机器级计划任务缺失、HKLM Clients 丢失），修复方法=安装 MicrosoftEdgeUpdateSetup.exe（1.3.257.13）重建组件后 Edge 自动拉取最新版 #经验
- @2026-08-16 [笔记本] OneDrive 接管的 Downloads 下载的 exe 可能是占位符（属性 SparseFile），Get-AuthenticodeSignature 能读但启动报'系统找不到指定文件'；解决=从其他完整副本安装或先让 OneDrive 下载内容 #经验 #坑

- @2026-08-16 [笔记本] 已安装 DSH Desktop v2.0.0（anywhere-labs/deepseek-harness-desktop，社区非官方）：程序 %LOCALAPPDATA%\Programs\DSH Desktop\，数据 ~/.dsh（profiles/storages）+ AppData\Roaming\DSH Desktop；SHA256 已校验匹配；安装包在 Temp\opencode\；已过内测声明、跳过 API Key，主界面正常（兼容模式，loopback 127.0.0.1:38464）；与 opencode 完全隔离 #配置 #服务 #安装
- @2026-08-16 [笔记本] DSH Desktop 已配好 opencode 模型：Zen 免费（deepseek-v4-flash-free，/zen/v1）+ Go 订阅（deepseek-v4-flash/pro，/zen/go/v1），凭据 OPENCODE_API_KEY 用 auth.json 的 opencode-go key（.credentials.yaml）；已装插件市场 dshmarket v1.2.4（设置→插件市场，237 个插件）；固定工作区 C:\Users\pass\dsh-workspace（与 oc 隔离）；Zen 免费模型限流 429 FreeUsageLimitError（服务端限流，非配置问题） #配置 #服务 #dsh
- @2026-08-16 [笔记本] FlClash 覆写脚本 339618059322920960.js（XFLTD 分组）置顶加规则 DOMAIN-SUFFIX,opencode.ai,XFLTD：opencode.ai Zen（/zen/v1 API+页面，全美托管）显式走代理（此前靠 MATCH 兜底） #配置 #FlClash #网络
- @2026-08-16 [笔记本] DSH Desktop v2.0.0 已完全卸载（用户决定，等成熟再用）：卸载器卸载程序 %LOCALAPPDATA%\Programs\DSH Desktop\、删 ~/.dsh、dsh-workspace、AppData\Roaming\DSH Desktop、dsh-plugin-desktop-updater、pnpm store、Temp 全部 dsh* 残留、快捷方式×2、注册表卸载项，npm 全局包无残留；坑：libvips-42.dll 被后台 dsh web 服务 node 进程占用删不掉，须先 kill 该 node（本次 PID 36844）再删。FlClash 覆写脚本里的 DOMAIN-SUFFIX,opencode.ai,XFLTD 规则保留（那是给 OC 本身用的，与 DSH 无关）。 #决策 #卸载 #DSH
- @2026-08-16 [笔记本] 主模型+image-reader 从 Go 套餐（opencode-go/deepseek-v4-flash + opencode-go/mimo-v2.5）切到 Zen 免费（opencode/deepseek-v4-flash-free + opencode/mimo-v2.5-free），笔记本+软路由两端同改：opencode.json(c) model、agents/image-reader.md、auth.json 补 opencode 条目（同 opencode-go key）、AGENTS.md/docs 引用；实测 Zen 免费 429 FreeUsageLimitError（免费限流），配置本身正确 #配置 #模型
- @2026-08-16 [笔记本] FlClash 扩展脚本坑：scripts/339618059322920960.js 的 rules.unshift 把 opencode.ai 强制送 XFLTD（新加坡节点）导致 opencode 慢+ECONNRESET；已改为 DIRECT 并补 api.opencode.ai/deepseek.com/xiaomimimo.com/dashscope.aliyuncs.com/zhipuai.cn/moonshot.cn 直连。运行配置 config.yaml 同步插入+PUT /configs 重载。FlClash 数据目录=AppData\Roaming\com.follow\clash\（旧~/.config/clash 是废弃的）。#代理 #opencode
- @2026-08-17 [笔记本] FlClash 已升级 v0.8.94→v0.8.95（官方 chen08209/FlClash release，setup.exe 36MB）。升级后脚本/配置 DIRECT 修复自动保留（基于已改脚本重新生成 config.yaml），内核仍 mihomo 1.10.0。数据备份 clash-backup-20260817。安装目录 C:\Program Files\FlClash，含 FlClashHelperService 服务（LocalSystem，sc stop 需管理员）。#服务 #升级
- @2026-08-19 [笔记本] 听书习惯：用户要求『听书时常帮我领一下』——听书 App（华为手机智能朗读界面，当前在听《末日：拥有空间的我觉醒雷系异能》404章）有两个领取入口：①『饭点领时长』入口（免费听书时长，特定饭点时段）②右下角橙色『点击领取 +964』金币/奖励按钮。以后对话涉及听书时主动提醒用户领取 #偏好 #习惯 #听书
- @2026-08-19 [笔记本] 番茄小说听书领时长进度：已领 +80分钟（听书可用时长 02:50→04:10）；「+964点击领取」红包点击后进入任务中心（看视频/去阅读等任务才给金币，非白拿）；「饭点领时长」需看广告（40秒~数分钟，可能跳下载落地页需返回键退出）；剩余「开宝箱」「晚餐领取」未领，下次继续 #听书 #任务 #进度
- @2026-08-19 [笔记本] image-reader 子代理已加 adb 权限（bash: "adb*" allow），需重启 opencode 生效；此后「识图+操作手机」类任务可全权委托 image-reader 自主完成（截图→看→点→验证） #配置 #子代理 #手机
- @2026-08-19 [笔记本] DeepSeek Harness (dsh) 已装好：全局 npm 安装 @deepseek-ai/dsh@0.1.0-rc.7，永久工作区 C:\Users\pass\dsw-workspace，桌面快捷方式 [DeepSeek Harness] 用 wt 启动（start-dsh.cmd → dsh web，秒开），访问 http://127.0.0.1:3080，数据在 ~/.dsh，关闭=Ctrl+C，升级跑 update-dsh.cmd。坑：npm proxy 指向软路由 Clash 对 npmmirror 超时，须 set NO_PROXY=registry.npmmirror.com,cdn.npmmirror.com；npx 的 shim 在 cmd 环境调 npm-prefix.js 会崩，改用全局 dsh 命令 #服务 #配置 #时效
- @2026-08-20 [笔记本] dsh web 服务是后台驻留进程，卸载/清理 dsh 必须顺手杀对应 node 进程（本次发现：npm 包已卸载但 PID 59720 的 dsh web node 进程残留，空闲烧 119% CPU 一整核，监听 3080 无连接纯空转）；验证方式：Get-CimInstance Win32_Process 查 CommandLine 含 dsh 的 node。 #DSH #运维 #经验
- @2026-08-20 [笔记本] 清理启动项残留：删 LM Studio/Token Monitor/Flow.Launcher 失效启动项（exe 不存在）、Ollama 启动记录；Tailscale 重复启动项（注册表 Run + ProgramData 启动文件夹 lnk 各一个）删 lnk 留 Run；FlClash 按用户要求全保留。WSA 两个条目是正常设计（AppxManifest 的 ContinuousVirtualMachine + PartiallyRunningVirtualMachine 两个 StartupTask，默认禁用）非残留。备份 Temp\opencode\startup_backup_* "


## 升级报告 2026-08-22 19:22

### 已升级组件
- windows-mcp: 依赖已更新（版本号不变，v0.8.5）
- npm 全局包: @playwright/mcp@0.0.79, superpowers-mcp@6.3.1, ctx7@0.5.8, @jackwener/opencli@1.8.6
- context7 本地包: @upstash/context7-mcp@4.0.3
- 软路由 Docker 容器: opencode-arm64:1.18.16-full → 1.18.21-full

### 跳过组件
- npx 类 MCP (tavily/firecrawl): 每次启动自动拉最新
- remote MCP (exa/github): 云端维护
- Skill 版本检查: 无法访问 SkillHub API，未比较

### 需要操作
- opencode 本体: 当前 1.18.16，最新 1.18.21。重启 opencode 后运行 /更新 即可升级

### 备份
- 已执行升级前备份到 OneDrive: backup_2026-08-22_19-22

- @2026-08-23 [笔记本] 修复 OC 会话标题不自动生成：opencode.jsonc 加 small_model=opencode/deepseek-v4-flash；根因是 title agent 依赖 small_model，未配置时静默失败不重试。同时强化 AGENTS.md 中文思考要求（禁止英文 CoT）。 #配置 #修复
- @2026-08-23 [笔记本] small_model 从 opencode/deepseek-v4-flash 换为 opencode/hy3-free（DS v4 flash 免费版已停用）。Hy3 Free 是 Zen 稳定免费模型，适合标题生成等轻量任务。 #配置 #修复
- @2026-08-23 [笔记本] 修复软路由 opencode Docker 容器网页卡/新建对话慢：docker run 必须加 `-w /root`，否则默认 `/` 导致 inotify 监视整个根目录（overlayfs/tmpfs/procfs 全部扫描），fff 初始化也失败。容器 `aca14989d0fa` 已重建。 #配置 #修复 #软路由 #Docker
- @2026-08-24 [笔记本] 卸载Claude Code：删除claude.exe（C:\Users\pass\.local\bin\）、WT profile、开始菜单快捷方式、ClaudeCode目录、.claude/.claude-server-commander/.claude.json/CLAUDE.md、AppData\Local下的Claude-3p和claude-cli-nodejs目录 #配置 #卸载
- @2026-08-24 [笔记本] 修复opencode MCP信号红灯/消息发不出：OpenClash规则只覆盖tailscale域名，DERP中继用直连IP 172.237.66.30没被匹配走了代理→超时→SSE断连。修复：在openclash_custom_rules.list加 DERP IP段直连规则。 #配置 #修复 #网络 #Tailscale #OpenClash
- @2026-08-24 [笔记本] DERP规则修正：初始加的172.237.64.0/18只覆盖新加坡DERP，东京DERP-7(172.237.28.183)不在范围内又断了一次。改为172.237.0.0/16覆盖所有DERP服务器。 #配置 #修复 #网络
- @2026-08-25 [笔记本] 修复opencode客户端"Failed to fetch"崩溃：OpenClash TUN拦截了localhost请求，Electron渲染进程无法访问本地后端API。修复：在openclash_custom_rules最前面加127.0.0.0/8、192.168.0.0/16等内网直连规则。 #配置 #修复 #OpenClash
- @2026-08-25 [笔记本] small_model从opencode/mimo-v2.5-free改为opencode-go/mimo-v2.5，避免免费模型限流影响标题生成等轻量任务。 #配置
- @2026-08-25 [笔记本] opencode桌面端红灯根因：手机端oc-remote同时在线，两个SSE客户端抢占同一账号的SSE连接，服务端只允许一个。解决：两端不同时在线。 #已知问题 #SSE #oc-remote
- @2026-08-25 [笔记本] OpenClash添加GitHub代理规则：github.com/githubusercontent.com等走XFLTD代理组，修复raw.githubusercontent.com无法访问的问题。代理组名是XFLTD不是🎯代理。 #配置 #OpenClash #GitHub
- @2026-08-25 [笔记本] OpenClash添加GitHub代理规则：github.com/githubusercontent.com等走XFLTD代理组，修复raw.githubusercontent.com无法访问的问题。代理组名是XFLTD不是🎯代理。 #配置 #OpenClash #GitHub
- @2026-08-24 [笔记本] 移除识图插件（opencode-vision）及相关文件：删除 plugins/vision-helper.ts、tools/vision.ts、agents/image-reader.md；更新 AGENTS.md（移除识图描述+文档表行）、skills/windows-computer-use/SKILL.md（移除看图章节） #配置 #移除
- @2026-08-24 [笔记本] MiMo V2.5 上下文优化：tool_output 降到 500行/16KB、图片 1280px/2MB、reserved 64K、tail_turns 5、comfyui MCP 禁用、AGENTS.md 加上下文节约规则 #配置
- @2026-08-25 [笔记本] Go 套餐模型分层配置：Plan 用 deepseek-v4-flash-vision-exp（识图+推理），Build 用 mimo-v2.5（额度大15万/月），Fallback 用 mimo-v2.5-free。笔记本 opencode.jsonc + 软路由 opencode.json 已同步 #配置 #模型 #Go
- @2026-08-26 [笔记本] MiMo 聪明/慢优化（用户拍板）：opencode.jsonc agent 写死 plan=opencode-go/deepseek-v4-flash-vision-exp、build=opencode-go/mimo-v2.5（temperature 0.2/0.1）；compaction 收敛 reserved 64K→20K、tail_turns 5→3；tool_output 放宽 500/16K→1000/32K。决策：build 不关 thinking（用户不切 plan 时 mimo 需独立智力；opencode 无 mimo reasoning_content 回传适配，开思考多轮 tool-call 有 400 风险→保留默认）。AGENTS.md 加「分层纪律」（小步走/每步验证/出错报告）。软路由只同步 compaction+tool_output（其 model 用 Zen opencode/mimo-v2.5 不动），备份 .bak-layered-20260826 #配置 #模型 #决策
- @2026-08-26 [笔记本] 修复 auto-learnings.ts 环境变量拼写 bug：`process.env.DEESEEK_API_KEY`（少个 P）→ 改为兼容 `DEEPSEEK_API_KEY || DEESEEK_API_KEY`（.env 里实际是正确拼写），插件此前一直禁用、记忆自动捕获从未生效 #修复 #插件 #记忆
- @2026-08-26 [笔记本] MiMo 调研结论：mimo-v2.5 thinking 默认开启（官方文档），reasoning effort 只能开/关不能调档；opencode-go 网关有 #43712 bug（间歇性静默不返回 reasoning，响应 ID gen-* 才带）；opencode 源码无 mimo reasoning_content 回传适配 #调研 #模型 #已知问题

### FlClash 卸载记录
- @2026-08-25 卸载 FlClash v0.8.96（原 v0.8.95）
- 卸载原因：external-controller (9090端口) 无法生效，即使配置和GUI开关都显示开启
- 卸载方式：unins000.exe /SILERT + 手动清理 AppData 和注册表
- 清理路径：%APPDATA%\com.follow\clash、%USERPROFILE%\.config\clash、注册表 Run/FlClash
- 相关机场配置：XFLTD (cctvclient 机场链接)、魔戒、二合一通用、精靈學院
- XF机场特点：节点连接10分钟时效，本地缓存节点可用
- 配置文件ID：320141415218679808 (XFLTD)、320141250697105408 (魔戒)、323413412883206144 (二合一)、333064163368636416 (精靈學院)
- 覆写脚本：339618059322920960.js (XFLTD分组规则)
- FlClash 数据目录：AppData\Roaming\com.follow\clash\（已清理）
- 旧配置备份：AppData\Roaming\com.follow\clash-backup-20260817
- @2026-08-26 [笔记本] opencode 模型配置简化：删除 agent.plan.model (deepseek-v4-flash-vision-exp) 和 agent.build.model (mimo-v2.5)，plan/build 统一继承全局 model (MiMO V2.5)；软路由无需改动（已是继承全局），已 docker restart 生效。原因是 flash/mimo 额度消耗太快 #配置 #模型 #软路由
