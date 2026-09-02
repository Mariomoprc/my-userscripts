# Errors & Fixes

---

## [ERR-20260701-001] Conversation history too large to compact

**Logged**: 2026-07-01
**Severity**: high
**Status**: resolved
**Area**: compaction, context-overflow

### Error Message
```
Error from provider: This endpoint's maximum context length is 1048576 tokens. However, you requested about 1109221 tokens (1077221 of text input, 32000 in the output). Please reduce the length of either one, or use the context-compression plugin to compress your prompt automatically.

Compaction: Conversation history too large to compact - exceeds model context limit
```

### Root Cause
1. 上下文增长到 1.1M tokens，超过模型 1M 限制
2. OpenCode 尝试压缩，但压缩本身也需要调用模型
3. 压缩请求也超限，导致压缩失败
4. 移除 ACP 后，没有主动的上下文管理

### Fix
在 `~/.config/opencode/opencode.jsonc` 中优化 compaction 配置：
```jsonc
"compaction": {
  "auto": true,
  "prune": true,
  "reserved": 200000
}
```

### Prevention
- `prune: true` 自动裁剪旧工具输出，减缓上下文膨胀
- `reserved: 200000` 提前触发压缩，留缓冲区避免溢出
- 定期检查对话长度，避免长时间运行的会话

### Metadata
- Source: debug_session
- Tags: compaction, context-overflow, tool-output, reserved, prune
- Pattern-Key: context-overflow-compaction-failure

---

### [ERR-20260708-001] Android 启动闪烁修复陷入死循环

**现象**：修复 Operit AI 启动闪烁，4 轮迭代每次引入新的视觉问题
- 第 1 轮：紫色状态栏 → 加 windowBackground=白 → 消除紫但出现白闪
- 第 2 轮：白色闪烁 → setTheme(StartDark/StartLight) before super.onCreate → 仍闪白
- 第 3 轮：decorView.setBackgroundColor → 内容区域仍闪白
- 第 4 轮：SplashScreen API → 编译成功但仍有白闪

**根因**：starting window 由系统在任何代码执行前创建，`setTheme()` 无法影响。只有 SplashScreen API 能控制，但还需要配合 ComposeView 背景色、内容区域初始化时序等。

**修复**：用户决定放弃修复。启动闪烁是系统级行为，非核心功能问题。

**教训**：
1. 系统级 UI 行为（starting window/splash screen）优先用官方 API，不要 hack
2. 修 3 次还没解决 → 停下来评估 ROI
3. 闪烁问题优先级低于功能正确性，应在确认核心功能稳定后再考虑

### Metadata
- Source: android_theme_fix_session
- Tags: android, splash, startup-flicker, theme, over-engineering
- Pattern-Key: android-startup-flicker-fix-deadloop
