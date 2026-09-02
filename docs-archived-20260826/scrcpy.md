# Scrcpy 安卓镜像工具

- **路径**：`C:\Users\pass\OneDrive\tools\Android\Scrcpy-镜像\scrcpy.exe`
- **版本**：v4.1
- **用途**：投屏并控制安卓设备（USB 或无线连接）
- **GitHub**：https://github.com/Genymobile/scrcpy
- **免控制台运行**：`scrcpy-noconsole.vbs`（默认 `-S -w`：黑屏投屏+不息屏）
- **内含 adb**：自带 adb.exe，无需单独安装
- **快捷方式**：`Scrcpy.lnk`（目录内 + 任务栏固定）

**快捷方式位置**：
- 目录内：`C:\Users\pass\OneDrive\tools\Android\Scrcpy-镜像\Scrcpy.lnk`
- 任务栏：`%APPDATA%\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\scrcpy.lnk`
- 升级后两个都需重建（指向根目录 `scrcpy-noconsole.vbs`）

**vbs 参数说明**：
- `-S` — 启动时立即熄灭平板屏幕（黑屏投屏）
- `-w` — 不息屏，防止设备休眠
- 官方 vbs 不包含这些参数，升级后需手动加回

**注意 -S 退出行为**：
- `-S` **只关闭启动时的屏幕，退出时不自动恢复亮屏**
- `-w` 退出时恢复的是 stay-awake 设置，不是屏幕电源状态
- 需退出后手动唤醒屏幕（见下方包装脚本示例）

**典型用法**：
- 任务栏点击启动（`scrcpy-noconsole.vbs`，含 `-S -w`）
- `scrcpy.exe` — USB 连接
- `scrcpy.exe --tcpip=192.168.x.x` — 无线连接
- `scrcpy.exe -m 1024` — 指定分辨率
- `scrcpy.exe --record file.mp4` — 录屏
- `scrcpy.exe --stay-awake` — 不息屏
- `scrcpy.exe -S -w` — 手机黑屏运行
- `scrcpy.exe --ignore-video-encoder-constraints` — 绕过编码器限制强制撑满（v4.1 新增）

**退出屏幕恢复方案**：
- 启动 `-S` 熄屏后，退出时需主动发送 adb 命令唤醒屏幕
- **方法 1（唤醒）**：`adb shell input keyevent KEYCODE_WAKEUP`
- **方法 2（锁屏+唤醒）**：`adb shell input keyevent 26`（模拟 POWER 键，会触发锁屏）
- 包装脚本示例（`scrcpy-with-restore.bat`）：
  ```
  @echo off
  scrcpy.exe -S -w
  if %errorlevel% equ 0 (
      adb shell input keyevent KEYCODE_WAKEUP
  )
  ```
- 也可修改 VBS 直接嵌入唤醒逻辑（需将 `Run` 第三个参数改为 `true` 等待退出后再执行 adb 命令）

**常见问题**：

- **任务栏图标变白色**：快捷方式指向的 `.ico` 文件丢失或损坏。从 `scrcpy.exe` 提取图标重建：
  ```powershell
  Add-Type -AssemblyName System.Drawing
  $icon = [System.Drawing.Icon]::ExtractAssociatedIcon("scrcpy.exe")
  $stream = [System.IO.File]::Create("scrcpy.ico")
  $icon.Save($stream)
  $stream.Close()
  ```
  然后右键任务栏图标 → 从任务栏取消固定，再重新固定 `scrcpy-noconsole.vbs`。或重启 Explorer 刷新图标缓存：`ie4uinit.exe -show; Stop-Process -Name explorer -Force; Start-Process explorer.exe`。

**升级流程**：
1. 下载 `scrcpy-win64-v4.x.zip`
2. 清空目标目录旧文件（保留 .vbs 和 .lnk）
3. 解压新版 zip 到目标目录
4. 重建快捷方式路径（目录内 + 任务栏）
5. 加回 vbs 的 `-S -w` 参数
6. 旧版文件夹被 OneDrive 锁定时：`takeown /f path /r /d y` → `icacls path /grant user:F /t` → `Remove-Item -Recurse -Force`
