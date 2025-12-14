# React2Shell Toolbox

一个基于 Electron + Vue 3 的安全测试工具箱，专注于 React Server Actions 漏洞检测与利用。

## 项目简介

React2Shell Toolbox 是一款针对 Next.js React Server Actions 原型链污染漏洞（CVE-2025-55182）的安全测试工具。该工具提供了友好的图形界面，支持 POC 验证、虚拟终端交互、以及高级的路由劫持功能。

## 应用截图

### POC 验证界面

![POC 验证](screenshoot/Snipaste_2025-12-13_17-13-52.png)

### 虚拟终端交互

![虚拟终端](screenshoot/Snipaste_2025-12-13_17-14-23.png)

### 设置页面

![设置页面](screenshoot/Snipaste_2025-12-13_17-15-30.png)

## 技术架构

### 前端技术栈

- **框架**: Vue 3 (Composition API)
- **UI 库**: Vuetify 3
- **路由**: Vue Router 4
- **代码编辑器**: Monaco Editor
- **终端模拟**: xterm.js
- **语法高亮**: highlight.js
- **构建工具**: Electron Vite

### 后端技术栈

- **运行时**: Electron 39
- **主进程**: Node.js
- **HTTP 客户端**: Axios
- **编码处理**: iconv-lite (支持 GBK/UTF-8 自适应解码)

### 项目结构

```
react2shell-toolbox/
├── src/
│   ├── main/                          # Electron 主进程
│   │   ├── index.js                   # 主进程入口
│   │   ├── poc-handler.js             # POC 执行核心逻辑
│   │   ├── terminal-handler.js        # 虚拟终端处理器
│   │   ├── http-terminal-backend.js   # HTTP 终端后端注入
│   │   ├── terminal-backend-injector.js # WebSocket 终端后端注入
│   │   ├── storage-handler.js         # 本地存储管理（历史记录、设置、favicon缓存）
│   │   └── updater.js                 # 版本更新检查
│   ├── preload/                       # 预加载脚本
│   │   └── index.js                   # IPC 通信桥接
│   └── renderer/                      # 渲染进程（前端）
│       ├── index.html
│       └── src/
│           ├── App.vue                # 主应用组件（启动时自动检查更新）
│           ├── main.js                # 前端入口
│           ├── router/                # 路由配置
│           ├── views/                 # 页面视图
│           │   ├── POCView.vue        # POC 验证页面
│           │   ├── BatchView.vue      # 批量验证页面
│           │   └── SettingsView.vue   # 设置页面（请求设置、代理设置、关于软件）
│           ├── components/            # 公共组件
│           ├── plugins/               # 插件配置
│           │   └── vuetify.js         # Vuetify 配置
│           └── assets/                # 静态资源
├── changelog/                         # 版本更新说明
│   ├── README.md                      # Changelog 使用说明
│   ├── v1.0.0.md                      # v1.0.0 版本更新说明
│   └── v1.0.1.md                      # v1.0.1 版本更新说明
├── resources/                         # 应用资源
│   ├── icon.png                       # 应用图标（PNG）
│   └── icon.ico                       # 应用图标（Windows ICO）
├── screenshoot/                       # 应用截图
├── .github/
│   └── workflows/
│       └── build.yml                  # GitHub Actions 自动构建配置
├── dist/                              # 构建输出
├── out/                               # 打包输出
├── package.json                       # 项目配置
├── electron.vite.config.mjs           # Vite 配置
├── electron-builder.yml               # Electron Builder 打包配置
├── UPDATES_SUMMARY.md                 # 更新总结文档
└── README.md                          # 项目说明
```

## 核心功能

### ✅ 已实现功能

#### 1. POC 验证模块

- **基础检测**: 输入目标 URL 和命令，一键执行漏洞检测
- **状态展示**: 实时显示 HTTP 状态码和漏洞检测结果
- **多视图展示**:
  - 完整响应视图（源码/网页双模式）
  - 命令回显提取
  - 虚拟终端交互（支持 Linux/macOS）
- **历史记录**:
  - 自动保存检测成功的 URL
  - 支持 favicon 显示
  - 快速填充历史 URL
  - 在浏览器中打开
  - 删除/清空历史记录

#### 2. 虚拟终端

