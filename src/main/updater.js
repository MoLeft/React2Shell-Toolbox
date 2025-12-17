import { app, shell } from 'electron'
import axios from 'axios'
import { loadSettings } from './storage-handler.js'

const GITHUB_REPO = 'MoLeft/React2Shell-Toolbox'
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`
const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`

/**
 * 应用镜像配置到 URL
 * @param {string} url - 原始 URL
 * @param {object} settings - 设置对象
 * @returns {string} - 处理后的 URL
 */
function applyMirror(url, settings) {
  if (!settings?.githubMirrorEnabled || !settings?.githubMirrorUrl) {
    return url
  }

  const mirrorUrl = settings.githubMirrorUrl.trim()
  if (!mirrorUrl) {
    return url
  }

  if (settings.githubMirrorType === 'prefix') {
    // 前置代理模式：在 URL 前添加镜像地址
    const cleanMirrorUrl = mirrorUrl.endsWith('/') ? mirrorUrl : mirrorUrl + '/'
    return cleanMirrorUrl + url
  } else if (settings.githubMirrorType === 'replace') {
    // 域名替换模式：替换 GitHub 域名
    return url
      .replace('https://github.com', `https://${mirrorUrl}`)
      .replace('https://raw.githubusercontent.com', `https://raw.${mirrorUrl}`)
      .replace('https://api.github.com', `https://api.${mirrorUrl}`)
  }

  return url
}

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
 * 构建 axios 请求配置（包含代理和镜像设置）
 * @param {object} settings - 设置对象
 * @returns {Promise<object>} - axios 配置对象
 */
async function buildAxiosConfig(settings) {
  const config = {
    timeout: settings?.timeout || 10000,
    headers: {
      'User-Agent': 'React2Shell-ToolBox'
    }
  }

  // 如果启用了代理，添加代理配置
  if (settings?.proxyEnabled && settings?.proxyHost && settings?.proxyPort) {
    const proxyProtocol = settings.proxyProtocol || 'http'
    const proxyHost = settings.proxyHost
    const proxyPort = settings.proxyPort

    console.log('✓ 启用代理:', `${proxyProtocol}://${proxyHost}:${proxyPort}`)

    // 构建代理 URL
    let proxyUrl = `${proxyProtocol}://${proxyHost}:${proxyPort}`

    // 如果需要认证
    if (settings.proxyAuth && settings.proxyUsername && settings.proxyPassword) {
      const username = encodeURIComponent(settings.proxyUsername)
      const password = encodeURIComponent(settings.proxyPassword)
      proxyUrl = `${proxyProtocol}://${username}:${password}@${proxyHost}:${proxyPort}`
      console.log('✓ 代理认证已启用')
    }

    // 准备 TLS 选项
    const tlsOptions = settings?.ignoreCertErrors
      ? {
          rejectUnauthorized: false,
          servername: undefined,
          checkServerIdentity: () => undefined
        }
      : {
          rejectUnauthorized: true
        }

    // 根据代理协议类型创建相应的 Agent
    if (proxyProtocol === 'socks5') {
      // SOCKS5 代理需要使用 SocksProxyAgent
      const { SocksProxyAgent } = await import('socks-proxy-agent')
      const socksAgent = new SocksProxyAgent(proxyUrl, tlsOptions)
      config.httpAgent = socksAgent
      config.httpsAgent = socksAgent
      console.log('✓ 使用 SOCKS5 代理，TLS 选项:', tlsOptions)
    } else {
      // HTTP/HTTPS 代理使用 HttpsProxyAgent
      const { HttpsProxyAgent } = await import('https-proxy-agent')
      const httpsAgent = new HttpsProxyAgent(proxyUrl, tlsOptions)
      config.httpAgent = httpsAgent
      config.httpsAgent = httpsAgent
      console.log(`✓ 使用 ${proxyProtocol.toUpperCase()} 代理，TLS 选项:`, tlsOptions)
    }

    // 禁用 axios 默认的 proxy 配置（我们使用 agent）
    config.proxy = false

    if (settings.ignoreCertErrors) {
      console.log('⚠️ 已忽略 SSL 证书错误')
    }
  } else {
    // 未启用代理时，仍然配置 SSL 证书验证
    if (settings?.ignoreCertErrors) {
      const https = await import('https')
      config.httpsAgent = new https.Agent({
        rejectUnauthorized: false,
        servername: undefined,
        checkServerIdentity: () => undefined
      })
      console.log('⚠️ 已忽略 SSL 证书错误')
    }
  }

  return config
}

/**
 * 生成获取更新内容失败的提示信息
 * @returns {string} - Markdown 格式的提示信息
 */
function generateFailureMessage() {
  return `## ⚠️ 获取更新内容失败

无法从 GitHub 获取详细的更新说明。

### 可能的原因：
- 网络连接问题
- GitHub 访问受限

### 解决方案：
1. 前往 **软件设置 → 国内镜像**
2. 启用 **GitHub 国内镜像**
3. 选择合适的镜像方式和地址
4. 重新检查更新

### 推荐镜像地址：
- 前置代理：\`https://mirror.ghproxy.com/\` 或 \`https://ghproxy.com/\`
- 域名替换：\`hub.gitmirror.com\` 或 \`gitclone.com\`

---

您也可以直接访问 [GitHub Releases](https://github.com/${GITHUB_REPO}/releases) 查看完整更新内容。`
}

