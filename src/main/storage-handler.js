import { app, ipcMain } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { createHash } from 'crypto'

/**
 * 获取用户数据目录
 */
function getUserDataPath() {
  return app.getPath('userData')
}

/**
 * 获取历史记录文件路径
 */
function getHistoryFilePath() {
  return join(getUserDataPath(), 'vuln-history.json')
}

/**
 * 获取设置文件路径
 */
function getSettingsFilePath() {
  return join(getUserDataPath(), 'settings.json')
}

/**
 * 读取历史记录
 */
async function loadHistory() {
  try {
    const filePath = getHistoryFilePath()

    if (!existsSync(filePath)) {
      return []
    }

    const data = await readFile(filePath, 'utf-8')
    const history = JSON.parse(data)

    // 验证数据格式
    if (!Array.isArray(history)) {
      console.warn('历史记录格式错误，返回空数组')
      return []
    }

    return history
  } catch (error) {
    console.error('读取历史记录失败:', error)
    return []
  }
}

/**
 * 保存历史记录
 */
async function saveHistory(history) {
  try {
    const filePath = getHistoryFilePath()
    const dirPath = getUserDataPath()

    // 确保目录存在
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true })
    }

    // 验证数据格式
    if (!Array.isArray(history)) {
      throw new Error('历史记录必须是数组格式')
    }

    // 限制历史记录数量（最多保存 100 条）
    const limitedHistory = history.slice(0, 100)

    await writeFile(filePath, JSON.stringify(limitedHistory, null, 2), 'utf-8')

    return { success: true }
  } catch (error) {
    console.error('保存历史记录失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 添加历史记录项
 */
async function addHistoryItem(url) {
  try {
    const history = await loadHistory()

    // 去重：如果已存在，先移除
    const filtered = history.filter((item) => item !== url)

    // 添加到开头
    filtered.unshift(url)

    // 保存
    await saveHistory(filtered)

    return { success: true, history: filtered }
  } catch (error) {
    console.error('添加历史记录失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 清空历史记录
 */
async function clearHistory() {
  try {
    await saveHistory([])
    return { success: true }
  } catch (error) {
    console.error('清空历史记录失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 删除单条历史记录
 */
async function removeHistoryItem(url) {
  try {
    const history = await loadHistory()
    const filtered = history.filter((item) => item !== url)
    await saveHistory(filtered)

    return { success: true, history: filtered }
  } catch (error) {
    console.error('删除历史记录失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 获取 favicon 缓存目录
 */
function getFaviconCachePath() {
  return join(getUserDataPath(), 'favicon-cache')
}

/**
 * 生成 URL 的哈希值作为文件名
 */
function getUrlHash(url) {
  return createHash('md5').update(url).digest('hex')
}

/**
 * 从 HTML 中解析 favicon 链接
 */
function parseFaviconFromHtml(html, baseUrl) {
  const faviconUrls = []

  // 常见的 favicon 标签
  const patterns = [
    // <link rel="icon" href="...">
    /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/gi,
    // <link href="..." rel="icon">
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/gi,
    // <link rel="apple-touch-icon" href="...">
    /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/gi,
    // <link href="..." rel="apple-touch-icon">
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon["']/gi
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(html)) !== null) {
      const href = match[1]
      if (href) {
        try {
          // 处理相对路径和绝对路径
          const absoluteUrl = new URL(href, baseUrl).href
          faviconUrls.push(absoluteUrl)
        } catch {
          // 忽略无效的 URL
        }
      }
    }
  }

  return faviconUrls
}

/**
 * 获取 favicon（带缓存）
 */
async function fetchFavicon(url) {
  try {
    // 解析 URL
    const urlObj = new URL(url)
    const domain = urlObj.hostname
    const port = urlObj.port
    const protocol = urlObj.protocol
    // 使用 host（包含端口）而不是 hostname
    const host = urlObj.host // 例如: localhost:3000
    const baseUrl = `${protocol}//${host}`

    // 检查缓存（使用 host 作为缓存键，包含端口）
    const cacheDir = getFaviconCachePath()
    const cacheKey = getUrlHash(host)
    const cachePath = join(cacheDir, `${cacheKey}.json`)

    // 如果缓存存在且未过期（24小时）
    if (existsSync(cachePath)) {
      try {
        const cacheData = JSON.parse(await readFile(cachePath, 'utf-8'))
        const cacheAge = Date.now() - cacheData.timestamp
        if (cacheAge < 24 * 60 * 60 * 1000) {
          // 缓存有效
          return {
            success: true,
            dataUrl: cacheData.dataUrl,
            cached: true
          }
        }
      } catch {
        // 缓存读取失败，继续获取
      }
    }

    // 动态导入 axios
    const axios = (await import('axios')).default
    const https = await import('https')

    // 加载设置以获取 SSL 配置
    const settingsResult = await loadSettings()
    const settings = settingsResult.success ? settingsResult.settings : null

    // 配置 axios agent（如果需要忽略 SSL 证书错误，仅对 https）
    let httpsAgent = null
    if (settings?.ignoreCertErrors && url.startsWith('https://')) {
      httpsAgent = new https.Agent({
        rejectUnauthorized: false,
        servername: undefined,
        checkServerIdentity: () => undefined
      })
    }

    // 第一步：获取 HTML 页面并解析 favicon 链接
    let faviconUrls = []
    try {
      console.log(`正在获取 ${url} 的 HTML...`)
      const axiosConfig = {
        timeout: 10000,
        validateStatus: (status) => status >= 200 && status < 400,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }

      // 只为 https URL 设置 httpsAgent
      if (httpsAgent) {
        axiosConfig.httpsAgent = httpsAgent
      }

      const htmlResponse = await axios.get(url, axiosConfig)

      if (htmlResponse.data) {
        const html = htmlResponse.data
        faviconUrls = parseFaviconFromHtml(html, baseUrl)
        console.log(`从 HTML 中解析到 ${faviconUrls.length} 个 favicon 链接:`, faviconUrls)
      }
    } catch (e) {
      console.warn('获取 HTML 失败:', e.message)
    }

    // 添加默认的 favicon 路径作为备选
    faviconUrls.push(
      `${baseUrl}/favicon.ico`,
      `${baseUrl}/favicon.png`,
      `${baseUrl}/apple-touch-icon.png`,
      `${baseUrl}/apple-touch-icon-precomposed.png`
    )

    // 去重
    faviconUrls = [...new Set(faviconUrls)]

    let faviconData = null
    let contentType = 'image/x-icon'
    let successUrl = null

    // 第二步：尝试下载 favicon
    for (const faviconUrl of faviconUrls) {
      try {
        console.log(`尝试下载 favicon: ${faviconUrl}`)
        const axiosConfig = {
          responseType: 'arraybuffer',
          timeout: 5000,
          validateStatus: (status) => status === 200,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        }

        // 只为 https URL 设置 httpsAgent
        if (httpsAgent && faviconUrl.startsWith('https://')) {
          axiosConfig.httpsAgent = httpsAgent
        }

        const response = await axios.get(faviconUrl, axiosConfig)

        if (response.data && response.data.byteLength > 0) {
          // 验证是否是有效的图片数据
          const buffer = Buffer.from(response.data)
          // 检查文件头（魔数）
          const isValidImage =
            buffer.length > 4 &&
            ((buffer[0] === 0x89 &&
              buffer[1] === 0x50 &&
              buffer[2] === 0x4e &&
              buffer[3] === 0x47) || // PNG
              (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) || // JPEG
              (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) || // GIF
              (buffer[0] === 0x00 &&
                buffer[1] === 0x00 &&
                buffer[2] === 0x01 &&
                buffer[3] === 0x00) || // ICO
              (buffer[0] === 0x3c &&
                buffer[1] === 0x73 &&
                buffer[2] === 0x76 &&
                buffer[3] === 0x67)) // SVG

          if (isValidImage) {
            faviconData = buffer
            contentType = response.headers['content-type'] || 'image/x-icon'
            successUrl = faviconUrl
            console.log(`✓ 成功获取 favicon: ${faviconUrl}`)
            break
          } else {
            console.warn(`跳过无效的图片数据: ${faviconUrl}`)
          }
        }
      } catch (e) {
        console.warn(`下载失败 ${faviconUrl}:`, e.message)
        // 尝试下一个源
        continue
      }
    }

    if (!faviconData) {
      console.error('所有 favicon 源都失败了')
      return {
        success: false,
        error: 'Failed to fetch favicon from all sources'
      }
    }

    // 转换为 data URL
    const base64 = faviconData.toString('base64')
    const dataUrl = `data:${contentType};base64,${base64}`

    // 保存到缓存
    try {
      if (!existsSync(cacheDir)) {
        await mkdir(cacheDir, { recursive: true })
      }

      await writeFile(
        cachePath,
        JSON.stringify({
          host,
          domain,
          port,
          dataUrl,
          timestamp: Date.now(),
          source: successUrl
        }),
        'utf-8'
      )
      console.log(`✓ Favicon 已缓存: ${host}`)
    } catch (e) {
      console.warn('保存 favicon 缓存失败:', e)
    }

    return {
      success: true,
      dataUrl,
      cached: false,
      source: successUrl
    }
  } catch (error) {
    console.error('获取 favicon 失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 保存导出文件
 */
async function saveExportFile(filename, content) {
  try {
    const { dialog } = await import('electron')
    const { BrowserWindow } = await import('electron')

    // 获取当前窗口
    const win = BrowserWindow.getFocusedWindow()

    // 显示保存对话框
    const result = await dialog.showSaveDialog(win, {
      title: '导出数据',
      defaultPath: filename,
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled) {
      return { success: false, canceled: true }
    }

    // 保存文件
    await writeFile(result.filePath, content, 'utf-8')

    return { success: true, filePath: result.filePath }
  } catch (error) {
    console.error('保存导出文件失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 注册存储相关的 IPC 处理器
 */
export function registerStorageHandlers() {
  ipcMain.handle('storage:loadHistory', async () => {
    try {
      const history = await loadHistory()
      return { success: true, history }
    } catch (error) {
      return { success: false, error: error.message, history: [] }
    }
  })

  ipcMain.handle('storage:saveHistory', async (_event, { history }) => {
    return saveHistory(history)
  })

  ipcMain.handle('storage:addHistoryItem', async (_event, { url }) => {
    return addHistoryItem(url)
  })

  ipcMain.handle('storage:removeHistoryItem', async (_event, { url }) => {
    return removeHistoryItem(url)
  })

  ipcMain.handle('storage:clearHistory', async () => {
    return clearHistory()
  })

  ipcMain.handle('storage:fetchFavicon', async (_event, { url }) => {
    return fetchFavicon(url)
  })

  ipcMain.handle('storage:loadSettings', async () => {
    return loadSettings()
  })

  ipcMain.handle('storage:saveSettings', async (_event, { settings }) => {
    return saveSettings(settings)
  })

  ipcMain.handle('storage:testProxy', async (_event, { proxyConfig }) => {
    return testProxy(proxyConfig)
  })

  ipcMain.handle('storage:saveExportFile', async (_event, { filename, content }) => {
    return saveExportFile(filename, content)
  })

  console.log('✓ 存储处理器已注册')
}

/**
 * 加载设置
 */
export async function loadSettings() {
  try {
    const filePath = getSettingsFilePath()

    if (!existsSync(filePath)) {
      return { success: true, settings: null }
    }

    const data = await readFile(filePath, 'utf-8')
    const settings = JSON.parse(data)

    return { success: true, settings }
  } catch (error) {
    console.error('读取设置失败:', error)
    return { success: false, error: error.message, settings: null }
  }
}

/**
 * 保存设置
 */
async function saveSettings(settings) {
  try {
    const filePath = getSettingsFilePath()
    const dirPath = getUserDataPath()

    // 确保目录存在
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true })
    }

    await writeFile(filePath, JSON.stringify(settings, null, 2), 'utf-8')

    return { success: true }
  } catch (error) {
    console.error('保存设置失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 测试代理配置
 */
async function testProxy(proxyConfig) {
  try {
    console.log('开始测试代理，配置:', proxyConfig)

    const axios = (await import('axios')).default
    const { HttpsProxyAgent } = await import('https-proxy-agent')
    const { SocksProxyAgent } = await import('socks-proxy-agent')

    // 构建代理 URL
    let proxyUrl = ''
    if (proxyConfig.proxyAuth && proxyConfig.proxyUsername) {
      proxyUrl = `${proxyConfig.proxyProtocol}://${proxyConfig.proxyUsername}:${proxyConfig.proxyPassword}@${proxyConfig.proxyHost}:${proxyConfig.proxyPort}`
    } else {
      proxyUrl = `${proxyConfig.proxyProtocol}://${proxyConfig.proxyHost}:${proxyConfig.proxyPort}`
    }

    console.log('代理 URL:', proxyUrl.replace(/:[^:@]+@/, ':****@')) // 隐藏密码

    // 加载设置以获取 SSL 配置
    const settingsResult = await loadSettings()
    const settings = settingsResult.success ? settingsResult.settings : null

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

    // 配置代理
    let agent = null
    if (proxyConfig.proxyProtocol === 'socks5') {
      // SOCKS5 代理支持 http 和 https
      agent = new SocksProxyAgent(proxyUrl, tlsOptions)
    } else {
      // HTTP/HTTPS 代理
      agent = new HttpsProxyAgent(proxyUrl, tlsOptions)
    }

    console.log('正在请求 IP 接口...')

    // 请求宝塔面板的 IP 接口（固定使用 https）
    const response = await axios.get('https://www.bt.cn/api/panel/get_ip_info', {
      httpsAgent: agent,
      httpAgent: proxyConfig.proxyProtocol === 'socks5' ? agent : undefined, // 只有 SOCKS5 才设置 httpAgent
      timeout: 10000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })

    console.log('接口响应状态:', response.status)
    console.log('接口响应数据:', response.data)

    if (response.data && typeof response.data === 'object') {
      // 解析响应数据，格式为 { "IP地址": { "country": "国家", ... } }
      const ipEntries = Object.entries(response.data)
      if (ipEntries.length > 0) {
        const [ip, info] = ipEntries[0]
        // 构建归属地字符串
        const addressParts = []
        if (info.continent) addressParts.push(info.continent)
        if (info.country) addressParts.push(info.country)
        if (info.province) addressParts.push(info.province)
        if (info.city) addressParts.push(info.city)
        if (info.carrier) addressParts.push(info.carrier)

        const result = {
          success: true,
          ip: ip,
          address: addressParts.join(' '),
          details: {
            continent: info.continent || '',
            country: info.country || '',
            province: info.province || '',
            city: info.city || '',
            carrier: info.carrier || '',
            longitude: info.longitude || '',
            latitude: info.latitude || '',
            division: info.division || '',
            en_country: info.en_country || '',
            en_short_code: info.en_short_code || ''
          }
        }

        console.log('返回成功结果:', result)
        return result
      }
    }

    return {
      success: false,
      error: '无法解析 IP 信息'
    }
  } catch (error) {
    console.error('测试代理失败:', error)

    // 提供更详细的错误信息
    let errorMessage = error.message
    if (error.code === 'ECONNREFUSED') {
      errorMessage = '代理服务器连接被拒绝，请检查代理地址和端口是否正确'
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = '连接超时，请检查代理服务器是否正常运行'
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = '无法解析代理服务器地址'
    } else if (error.response) {
      errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`
    }

    return {
      success: false,
      error: errorMessage,
      errorCode: error.code,
      errorDetails: error.toString()
    }
  }
}
