#!/usr/bin/env python3
"""
Tavo 角色卡模板生成器
根据用户输入的卡名、前缀、玩法类型，生成空白角色卡 JSON 模板。

用法：
    python build_card_template.py --name "末日求生" --prefix "dr" --type survival
    python build_card_template.py --name "青云诀" --prefix "qy" --type rpg --output card.json

支持的玩法类型（--type）：
    survival  - 末日生存（T1）
    rpg       - 修真 RPG（T2）
    business  - 经营养成（T3）
    adventure - 冒险探索（T4）
    narrative - 单角色叙事（T5）
    audit     - 审批审核（T6）
"""

import sys
import json
import uuid
import argparse
import os


# ============================================================
# 玩法模板配置
# ============================================================

GAMEPLAY_CONFIGS = {
    "survival": {
        "name_cn": "末日生存",
        "stats": [
            {"name": "HP", "value": "100/100"},
            {"name": "饥饿", "value": "80/100"},
            {"name": "口渴", "value": "70/100"},
            {"name": "体力", "value": "100/100"},
            {"name": "天数", "value": "1"},
        ],
        "scene_example": "废弃城市，晨光熹微，远处传来不明声响。",
    },
    "rpg": {
        "name_cn": "修真 RPG",
        "stats": [
            {"name": "境界", "value": "练气一层"},
            {"name": "EXP", "value": "0/100"},
            {"name": "灵力", "value": "30/30"},
            {"name": "道行", "value": "0年"},
        ],
        "scene_example": "青云宗·天枢峰，辰时，晨雾未散。你初入宗门，师父在天枢殿等候。",
    },
    "business": {
        "name_cn": "经营养成",
        "stats": [
            {"name": "金币", "value": "500"},
            {"name": "天数", "value": "1"},
            {"name": "声望", "value": "0"},
            {"name": "租客", "value": "0"},
        ],
        "scene_example": "晨曦公寓，开业第一天，阳光透过窗户洒进大厅。",
    },
    "adventure": {
        "name_cn": "冒险探索",
        "stats": [
            {"name": "HP", "value": "100/100"},
            {"name": "EXP", "value": "0/100"},
            {"name": "坐标", "value": "(0,0)"},
            {"name": "体力", "value": "100/100"},
        ],
        "scene_example": "未知迷宫入口，火把摇曳，前方分岔三条路。",
    },
    "narrative": {
        "name_cn": "单角色叙事",
        "stats": [
            {"name": "好感度", "value": "50/100"},
            {"name": "天数", "value": "1"},
        ],
        "scene_example": "初见之地，樱花纷飞，她站在树下回眸。",
    },
    "audit": {
        "name_cn": "审批审核",
        "stats": [
            {"name": "案件数", "value": "0"},
            {"name": "正确率", "value": "100%"},
            {"name": "天数", "value": "1"},
            {"name": "警觉", "value": "0"},
        ],
        "scene_example": "审批司，案牍堆积如山，第一份档案已摆在桌上。",
    },
}


# ============================================================
# 模板生成
# ============================================================

def gen_uuid():
    return str(uuid.uuid4())


def build_stats_xml(prefix: str, stats: list) -> str:
    """生成玩家面板 XML。"""
    lines = [f"<{prefix}-player>"]
    for stat in stats:
        lines.append(f'  <{prefix}-stat name="{stat["name"]}" value="{stat["value"]}"/>')
    lines.append(f"</{prefix}-player>")
    return "\n".join(lines)


def build_first_mes(prefix: str, config: dict) -> str:
    """生成 first_mes。"""
    parts = [
        f"<{prefix}-scene>{config['scene_example']}</{prefix}-scene>",
        "",
        build_stats_xml(prefix, config["stats"]),
        "",
        f'<{prefix}-dialogue who="npc" name="旁白">',
        "故事开始了，你的选择将决定命运的走向。",
        f"</{prefix}-dialogue>",
        "",
        f"<{prefix}-choice>",
        f"<{prefix}-choice-item>开始探索</{prefix}-choice-item>",
        f"<{prefix}-choice-item>查看状态</{prefix}-choice-item>",
        f"</{prefix}-choice>",
    ]
    return "\n".join(parts)


