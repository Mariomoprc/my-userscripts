; doubao-space-push-to-talk.ahk — 按住空格说话，松手上屏（豆包输入法 Windows 版增强 / 通用空格桥接）
; 状态：豆包输入法 Windows 版官网仍“敬请期待”（2026-08-29 截图），此脚本待官方发布后可用；当前主线推荐 PushToTalk 云端直连 Seed-ASR（自带空格阈值）
; 适用（待发布后）：已安装豆包输入法 Windows 版（语音快捷键设为 右Alt 长按）
; 原理：长按空格(>220ms) → 模拟按住 右Alt 触发豆包语音；短按空格保持正常输入
; 需 AutoHotkey v2
; 安装：https://www.autohotkey.com/download/  → 安装 v2 → 双击本文件运行 → 托盘出现 H 图标即生效
; 开机自启：Win+R → shell:startup → 把本文件快捷方式放进去
; 替代：当前可用 PushToTalk（https://github.com/liujuntao123/push-2-talk）直接支持空格长按，无需此脚本

#Requires AutoHotkey v2.0
#SingleInstance Force
Persistent true
A_IconTip := "豆包空格按住说话 (长按空格=语音, 短按=空格)"

; —— 配置区 ——
holdThreshold := 220        ; 长按判定阈值 ms（200-300 推荐，空格高频键建议 220）
doubaoKey := "RAlt"         ; 豆包语音键，需与豆包设置里一致（默认 右Alt 长按）
debugTip := false           ; 设 true 显示调试提示

; —— 状态 ——
isHolding := false
isVoice := false
pressTime := 0

; 空格按下
Space::
{
    global isHolding, isVoice, pressTime, holdThreshold, doubaoKey, debugTip
    if isHolding
        return
    isHolding := true
    isVoice := false
    pressTime := A_TickCount
    ; 延时判定是否为长按
    SetTimer(CheckHold, -holdThreshold)
}

; 空格松开
Space Up::
{
    global isHolding, isVoice, doubaoKey, debugTip
    SetTimer(CheckHold, 0)
    if !isHolding
        return
    isHolding := false
    if isVoice {
        ; 长按语音：松开时释放豆包键，结束语音
        try Send("{" doubaoKey " up}")
        if debugTip
            ToolTip("🎤 语音结束")
        SetTimer(() => ToolTip(), -800)
        isVoice := false
    } else {
        ; 短按：补一个空格
        Send("{Space}")
    }
}

CheckHold() {
    global isHolding, isVoice, pressTime, doubaoKey, holdThreshold, debugTip
    if !isHolding || isVoice
        return
    elapsed := A_TickCount - pressTime
    if elapsed < holdThreshold
        return
    ; 判定为长按语音
    isVoice := true
    if debugTip
        ToolTip("🎤 按住空格说话… 松手上屏")
    try Send("{" doubaoKey " down}")
}

; —— 托盘菜单 ——
A_TrayMenu.Delete()
A_TrayMenu.Add("🎤 长按空格说话已启用", (*) => 0)
A_TrayMenu.Add("阈值: " holdThreshold "ms (短按=空格)", (*) => 0)
A_TrayMenu.Add()
A_TrayMenu.Add("暂停/恢复", (*) => (A_IsSuspended ? (A_IsSuspended := false, ToolTip("已恢复")) : (A_IsSuspended := true, ToolTip("已暂停"))))
A_TrayMenu.Add("退出", (*) => ExitApp())
A_TrayMenu.Default := "🎤 长按空格说话已启用"

; —— 快捷键说明 ——
; 如需改触发键：把上面的 Space / Space Up 改为 CapsLock / RControl 等
; 例如改右Ctrl触发：把 Space 改 RControl，Space Up 改 RControl Up 即可
; 豆包侧需保持“长按 右Alt”不变，或把 doubaoKey 改为对应键
