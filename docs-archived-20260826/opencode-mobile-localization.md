# OpenCode-Mobile 汉化构建流程

第三方安卓客户端 `alvarolorentedev/opencode-mobile`（Expo/React Native，连自建 opencode serve）的汉化与本地构建流程。官方无中文（无 i18n 库），用词典直接替换 UI 字符串。

**相关经验**：LRN-20260807-076/077/079，ERR-20260806-003/004/005/006。

## 1 环境要求

- Node ≥ 20、npm
- Android Studio（自带 JBR JDK）+ Android SDK：`ANDROID_HOME=C:\Users\pass\AppData\Local\Android\Sdk`，`JAVA_HOME=C:\Program Files\Android\Android Studio\jbr`
- 手机开 USB 调试，`adb devices` 可见
- **项目必须放短路径**（如 `C:\oc-mobile`），放 `%TEMP%` 深路径触发 CMake 260 字符限制（ERR-20260806-003）

## 2 完整流程

### 2.1 获取源码

```powershell
$env:HTTPS_PROXY="http://127.0.0.1:7890"
git clone https://github.com/alvarolorentedev/opencode-mobile.git C:\oc-mobile
```

### 2.2 安装依赖（严格按 lock）

```powershell
npm ci --no-audit --no-fund     # 勿用 npm install，不校验已有文件完整性（ERR-20260806-005）
```

### 2.3 提取并翻译字符串

用 Python 脚本（示例在 `C:\Users\pass\AppData\Local\Temp\opencode\extract_all.py`）提取：
- JSX 文本节点 `>Text<`
- 引号字符串 `"Text"` / `'Text'`（排除 import、URL、icon 名、testID 等）

构建翻译词典后替换，**词典键必须覆盖三种写法**（JSX 文本 `>x<`、双引号 `"x"`、单引号 `'x'`），否则漏网（LRN-20260807-077）。短英文词（Server/Delete 等）单引号可能是代码逻辑值，单引号替换需排除。

### 2.4 验证 + 构建

```powershell
npm run typecheck                     # 确保替换没破坏类型
npx expo prebuild --platform android --clean
cd android
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
.\gradlew.bat assembleRelease         # 后台跑 + 日志文件轮询
```

- **必须 assembleRelease**：debug 是 dev client，APK 无 JS bundle，打开进 expo launcher 非 app 本体（ERR-20260806-004）
- release 默认用 debug keystore 签名，可与同包名（`app.getopencode`）旧版 `adb install -r` 覆盖
- Gradle 下载/依赖超时：`~/.gradle/gradle.properties` 配 `systemProp.http(s).proxyHost/Port=127.0.0.1/7890`（ERR-20260806-006）

### 2.5 验证汉化进包

APK 内 bundle 是 Hermes 字节码，**非 ASCII 字符串用 UTF-16LE 存储**（LRN-20260807-076）：

```python
import zipfile
raw = zipfile.ZipFile('app-release.apk').read('assets/index.android.bundle')
print(raw.count('设置'.encode('utf-16-le')))   # >0 即汉化已进包
```

### 2.6 安装

```powershell
adb install -r android\app\build\outputs\apk\release\app-release.apk
```

## 3 关键坑速查

| 症状 | 原因 | 处理 |
|------|------|------|
| CMake "Filename longer than 260" | 项目在长路径 | 移到盘符短路径（ERR-20260806-003） |
| 装后打开是 expo 英文启动器 | debug 是 dev client | 构建 release（ERR-20260806-004） |
| 改源码后 bundle 不更新 | Metro 缓存 | 删 `.expo`+`node_modules/.cache`+Temp `metro-*`，用字符串字面量 marker 验证（LRN-20260807-079） |
| 源码有中文但 bundle 搜不到 | Hermes 存 UTF-16 | 用 `utf-16-le` 编码搜索（LRN-20260807-076） |
| 移动目录后文件缺失 | Move-Item 中断 | `git checkout -- $(git ls-files --deleted)` 恢复 + `npm ci`（ERR-20260806-005） |

## 4 app 升级后重新汉化

源码升级后汉化会丢失，重跑 2.3 词典替换 + 2.4~2.6 构建安装即可（词典和提取脚本按需重建）。
