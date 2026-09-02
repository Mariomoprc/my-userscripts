#Requires AutoHotkey v2.0
#SingleInstance Force
Persistent

; 允许查找隐藏窗口
DetectHiddenWindows True

; ============================================
; OpenCode 侧边栏唤出脚本
; 快捷键: Alt+Space
; 功能: 一键唤出/隐藏终端窗口，记住原始位置
; ============================================

; ---------- 全局变量 ----------
global CONFIG := Map()
global CONFIG_FILE := A_ScriptDir "\sidebar-config.ini"
global TERMINAL_EXES := ["WindowsTerminal.exe", "cmd.exe", "powershell.exe", "pwsh.exe"]
global SAVED_FG_POS := Map()
global HAS_SAVED_FG := false

; ============================================
; 函数定义
; ============================================

FindTerminal() {
    ; 优先查找标题含 opencode 的终端窗口
    windows := WinGetList("ahk_exe WindowsTerminal.exe")
    for id in windows {
        t := ""
        try t := WinGetTitle("ahk_id " id)
        if InStr(t, "opencode", false) || InStr(t, "OpenCode", false)
            return id
    }
    
    ; 回退：查找任何终端窗口
    for exe in TERMINAL_EXES {
        try {
            hwnd := WinExist("ahk_exe " exe)
            if hwnd
                return hwnd
        }
    }
    return 0
}

CalculatePosition(ocHwnd) {
    global CONFIG
    
    ; 获取前台窗口
    fgHwnd := DllCall("GetForegroundWindow", "Ptr")
    
    ; 没有前台窗口或前台就是自己，用默认位置
    if !fgHwnd || fgHwnd = ocHwnd {
        MonitorGetWorkArea(, &mL, &mT, &mR, &mB)
        return {x: mR - CONFIG["width"], y: mT, w: CONFIG["width"], h: mB - mT}
    }
    
    ; 跳过桌面和任务栏
    fgClass := ""
    try fgClass := WinGetClass("ahk_id " fgHwnd)
    if fgClass = "Progman" || fgClass = "Shell_TrayWnd"
        || fgClass = "Shell_SecondaryTrayWnd" {
        MonitorGetWorkArea(, &mL, &mT, &mR, &mB)
        return {x: mR - CONFIG["width"], y: mT, w: CONFIG["width"], h: mB - mT}
    }
    
    ; 获取前台窗口位置
    fgX := 0, fgY := 0, fgW := 0, fgH := 0
    try WinGetPos(&fgX, &fgY, &fgW, &fgH, fgHwnd)
    if !fgW || !fgH {
        MonitorGetWorkArea(, &mL, &mT, &mR, &mB)
        return {x: mR - CONFIG["width"], y: mT, w: CONFIG["width"], h: mB - mT}
    }
    
    ; 获取屏幕工作区
    MonitorGetWorkArea(, &mL, &mT, &mR, &mB)
    mW := mR - mL
    mH := mB - mT
    
    ; 场景1: 最大化/全屏 (宽度 ≥ 95%)
    if (fgW >= mW * 0.95 && fgH >= mH * 0.95) {
        w := Round(mW * 0.37)
        return {x: mR - w, y: mT, w: w, h: mH}
    }
    
    ; 场景2: 左宽屏 (左边缘贴左 + 宽度约 60%)
    if (fgX <= mL + 10 && fgW >= mW * 0.55 && fgW <= mW * 0.65) {
        w := Round(mW * 0.4)
        return {x: mR - w, y: mT, w: w, h: mH}
    }
    
    ; 场景3: 右窄屏 (右边缘贴右 + 宽度约 40%) → OC 还是放右边，默认宽度
    ; 场景4: 自由窗口 → OC 放右边，默认宽度
    return {x: mR - CONFIG["width"], y: mT, w: CONFIG["width"], h: mH}
}

