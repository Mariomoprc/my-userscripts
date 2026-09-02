# 平板搜索节点（Huawei MatePad 192.168.3.21）

软路由（192.168.3.100 容器）已把闲置华为平板配成**真实浏览器搜索节点**。本机 opencode 可通过软路由间接调用，作为 Firecrawl/Tavily 配额耗尽或 JS 渲染/反爬页的补充搜索手段。

## 资源
- 平板：Huawei MatePad（鸿蒙4.0，IP `192.168.3.21` 已在主路由绑定固定）
- headless Chromium CDP：`192.168.3.21:9223`（真实浏览器，能渲染 JS / 过部分反爬）
- SSH 管理通道：`192.168.3.21:8022`（用户 u0_a417，密钥在软路由 `/root/.ssh/tablet_termux`）
- 开机自启 + 后台保活已配置，重启平板自动恢复

## 怎么用（在软路由容器执行）
```
python3 /root/cdp_tool.py search "关键词"     # Bing 搜索，返回 标题+URL+摘要
python3 /root/cdp_tool.py fetch <URL>        # 抓取 JS 渲染页面标题+正文
python3 /root/cdp_tool.py list               # 当前 CDP 页面列表
```
本机（笔记本）若要用，需先 SSH 到软路由容器（`ssh root@192.168.3.100`）再执行上述命令。

## 注意事项
- 偶发：search 偶尔标题为空（Bing 动态渲染差异），重试或换关键词即可
- 平板息屏冻结偶发：服务掉线时到软路由 `adb devices` 唤醒或跑 `bash oc_start.sh`
- 完整经验见软路由 `.learnings/ROUTER-LEARNINGS.md`（LRN-20260809-006/007/008）
