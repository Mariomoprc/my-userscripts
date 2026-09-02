# ROUTER-MEMO（软路由备忘录）

对话中出现**有长期价值的信息**（配置变更、决策、偏好、账号/IP/目录等）时，AI **自动**追加到这里；用户说"记住 XX"也立即写。每条一行，短而具体，可加标签。

**格式**：`- @YYYY-MM-DD [软路由] <内容> #标签`

**检索**：用户问"以前记住的 XX"时，先 grep 本文件 + 笔记本端 `MEMO.md` 再回答。

---

- @2026-08-10 [软路由] 初始化本备忘录文件 #备忘
- @2026-08-10 [软路由] 决策：放弃 Obsidian 笔记软件方案，采用纯 MD 跨对话备忘录（AGENTS.md 规则 + .learnings/ 同步） #决策
- @2026-08-10 [软路由] 备忘录机制：两端 AGENTS.md 含「跨对话备忘录」章节（自动记录+记忆检索），软路由写 ROUTER-MEMO.md、笔记本写 MEMO.md，经 syncthing 双向同步 #配置 #备忘
- @2026-08-10 [软路由] gowebdav 服务：端口 6086，账号 backup，根目录 /mnt/usb4-1/Backup，可写，局域网+Tailscale 可访问，allow_wan=0 #服务 #账号
- @2026-08-10 [软路由] 笔记本 AGENTS.md 已备份为 AGENTS.md.bak-memo（本次改动前） #配置
- @2026-08-10 [软路由] 约定：需手机查看的交付物（下载/生成/修改的文件）一律写入宿主移动硬盘可见目录（/mnt/usb4-1/download/ 或 Backup/），容器内部目录 SMB 不可见；oc-remote 纯对话/终端无文件管理，文件靠手机文件管理器+SMB 看 #约定 #决策
- @2026-08-10 [软路由] 豆包输入法 Windows 版上线监控已建。firecrawl monitor ID: 019fe964-cd37-77dd-bbc6-c24ab4d8240a,邮箱 mario.mo.prc@foxmail.com,每天检查一次,页面出现"Windows版下载"时发邮件。状态:active #监控
- @2026-08-10 [软路由] 识图方案:当前模型 deepseek-v4-flash 不支持图片,换 opencode-go/mimo-v2.5 识图。操作:手机 web 新会话选 mimo-v2.5 再上传图片 #识图 #模型
- @2026-08-10 [软路由] opencode 配置去掉硬编码模型:全局 model 字段和 agent(plan/build) 的 model 均已移除,与笔记本一致,模型在 web/TUI 界面手动切换。变更文件:/root/.config/opencode/opencode.json(需重启 opencode serve 生效) #配置 #模型 #决策
- @2026-08-11 [软路由] Windows-MCP 安装计划文档已写入笔记本桌面 (C:\Users\pass\Desktop\Windows-MCP安装执行计划.md)，待笔记本 OpenCode 执行；选型 CursorTouch/Windows-MCP(6.7k⭐)+skill rein3400/windows-computer-use，适配 flash 无视觉用 UIA 树 #服务 #决策
- @2026-08-11 [软路由] 备份脚本：宿主 /root/opencode-backup.sh，tar 打包 /etc/opencode 排除 auth.json/data/node_modules/.git/stversions/bak，输出 /mnt/usb4-1/Backup/opencode-config-*.tar.gz 保留7份，cron 每日04:00（避开03:00重启） #配置 #服务 #备份
- @2026-08-11 [软路由] 旧备份包曾泄露 auth.json API key 明文（已隔离至 Backup/quarantine/），建议下次轮换 key #安全 #备份
- @2026-08-11 [软路由] 新增 executor 子代理（agents/executor.md，ds-flash 执行者，禁写记忆文件）+ opencode.json subagent_depth:2，长任务自动委托 #配置 #决策
- @2026-08-11 [软路由] AGENTS.md 加「记忆库治理」4条（>300KB归档50%旧条目到archive/、Promotion≥3次→AGENTS.md/docs、每月review、skill抽取），记住.md 加 promotion/治理/抽取/统计环节 #配置 #记忆
- @2026-08-11 [软路由] 对齐笔记本最新架构（共享会话更新版）：删除 executor.md（executor 与 ds 主模型同模型无价值，笔记本已删），保留 subagent_depth:2（防上下文膨胀），主模型保持 deepseek-v4-flash #配置 #决策
- @2026-08-11 [软路由] 备份脚本补排除 syncthing 元数据（.learnings/.stfolder、.stignore、.stversions*），最新包 780K 全排除验证通过 #配置 #备份
- @2026-08-11 [软路由] 容器重建事故复盘：docker run 重建中途中断导致容器打炸，笔记本 OC 接手修复——重建镜像 opencode-arm64:1.18.16-full（node:20-slim+release 二进制+apt 补装 ssh/curl/git/python3+SSH 密钥软链到 data/ssh-backup），已验证 SSH 宿主+笔记本双通道、4096 服务、exa remote MCP 正常 #事故 #修复 #服务
- @2026-08-11 [软路由] 遗留项：OPENCODE_ENABLE_EXA / OPENCODE_EXPERIMENTAL_PLAN_MODE 在 .env 但未注入容器 env（1.18.16 不自动加载 .env，需 docker run -e 注入），决策暂缓待下次维护窗口 #配置 #决策
- @2026-08-12 [软路由] opencode.json 彻底移除 playwright MCP 配置块（原 enabled:false），浏览器兜底仅剩平板 CDP cdp_tool.py #配置
- @2026-08-12 [软路由] 平板CDP恢复：192.168.3.21:9223 浏览器仍活，但容器 /root/cdp_tool.py 与 /root/.ssh/tablet_termux 丢失（备份只含 /etc/opencode 不含 /root）；重建 cdp_tool.py（apt 装回 python3-websockets），功能全通 #配置
- @2026-08-12 [软路由] 平板SSH密钥恢复：宿主机 /mnt/usb4-1/docker/overlay2/<旧层>/diff/root/.ssh/tablet_termux 残留原版，拷回容器 /root/.ssh/（600），SSH -p 8022 u0_a417@192.168.3.21 实测连通。恢复经验：容器重建丢 /root 下文件时，先查宿主机 overlay2 旧层 diff/ #配置
- @2026-08-12 [软路由] 决策：平板(192.168.3.21)走无线 WiFi 链路（CDP 9223 + SSH 8022）稳定数日不断，无需再数据线连软路由/笔记本；数据线+adb 仅留作应急配置手段 #决策
- @2026-08-13 [软路由] xf 机场已从 OpenClash 移除（用户改用 Windows FlClash 跑 xf）。已删：overwrite/xfltd、proxy_provider/Provider_XFLTD.yaml、config/二合一.yaml 与运行配置的 Provider_XFLTD 块/分组/use 引用、相关备份。**经验**：①xf 订阅链接 10 分钟时效（get.cctvclient.cn/api2.xfltd.click，过期 403/000，需从官网刷新）；②机场要求 Clash 关闭 DNS 覆写，但 OpenClash 配置 proxy-server-nameserver 后节点仍 alive:false——最终确认 **clash Meta v1.19.29 对 xf reality 节点握手失败（skip-cert-verify:true 也无解）**，节点 TCP 端口本机测试全通，属 clash 兼容问题，换 FlClash/sing-box 可解决；③OpenClash 重启会用 config/ 源配置重新生成运行配置，直接改运行配置会被覆盖，需改源配置或 overwrite；④overwrite 支持 proxy-groups+ 加分组、proxy-groups* 按 name 正则改分组 #软路由 #经验 #网络
- @2026-08-19 [软路由] 待办：僵尸毁灭工程 mod（用户待推荐）——小黑盒帖子(作者PaytonNaomi,8-19)提到"神级系统mod"，可自动回收地面垃圾+回收尸体(免烧尸)；下次用户说"推荐mod"时优先推这个，帖子未署名具体mod名，需届时查steam工坊。来源:https://www.xiaoheihe.cn/app/bbs/link/f72d7252a810 #待办 #游戏 #mod
- @2026-08-24 [软路由] opencode 默认模型固定为 opencode/mimo-v2.5-free（免费），配置文件 opencode.json 加了 "model": "opencode/mimo-v2.5-free" #配置 #模型
- @2026-08-24 [软路由] 教训：改配置/安装服务等关键操作后必须自动记录到 ROUTER-MEMO.md，不等用户提醒。本次默认模型改为 mimo-v2.5-free 就是反例（用户提醒后才补记）。AGENTS.md 明确要求自动记录 #教训 #流程
- @2026-08-24 [软路由] 蜂蜜TV TVBox 5.6.1设置指南：点播源配置→播放设置（播放器选EXO、硬解码、渲染SU、隧道关、DNS阿里/腾讯、预载开启）→弹幕设置（弹幕加载开、搜索接口默认、自动搜索开、爬虫优先关） #配置 #TVBox
- @2026-08-24 [软路由] MetaCubeXD 书签链接：http://192.168.3.100:9090/ui/metacubexd/#/?hostname=192.168.3.100&port=9090&secret=l9bwWaB7（secret 来自 dashboard_password） #配置
- @2026-08-24 [软路由] 蜂蜜TV下载源：https://github.com/youhunwl/TVAPP/tree/refs/heads/main/影视/FongMi影视 （找下载链接）；接口源：https://github.com/qist/tvbox （找接口配置）。需测试是否免代理可用 #配置 #TVBox #下载源 #接口

