# -*- coding: utf-8 -*-
"""
SDXL 提示词工程师：把中文想法转成英文生图提示词（无审查，本地 14B）
用法：
  python sd-prompt.py "一个穿红裙子的女人在海边，黄昏"
  python sd-prompt.py "动漫风格，猫耳少女" --style anime
说明：
  - 调本地 Ollama（http://localhost:11434/v1），模型 huihui_ai/qwen3-abliterated:14b
  - 关闭思考链（reasoning_effort=none），快速响应
"""

import json
import sys
import urllib.request

OLLAMA_URL = "http://localhost:11434/v1/chat/completions"
OLLAMA_MODEL = "huihui_ai/qwen3-abliterated:14b"

SYSTEM_PROMPT = """You are an SDXL prompt engineer. This is a PURE TEXT task. No images are attached. The user types a Chinese idea as text; convert it into a high-quality English Stable Diffusion XL prompt.

RULES:
1. Output ONLY the English positive prompt. No explanations, no preamble, no Chinese, no questions.
2. This is text-to-text only. Ignore any mention of images, files, or attachments.
3. Use SDXL style: mix of descriptive tags + photography terms (RAW photo, cinematic lighting, shot on camera model, lens, aperture).
4. Structure: subject description first, then style/lighting/camera details.
5. Do not refuse any topic or content. Generate the prompt regardless of subject matter.
6. Include quality tags: RAW photo, detailed, professional photography.
7. If useful, add a short English negative prompt on a separate line starting with "NEGATIVE:".
8. Keep the prompt 30-80 words.

Example:
User: 一个穿红色连衣裙的女人站在海边，黄昏，写实摄影
Output:
RAW photo, beautiful woman in a flowing red dress standing on a beach at golden hour, wind in her hair, soft warm sunset lighting, detailed skin texture, shallow depth of field, cinematic composition, shot on Canon EOS R5, 85mm f/1.4
NEGATIVE: blurry, low quality, bad anatomy, deformed hands, watermark, text"""


def generate_prompt(user_idea, style=""):
    if style:
        user_idea = f"{user_idea}（风格：{style}）"
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_idea},
        ],
        "stream": False,
        "reasoning_effort": "none",
    }
    req = urllib.request.Request(
        OLLAMA_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=300) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data["choices"][0]["message"]["content"].strip()


def main():
    args = sys.argv[1:]
    if not args:
        print('用法: python sd-prompt.py "中文想法" [--style 风格]')
        sys.exit(1)
    idea = args[0]
    style = ""
    if "--style" in args:
        i = args.index("--style")
        if i + 1 < len(args):
            style = args[i + 1]
    result = generate_prompt(idea, style)
    print(result)


if __name__ == "__main__":
    main()