- **HTTP SSE 模式**: 基于 Server-Sent Events 的实时终端
- **平台检测**: 自动识别目标服务器操作系统（Windows/Linux/macOS）
- **智能适配**: Windows 平台自动禁用终端功能（暂不支持）
- **交互式 Shell**: 支持命令输入、输出显示、历史记录
- **终端特性**:
  - 光标闪烁
  - 自适应大小
  - 链接识别
  - 滚动缓冲

#### 3. 编码处理

- **自适应解码**: 自动识别并修复 GBK/UTF-8 编码问题
- **平台感知**: 根据目标平台（Windows/Linux）选择正确的编码
- **Base64 处理**: 支持 Base64 编码的命令输出解码
- **乱码修复**: 多种策略修复中文乱码

#### 4. 存储管理

- **历史记录持久化**: 使用 Electron Store 保存检测历史
- **Favicon 缓存**: 自动获取并缓存网站图标
- **跨会话保持**: 应用重启后保留历史数据

#### 5. 设置管理

- **请求设置**:
  - 响应超时时间配置（1000-60000ms）
  - 忽略 SSL 证书错误选项
- **代理设置**:
  - 支持 HTTP/HTTPS/SOCKS5 代理
  - 代理服务器地址和端口配置
  - 代理认证（用户名/密码）
  - 代理连接测试（显示出口 IP 和归属地）
- **关于软件**:
  - 当前版本显示
  - 手动检查更新
  - 启动时自动检查更新开关
  - 开源地址链接
  - 软件信息展示

#### 6. 版本更新检查

- **自动检查**: 应用启动时自动检查更新（可在设置中关闭）
- **手动检查**: 在设置页面点击"检查更新"按钮
- **版本对比**: 智能比较当前版本和最新版本
- **更新说明**: 优先从本地 changelog 读取，支持 Markdown 格式
- **友好提示**: 
  - 检查时显示 loading 提示
  - 有新版本时弹窗显示详情
  - 已是最新版本时显示简短提示
- **一键下载**: 点击"前往下载"跳转到 GitHub Releases 页面
- **全环境支持**: 开发和生产环境都可以检查更新

### 🚧 未实现功能

#### 1. 批量验证模块

- 批量导入 URL 列表
- 并发检测
- 结果导出（CSV/JSON）
- 进度跟踪
- 失败重试

#### 2. 高级设置

- 并发数控制
- 自定义 Payload 模板
- 主题切换（暗色/亮色）
- 语言切换（中文/英文）

#### 3. 报告生成

- 检测报告导出
- 漏洞详情记录
- 截图功能
- PDF 导出

#### 4. 高级功能

- 自定义 POC 脚本
- 插件系统
- 漏洞数据库

#### 5. Windows 终端支持

- Windows CMD/PowerShell 交互
- Windows 平台的虚拟终端

## 下载安装

### 预编译版本下载

