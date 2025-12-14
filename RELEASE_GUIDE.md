# 发布指南

## 删除旧版本 v1.0.0 并重新发布

### 1. 删除 GitHub Release

```bash
# 删除 GitHub 上的 v1.0.0 release
gh release delete v1.0.0 --yes

# 或者手动在 GitHub 网页上删除:
# https://github.com/MoLeft/React2Shell-Toolbox/releases
```

### 2. 删除本地和远程标签

```bash
# 删除本地标签
git tag -d v1.0.0

# 删除远程标签
git push origin :refs/tags/v1.0.0
```

### 3. 提交新的配置

```bash
# 添加修改的文件
git add electron-builder.yml .github/workflows/build.yml README.md

# 提交更改
git commit -m "优化打包文件命名：添加系统前缀 (Windows/macOS/Linux)"

# 推送到远程
git push origin main
```

### 4. 重新创建标签并触发构建

```bash
# 创建新的 v1.0.0 标签
git tag v1.0.0

# 推送标签到远程，触发 GitHub Actions 自动构建
git push origin v1.0.0
```

### 5. 等待构建完成

访问 GitHub Actions 页面查看构建进度：
https://github.com/MoLeft/React2Shell-Toolbox/actions

构建完成后，新的 Release 将自动创建，包含以下文件：

#### Windows
- `Windows-react2shell-toolbox-1.0.0-setup.exe` (安装版)
- `Windows-react2shell-toolbox-1.0.0-portable.exe` (便携版)

#### macOS
- `macOS-react2shell-toolbox-1.0.0-x64.dmg` (Intel)
- `macOS-react2shell-toolbox-1.0.0-arm64.dmg` (Apple Silicon)
- `macOS-react2shell-toolbox-1.0.0-x64.zip` (Intel ZIP)
- `macOS-react2shell-toolbox-1.0.0-arm64.zip` (Apple Silicon ZIP)

#### Linux
- `Linux-react2shell-toolbox-1.0.0-x64.AppImage`
- `Linux-react2shell-toolbox-1.0.0-x64.deb`
- `Linux-react2shell-toolbox-1.0.0-x64.tar.gz`

## 注意事项

1. 确保你已经安装了 GitHub CLI (`gh`)，或者手动在网页上删除 Release
2. 删除标签后，需要等待几分钟再重新创建同名标签
3. 如果构建失败，检查 GitHub Actions 日志排查问题
4. 构建大约需要 15-30 分钟完成所有平台

## 快速命令（一键执行）

```bash
# 删除旧版本并重新发布
gh release delete v1.0.0 --yes && \
git tag -d v1.0.0 && \
git push origin :refs/tags/v1.0.0 && \
git add electron-builder.yml .github/workflows/build.yml README.md && \
git commit -m "优化打包文件命名：添加系统前缀" && \
git push origin main && \
sleep 5 && \
git tag v1.0.0 && \
git push origin v1.0.0
```