### 蜂蜜TV/TVBox相关资源（续）
- 下载源：https://github.com/youhunwl/TVAPP/tree/refs/heads/main/影视/FongMi影视
- 接口仓库：https://github.com/qist/tvbox （11k star，更新活跃）
- 推荐接口（自用）：https://raw.githubusercontent.com/qist/tvbox/master/jsm.json
- 推荐接口（饭太硬）：https://raw.githubusercontent.com/qist/tvbox/master/fty.json
- 推荐接口（潇洒）：https://raw.githubusercontent.com/qist/tvbox/master/xiaosa/api.json
- 备用域名：https://qist.wyfc.qzz.io/jsm.json
- 以上GitHub链接均可直连，不需要代理 #时效

### 蜂蜜TV下载更新（修正）
- TV端APK已下载到：/mnt/usb4-1/download/FM影视TV端-64位_v5.6.1_正式版.apk (89.8M)
- 平板用leanback（TV端），不用mobile（手机端）
- qist/tvbox仓库的接口地址需要raw格式才能用
- @2026-08-24 [软路由] MCP修复：context7/tavily/firecrawl二进制未安装导致MCP连接失败。修复：npm install -g @upstash/context7-mcp @mcptools/mcp-tavily firecrawl-mcp，重启opencode serve后正常。教训：容器重建后需检查MCP二进制是否安装 #修复 #MCP #教训
- @2026-08-25 [软路由] opencode模型改为mimo-v2.5，回退mimo-v2.5-free #配置
- @2026-08-25 [软路由] 添加small_model配置：opencode/mimo-v2.5-free用于标题生成 #配置

- @2026-08-26 [软路由] SSH密钥修复：容器重建后authorized_keys中的opencode-container公钥是旧的（指纹不匹配），导致密钥认证失败。解决：用sshpass密码认证登录→备份authorized_keys→删除旧公钥→添加当前容器公钥（id_ed25519.pub）。密钥认证恢复 #SSH #修复 #容器重建

- @2026-08-26 [软路由] OX Alpha测试完成：openrouter.ai→fake-ip 198.18.0.10（走代理✅），opencode.ai→fake-ip 198.18.0.5（走代理✅）。现有OpenClash规则集已包含AI和OpenAi规则，应该已覆盖AI API域名。模型ID：openrouter/stealth/ox-alpha 或 opencode/x-preview-f-free，免费窗口约一周（截至2026-08-27） #OX-Alpha #测试 #代理 #配置

- @2026-08-26 [软路由] opencode.json权限已全开：bash permission从"ask"改为"allow"，不再弹出确认 #配置 #权限
