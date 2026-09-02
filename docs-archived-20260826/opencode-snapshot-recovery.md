# opencode Snapshot 文件恢复

- **来源**：opencode 内置文件快照（无外部来源）
- **安装路径**：`C:\Users\pass\.local\share\opencode\snapshot\<snapshotid>\<repoid>\`
- **版本**：随 opencode 版本更新
- **用途**：工作区文件被误改/破坏（编码损坏、误删、错误覆盖）时，从快照 git 对象库恢复原始内容。**适用于不在 git 仓库内的文件**（untracked）。

## 背景

opencode 对工作区文件做快照，目录结构：

```
C:\Users\pass\.local\share\opencode\snapshot\
└── <snapshotid>\                    # 按工作区哈希
    └── <repoid>\                    # git 对象库：有 objects/ + index，无 refs（无提交历史）
```

用 `git` 命令可读取：`index` 记录 路径→blob 映射，`objects/` 和 `pack` 保存 blob 内容（含历史版本）。

## 恢复步骤

```powershell
# 1. 定位 snapshot 仓库（找 <snapshotid>\<repoid> 两层）
$gitdir = (Get-ChildItem "C:\Users\pass\.local\share\opencode\snapshot\*\*\HEAD" | Where-Object { (Get-Content $_.FullName -Raw) -match "ref:" } | Select-Object -First 1).Directory.FullName

# 2. 设 GIT_DIR，找目标文件路径对应的 blob
$env:GIT_DIR = $gitdir
git ls-files --stage | Select-String "project-zomboid"

# 3. 导出 blob（⚠️ 必须用 cmd /c 重定向，PowerShell 的 > 会把二进制转文本）
cmd /c "git cat-file blob <blobhash> > C:\Users\pass\AppData\Local\Temp\opencode\recovered.bin"

# 4. 找历史版本：按 blob 大小过滤（如原文件 34867B vs 损坏 34886B）
git cat-file --batch-all-objects --batch-check | Select-String " blob 34[0-9]{3}$"
```

## 常见问题

- **PowerShell `>` 重定向损坏二进制**：`git cat-file blob` 输出是原始字节，PS `>` 会按文本转码（产生 UTF-16 BOM）。必须 `cmd /c "..."`。
- **文件不在 index 中 / 找不到路径**：index 记录的是最近状态；历史 blob 需用 `--batch-all-objects --batch-check` 按大小/内容人工定位。
- **恢复后验证**：用 Read 工具读恢复文件确认中文/编码正常，字节数应与原文件一致。
- **配合编码教训**：编辑非 git 的 UTF-8 中文文件，先检测 BOM（`EF BB BF`），用 Python（`utf-8-sig`）或 edit 工具链，勿用 PowerShell GB2312 编码转换（见 `.learnings/ERRORS.md` 中编码相关条目）。
