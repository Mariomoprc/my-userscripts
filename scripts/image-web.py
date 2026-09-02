# -*- coding: utf-8 -*-
"""
本地生图网页服务：浏览器打开即用，输入提示词点按钮出图
启动：python image-web.py  ->  http://localhost:8090
提示词可直接输入中文或英文，中文自动走本地14B转英文，英文直接透传
"""

import json
import os
import re
import subprocess
import sys
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

COMFYUI_URL = "http://127.0.0.1:8188"
OUTPUT_DIR = r"C:\Users\pass\ComfyUI\output"
INPUT_DIR = r"C:\Users\pass\ComfyUI\input"
SD_PROMPT_PY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sd-prompt.py")

WORKFLOW = {
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
        "inputs": {"text": "NEGATIVE", "clip": ["2", 0]},
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
        "inputs": {"filename_prefix": "web_gen", "images": ["8", 0]},
    },
}

PAGE = """<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<title>本地生图</title>
<style>
body{font-family:'Microsoft YaHei',sans-serif;max-width:720px;margin:40px auto;padding:0 20px;background:#111;color:#eee}
h1{font-size:22px}
textarea{width:100%;height:70px;background:#1e1e1e;color:#eee;border:1px solid #444;border-radius:8px;padding:10px;font-size:14px}
.controls{display:flex;gap:12px;margin:14px 0;flex-wrap:wrap;align-items:center}
select,input[type=number],input[type=text]{background:#1e1e1e;color:#eee;border:1px solid #444;border-radius:6px;padding:6px 10px}
button{background:#2f6fed;color:#fff;border:none;border-radius:8px;padding:10px 26px;font-size:15px;cursor:pointer}
button:disabled{opacity:.5}
#status{margin:14px 0;color:#8ab4f8;font-size:14px;min-height:20px}
#result{text-align:center}
#result img{max-width:100%;border-radius:10px;margin-top:12px}
.hint{color:#888;font-size:13px;margin:8px 0}
#gallery{display:flex;flex-wrap:wrap;gap:10px}
#gallery .item{position:relative;width:120px}
#gallery img{width:120px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #333;cursor:pointer}
#gallery .del{position:absolute;top:4px;right:4px;background:rgba(200,40,40,.9);color:#fff;border:none;border-radius:50%;width:22px;height:22px;font-size:12px;cursor:pointer;line-height:1}
</style>
</head>
<body>
<h1>🎨 本地生图</h1>
<div class="hint">提示词可直接写中文或英文。中文自动翻译成英文，英文直接使用。</div>
<textarea id="prompt" placeholder="例：一位穿着红色连衣裙的女人站在海边，黄昏，写实摄影"></textarea>
<div class="controls">
  <label>尺寸</label>
  <select id="size">
    <option value="1024x1024">1024×1024</option>
    <option value="768x1024">768×1024</option>
    <option value="1024x768">1024×768</option>
  </select>
  <label>步数</label>
  <input type="number" id="steps" value="20" min="8" max="40" style="width:60px">
  <label>种子(0=随机)</label>
  <input type="number" id="seed" value="0" style="width:80px">
  <button id="go" onclick="generate()">生成</button>
  <button onclick="openFolder()" style="background:#3a3a3a">📂 打开文件夹</button>
</div>
<div class="controls">
  <label style="color:#ffa657">🖼️ 参考图（可选，照着画）：</label>
  <input type="file" id="reffile" accept="image/*" style="color:#eee">
  <label>强度</label>
  <select id="denoise">
    <option value="0.25">超保脸(0.25)</option>
    <option value="0.35" selected>保脸(0.35)</option>
    <option value="0.5">换装保脸(0.5)</option>
    <option value="0.65">大改(0.65)</option>
  </select>
  <label style="color:#8ab4f8"><input type="checkbox" id="swapchk" style="vertical-align:middle"> 换脸</label>
  <span class="hint">上传照片后自动按原图比例重绘；强度低=脸更像原图，高=换装/换场景明显</span>
</div>
<div class="controls">
  <span class="hint" style="color:#8ab4f8">💡 勾选「换脸」：img2img 换衣/换场景 + ReActor 把参考图人脸换到生成图上（参考图需有清晰正脸）</span>
</div>
<div class="hint">负面提示词（可选，默认防畸形）：</div>
<input type="text" id="negative" style="width:100%" value="blurry, low quality, bad anatomy, deformed hands, watermark, text">
<div id="status"></div>
<div id="result"></div>
<div class="hint">历史图片（点击删除）：</div>
<div id="gallery"></div>
<script>
async function generate(){
  const prompt=document.getElementById('prompt').value.trim();
  if(!prompt){alert('请输入提示词');return;}
  const btn=document.getElementById('go');btn.disabled=true;
  const st=document.getElementById('status');st.textContent='[1/2] 准备提示词...';
  const neg=document.getElementById('negative').value.trim();
  const size=document.getElementById('size').value.split('x');
  const steps=document.getElementById('steps').value;
  const seed=document.getElementById('seed').value;
  const denoise=document.getElementById('denoise').value;
  const swapchk=document.getElementById('swapchk');
  const swap=swapchk.checked?1:0;
  const reffile=document.getElementById('reffile').files[0];
  let ref='';
  if(reffile){
    st.textContent='上传参考图...';
    const fd=new FormData();fd.append('file',reffile);
    const up=await fetch('/upload',{method:'POST',body:fd});
    const ud=await up.json();
    if(ud.error){st.textContent='上传失败: '+ud.error;btn.disabled=false;return;}
    ref=ud.file;
  }
  if(swap && !ref){alert('换脸需要先上传参考图（人脸来源）');btn.disabled=false;return;}
  st.textContent='[2/2] 生成中（核显约1-3分钟），请等待...';
  let data;
  if(ref){
    const resp=await fetch('/generate?prompt='+encodeURIComponent(prompt)+'&neg='+encodeURIComponent(neg)+'&w='+size[0]+'&h='+size[1]+'&steps='+steps+'&seed='+seed+'&ref='+encodeURIComponent(ref)+'&denoise='+denoise+'&swap='+swap);
    data=await resp.json();
  }else{
    const resp=await fetch('/generate?prompt='+encodeURIComponent(prompt)+'&neg='+encodeURIComponent(neg)+'&w='+size[0]+'&h='+size[1]+'&steps='+steps+'&seed='+seed);
    data=await resp.json();
  }
  if(data.error){st.textContent='错误: '+data.error;btn.disabled=false;return;}
  st.textContent='[2/2] 生成中（核显约1-3分钟），请等待...';
  // poll result
  const poll=setInterval(async()=>{
    const r=await fetch('/status?id='+data.id);
    const d=await r.json();
    if(d.done){
      clearInterval(poll);
      st.textContent='完成！';
      document.getElementById('result').innerHTML='<img src="'+d.image+'">';
      btn.disabled=false;
      loadGallery();
    }else if(d.error){
      clearInterval(poll);st.textContent='错误: '+d.error;btn.disabled=false;
    }else{
      st.textContent='生成中...（已等待 '+d.elapsed+'s）';
    }
  },5000);
}
function openFolder(){ fetch('/open_folder').then(r=>r.json()).then(d=>{ if(d.error)alert(d.error); }); }
function delImage(f){
  if(!confirm('删除 '+f+' ？'))return;
  fetch('/delete?file='+encodeURIComponent(f)).then(r=>r.json()).then(d=>{
    if(d.ok)loadGallery(); else alert(d.error);
  });
}
document.addEventListener('click',function(e){
  const t=e.target.closest('[data-del]');
  if(t){ delImage(decodeURIComponent(t.getAttribute('data-del'))); }
});
function loadGallery(){
  fetch('/list_images').then(r=>r.json()).then(d=>{
    const g=document.getElementById('gallery');
    if(d.files&&d.files.length){
      g.innerHTML=d.files.map(f=>
        '<div class="item"><button class="del" data-del="'+f+'">×</button>'+
        '<a href="/images/'+f+'" target="_blank"><img src="/images/'+f+'" style="width:120px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #333"></a>'
      ).join('');
    }else{ g.innerHTML='<span class="hint">暂无图片</span>'; }
  });
}
loadGallery();
</script>
</body>
</html>"""

