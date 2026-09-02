# 开发工具

GitHub CLI。通过 OpenCode 内置的 GitHub MCP 或 gh CLI 调用。

## GitHub

```bash
# 搜索
gh search repos "query" --sort stars --limit 10
gh search code "query" --language python

# 仓库信息
gh repo view owner/repo

# Issues
gh issue list -R owner/repo --state open
gh issue view 123 -R owner/repo

# Pull Requests
gh pr list -R owner/repo --state open
gh pr view 123 -R owner/repo
gh pr create -R owner/repo --title "Title" --body "Body"
gh pr checks 123 --repo owner/repo

# 检查 Actions
gh run list --repo owner/repo --limit 10
gh run view <run-id> --repo owner/repo --log-failed
gh workflow list --repo owner/repo

# Releases
gh release list -R owner/repo
gh release create v1.0.0

# JSON 输出
gh issue list --repo owner/repo --json number,title --jq '.[] | "\(.number): \(.title)"'
```

## 选择指南

| 工具 | 来源 | 用途 |
|-----|------|------|
| GitHub MCP | OpenCode 内置 | GitHub 操作（推荐） |
| gh CLI | 系统安装 | GitHub 操作（备选） |
| Context7 MCP | OpenCode 内置 | 技术文档查询 |
