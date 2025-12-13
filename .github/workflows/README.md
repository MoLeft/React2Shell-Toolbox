# GitHub Actions 自动构建说明

## 工作流程

本项目使用 GitHub Actions 自动构建 Windows、Linux 和 macOS 版本的应用程序。

### 触发方式

1. **标签推送**: 推送以 `v` 开头的标签（如 `v1.0.0`）
2. **手动触发**: 在 GitHub Actions 页面手动运行工作流

### 构建产物

- **Windows (x64)**: 
  - `react2shell-toolbox-{version}-setup.exe` (NSIS 安装程序)
  - `react2shell-toolbox-{version}-portable.exe` (便携版)

- **macOS (x64 + arm64 通用)**: 
  - `react2shell-toolbox-{version}-x64.dmg` (Intel 芯片磁盘镜像)
  - `react2shell-toolbox-{version}-arm64.dmg` (Apple Silicon 磁盘镜像)
  - `react2shell-toolbox-{version}-x64.zip` (Intel 芯片压缩包)
  - `react2shell-toolbox-{version}-arm64.zip` (Apple Silicon 压缩包)

- **Linux (x64 + arm64)**: 
  - `react2shell-toolbox-{version}-x64.AppImage` (通用格式 - 推荐)
  - `react2shell-toolbox-{version}-arm64.AppImage` (ARM64 通用格式)
  - `react2shell-toolbox-{version}-x64.deb` (Debian/Ubuntu)
  - `react2shell-toolbox-{version}-arm64.deb` (Debian/Ubuntu ARM64)
  - `react2shell-toolbox-{version}-x64.rpm` (RedHat/Fedora/CentOS)
  - `react2shell-toolbox-{version}-arm64.rpm` (RedHat/Fedora/CentOS ARM64)
  - `react2shell-toolbox-{version}-x64.tar.gz` (通用压缩包)
  - `react2shell-toolbox-{version}-arm64.tar.gz` (ARM64 通用压缩包)

## 使用方法

### 方法 1: 创建标签发布

```bash
# 创建标签
git tag v1.0.0

# 推送标签到 GitHub
git push origin v1.0.0
```

### 方法 2: 手动触发

1. 进入 GitHub 仓库的 Actions 页面
2. 选择 "Build and Release" 工作流
3. 点击 "Run workflow" 按钮
4. 选择分支并运行

## 下载构建产物

### 从 Artifacts 下载（手动触发）

1. 进入 Actions 页面
2. 选择对应的工作流运行
3. 在页面底部找到 Artifacts 部分
4. 下载对应平台的构建产物

### 从 Releases 下载（标签触发）

1. 进入仓库的 Releases 页面
2. 找到对应版本的 Release
3. 下载对应平台的安装包

## 自动更新机制

应用内置了基于 `electron-updater` 的自动更新功能：

1. **更新源**: GitHub Releases
2. **检查机制**: 用户在设置页面手动检查
3. **更新文件**: 
   - Windows: 使用 `.exe` 和 `latest.yml`
   - macOS: 使用 `.dmg/.zip` 和 `latest-mac.yml`
   - Linux: 使用 `.AppImage` 和 `latest-linux.yml`

### 发布新版本触发更新

```bash
# 1. 更新 package.json 中的版本号
npm version patch  # 或 minor, major

# 2. 推送标签
git push origin v1.0.1

# 3. GitHub Actions 自动构建并发布
# 4. 用户在应用内检查更新即可获取新版本
```

## 注意事项

1. **macOS 签名**: 当前配置禁用了代码签名（`CSC_IDENTITY_AUTO_DISCOVERY: false`），如需签名需要配置证书
2. **Windows 管理员权限**: 应用程序需要管理员权限运行
3. **构建时间**: 完整构建三个平台大约需要 15-30 分钟
4. **自动更新**: 需要发布 Release 后才能使用自动更新功能

## 配置 Secrets（可选）

如果需要代码签名或其他敏感配置，在仓库设置中添加以下 Secrets：

- `CSC_LINK`: macOS 证书文件（base64 编码）
- `CSC_KEY_PASSWORD`: 证书密码
- `WIN_CSC_LINK`: Windows 证书文件
- `WIN_CSC_KEY_PASSWORD`: Windows 证书密码
