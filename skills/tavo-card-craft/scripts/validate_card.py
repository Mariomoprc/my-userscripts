#!/usr/bin/env python3
"""
Tavo 角色卡验证器
检查角色卡 JSON 是否符合 chara_card_v3 规范和本技能的正则格式铁律。

用法：
    python validate_card.py card.json
    python validate_card.py card.json --fix   # 输出修复建议

检查项（对应 render-checklist.md）：
    A. 正则脚本自检（A1-A10）
    B. 世界书自检（B1-B6）
    C. 角色卡字段自检（C1-C8）
    F. 整体一致性自检（F1-F4）
"""

import sys
import json
import re
import os


# ============================================================
# 检查规则
# ============================================================

def check_regex_script(script: dict, idx: int) -> list:
    """检查单条正则脚本，返回问题列表。"""
    issues = []
    name = script.get("name", f"#{idx}")

    # A1: id 字段
    if "id" not in script or not script["id"]:
        issues.append(f"  [A1] ❌ '{name}': 缺少 id 字段（用 gen_uuid.py 生成）")
    elif not re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', str(script["id"]), re.I):
        issues.append(f"  [A1] ⚠️ '{name}': id 不是标准 UUID 格式")

    # A2: placement
    placement = script.get("placement")
    if placement != [2]:
        issues.append(f"  [A2] ❌ '{name}': placement 应为 [2]，当前为 {placement!r}")

    # A3: markdownOnly
    if script.get("markdownOnly") is not True:
        issues.append(f"  [A3] ❌ '{name}': markdownOnly 应为 true")

    # A4: promptOnly
    if script.get("promptOnly") is not False:
        issues.append(f"  [A4] ❌ '{name}': promptOnly 应为 false")

    # A5: runOnEdit
    if script.get("runOnEdit") is not False:
        issues.append(f"  [A5] ❌ '{name}': runOnEdit 应为 false")

    # A6: disabled
    if script.get("disabled") is not False:
        issues.append(f"  [A6] ❌ '{name}': disabled 应为 false（当前为 true，正则被禁用）")

    # A7: substituteRegex
    if script.get("substituteRegex") != 0:
        issues.append(f"  [A7] ❌ '{name}': substituteRegex 应为 0")

    # A8: findRegex 存在
    if not script.get("findRegex"):
        issues.append(f"  [A8] ❌ '{name}': findRegex 为空")

    # A9: replaceString 用 $1 而非 \1
    replace = script.get("replaceString", "")
    if "\\1" in replace or "\\2" in replace:
        issues.append(f"  [A9] ⚠️ '{name}': replaceString 用了 \\1 \\2，应改为 $1 $2")

    # A10: CSS 注入正则检查
    if name.endswith("-style") or "style" in name.lower():
        if script.get("findRegex") != "^":
            issues.append(f"  [A10] ⚠️ '{name}': CSS 注入正则的 findRegex 建议为 '^'")
        if "<style" not in replace:
            issues.append(f"  [A10] ⚠️ '{name}': CSS 注入正则的 replaceString 应包含 <style> 标签")

    return issues


def check_worldbook(entries: list) -> list:
    """检查世界书条目。"""
    issues = []
    if not entries:
        issues.append("  [B1] ❌ 世界书为空，至少需要 4 类条目")
        return issues

    if len(entries) < 4:
        issues.append(f"  [B1] ⚠️ 世界书只有 {len(entries)} 条，建议至少 4 条（格式/系统/世界观/指引）")

    # 检查常驻条目
    constants = [e for e in entries if e.get("constant") is True]
    if len(constants) < 2:
        issues.append(f"  [B2/B3] ⚠️ 常驻条目只有 {len(constants)} 条，建议至少 2 条（格式铁律 + 角色扮演指引）")

    # 检查每个条目的字段
    for i, entry in enumerate(entries):
        name = entry.get("name", f"#{i}")
        for field in ["name", "content", "keys", "constant", "position", "disable"]:
            if field not in entry:
                issues.append(f"  [B5] ❌ 条目 '{name}': 缺少字段 {field}")

    return issues


def check_card_fields(card: dict, data: dict) -> list:
    """检查角色卡字段。card 是顶层，data 是 data 子对象。"""
    issues = []

    # C1/C2: spec（在顶层，不在 data 里）
    if card.get("spec") != "chara_card_v3":
        issues.append(f"  [C1] ❌ spec 应为 'chara_card_v3'，当前为 {card.get('spec')!r}")
    if card.get("spec_version") != "3.0":
        issues.append(f"  [C2] ❌ spec_version 应为 '3.0'，当前为 {card.get('spec_version')!r}")

    # C3: name
    if not data.get("name"):
        issues.append("  [C3] ❌ data.name 为空")

    # C4: description 不应包含格式规则关键词
    desc = data.get("description", "")
    if any(kw in desc for kw in ["findRegex", "replaceString", "<style>", "placement"]):
        issues.append("  [C4] ⚠️ description 包含技术细节，应移到世界书")

    # C5: first_mes
    if not data.get("first_mes"):
        issues.append("  [C5] ❌ first_mes 为空")

    # C6: system_prompt 应留空
    if data.get("system_prompt"):
        length = len(data["system_prompt"])
        issues.append(f"  [C6] ⚠️ system_prompt 非空（{length} 字符），格式规则应放世界书")

    # C7: post_history_instructions 应留空
    if data.get("post_history_instructions"):
        issues.append("  [C7] ⚠️ post_history_instructions 非空，建议留空")

    # C8: regex_scripts 是数组
    ext = data.get("extensions", {})
    regex_scripts = ext.get("regex_scripts")
    if regex_scripts is not None and not isinstance(regex_scripts, list):
        issues.append(f"  [C8] ❌ regex_scripts 应为数组，当前为 {type(regex_scripts).__name__}")

    return issues