/**
 * 从 GitHub 仓库的 changelog 目录读取版本更新说明
 * @param {string} version - 版本号 (例如: "1.0.1")
 * @param {object} settings - 设置对象
 * @returns {Promise<{success: boolean, content: string}>} - 返回读取结果
 */
async function loadChangelogFromGitHub(version, settings) {
  // 原始 GitHub raw 文件 URL
  const originalUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/changelog/v${version}.md`

  // 备用代理 URL（无视用户镜像设置）
  const fallbackUrl = `https://gh-proxy.com/${originalUrl}`

  // 第一次尝试：使用用户配置的镜像
  try {
    let changelogUrl = applyMirror(originalUrl, settings)
    console.log('尝试从 GitHub 读取 changelog:', changelogUrl)

    const axiosConfig = await buildAxiosConfig(settings)
    const response = await axios.get(changelogUrl, axiosConfig)

    if (response.status === 200 && response.data) {
      console.log('✓ 成功从 GitHub 读取 changelog')
      return { success: true, content: response.data }
    } else {
      console.warn('GitHub changelog 文件不存在或为空')
      return { success: false, content: '' }
    }
  } catch (error) {
    // 404 错误表示文件不存在，不需要重试
    if (error.response?.status === 404) {
      console.warn('GitHub changelog 文件不存在 (404):', `v${version}.md`)
      return { success: false, content: '' }
    }

    // 其他错误（如网络问题、DNS 解析失败），尝试备用方案
    console.error('读取 GitHub changelog 失败:', error.message)
    console.error('错误详情:', {
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      hostname: error.hostname
    })

    // 第二次尝试：使用备用代理 gh-proxy.com
    try {
      console.log('⚠️ 尝试使用备用代理:', fallbackUrl)
      const axiosConfig = await buildAxiosConfig(settings)
      const response = await axios.get(fallbackUrl, axiosConfig)

      if (response.status === 200 && response.data) {
        console.log('✓ 成功通过备用代理读取 changelog')
        return { success: true, content: response.data }
      } else {
        console.warn('备用代理返回空内容')
        return { success: false, content: generateFailureMessage() }
      }
    } catch (fallbackError) {
      console.error('备用代理也失败:', fallbackError.message)
      // 如果是 DNS 解析错误，提示用户启用镜像
      if (
        error.code === 'ENOTFOUND' ||
        error.code === 'ENOENT' ||
        error.syscall === 'getaddrinfo'
      ) {
        console.warn('⚠️ DNS 解析失败，建议启用 GitHub 国内镜像')
      }
      // 返回失败提示信息
      return { success: false, content: generateFailureMessage() }
    }
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

    // 加载设置以获取镜像和代理配置
    const settingsResult = await loadSettings()
    const settings = settingsResult.success ? settingsResult.settings : null

    // 应用镜像配置到 API URL
    let apiUrl = GITHUB_API_URL
    apiUrl = applyMirror(apiUrl, settings)

    console.log('检查更新 API:', apiUrl)

    // 构建包含代理的请求配置
    const axiosConfig = await buildAxiosConfig(settings)

    // 从 GitHub API 获取最新版本信息
    const response = await axios.get(apiUrl, axiosConfig)

    const latestRelease = response.data
    const latestVersion = latestRelease.tag_name.replace(/^v/, '')
    let releaseUrl = latestRelease.html_url

    // 应用镜像配置到 Release URL
    releaseUrl = applyMirror(releaseUrl, settings)

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

    // 优先从 GitHub 仓库的 changelog 文件夹读取更新说明
    const changelogResult = await loadChangelogFromGitHub(latestVersion, settings)
    let releaseNotes = ''

    if (changelogResult.success) {
      // 成功读取 changelog
      releaseNotes = changelogResult.content
    } else if (changelogResult.content) {
      // 读取失败但有错误提示信息
      releaseNotes = changelogResult.content
    } else {
      // changelog 文件不存在（404），使用 GitHub Release 的说明
      console.log('使用 GitHub Release 的更新说明')
      releaseNotes = latestRelease.body || generateFailureMessage()
    }

    // 应用镜像配置到下载 URL
    let downloadUrl = GITHUB_RELEASES_URL
    downloadUrl = applyMirror(downloadUrl, settings)

    return {
      hasUpdate: true,
      version: latestVersion,
      currentVersion: currentVersion,
      releaseUrl: releaseUrl,
      releaseNotes: releaseNotes,
      releaseDate: latestRelease.published_at || '',
      downloadUrl: downloadUrl
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
export function onDownloadProgress() {
  // 不再需要，保持兼容性
}

/**
 * 监听更新下载完成（不再需要）
 */
export function onUpdateDownloaded() {
  // 不再需要，保持兼容性
}
