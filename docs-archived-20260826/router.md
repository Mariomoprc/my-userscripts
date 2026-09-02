# 软路由配置

## 基本信息

| 项目 | 值 |
|------|-----|
| 系统 | iStoreOS 24.10.6 (OpenWrt) |
| 设备型号 | Lunzn FastRhino R66S |
| 内核 | 6.6.127 |
| 内网地址 | `{env:ROUTER_IP}` |
| 管理后台 | `{env:ROUTER_URL}` |
| 用户名 | `{env:ROUTER_USER}` |
| 密码 | `{env:ROUTER_PASS}` |
| 远程域名 | `https://istore-028b1bbc6847-30.kooldns.cn:443` (DDNSTO) |
| SSH 端口 | 22 |

## SSH 连接

| 项目 | 值 |
|------|-----|
| 内网连接 | `ssh router`（走 `~/.ssh/config`，免密用 `id_router` 密钥）|
| 等效全写 | `ssh -i ~/.ssh/id_router {env:ROUTER_USER}@{env:ROUTER_IP} -p 22` |
| 密码 | `{env:ROUTER_PASS}`（免密已配好，仅作兜底） |
| 说明 | 内网直连；外网需穿透（DDNSTO/ZeroTier）后连接 |

## 存储

| 挂载点 | 容量 | 路径 |
|--------|------|------|
| 系统盘 (mmcblk0) | 29.7 GiB | 使用率 17% |
| 外接硬盘 (WD Elements 2621) | 1.8 TiB | `/mnt/usb4-1` (使用率 13%) |

## 运行服务

| 服务 | 状态 |
|------|------|
| OpenClash (mihomo) | ✅ 运行中（TUN 模式，Fake-IP，7890/7891/7892/7893/9090；核心 **Mihomo v1.19.29 稳定版**，2026-08-11 从 alpha 切换，旧核心备份 `/root/clash_meta.alpha.bak`） |
| Tailscale | ✅ 运行中（v1.82.5，subnet router 广告 192.168.3.0/24，exit node） |
| zram swap | ✅ 已启用 512MB（lzo 压缩，`system.@system[0].zram_enabled=1` / `zram_size_mb=512`） |
| Syncthing | ✅ 运行中（照片备份到 `/mnt/usb4-1/photos-backup`，端口 8384/22000） |
| SAMBA | ✅ 已启用 → `smb://{env:ROUTER_IP}/op` |
| WEBDAV | ✅ 已启用 |
| Aria2 | ✅ 已启用 → `http://{env:ROUTER_IP}/ariang` |
| Docker | ✅ 运行中 (根目录: `/mnt/usb4-1/docker`, 版本: 27.3.1) |
| DDNSTO | ✅ 正常 |

## Docker 容器：opencode（远程唤醒/管理入口）

| 项目 | 值 |
|------|-----|
| 容器名 | `opencode` |
| 镜像 | `opencode-arm64:1.18.21-full`（含 ssh/scp/curl/git/python3/jq 全套工具） |
| 端口映射 | `0.0.0.0:4096->4096/tcp` |
| HTTP 访问 | `http://192.168.3.100:4096`（返回 401，需 opencode serve 密码认证） |
| 容器内工具 | 有 `ssh`、`curl`；**无 `etherwake`**（在宿主机） |
| 宿主 WOL 工具 | `/usr/bin/etherwake`（发 WOL 魔术包用） |
| 工作目录 | `/root`（**必须**加 `-w /root`，否则默认 `/` 导致 inotify 监视整个根目录，网页卡顿） |

> ⚠️ **USB 硬盘掉盘教训（2026-08-12）**：两个 USB 口同时接 WD 硬盘 + 平板会**供电不足**导致硬盘掉盘（SCSI `Unit Not Ready`/ASC 0x44）。且内核 USB autosuspend 默认 2s 会让空闲硬盘休眠卡死。
> - **平板用完即拔**，勿与硬盘长时间同接
> - 已加防复发：`/etc/rc.local` 对 vendor 1058 设备设 `power/control=on` + `autosuspend_delay_ms=-1`；开机挂载重试脚本 `/etc/usb-mount-retry.sh`（spin-up 超时自动 rescan）
> - 硬盘彻底卡死时**拔电源重启**可完全复位（USB 软复位/SCSI rescan 无效）

> ⚠️ 远程唤醒笔记本的链路：宿主机 `etherwake -i br-lan <MAC>`。若想经容器内触发，容器无 etherwake，需 `docker exec` 宿主或容器内 `ssh root@192.168.3.100` 执行。

## Docker 特殊说明

### 代理配置（拉取外网镜像）

国内拉取 `ghcr.io` 镜像极慢（超时/几KB），需配置 Docker daemon 代理：