def check_consistency(data: dict) -> list:
    """检查整体一致性。"""
    issues = []

    # F1: {prefix} 占位符
    all_text = json.dumps(data, ensure_ascii=False)
    if "{prefix}" in all_text:
        count = all_text.count("{prefix}")
        issues.append(f"  [F1] ❌ 发现 {count} 处 {{prefix}} 占位符未替换")

    # F2: <UUID> 占位符
    if "<UUID>" in all_text or "<uuid>" in all_text.lower():
        count = all_text.lower().count("<uuid>")
        issues.append(f"  [F2] ❌ 发现 {count} 处 <UUID> 占位符未替换（用 gen_uuid.py 生成）")

    # F3: {{ }} 模板转义
    if "{{" in all_text:
        count = all_text.count("{{")
        issues.append(f"  [F3] ❌ 发现 {count} 处 {{{{ 模板转义未还原为 {{")

    # F4: 标签一致性（检查 first_mes 和正则 findRegex 的标签是否匹配）
    first_mes = data.get("first_mes", "")
    regex_scripts = data.get("extensions", {}).get("regex_scripts", [])
    tags_in_first = set(re.findall(r'<([a-z]+-[a-z]+)', first_mes))
    tags_in_regex = set()
    for s in regex_scripts:
        tags_in_regex.update(re.findall(r'<([a-z]+-[a-z]+)', s.get("findRegex", "")))

    mismatch = tags_in_first - tags_in_regex
    if mismatch:
        issues.append(f"  [F4] ⚠️ first_mes 用了标签 {mismatch}，但正则没有对应 findRegex")

    return issues


# ============================================================
# 主流程
# ============================================================

def validate(card_path: str) -> tuple:
    """验证角色卡，返回 (问题列表, 统计信息)。"""
    issues = []
    stats = {"regex_count": 0, "worldbook_count": 0, "errors": 0, "warnings": 0}

    try:
        with open(card_path, 'r', encoding='utf-8') as f:
            card = json.load(f)
    except FileNotFoundError:
        return [f"❌ 文件不存在: {card_path}"], stats
    except json.JSONDecodeError as e:
        return [f"❌ JSON 解析失败: {e}"], stats

    data = card.get("data", card)  # 兼容带/不带 data 包裹

    # A. 正则脚本
    regex_scripts = data.get("extensions", {}).get("regex_scripts", [])
    stats["regex_count"] = len(regex_scripts)
    if regex_scripts:
        issues.append("【A. 正则脚本自检】")
        for i, s in enumerate(regex_scripts):
            issues.extend(check_regex_script(s, i))

    # B. 世界书
    entries = data.get("character_book", {}).get("entries", [])
    stats["worldbook_count"] = len(entries)
    if entries or True:  # 总是检查
        issues.append("\n【B. 世界书自检】")
        issues.extend(check_worldbook(entries))

    # C. 角色卡字段
    issues.append("\n【C. 角色卡字段自检】")
    issues.extend(check_card_fields(card, data))

    # F. 整体一致性
    issues.append("\n【F. 整体一致性自检】")
    issues.extend(check_consistency(data))

    # 统计
    for line in issues:
        if "❌" in line:
            stats["errors"] += 1
        elif "⚠️" in line:
            stats["warnings"] += 1

    return issues, stats


def main():
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print(__doc__)
        return

    card_path = args[0]
    if not os.path.exists(card_path):
        print(f"❌ 文件不存在: {card_path}")
        sys.exit(1)

    issues, stats = validate(card_path)

    print("=" * 60)
    print(f"Tavo 角色卡验证报告: {card_path}")
    print("=" * 60)
    print(f"正则脚本数: {stats['regex_count']}")
    print(f"世界书条目数: {stats['worldbook_count']}")
    print(f"错误数: {stats['errors']}")
    print(f"警告数: {stats['warnings']}")
    print("=" * 60)
    print()

    for line in issues:
        print(line)

    print()
    print("=" * 60)
    if stats["errors"] == 0 and stats["warnings"] == 0:
        print("✅ 全部通过，卡可导入 Tavo 测试。")
    elif stats["errors"] == 0:
        print(f"⚠️ 无错误，但有 {stats['warnings']} 个警告，建议修复后测试。")
    else:
        print(f"❌ 有 {stats['errors']} 个错误，必须修复后才能正常使用。")
    print("=" * 60)

    sys.exit(0 if stats["errors"] == 0 else 1)


if __name__ == "__main__":
    main()
