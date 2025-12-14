import { app, shell } from 'electron'
import axios from 'axios'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const GITHUB_REPO = 'MoLeft/React2Shell-Toolbox'
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`
const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`

/**
 * 比较版本号
 * @param {string} v1 - 版本号1 (例如: "1.0.0")
 * @param {string} v2 - 版本号2 (例如: "1.0.1")
 * @returns {number} - 返回 1 表示 v1 > v2, -1 表示 v1 < v2, 0 表示相等
 */
function compareVersions(v1, v2) {
  const parts1 = v1.replace(/^v/, '').split('.').map(Number)
  const parts2 = v2.replace(/^v/, '').split('.').map(Number)

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0
    const part2 = parts2[i] || 0

    if (part1 > part2) return 1
    if (part1 < part2) return -1
  }

  return 0
}

/**
 * 初始化自动更新（空函数，保持兼容性）
 */
export function initAutoUpdater() {
  console.log('自动更新初始化 - 使用 GitHub Releases 检查')
}

/**
 * 从本地 changelog 目录读取版本更新说明
 * @param {string} version - 版本号 (例如: "1.0.1")
 * @returns {Promise<string>} - 返回更新说明内容
 */
async function loadChangelogFromLocal(version) {
  try {
    // 获取应用根目录
    const appPath = app.isPackaged ? process.resourcesPath : app.getAppPath()
    const changelogPath = join(appPath, 'changelog', `v${version}.md`)

    console.log('尝试读取 changelog:', changelogPath)

    if (existsSync(changelogPath)) {
      const content = await readFile(changelogPath, 'utf-8')
      console.log('✓ 成功从本地读取 changelog')
      return content
    } else {
      console.warn('本地 changelog 文件不存在:', changelogPath)
      return ''
    }
  } catch (error) {
    console.error('读取本地 changelog 失败:', error)
    return ''
  }
}

/**
 * 检查更新
 * @returns {Promise<{hasUpdate: boolean, version?: string, currentVersion?: string, releaseUrl?: string, error?: string}>}
 */
export async function checkForUpdates() {
  try {
    const currentVersion = app.getVersion()
    console.log('当前版本:', currentVersion)

    // 从 GitHub API 获取最新版本信息
    const response = await axios.get(GITHUB_API_URL, {
      timeout: 10000,
      headers: {
        'User-Agent': 'React2Shell-ToolBox'
      }
    })

    const latestRelease = response.data
    const latestVersion = latestRelease.tag_name.replace(/^v/, '')
    const releaseUrl = latestRelease.html_url

    console.log('最新版本:', latestVersion)

    // 比较版本号
    const comparison = compareVersions(latestVersion, currentVersion)

    if (comparison <= 0) {
      return {
        hasUpdate: false,
        version: currentVersion,
        currentVersion: currentVersion,
        message: '当前已是最新版本'
      }
    }

    // 优先从本地 changelog 读取更新说明
    let releaseNotes = await loadChangelogFromLocal(latestVersion)

    // 如果本地没有，使用 GitHub Release 的说明
    if (!releaseNotes) {
      console.log('使用 GitHub Release 的更新说明')
      releaseNotes = latestRelease.body || ''
    }

    return {
      hasUpdate: true,
      version: latestVersion,
      currentVersion: currentVersion,
      releaseUrl: releaseUrl,
      releaseNotes: releaseNotes,
      releaseDate: latestRelease.published_at || '',
      downloadUrl: GITHUB_RELEASES_URL
    }
  } catch (error) {
    console.error('检查更新失败:', error)
    return {
      hasUpdate: false,
      error: error.message || '检查更新失败，请检查网络连接'
    }
  }
}

/**
 * 打开 GitHub Releases 页面下载最新版本
 * @param {string} url - Release 页面 URL（可选）
 */
export function openDownloadPage(url) {
  const downloadUrl = url || GITHUB_RELEASES_URL
  console.log('打开下载页面:', downloadUrl)
  shell.openExternal(downloadUrl)
}

/**
 * 下载更新（跳转到 GitHub 下载页面）
 * @param {string} releaseUrl - Release 页面 URL
 * @returns {Promise<{success: boolean}>}
 */
export async function downloadUpdate(releaseUrl) {
  try {
    openDownloadPage(releaseUrl)
    return { success: true }
  } catch (error) {
    console.error('打开下载页面失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 安装更新并重启（不再需要，用户手动下载安装）
 */
export function quitAndInstall() {
  console.log('请手动安装下载的更新包')
}

/**
 * 获取下载进度（不再需要）
 */
export function onDownloadProgress(callback) {
  // 不再需要，保持兼容性
}

/**
 * 监听更新下载完成（不再需要）
 */
export function onUpdateDownloaded() {
  // 不再需要，保持兼容性
}
