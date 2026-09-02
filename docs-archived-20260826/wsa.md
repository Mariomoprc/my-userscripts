# WSA 安卓子系统

- **来源**：MustardChef/WSABuilds
- **安装路径**：`C:\WSA`
- **版本**：Windows_11_2407.40000.4.0_LTS_7_HOTFIX_1
- **状态**：微软已于 2025-03 终止官方支持，社区版继续维护
- **GitHub**：https://github.com/MustardChef/WSABuilds

## 安装

1. 从 Releases 下载对应架构的 7z 包
2. 解压到目标目录（如 `C:\WSA`）
3. 以管理员身份运行 `Install.ps1`
4. 重启后开始菜单出现「Windows Subsystem for Android」

## 基础配置

**开发者模式**：
- 打开 WSA 设置 → 开发者 → 开启
- ADB 端口默认 `58526`

**内存分配**（WSA 设置 → 性能）：
- 日常：2-4 核 / 4-6GB
- 游戏：4-6 核 / 6-8GB
- **不超过物理内存 50%**

**GPU 加速**：WSA 设置 → 图形 → 开启硬件加速

## 火绒白名单

火绒 → 防护中心 → 高级防护 → **隐私设备保护** → 自动处理规则：

| 保护项目 | 程序路径 | 处理方式 |
|---------|---------|---------|
| 摄像头保护 | `C:\WSA\WsaSettings.exe` | 自动允许 |
| 麦克风保护 | `C:\WSA\WsaSettings.exe` | 自动允许 |
| 摄像头保护 | `C:\WSA\WsaClient.exe` | 自动允许（备用） |
| 麦克风保护 | `C:\WSA\WsaClient.exe` | 自动允许（备用） |

## 游戏兼容

### ✅ 推荐

| 游戏 | 说明 |
|------|------|
| 明日方舟 (Arknights) | GTX 1650 稳定 60FPS |
| Among Us | 键盘/手柄都支持 |
| Alto's Adventure / Odyssey | 完美运行 |
| A Dance of Fire and Ice | 键盘支持 |
| Arcaea | 音乐节奏 |
| Asphalt 8 | 键盘支持 |
| 8 Ball Pool | 完美 |
| Archero | 需 GMS |
| 2/3/4 Player Games | 推荐触屏 |

### ⚠️ 不推荐/有问题

| 游戏 | 问题 |
|------|------|
| 原神 / 崩坏 | 重度 3D，发热严重，需高配 GPU |
| Asphalt 9 | 键盘不支持 |
| Angry Birds Epic | 低 FPS，体验差 |
| 王者荣耀 | 触控操作不便 |
| 竞技类手游 | 多指操控映射不理想 |

### 资源占用对比

WSA 基于 Hyper-V，比 BlueStacks 等模拟器**省 40-50% 内存**。

## 常见问题

- **应用不开 / 卡启动画面**：需打 ARM 翻译层 Hotfix（LTS #7 Hotfix 版已修复）
- **VPN 断连**：窗口失焦后 WSA 触发 onTrimMemory，VPN 可能被回收
- **Ctrl+Backspace 打出奇怪字符**：WSA 已知键盘映射问题
- **APK 装不上**：检查架构（x86_64 可跑 arm64 应用，但 arm64 设备不能用 x64 包）；开启开发者模式
