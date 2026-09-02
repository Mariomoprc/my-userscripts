# 笔记本语音输入 — 已清理（2026-08-29）

> 已按你要求删掉 PushToTalk / Whisper Input / CapsWriter-Offline，Win+H 保留为系统自带。

## 清理结果

| 工具 | 路径 | 结果 |
|------|------|------|
| CapsWriter-Offline v2.6 | `C:\Users\pass\CapsWriter-Offline` (99MB+模型 700MB) | 已删 |
| PushToTalk v1.6.1 | `C:\Users\pass\AppData\Local\PushToTalk` | 已删（上次） |
| Whisper Input v1.5.0 | `C:\Program Files\Whisper Input` | 已删（上次） |
| 临时 | `AppData\Local\Temp\opencode\caps` / `C:\TempCapEx` | 已删 |
| 桌面快捷 | CapsWriter-Server/Client.lnk | 已删 |

验证：进程已清，Test-Path CapsWriter-Offline = False。

## 后续建议

- 小声最像豆包：VoxType（豆包 Seed-ASR 2.0，直接对标）或 等豆包 Windows 正式版
- 离线：CapsWriter 已验证你 X7 358H 0.6s 能跑，但 Realtek MME error 1 需改 16位16000Hz+关独占
- 系统自带：`Win+H` 随时可用（有 NPU 13 TOPS，但中文小声仍一般，需联网）