JOBS = {}


def submit_img2img(positive, negative, w, h, steps, seed, ref_image, denoise=0.35):
    """图生图：基于参考图重绘，保持人物/人脸。用匹配参考图比例的尺寸避免裁脸"""
    wf = json.loads(json.dumps(WORKFLOW))
    # 根据参考图比例选择目标尺寸（竖图保持竖，横图保持横，避免方形裁掉脸）
    ref_path = os.path.join(INPUT_DIR, ref_image)
    use_w, use_h = w, h
    try:
        from PIL import Image as PILImage

        if os.path.exists(ref_path):
            iw, ih = PILImage.open(ref_path).size
            if ih > iw:
                use_w, use_h = 768, 1152  # 竖构图
            else:
                use_w, use_h = 1152, 768  # 横构图
    except Exception:
        pass
    # LoadImage -> ImageScale (upscale ref to target size) -> VAEEncode
    wf["10"] = {"class_type": "LoadImage", "inputs": {"image": ref_image}}
    wf["15"] = {
        "class_type": "ImageScale",
        "inputs": {
            "image": ["10", 0],
            "upscale_method": "lanczos",
            "width": use_w,
            "height": use_h,
            "crop": "center",
        },
    }
    wf["14"] = {
        "class_type": "VAEEncode",
        "inputs": {"pixels": ["15", 0], "vae": ["3", 0]},
    }
    wf["4"]["inputs"]["text"] = positive
    wf["5"]["inputs"]["text"] = negative
    wf["6"]["inputs"]["width"] = use_w
    wf["6"]["inputs"]["height"] = use_h
    wf["7"]["inputs"]["steps"] = steps
    wf["7"]["inputs"]["seed"] = seed
    wf["7"]["inputs"]["denoise"] = denoise
    wf["7"]["inputs"]["latent_image"] = ["14", 0]
    payload = json.dumps({"prompt": wf}).encode("utf-8")
    req = urllib.request.Request(
        f"{COMFYUI_URL}/prompt",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def submit_img2img_swap(positive, negative, w, h, steps, seed, ref_image, denoise=0.6):
    """换衣+换脸：img2img 高 denoise 重绘（换衣/换场景），再用 ReActor 把参考图人脸换到生成图"""
    wf = json.loads(json.dumps(WORKFLOW))
    # 匹配参考图比例（竖图保持竖，横图保持横）
    ref_path = os.path.join(INPUT_DIR, ref_image)
    use_w, use_h = w, h
    try:
        from PIL import Image as PILImage

        if os.path.exists(ref_path):
            iw, ih = PILImage.open(ref_path).size
            if ih > iw:
                use_w, use_h = 768, 1152
            else:
                use_w, use_h = 1152, 768
    except Exception:
        pass
    wf["10"] = {"class_type": "LoadImage", "inputs": {"image": ref_image}}
    wf["15"] = {
        "class_type": "ImageScale",
        "inputs": {
            "image": ["10", 0],
            "upscale_method": "lanczos",
            "width": use_w,
            "height": use_h,
            "crop": "center",
        },
    }
    wf["14"] = {
        "class_type": "VAEEncode",
        "inputs": {"pixels": ["15", 0], "vae": ["3", 0]},
    }
    wf["4"]["inputs"]["text"] = positive
    wf["5"]["inputs"]["text"] = negative
    wf["6"]["inputs"]["width"] = use_w
    wf["6"]["inputs"]["height"] = use_h
    wf["7"]["inputs"]["steps"] = steps
    wf["7"]["inputs"]["seed"] = seed
    wf["7"]["inputs"]["denoise"] = denoise
    wf["7"]["inputs"]["latent_image"] = ["14", 0]
    # ReActor 换脸：source=参考图, target=img2img 生成图
    wf["16"] = {
        "class_type": "ReActorFaceSwap",
        "inputs": {
            "enabled": True,
            "swap_model": "inswapper_128.onnx",
            "facedetection": "retinaface_resnet50",
            "face_restore_model": "none",
            "face_restore_visibility": 1.0,
            "codeformer_weight": 0.5,
            "detect_gender_input": "no",
            "detect_gender_source": "no",
            "input_faces_index": "0",
            "source_faces_index": "0",
            "console_log_level": 0,
            "input_image": ["8", 0],
            "source_image": ["10", 0],
        },
    }
    wf["17"] = {
        "class_type": "SaveImage",
        "inputs": {"filename_prefix": "web_swap", "images": ["16", 0]},
    }
    payload = json.dumps({"prompt": wf}).encode("utf-8")
    req = urllib.request.Request(
        f"{COMFYUI_URL}/prompt",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def translate(prompt):
    # if contains CJK, translate via local model
    if re.search(r"[\u4e00-\u9fff]", prompt):
        result = subprocess.run(
            [sys.executable, SD_PROMPT_PY, prompt],
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=300,
        )
        text = result.stdout.strip()
        if "NEGATIVE:" in text:
            text = text.split("NEGATIVE:")[0].strip()
        return text
    return prompt


def submit(positive, negative, w, h, steps, seed):
    wf = json.loads(json.dumps(WORKFLOW))
    wf["4"]["inputs"]["text"] = positive
    wf["5"]["inputs"]["text"] = negative
    wf["6"]["inputs"]["width"] = w
    wf["6"]["inputs"]["height"] = h
    wf["7"]["inputs"]["steps"] = steps
    wf["7"]["inputs"]["seed"] = seed
    payload = json.dumps({"prompt": wf}).encode("utf-8")
    req = urllib.request.Request(
        f"{COMFYUI_URL}/prompt",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        if self.path == "/" or self.path == "/index.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(PAGE.encode("utf-8"))
            return

        if self.path.startswith("/generate?"):
            from urllib.parse import urlparse, parse_qs

            q = parse_qs(urlparse(self.path).query)
            prompt = q.get("prompt", [""])[0]
            neg = q.get(
                "neg",
                ["blurry, low quality, bad anatomy, deformed hands, watermark, text"],
            )[0]
            w = int(q.get("w", ["1024"])[0])
            h = int(q.get("h", ["1024"])[0])
            steps = int(q.get("steps", ["20"])[0])
            seed = int(q.get("seed", ["0"])[0])
            ref = q.get("ref", [""])[0]
            denoise = float(q.get("denoise", ["0.55"])[0])
            swap = q.get("swap", ["0"])[0] == "1"
            try:
                pos = translate(prompt)
                job_id = str(int(time.time() * 1000))
                JOBS[job_id] = {
                    "pos": pos,
                    "neg": neg,
                    "w": w,
                    "h": h,
                    "steps": steps,
                    "seed": seed,
                    "ref": ref,
                    "denoise": denoise,
                    "swap": swap,
                    "start": time.time(),
                    "done": False,
                    "error": None,
                    "image": None,
                }
                self._json({"id": job_id, "prompt": pos})
                # kick off background thread
                import threading

                threading.Thread(
                    target=self._run_job, args=(job_id,), daemon=True
                ).start()
            except Exception as e:
                self._json({"error": str(e)})
            return

        if self.path.startswith("/status?"):
            from urllib.parse import urlparse, parse_qs

            q = parse_qs(urlparse(self.path).query)
            jid = q.get("id", [""])[0]
            job = JOBS.get(jid)
            if not job:
                self._json({"error": "job not found"})
                return
            if job["done"]:
                self._json({"done": True, "image": job["image"]})
            elif job["error"]:
                self._json({"error": job["error"]})
            else:
                self._json({"done": False, "elapsed": int(time.time() - job["start"])})
            return

        if self.path == "/upload" and self.command == "POST":
            # simple multipart parse (no cgi, removed in 3.13+)
            content_type = self.headers.get("Content-Type", "")
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            boundary = content_type.split("boundary=")[-1].strip().strip('"')
            if boundary and body:
                parts = body.split(("--" + boundary).encode())
                for part in parts:
                    if b"filename=" in part:
                        head, _, data = part.partition(b"\r\n\r\n")
                        fname = (
                            head.decode("utf-8", "ignore")
                            .split('filename="')[1]
                            .split('"')[0]
                            if 'filename="' in head.decode("utf-8", "ignore")
                            else "ref.jpg"
                        )
                        data = data.rsplit(b"\r\n--", 1)[0]
                        ext = os.path.splitext(fname)[1].lower() or ".jpg"
                        if ext not in (".jpg", ".jpeg", ".png", ".webp"):
                            ext = ".jpg"
                        fname = f"ref_{int(time.time())}{ext}"
                        with open(os.path.join(INPUT_DIR, fname), "wb") as f:
                            f.write(data)
                        self._json({"file": fname})
                        return
                self._json({"error": "no file part"})
            else:
                self._json({"error": "no boundary"})
            return

        if self.path.startswith("/delete?"):
            from urllib.parse import urlparse, parse_qs

            q = parse_qs(urlparse(self.path).query)
            fname = q.get("file", [""])[0]
            fname = os.path.basename(fname)  # prevent path traversal
            fpath = os.path.join(OUTPUT_DIR, fname)
            if fname and os.path.exists(fpath) and fname.lower().endswith(".png"):
                try:
                    os.remove(fpath)
                    self._json({"ok": True})
                except Exception as e:
                    self._json({"error": str(e)})
            else:
                self._json({"error": "file not found"})
            return

        if self.path.startswith("/open_folder"):
            try:
                os.startfile(OUTPUT_DIR)
                self._json({"ok": True})
            except Exception as e:
                self._json({"error": str(e)})
            return

        if self.path.startswith("/list_images"):
            try:
                files = sorted(
                    (f for f in os.listdir(OUTPUT_DIR) if f.lower().endswith(".png")),
                    key=lambda f: os.path.getmtime(os.path.join(OUTPUT_DIR, f)),
                    reverse=True,
                )
                self._json({"files": files[:50]})
            except Exception as e:
                self._json({"error": str(e)})
            return

        if self.path.startswith("/images/"):
            fname = os.path.basename(self.path)
            fpath = os.path.join(OUTPUT_DIR, fname)
            if os.path.exists(fpath):
                self.send_response(200)
                self.send_header("Content-Type", "image/png")
                self.end_headers()
                with open(fpath, "rb") as f:
                    self.wfile.write(f.read())
            else:
                self.send_response(404)
                self.end_headers()
            return

        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        self.do_GET()

    def _run_job(self, job_id):
        job = JOBS[job_id]
        try:
            if job.get("swap") and job.get("ref"):
                data = submit_img2img_swap(
                    job["pos"],
                    job["neg"],
                    job["w"],
                    job["h"],
                    job["steps"],
                    job["seed"],
                    job["ref"],
                    job["denoise"],
                )
            elif job.get("ref"):
                data = submit_img2img(
                    job["pos"],
                    job["neg"],
                    job["w"],
                    job["h"],
                    job["steps"],
                    job["seed"],
                    job["ref"],
                    job["denoise"],
                )
            else:
                data = submit(
                    job["pos"],
                    job["neg"],
                    job["w"],
                    job["h"],
                    job["steps"],
                    job["seed"],
                )
            pid = data.get("prompt_id", "")
            start = time.time()
            while time.time() - start < 600:
                try:
                    with urllib.request.urlopen(
                        f"{COMFYUI_URL}/history/{pid}", timeout=15
                    ) as resp:
                        h = json.loads(resp.read().decode("utf-8"))
                    if pid in h:
                        hh = h[pid]
                        st = hh.get("status", {}).get("status_str")
                        if st == "error":
                            for m in hh.get("status", {}).get("messages", []):
                                if m[0] == "execution_error":
                                    job["error"] = m[1].get(
                                        "exception_message", "error"
                                    )
                                    return
                        if st == "success":
                            swap_pref = "web_swap"
                            for v in hh.get("outputs", {}).values():
                                for img in v.get("images", []):
                                    fname = img.get("filename", "")
                                    if fname.startswith(swap_pref):
                                        job["image"] = "/images/" + fname
                                        job["done"] = True
                                        return
                            for v in hh.get("outputs", {}).values():
                                for img in v.get("images", []):
                                    job["image"] = "/images/" + img.get("filename")
                                    job["done"] = True
                                    return
                except Exception:
                    pass
                time.sleep(5)
            job["error"] = "timeout"
        except Exception as e:
            job["error"] = str(e)

    def _json(self, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    print("本地生图网页：http://localhost:8090")
    HTTPServer(("127.0.0.1", 8090), Handler).serve_forever()
