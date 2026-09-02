# -*- coding: utf-8 -*-
"""
一键生图：中文描述 -> 自动生成提示词 -> ComfyUI 出图 -> 打开图片
用法：
  python generate-image.py "一个穿红裙的女人在海边，黄昏"
  python generate-image.py "赛博朋克风格的城市夜景" --width 1024 --height 1024
说明：
  - 提示词生成走本地 14B（无审查），出图走本地 ComfyUI（Arc B390 XPU）
  - 全程本地，无审查，断网可用
"""

import json
import os
import subprocess
import sys
import time
import urllib.request

SD_PROMPT_PY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sd-prompt.py")
COMFYUI_URL = "http://127.0.0.1:8188"
OUTPUT_DIR = r"C:\Users\pass\ComfyUI\output"

WORKFLOW_TEMPLATE = {
    "1": {
        "class_type": "UnetLoaderGGUF",
        "inputs": {
            "unet_name": "juggernaut-xl-v9-Q4_K.gguf",
            "weight_dtype": "default",
        },
    },
    "2": {
        "class_type": "DualCLIPLoader",
        "inputs": {
            "clip_name1": "clip_l.safetensors",
            "clip_name2": "sdxl_clip_g.safetensors",
            "type": "sdxl",
        },
    },
    "3": {"class_type": "VAELoader", "inputs": {"vae_name": "sdxl_vae.safetensors"}},
    "4": {
        "class_type": "CLIPTextEncode",
        "inputs": {"text": "POSITIVE", "clip": ["2", 0]},
    },
    "5": {
        "class_type": "CLIPTextEncode",
        "inputs": {
            "text": "blurry, low quality, bad anatomy, deformed hands, watermark, text",
            "clip": ["2", 0],
        },
    },
    "6": {
        "class_type": "EmptyLatentImage",
        "inputs": {"width": 1024, "height": 1024, "batch_size": 1},
    },
    "7": {
        "class_type": "KSampler",
        "inputs": {
            "seed": 0,
            "steps": 20,
            "cfg": 6,
            "sampler_name": "euler",
            "scheduler": "normal",
            "denoise": 1,
            "model": ["1", 0],
            "positive": ["4", 0],
            "negative": ["5", 0],
            "latent_image": ["6", 0],
        },
    },
    "8": {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["3", 0]}},
    "9": {
        "class_type": "SaveImage",
        "inputs": {"filename_prefix": "local_gen", "images": ["8", 0]},
    },
}


def get_english_prompt(idea):
    result = subprocess.run(
        [sys.executable, SD_PROMPT_PY, idea],
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=300,
    )
    text = result.stdout.strip()
    # extract positive prompt (before NEGATIVE:)
    if "NEGATIVE:" in text:
        text = text.split("NEGATIVE:")[0].strip()
    return text


def submit_workflow(positive, width, height, seed):
    wf = json.loads(json.dumps(WORKFLOW_TEMPLATE))
    wf["4"]["inputs"]["text"] = positive
    wf["6"]["inputs"]["width"] = width
    wf["6"]["inputs"]["height"] = height
    wf["7"]["inputs"]["seed"] = seed
    payload = json.dumps({"prompt": wf}).encode("utf-8")
    req = urllib.request.Request(
        f"{COMFYUI_URL}/prompt",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def wait_for_output(prompt_id, timeout=600):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(
                f"{COMFYUI_URL}/history/{prompt_id}", timeout=15
            ) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            if prompt_id in data:
                h = data[prompt_id]
                status = h.get("status", {}).get("status_str")
                if status == "error":
                    for m in h.get("status", {}).get("messages", []):
                        if m[0] == "execution_error":
                            return None, m[1].get("exception_message", "unknown error")
                if status == "success":
                    for v in h.get("outputs", {}).values():
                        for img in v.get("images", []):
                            return os.path.join(OUTPUT_DIR, img.get("filename")), None
        except Exception:
            pass
        time.sleep(5)
    return None, "timeout waiting for image"


def main():
    args = sys.argv[1:]
    if not args:
        print(
            '用法: python generate-image.py "中文描述" [--width 1024] [--height 1024]'
        )
        sys.exit(1)
    idea = args[0]
    width, height, seed = 1024, 1024, int(time.time()) % 100000
    i = 1
    while i < len(args):
        if args[i] == "--width" and i + 1 < len(args):
            width = int(args[i + 1])
            i += 2
        elif args[i] == "--height" and i + 1 < len(args):
            height = int(args[i + 1])
            i += 2
        elif args[i] == "--seed" and i + 1 < len(args):
            seed = int(args[i + 1])
            i += 2
        else:
            i += 1

    print(f"[1/3] 生成提示词...")
    positive = get_english_prompt(idea)
    print(f"      提示词: {positive[:120]}...")

    print(f"[2/3] 提交 ComfyUI 生成 ({width}x{height})...")
    try:
        resp = submit_workflow(positive, width, height, seed)
    except Exception as e:
        print(f"[错误] ComfyUI 提交失败: {e}")
        print("       确认 ComfyUI 已启动（START_ComfyUI.bat）")
        sys.exit(1)
    prompt_id = resp.get("prompt_id", "")

    print(f"[3/3] 生成中（核显约 1-3 分钟），请稍候...")
    img_path, err = wait_for_output(prompt_id)
    if img_path:
        print(f"[完成] 图片已生成: {img_path}")
        os.startfile(img_path)
    else:
        print(f"[错误] 生成失败: {err}")


if __name__ == "__main__":
    main()