IsFreeWindow(fgHwnd, ocHwnd) {
    if !fgHwnd || fgHwnd = ocHwnd
        return false
    
    fgClass := ""
    try fgClass := WinGetClass("ahk_id " fgHwnd)
    if fgClass = "Progman" || fgClass = "Shell_TrayWnd"
        || fgClass = "Shell_SecondaryTrayWnd"
        || fgClass = "WorkerW"
        return false
    
    fgX := 0, fgY := 0, fgW := 0, fgH := 0
    try WinGetPos(&fgX, &fgY, &fgW, &fgH, fgHwnd)
    if !fgW || !fgH
        return false
    
    MonitorGetWorkArea(, &mL, &mT, &mR, &mB)
    mW := mR - mL
    mH := mB - mT
    
    isMaximized := (fgW >= mW * 0.95 && fgH >= mH * 0.95)
    isLeftSnap := (fgX <= mL + 10 && fgW >= mW * 0.55 && fgW <= mW * 0.65)
    isRightSnap := (fgX + fgW >= mR - 10 && fgW >= mW * 0.35 && fgW <= mW * 0.45)
    
    if isMaximized || isLeftSnap || isRightSnap
        return false
    
    return true
}

SnapForegroundToFreeLayout(fgHwnd) {
    MonitorGetWorkArea(, &mL, &mT, &mR, &mB)
    mW := mR - mL
    mH := mB - mT
    ocW := Round(mW * 0.37)
    leftW := mW - ocW
    
    WinMove mL, mT, leftW, mH, fgHwnd
    return {x: mL + leftW, y: mT, w: ocW, h: mH}
}

ShowWindow(hwnd) {
    global SAVED_FG_POS, HAS_SAVED_FG
    
    ; 先获取前台窗口（必须在 ShowWindow 之前！）
    fgHwnd := DllCall("GetForegroundWindow", "Ptr")
    
    ; 始终保存前台窗口信息
    if fgHwnd && fgHwnd != hwnd {
        try {
            fgClass := ""
            try fgClass := WinGetClass("ahk_id " fgHwnd)
            if fgClass != "Progman" && fgClass != "Shell_TrayWnd"
                && fgClass != "Shell_SecondaryTrayWnd" && fgClass != "WorkerW" {
                WinGetPos(&fx, &fy, &fw, &fh, fgHwnd)
                SAVED_FG_POS["hwnd"] := fgHwnd
                SAVED_FG_POS["x"] := fx
                SAVED_FG_POS["y"] := fy
                SAVED_FG_POS["w"] := fw
                SAVED_FG_POS["h"] := fh
                
                MonitorGetWorkArea(, &mL, &mT, &mR, &mB)
                mW := mR - mL
                mH := mB - mT
                SAVED_FG_POS["wasMaximized"] := (fw >= mW * 0.95 && fh >= mH * 0.95)
                HAS_SAVED_FG := true
            }
        }
    }
    
    ; 判断是否需要吸附前台窗口
    if IsFreeWindow(fgHwnd, hwnd) {
        pos := SnapForegroundToFreeLayout(fgHwnd)
    } else {
        pos := CalculatePosition(hwnd)
    }
    
    ; 恢复 OC 窗口
    DllCall("ShowWindow", "Ptr", hwnd, "Int", 9)  ; SW_RESTORE
    Sleep 200
    
    ; 设置 OC 位置和大小
    WinMove pos.x, pos.y, pos.w, pos.h, hwnd
    Sleep 100
    WinMove pos.x, pos.y, pos.w, pos.h, hwnd
    
    ; 激活到前台
    WinActivate hwnd
    Sleep 100
    WinActivate hwnd
}

HideWindow(hwnd) {
    global SAVED_FG_POS, HAS_SAVED_FG
    
    WinHide hwnd
    
    if HAS_SAVED_FG {
        Sleep 100
        fgHwnd := SAVED_FG_POS["hwnd"]
        
        try {
            if SAVED_FG_POS["wasMaximized"] {
                ; 全屏/最大化 → 只激活回去，不改大小
                WinActivate fgHwnd
            } else {
                ; 自由窗口 → 恢复原始位置和大小
                WinMove SAVED_FG_POS["x"], SAVED_FG_POS["y"], SAVED_FG_POS["w"], SAVED_FG_POS["h"], fgHwnd
                WinActivate fgHwnd
            }
        }
        HAS_SAVED_FG := false
    } else {
        ; 没有保存的窗口，激活桌面上最近的窗口
        WinActivate "ahk_exe explorer.exe"
    }
}

