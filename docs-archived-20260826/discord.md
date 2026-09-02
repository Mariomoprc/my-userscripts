# Discord User Token 操作

- **小号用户名**：slime00260
- **User Token**：通过 Edge 浏览器从 Discord API 请求的 Authorization 头获取
- **获取方式**：连接 Edge 浏览器 → 网络请求 → 提取 Authorization 头
- **服务器**：Tavo 社区（ID: 1356606095207960616）
- **用途**：读取频道消息、搜索内容、查看公告
- **调用方式**：`curl -H "Authorization: {token}" https://discord.com/api/v10/...`
- **注意**：User Token 违反 Discord ToS，仅用小号读取，不做写入操作
