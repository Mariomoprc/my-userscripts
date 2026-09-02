# Steam Workshop 合集机制与 API

## 合集机制

- **快照式订阅**：订阅合集 = 订阅合集内当前所有 item。作者新增 item 后，需回合集页**重新订阅**（取消再订阅）才同步新增内容。
- **合集页数字 ≠ mod 数**：合集页显示 Workshop item 数；一个 item 可含多个 mod（PZ 常见主 mod + 分支/附加 mod）。
- **排序**：合集内顺序即订阅顺序，订阅列表的 load order 与之匹配。

## API

### GetCollectionDetails — 展开合集全部 item

```
POST https://api.steampowered.com/ISteamRemoteStorage/GetCollectionDetails/v1/
Content-Type: application/x-www-form-urlencoded
itemcount=1&publishedfileids[0]=<collectionid>
```

响应含 `children` 数组（每个 item 的 publishedfileid）。

### GetPublishedFileDetails — 单 item / 批量详情

```
POST https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/
itemcount=N&publishedfileids[0]=<id1>&publishedfileids[1]=<id2>...
```

含 title、description、creator_app_id、tags 等。

**注意**：走代理可能失败，需直连（`$env:HTTPS_PROXY=""`）。PS 的 `curl` 是 `Invoke-WebRequest` 别名，用 `curl.exe`。

```powershell
$env:HTTPS_PROXY=""
curl.exe -s "https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/" -d "itemcount=1" -d "publishedfileids[0]=<id>"
```

## 订阅管理

- **GUI 订阅**：合集页「订阅所有」（Subscribe to all）→ Steam 客户端自动下载全部 item。后续新增 item 需重订。
- **取消订阅**：Workshop → Your Workshop Files → Subscribed Items → 按游戏筛选 → Unsubscribe（批量用 Steam Inventory Helper 等）。
- **禁用 vs 卸载**：游戏内可禁用 mod（保留订阅不加载）；卸载需取消订阅。

## 下载验证

- `C:\Steam\steamapps\workshop\content\<appid>\` 目录数应等于合集 item 数
- `appworkshop_<appid>.acf` 的 `SizeOnDisk` 非 0 = 已下载；`NeedsDownload`=1 表示有待下载项
- 部分 item 可能下架/隐藏 → 目录数会少于合集页显示数