ToggleSidebar(*) {
    hwnd := FindTerminal()
    
    if !hwnd {
        ; 启动新的 OpenCode
        try {
            Run "opencode", "C:\Users\pass\.config\opencode"
            loop 10 {
                Sleep 500
                hwnd := FindTerminal()
                if hwnd
                    break
            }
            if !hwnd {
                TrayTip "错误", "无法启动 OpenCode", 2
                return
            }
            Sleep 500
            ShowWindow(hwnd)
            return
        } catch as e {
            TrayTip "错误", "无法启动 OpenCode: " e.Message, 2
            return
        }
    }
    
    ; 切换显隐
    if DllCall("IsWindowVisible", "Ptr", hwnd) {
        HideWindow(hwnd)
    } else {
        ShowWindow(hwnd)
    }
}

LoadConfig() {
    global CONFIG, CONFIG_FILE
    
    CONFIG["hotkey"] := "!Space"
    CONFIG["width"] := 500
    CONFIG["autoStart"] := false
    
    if !FileExist(CONFIG_FILE)
        return
    
    try {
        loop read, CONFIG_FILE {
            line := Trim(A_LoopReadLine)
            if line = "" || SubStr(line, 1, 1) = ";"
                continue
            
            parts := StrSplit(line, "=")
            if parts.Length >= 2 {
                key := Trim(parts[1])
                value := Trim(parts[2])
                
                if key = "hotkey"
                    CONFIG["hotkey"] := value
                else if key = "width"
                    CONFIG["width"] := Integer(value)
                else if key = "autoStart"
                    CONFIG["autoStart"] := (value = "1")
            }
        }
    }
}

SaveConfig() {
    global CONFIG, CONFIG_FILE
    
    content := "; OpenCode 侧边栏配置文件`n"
    content .= "[General]`n"
    content .= "hotkey=" CONFIG["hotkey"] "`n"
    content .= "width=" CONFIG["width"] "`n"
    content .= "autoStart=" (CONFIG["autoStart"] ? "1" : "0") "`n"
    
    try FileDelete CONFIG_FILE
    FileAppend content, CONFIG_FILE
}

SetAutoStart(enable) {
    startupPath := A_Startup "\OpenCodeSidebar.lnk"
    if enable {
        try FileCreateShortcut A_ScriptFullPath, startupPath
    } else {
        try FileDelete startupPath
    }
}

TrayWidth(*)
{
    global CONFIG
    input := InputBox("输入侧边栏宽度（像素）:", "设置宽度", "H100 W300")
    if input.Result = "OK" && input.Value != "" {
        try {
            newWidth := Integer(input.Value)
            if newWidth > 100 && newWidth < A_ScreenWidth {
                CONFIG["width"] := newWidth
                SaveConfig()
                TrayTip "设置已保存", "宽度: " newWidth "px", 2
            }
        }
    }
}

TrayAutoStart(*)
{
    global CONFIG
    CONFIG["autoStart"] := !CONFIG["autoStart"]
    SetAutoStart(CONFIG["autoStart"])
    SaveConfig()
    state := CONFIG["autoStart"] ? "开启" : "关闭"
    TrayTip "设置已保存", "开机自启已" state, 2
}

TrayReload(*)
{
    Reload
}

TrayExit(*)
{
    ExitApp
}

; ============================================
; 主程序入口
; ============================================

LoadConfig()

Hotkey CONFIG["hotkey"], ToggleSidebar

A_TrayMenu.Delete()
A_TrayMenu.Add("快捷键: Alt+Space", TrayReload)
A_TrayMenu.Add("侧边栏宽度: " CONFIG["width"] "px", TrayWidth)
A_TrayMenu.Add("开机自启", TrayAutoStart)
A_TrayMenu.Add()
A_TrayMenu.Add("重新加载", TrayReload)
A_TrayMenu.Add("退出", TrayExit)

if CONFIG["autoStart"]
    A_TrayMenu.Check("开机自启")

TraySetIcon "shell32.dll", 297
TrayTip "OpenCode 侧边栏已启动", "按 Alt+Space 唤出/隐藏", 2
