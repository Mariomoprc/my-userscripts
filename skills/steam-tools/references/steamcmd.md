# steamcmd 安装与用法

## 说明
Valve 官方命令行 Steam 客户端（无 GUI），用于无人值守批量下载游戏/服务器/Workshop 内容。日常 mod 管理以 Steam GUI 订阅为主，steamcmd 是**批量自动化下载的备选方案**。

## 安装（已在本机完成）

- **位置**：`C:\Steam\steamcmd\steamcmd.exe`
- **下载源**：`https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip`
- **首次运行**：自动更新自身（下载 ~43MB 更新包），完成后进入可用状态
- **代理坑**：下载和登录**走代理会 SSL/TLS 握手失败**，必须清空代理直连：
  ```powershell
  $env:HTTP_PROXY=""; $env:HTTPS_PROXY=""
  ```

## 基本用法

命令以 `+` 前缀链式拼接，最后 `+quit` 退出。

### 匿名登录（免费内容）
```powershell
steamcmd +login anonymous +quit
```

### 下载单个 Workshop mod
```powershell
steamcmd +login anonymous +workshop_download_item <appid> <modid> +quit
```
- 下载到 `C:\Steam\steamcmd\steamapps\workshop\content\<appid>\`
- 注意：steamcmd 有自己的下载目录（steamcmd\steamapps\），**不是** `C:\Steam\steamapps\workshop`。要改路径用 `+force_install_dir <path>`

### 批量下载合集
1. 用 GetCollectionDetails API 展开合集得到全部 item id（见 workshop.md）
2. 循环执行 `workshop_download_item`（可生成一个脚本）
3. 第三方工具（如 `changhe3/swd`）可自动生成合集批量命令

### 下载/更新游戏本体或专用服务器
```powershell
steamcmd +login anonymous +app_update <appid> +quit
# 验证完整性加 validate
steamcmd +login anonymous +app_update <appid> validate +quit
```

## 常见错误

| 错误 | 解决 |
|------|------|
| `SSL/TLS connection failed` | 清空代理直连 |
| `Error: Steam is running` | 关闭 Steam 客户端进程 |
| `missing permissions / auth failure` | 该内容需真实账号登录（`+login <user>`） |
| 下载后游戏不识别 | mod 仍需游戏内启用/排序，steamcmd 只负责下载 |

## 局限

- 匿名登录仅限免费内容
- 付费/订阅内容需账号 + 可能 Steam Guard 验证
- 下载 ≠ 激活：下载完成后仍需游戏内启用、排序、必要时改配置（default.txt / Junction 等）
- 不自动更新 mod：需定期重跑下载命令获取新版本
