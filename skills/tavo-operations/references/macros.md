## Tavo 宏参考

从 Discord #📚丨support-faqs 频道整理。宏在预设/世界书/提示词中使用。

### 基础宏

| 宏 | 说明 | 示例 |
|----|------|------|
| `{{time}}` | 当前时间 | 14:30 |
| `{{date}}` | 当前日期 | 2026-07-18 |
| `{{weekday}}` | 当前星期 | Saturday |
| `{{isotime}}` | ISO 时间（时:分） | 14:30 |
| `{{isodate}}` | ISO 日期（年-月-日） | 2026-07-18 |
| `{{idle_duration}}` | 距离上条消息的时长 | 5分钟 |
| `{{time_UTC+X}}` | 指定时区时间 | `{{time_UTC+9}}` |
| `{{random:val1,val2,...}}` | 随机选取一个值 | `{{random:你好,hello,こんにちは}}` |
| `{{roll:NdM}}` | 掷骰子（N个M面骰） | `{{roll:3d6}}` → 12 |

### 角色宏

| 宏 | 说明 |
|----|------|
| `{{user}}` | 用户身份名 |
| `{{char}}` | 当前角色名 |
| `{{group}}` | 群组名 |
| `{{charIfNotGroup}}` | 非群聊时显示角色名 |

### 变量宏（setvar/getvar 系统）

| 宏 | 说明 | 示例 |
|----|------|------|
| `{{setvar::name::value}}` | 设置变量（支持 JSON 列表/数字/文本） | `{{setvar::hp::100}}` |
| `{{addvar::name::value}}` | 追加值到变量（列表追加、数字相加、文本拼接） | `{{addvar::items::"sword"}}` |
| `{{incvar::name}}` | 变量 +1 | `{{incvar::counter}}` |
| `{{decvar::name}}` | 变量 -1 | `{{decvar::hp}}` |
| `{{getvar::name}}` | 获取变量值 | `{{getvar::hp}}` |

**作用域**: 所有变量默认当前聊天范围（非跨聊天）。

### EJS 支持（v0.87.0+）

Tavo 宏系统支持 EJS（Embedded JavaScript）模板语法，在设置 → 通用 → 宏系统中启用。
