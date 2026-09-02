# ComfyUI 本地生图（Intel Arc 核显）

笔记本（Intel Core Ultra X7 358H + Arc B390 iGPU + 32GB 共享内存）的本地生图方案。

## 环境

| 项 | 值 |
|---|---|
| ComfyUI | `C:\Users\pass\ComfyUI`（手动部署，非一键脚本） |
| Python | uv 缓存的 3.11（`uv python install 3.11`） |
| PyTorch | `--pre torch --index-url https://download.pytorch.org/whl/nightly/xpu` |
| 启动 | `START_ComfyUI.bat`（`--bf16-unet --async-offload --disable-smart-memory` + `SYCL_CACHE_PERSISTENT=1`） |
| 端口 | 8188 |
| 网页前端 | `scripts/image-web.py` → http://localhost:8090 |
| 生图脚本 | `scripts/generate-image.py`（中文描述→出图） |
| 提示词工具 | `scripts/sd-prompt.py`（中文想法→SDXL英文提示词，本地14B无审查） |

**显存实测**（2026-08-14）：生图峰值仅 **2.14GB**（SDXL GGUF Q4 按需 CPU-offload 加载）。与本地 LLM 可共存——qwen3.6:27b（16GB）+ 生图同时跑 74s 正常出图，无需调 Shared GPU Memory Override。评估显存用「提交任务同时轮询 system_stats 的 vram_free」实测，勿信 system_stats 报告的 vram_total。

**进程坑**：venv 主进程会 spawn 一个 **uv python 子进程**（`AppData\Roaming\uv\python\...`）承担 8188 服务，通过 PYTHONPATH 继承 venv 包，**属正常架构勿当残留杀**；判断标准看 8188 是否可用（system_stats 200）。启动前先杀干净所有 `main.py` 进程确保单实例。

**启动参数注意**：勿加 `--reserve-vram`（会误导显存计算，配合进程混乱造成假性 OOM）；标准参数 `--lowvram --bf16-unet --async-offload --disable-smart-memory`。

**网页换脸入口**（image-web.py v2）：上传参考图 + 勾选「换脸」→ img2img 换衣/换场景 + ReActor 换脸，返回 `web_swap_*.png`。参数 `swap=1`（需配 `ref`）。注意：服务是单线程，translate 调 14B 首次冷启动可能 >60s，客户端别用太短的请求超时。

## 模型

- **Juggernaut XL v9 GGUF** Q4_K：`models/unet/juggernaut-xl-v9-Q4_K.gguf`（2.76GB，offgrid-ai 仓库）
- SDXL 需配齐：unet(GGUF) + clip_l + sdxl_clip_g（DualCLIPLoader type=sdxl）+ sdxl_vae
- 下载源：offgrid-ai/juggernaut-xl-v9-GGUF、HyperX-Sentience/SDXL-GGUF、stabilityai/sdxl-vae

## 核显硬限制（重要）

1. **只兼容 GGUF + bf16**：fp16 模型在核显上 fp32 推理全黑图；GGUF + `--bf16-unet` 正常
2. **IP-Adapter 彻底黑图**（无解）：GGUF/fp16、bf16/fp32 都纯黑。IPAdapter_plus 无法强制 CPU
3. **inpaint 不可靠**：mask 重绘区生成新人物/纯背景，接缝生硬，无法保持同一个人
4. **img2img denoise >0.4 可能黑图**：低 denoise(0.35) 稳定

## 保脸方案（换衣/换场景脸不变）

**最终方案：img2img 换衣 + ReActor 换脸**（换衣和保脸分离）：
1. img2img 高 denoise 换衣/换场景（脸随便，参考图当底图 + 匹配原图比例）
2. ReActor 把参考图人脸交换到生成图

**img2img 保脸（不用 ReActor 时）**：
- denoise 0.35 + 匹配参考图比例（竖图 768x1152，避免 crop:center 裁脸）
- 人脸相似度 85-95%，换装弱

## ReActor 换脸节点

- 位置：`custom_nodes/ComfyUI_ReActor`（Gourieff/ComfyUI-ReActor）
- 换脸：img2img 生成图 → ReActorFaceSwap(source=参考图, target=生成图)

**依赖（装到 `comfyui_venv`）**：
- `pip install onnxruntime`（venv 的 python，用清华源加速）
- `pip install -r custom_nodes\ComfyUI_ReActor\requirements.txt`（albumentations/onnx/cv2/SAM/ultralytics）
- **注意**：清华源会装 CPU 版 torch，若已装 XPU torch 会被降级！装完必须恢复：
  `pip install --force-reinstall --no-deps "torch==2.15.0.dev20260812+xpu" --index-url https://download.pytorch.org/whl/nightly/xpu`

**所需模型（全部用本机 FlClash `http://127.0.0.1:7890` xf 机场下载）**：
| 模型 | 位置 | 大小 | 用途 |
|---|---|---|---|
| `inswapper_128.onnx` | `models/insightface/` | **554MB** | 换脸核心（**不是** 13.5MB！下载不全会 Protobuf 报错） |
| `buffalo_l.zip` | 解压到 `models/insightface/models/buffalo_l/` | 288MB | 人脸分析（det_10g/w600k_r50/genderage/2d106det/1k3d68） |
| `GFPGANv1.3/1.4.pth` | `models/facerestore_models/` | 82/333MB | 人脸修复 |
| `codeformer-v0.1.0.pth` | 同上 | 371MB | 人脸修复 |
| `GPEN-BFR-512.onnx` | 同上 | 287MB | 人脸修复 |

- face_restore_model 目录为空时，ReActor 每次查询 object_info 都尝试在线下载（HF 超时→500），需预下载
- HF 大文件用 curl `-x http://127.0.0.1:7890 -L` 下载，断点续传用 `-C -`；软路由 TUN 直连 HF 只有 ~285KB/s 很慢

## 代理下载

- HF 下载模型：**本机 FlClash 代理 `http://127.0.0.1:7890`**（xf 机场），软路由代理 SSL 不稳
- 软路由 OpenClash：只做透明代理，下载大文件不稳

## 常见坑

- pip install 装错 python：ComfyUI 用 uv 缓存的 3.11，用 `Get-CimInstance Win32_Process` 查实际 python，装依赖用 `--break-system-packages`
- 中文文件名参考图：LoadImage 可能不支持，先复制为英文名
- 参考图全身竖构图：img2img 必须匹配比例，否则方形裁剪掉脸

相关经验：LRN-20260813-001/002/003、ERR-20260813-001/002/003