```bash
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'EOF'
{
  "proxies": {
    "http-proxy": "http://127.0.0.1:7890",
    "https-proxy": "http://127.0.0.1:7890"
  }
}
EOF
/etc/init.d/dockerd restart
```

或使用 DaoCloud 镜像加速（免代理）：
- `ghcr.m.daocloud.io/org/repo:tag`

### 环境限制

iStoreOS 基于 OpenWrt，默认无 Python/Node/PHP，只有 BusyBox。通过 SSH 部署脚本时优先用 shell + curl。

### SSH 执行命令注意

Windows 通过 plink.exe 传递复杂 shell 命令时引号易丢失，推荐 base64 编码脚本后传输：

```powershell
$script = 'ifconfig -a'
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($script))
& plink -ssh -pw {env:ROUTER_PASS} root@{env:ROUTER_IP} "echo $b64 | base64 -d | sh"
```

## OpenClash 自定义规则

**文件**：`/etc/openclash/custom/openclash_custom_rules.list`（YAML 格式）
**启用**：`uci set openclash.config.enable_custom_clash_rules=1`（默认关闭）
**生效**：删 `/tmp/openclash.change` + 重启 OpenClash（完整模式合并规则）

### 当前生效规则

```yaml
# 内网直连（必须在最前面，防 OpenClash TUN 拦截 localhost）
- IP-CIDR,127.0.0.0/8,🎯 全球直连
- IP-CIDR,172.16.0.0/12,🎯 全球直连
- IP-CIDR,192.168.0.0/16,🎯 全球直连
- IP-CIDR,10.0.0.0/8,🎯 全球直连
# Syncthing
- PROCESS-NAME,syncthing,DIRECT
- PROCESS-NAME,syncthin,DIRECT
- DST-PORT,22000,DIRECT
- DST-PORT,8384,DIRECT
- DST-PORT,21027,DIRECT
- DOMAIN-KEYWORD,syncthing,DIRECT
- DOMAIN-SUFFIX,syncthing.net,DIRECT
# opencode API（Cloudflare 后端，直连 TLS 握手失败）
- DOMAIN-SUFFIX,opencode.ai,XFLTD
# GitHub（直连不稳定）
- DOMAIN-SUFFIX,github.com,XFLTD
- DOMAIN-SUFFIX,github.io,XFLTD
- DOMAIN-SUFFIX,githubapp.com,XFLTD
- DOMAIN-SUFFIX,githubusercontent.com,XFLTD
- DOMAIN-SUFFIX,githubassets.com,XFLTD
# Tailscale 域名直连
- DOMAIN-SUFFIX,tailscale.com,🎯 全球直连
- DOMAIN-SUFFIX,tailscale.io,🎯 全球直连
- DOMAIN-SUFFIX,headscale.net,🎯 全球直连
- DST-PORT,41641,DIRECT
# Tailscale DERP 中继 IP 直连（覆盖所有 DERP 服务器）
- IP-CIDR,172.237.0.0/16,🎯 全球直连
- IP-CIDR,2607:f7d0:a000::/48,🎯 全球直连
```

> ⚠️ mihomo 规则类型是 `DST-PORT`（不是 `DEST-PORT`），写错会导致 fatal 错误（ERR-20260808-015）。
> ⚠️ 规则之间不能有空行。
> ⚠️ 代理组名必须用实际名称（当前为 `XFLTD`），不是通用名。

## Tailscale 修复（局域网路由劫持）

Tailscale subnet router 广告 192.168.3.0/24 会在 `table 52` 添加路由，劫持本机局域网访问。三重保险修复（LRN-20260808-135）：

```bash
# rc.local
ip rule del from all to 192.168.3.0/24 lookup main pref 100 2>/dev/null
ip rule add from all to 192.168.3.0/24 lookup main pref 100

# /etc/tailscale/up.sh（tailscale up 后执行）
# /etc/openclash/custom/openclash_custom_firewall_rules.sh（OpenClash 启动时执行）
# 同上规则，三处持久化
```

## OpenClash 配置管理

- **源配置**：`/etc/openclash/config/二合一.yaml`（OpenClash 每次重启/订阅更新时从此生成）
- **根目录配置**：`/etc/openclash/二合一.yaml`（mihomo 实际加载，由源配置 + yml_change.sh 生成）
- **快速模式**：`/tmp/openclash.change` 控制，删该文件强制完整模式（完整模式才执行 overwrite/自定义规则）
- **provider 文件**：`/etc/openclash/proxy_provider/Provider_*.yaml`（http 类型自动更新，file 类型本地缓存）
- **proxy认证**：`authentication: Clash:vOknt8m0`（7890/7893 代理需认证）