从 [GitHub Releases](https://github.com/MoLeft/React2Shell-Toolbox/releases) 下载对应平台的安装包：

#### Windows 系统

- **安装版**: `Windows-react2shell-toolbox-{version}-setup.exe`
  - 双击运行，按提示安装
  - 支持自定义安装路径
  - 自动创建桌面快捷方式
- **便携版**: `Windows-react2shell-toolbox-{version}-portable.exe`
  - 无需安装，直接运行
  - 适合 U 盘携带使用

#### macOS 系统

- **Intel 芯片**: `macOS-react2shell-toolbox-{version}-x64.dmg`
- **Apple Silicon (M1/M2/M3)**: `macOS-react2shell-toolbox-{version}-arm64.dmg`

**安装步骤**:

1. 下载对应架构的 DMG 文件
2. 双击打开 DMG 文件
3. 将应用拖拽到 Applications 文件夹
4. 首次运行需要在"系统偏好设置 > 安全性与隐私"中允许运行

**ZIP 版本**: 如果 DMG 无法使用，可下载对应的 `.zip` 文件解压使用

#### Linux 系统

- **AppImage** (推荐): `Linux-react2shell-toolbox-{version}-x64.AppImage`

  ```bash
  chmod +x Linux-react2shell-toolbox-{version}-x64.AppImage
  ./Linux-react2shell-toolbox-{version}-x64.AppImage
  ```

- **DEB 包** (Debian/Ubuntu): `Linux-react2shell-toolbox-{version}-x64.deb`

  ```bash
  sudo dpkg -i Linux-react2shell-toolbox-{version}-x64.deb
  sudo apt-get install -f  # 修复依赖
  ```

- **TAR.GZ 包**: `Linux-react2shell-toolbox-{version}-x64.tar.gz`
  ```bash
  tar -xzf Linux-react2shell-toolbox-{version}-x64.tar.gz
  cd react2shell-toolbox
  ./react2shell-toolbox
  ```

### 从源码构建

#### 环境要求

- Node.js >= 18
- npm >= 9

#### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建应用

#### 本地构建

```bash
# 构建代码
npm run build

# 打包 Windows 应用 (x64)
npm run build:win

# 打包 macOS 应用 (x64 + arm64 通用)
npm run build:mac

# 打包 macOS 应用 (仅 Intel)
npm run build:mac:x64

# 打包 macOS 应用 (仅 Apple Silicon)
npm run build:mac:arm64

# 打包 Linux 应用 (x64 + arm64)
npm run build:linux

# 打包 Linux 应用 (仅 x64)
npm run build:linux:x64

# 打包 Linux 应用 (仅 arm64)
npm run build:linux:arm64

# 打包所有平台
npm run build:all
```

**构建产物说明：**

- Windows: NSIS 安装程序 + 便携版
- macOS: DMG 磁盘镜像 + ZIP 压缩包 (支持 Intel 和 Apple Silicon)
- Linux: AppImage + DEB + RPM + TAR.GZ (支持 x64 和 arm64)

#### 自动构建（GitHub Actions）

本项目支持通过 GitHub Actions 自动构建所有平台的应用程序：

```bash
# 创建版本标签触发自动构建
git tag v1.0.0
git push origin v1.0.0
```

构建完成后，可以在 GitHub Releases 页面下载对应平台的安装包。详见 [.github/workflows/README.md](.github/workflows/README.md)

### 代码格式化

```bash
npm run format
npm run lint
```

## 使用说明

### POC 验证

1. 在左侧输入目标 URL（例如：`http://localhost:3000`）
2. 输入要执行的命令（例如：`ifconfig`、`whoami`）
3. 点击"执行检测"按钮
4. 查看右侧的检测结果：
   - 状态码卡片显示 HTTP 响应状态
   - 漏洞检测卡片显示是否存在漏洞
   - 切换不同 Tab 查看详细信息

### 虚拟终端

1. 执行 POC 检测并确认存在漏洞
2. 切换到"虚拟终端" Tab
3. 等待终端初始化完成
4. 输入命令并按回车执行
5. 支持命令历史记录（上下箭头）

### 检查更新

1. 进入"设置"页面
2. 在"关于软件"部分点击"检查更新"按钮
3. 如果有新版本，会显示更新信息和下载按钮
4. 点击"前往下载"按钮，自动打开浏览器跳转到 GitHub Releases 页面
5. 在 GitHub 页面下载对应平台的安装包并手动安装

**优势**:

- 支持开发和生产环境
- 无需配置复杂的自动更新服务器
- 用户可以查看完整的 Release 说明
- 支持选择下载不同平台的版本

### 隐藏功能

（去分析源码找到这个功能吧！）

## 安全警告

⚠️ **本工具仅供安全研究和授权测试使用**

- 请勿在未经授权的系统上使用本工具
- 使用本工具造成的任何后果由使用者自行承担
- 建议仅在受控的测试环境中使用

## 漏洞说明

本工具针对的是 Next.js React Server Actions 的原型链污染漏洞（CVE-2025-55182）。该漏洞允许攻击者通过构造特殊的 FormData 请求，污染 JavaScript 原型链，从而实现远程代码执行。

### 影响版本

- Next.js < 15.1.0
- Next.js < 14.2.22
- Next.js < 13.5.8

### 修复建议

- 升级 Next.js 到最新版本
- 启用严格的输入验证
- 使用 CSP 策略限制脚本执行

## 开发计划

- [ ] 完成批量验证模块
- [x] 实现设置页面（请求设置、代理设置）
- [ ] 添加报告生成功能
- [ ] 支持 Windows 终端
- [ ] 添加自定义 POC 脚本
- [ ] 实现插件系统
- [x] 添加版本更新检查功能
- [x] 启动时自动检查更新
- [x] Changelog 版本管理
- [ ] 支持多语言
- [ ] 添加暗色主题

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 致谢

- Next.js 团队
- Electron 社区
- Vue.js 社区
- 所有开源贡献者

---

**免责声明**: 本工具仅用于安全研究和教育目的。使用者应遵守当地法律法规，不得用于非法用途。