def build_regex_scripts(prefix: str) -> list:
    """生成基础正则脚本（5 条：style/container/scene/dialogue/choice）。"""
    scripts = []

    # 1. CSS 注入
    css = f"""<{prefix}-container {{
  font-family: 'Noto Sans SC', sans-serif;
  color: #e0e0e0;
  background: #1a1a2e;
  padding: 16px;
  border-radius: 12px;
  line-height: 1.6;
}}
.{prefix}-scene {{
  background: #16213e;
  border-left: 4px solid #0f3460;
  padding: 12px 16px;
  margin: 8px 0;
  border-radius: 0 8px 8px 0;
  color: #a8b4c4;
  font-style: italic;
}}
.{prefix}-player {{
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px;
  background: #0f0f1a;
  border-radius: 8px;
  margin: 8px 0;
}}
.{prefix}-stat {{
  padding: 4px 12px;
  background: #16213e;
  border-radius: 4px;
  font-size: 0.9em;
}}
.{prefix}-dialogue {{
  margin: 8px 0;
  padding: 10px 14px;
  background: #1a1a2e;
  border-radius: 8px;
}}
.{prefix}-dialogue[data-who="npc"] {{
  border-left: 3px solid #e94560;
}}
.{prefix}-dialogue[data-who="player"] {{
  border-left: 3px solid #4a90d9;
  margin-left: 24px;
}}
.{prefix}-choice {{
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0;
}}
.{prefix}-choice-item {{
  padding: 10px 16px;
  background: #16213e;
  border: 1px solid #0f3460;
  border-radius: 8px;
  color: #e0e0e0;
  cursor: pointer;
  text-align: center;
}}
.{prefix}-choice-item:hover {{
  background: #0f3460;
}}"""

    scripts.append({
        "id": gen_uuid(),
        "name": f"{prefix}-style",
        "findRegex": "^",
        "replaceString": f"<style>\n{css}\n</style>\n",
        "placement": [2],
        "disabled": False,
        "markdownOnly": True,
        "promptOnly": False,
        "runOnEdit": False,
        "substituteRegex": 0,
    })

    # 2. 容器包裹
    scripts.append({
        "id": gen_uuid(),
        "name": f"{prefix}-container",
        "findRegex": r"^([\s\S]*)$",
        "replaceString": f'<div class="{prefix}-container">$1</div>',
        "placement": [2],
        "disabled": False,
        "markdownOnly": True,
        "promptOnly": False,
        "runOnEdit": False,
        "substituteRegex": 0,
    })

    # 3. 场景
    scripts.append({
        "id": gen_uuid(),
        "name": f"{prefix}-scene",
        "findRegex": rf"<{prefix}-scene>([\s\S]*?)</{prefix}-scene>",
        "replaceString": f'<div class="{prefix}-scene">$1</div>',
        "placement": [2],
        "disabled": False,
        "markdownOnly": True,
        "promptOnly": False,
        "runOnEdit": False,
        "substituteRegex": 0,
    })

    # 4. 玩家面板
    scripts.append({
        "id": gen_uuid(),
        "name": f"{prefix}-player",
        "findRegex": rf"<{prefix}-player>([\s\S]*?)</{prefix}-player>",
        "replaceString": f'<div class="{prefix}-player">$1</div>',
        "placement": [2],
        "disabled": False,
        "markdownOnly": True,
        "promptOnly": False,
        "runOnEdit": False,
        "substituteRegex": 0,
    })

    scripts.append({
        "id": gen_uuid(),
        "name": f"{prefix}-stat",
        "findRegex": rf'<{prefix}-stat\s+name="([^"]*)"\s+value="([^"]*)"\s*/>',
        "replaceString": f'<div class="{prefix}-stat"><b>$1</b>: $2</div>',
        "placement": [2],
        "disabled": False,
        "markdownOnly": True,
        "promptOnly": False,
        "runOnEdit": False,
        "substituteRegex": 0,
    })

    # 5. 对话
    scripts.append({
        "id": gen_uuid(),
        "name": f"{prefix}-dialogue",
        "findRegex": rf'<{prefix}-dialogue\s+who="([^"]*)"(?:\s+name="([^"]*)")?>([\s\S]*?)</{prefix}-dialogue>',
        "replaceString": f'<div class="{prefix}-dialogue" data-who="$1">' +
                         f'<div class="{prefix}-dialogue-name">$2</div>$3</div>',
        "placement": [2],
        "disabled": False,
        "markdownOnly": True,
        "promptOnly": False,
        "runOnEdit": False,
        "substituteRegex": 0,
    })

    # 6. 选项
    scripts.append({
        "id": gen_uuid(),
        "name": f"{prefix}-choice",
        "findRegex": rf"<{prefix}-choice>([\s\S]*?)</{prefix}-choice>",
        "replaceString": f'<div class="{prefix}-choice">$1</div>',
        "placement": [2],
        "disabled": False,
        "markdownOnly": True,
        "promptOnly": False,
        "runOnEdit": False,
        "substituteRegex": 0,
    })

    scripts.append({
        "id": gen_uuid(),
        "name": f"{prefix}-choice-item",
        "findRegex": rf"<{prefix}-choice-item>([\s\S]*?)</{prefix}-choice-item>",
        "replaceString": f'<button class="{prefix}-choice-item" onclick="tavo.input.set(this.innerText); tavo.input.send()">$1</button>',
        "placement": [2],
        "disabled": False,
        "markdownOnly": True,
        "promptOnly": False,
        "runOnEdit": False,
        "substituteRegex": 0,
    })

    return scripts


