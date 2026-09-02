# RimSort & todds（RimWorld Mod 管理器 / DDS 贴图转换）

- **来源**：https://github.com/RimSort/RimSort （开源，含 todds 工具）
- **安装路径**：`C:\Users\pass\AppData\Local\Temp\opencode\rimsort\extracted\RimSort\`
- **版本**：RimSort v1.10.2（内含 todds 0.4.1）
- **用途**：RimWorld Mod 排序 + 把 Mod 贴图转 DDS 压缩，大幅降低加载内存占用

## 背景：为什么需要 DDS

RimWorld 加载 Mod 时把 PNG 贴图解码为未压缩像素，占用大量内存。转 DDS（BC7 压缩）后：
- 加载内存显著下降（实测 10GB → 5~6GB）
- 加载更快，画质几乎无损失
- **前提**：Mod 合集需包含 **Graphics Settings+**（负责加载 DDS），否则显示大红叉

## 安装

RimSort 是便携版，解压即用，无需安装。下载时**走代理 + 美国节点**（GitHub CDN 在美国，实测快 10 倍）：
```bash
# 切换 FlClash 到美国节点（用 Python 脚本，curl 传 emoji 会 400）
# 然后下载
curl -s -L -x http://127.0.0.1:7890 -o rimsort.zip \
  "https://github.com/RimSort/RimSort/releases/download/v1.10.2/RimSort-v1.10.2-Windows_x86_64.zip"
Expand-Archive rimsort.zip -DestinationPath <目标目录> -Force
```

## 配置

首次使用需设置：
- RimWorld 游戏目录：`C:\Steam\steamapps\common\RimWorld`
- Mods 目录：`C:\Steam\steamapps\workshop\content\294100`
- 下载 Steam 数据库 + 社区规则（RimSort 设置向导自动完成，需联网）

## DDS 转换（命令行全自动）

**关键**：用 RimSort 自带的 `todds\todds.exe`（独立版 todds.exe 缺 Intel 运行时 DLL 无法运行），且**必须 cd 到其所在目录**再调用。

**⚠️ todds 0.4.1 CLI flags 全部失效**：实测该版本**所有命令行参数均被忽略**（`-f/-q/-ms/-fs/-o/-th` 等，传无效参数也静默 exit=0），只按默认参数编码：**BC7 + 质量6 + 自动 mipmap**。恰好默认格式就是 BC7，直接裸调即可：

```bash
cd /d "C:\Users\pass\AppData\Local\Temp\opencode\rimsort\extracted\RimSort\todds"
todds.exe "<Mods目录>" "<Mods目录>"
```

- input 和 output **都指向 Mod 目录** → 原地生成 `.dds`，保留 PNG 作后备
- 21845 张 PNG 约 6 分钟（默认全核并行）
- About/ 目录的 Preview.png 也会被转成 DDS（封面图，游戏不加载，无害）
- **非 4 倍数尺寸坑**：BC7 是 4x4 块压缩，宽/高必须是 4 的倍数。源 PNG 为 150x150、1067x1067 等奇数尺寸时，生成的 DDS 无法被 Unity 加载。转换前需先补位（见常见问题），**不能依赖 `-fs/--fix-size`（该参数失效）**

## 常见问题

- **独立版 todds.exe 启动 exit=1 无输出**：缺少 Intel tbb/OpenCL 等 8 个 DLL。改用 RimSort 自带版并 `cd /d` 到其目录
- **转换后内存没降**：确认合集里有 Graphics Settings+；游戏需重启
- **游戏内大红叉/紫块**：Graphics Settings+ 未启用，或某个 Mod 的 DDS 损坏（用 `-cl` clean 回退该 Mod）
- **报错 "Cannot load compressed texture with non multiple of 4 dimensions ... BC7"**：源贴图尺寸非 4 倍数（BC7 要求 4 倍数），Unity 拒绝加载，GraphicsSetter 每次启动警告并回退 PNG。修复：用 System.Drawing 把坏 PNG 补位到下一个 4 倍数（`[int][Math]::Ceiling(w/4)*4`，Ceiling 返回 double 需强转 int，否则 Bitmap 报"参数无效"），>1024 的先等比缩到 1024；另存临时目录后 todds 裸调编码，再复制 DDS 覆盖原文件。判定坏文件：读 DDS 头部第 12/16 字节的宽/高取模 4
- **验证转换是否成功**：启动游戏后看 `C:\Users\pass\AppData\LocalLow\Ludeon Studios\RimWorld by Ludeon Studios\Player.log`，若无 `Cannot load compressed texture` 或 `DDS loading failed` 字样即为全部合法（实测修复后 21821 张零报错、正常进主菜单）
- **后台转换进程吃满 CPU**：必须记录 PID 并监控，完成确认退出，残留进程手动 Kill
- **Mod 更新后**：新贴图是 PNG，需重新跑 todds 转换