def build_worldbook(prefix: str, card_name: str, config: dict) -> dict:
    """生成世界书。"""
    entries = [
        {
            "name": f"{card_name}-格式铁律",
            "content": f"""你是「{card_name}」的 AI 主持人。每轮输出必须严格遵守以下标签格式：

1. 场景描述用 <{prefix}-scene>...</{prefix}-scene>
2. 玩家状态用 <{prefix}-player>...<{prefix}-stat name="数值名" value="值"/>...</{prefix}-player>
3. NPC 对话用 <{prefix}-dialogue who="npc" name="名字">...</{prefix}-dialogue>
4. 玩家对话用 <{prefix}-dialogue who="player">...</{prefix}-dialogue>
5. 选项用 <{prefix}-choice><{prefix}-choice-item>选项1</{prefix}-choice-item>...</{prefix}-choice>

输出顺序：场景 → 玩家状态 → 对话 → 选项。
不要输出任何其他格式。不要解释标签。""",
            "keys": [],
            "constant": True,
            "position": "before_char",
            "disable": False,
        },
        {
            "name": f"{card_name}-系统规则",
            "content": f"""游戏系统规则：
- 每轮必须更新 <{prefix}-player> 里的数值
- 数值变化要明确（如"HP -10"）
- 选项要标注消耗和风险
- 数值归零触发对应结局（HP=0 死亡等）
- 根据玩家选择推进剧情""",
            "keys": [],
            "constant": True,
            "position": "before_char",
            "disable": False,
        },
        {
            "name": f"{card_name}-世界观",
            "content": f"世界观设定（按需补充）：{config['scene_example']}所在的世界...",
            "keys": ["世界", "背景", "设定"],
            "constant": False,
            "position": "before_char",
            "disable": False,
        },
        {
            "name": f"{card_name}-角色扮演指引",
            "content": """角色扮演指引：
- 沉浸式叙事，不要跳出角色
- 描述生动，有画面感
- 对话符合角色性格
- 选项有意义，每个选择都有后果
- 保持游戏节奏，不要拖沓""",
            "keys": [],
            "constant": True,
            "position": "before_char",
            "disable": False,
        },
    ]

    return {"entries": entries}


def build_card(name: str, prefix: str, game_type: str) -> dict:
    """构建完整角色卡。"""
    config = GAMEPLAY_CONFIGS[game_type]

    return {
        "spec": "chara_card_v3",
        "spec_version": "3.0",
        "data": {
            "name": name,
            "description": f"{name}：{config['name_cn']}类角色卡。",
            "personality": "",
            "scenario": "",
            "first_mes": build_first_mes(prefix, config),
            "mes_example": "",
            "system_prompt": "",
            "post_history_instructions": "",
            "character_book": build_worldbook(prefix, name, config),
            "extensions": {
                "regex_scripts": build_regex_scripts(prefix),
            },
        },
    }


# ============================================================
# 主流程
# ============================================================

def main():
    parser = argparse.ArgumentParser(description="Tavo 角色卡模板生成器")
    parser.add_argument("--name", required=True, help="卡名")
    parser.add_argument("--prefix", required=True, help="前缀（2-4 字母，如 dr/qy）")
    parser.add_argument("--type", required=True, choices=GAMEPLAY_CONFIGS.keys(),
                        help="玩法类型")
    parser.add_argument("--output", "-o", help="输出文件路径（不填则打印到屏幕）")
    args = parser.parse_args()

    card = build_card(args.name, args.prefix, args.type)
    json_str = json.dumps(card, ensure_ascii=False, indent=2)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(json_str)
        print(f"✅ 角色卡已生成: {args.output}")
        print(f"   卡名: {args.name}")
        print(f"   前缀: {args.prefix}-")
        print(f"   玩法: {GAMEPLAY_CONFIGS[args.type]['name_cn']}")
        print(f"   正则数: {len(card['data']['extensions']['regex_scripts'])}")
        print(f"   世界书条目数: {len(card['data']['character_book']['entries'])}")
    else:
        print(json_str)


if __name__ == "__main__":
    main()
