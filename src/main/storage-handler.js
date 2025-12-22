import { app, ipcMain } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { createHash } from 'crypto'
import {
  PROXY_IP_INFO_PARSE_FAILED,
  HISTORY_MUST_BE_ARRAY,
  PROXY_CONNECTION_REFUSED,
  PROXY_TIMEOUT,
  PROXY_HOST_NOT_FOUND
} from './error-codes.js'
import { t } from './i18n.js'

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
      throw new Error(HISTORY_MUST_BE_ARRAY)
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
      }
    } catch {
      // 获取 HTML 失败，使用默认路径
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
            break
          }
        }
      } catch {
        // 下载失败，尝试下一个源
        continue
      }
    }

    if (!faviconData) {
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
    } catch {
      // 缓存保存失败，不影响返回结果
    }

    return {
      success: true,
      dataUrl,
      cached: false,
      source: successUrl
    }
  } catch (error) {
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
      title: t('dialog.exportData'),
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
 * 保存任务文件（新方案：JSON → gzip → 加密 → 修改文件头）
 * 先在后台完成所有处理，最后弹出文件选择对话框
 */
async function saveTaskFile(filename, taskData, password = null, progressCallback = null) {
  const fs = await import('fs')
  const { tmpdir } = await import('os')
  const { join } = await import('path')
  const { stat, unlink, copyFile } = await import('fs/promises')
  const { createGzip } = await import('zlib')
  const { pipeline } = await import('stream/promises')
  const { Transform } = await import('stream')
  const crypto = await import('crypto')

  let tempJsonPath = null
  let tempGzPath = null
  let tempFinalPath = null

  try {
    if (progressCallback) progressCallback({ percent: 0, stage: 'preparing' })

    // 第一步：将 JSON 序列化并写入临时文件
    tempJsonPath = join(tmpdir(), `r2stb-export-${Date.now()}.json`)
    const jsonString = JSON.stringify(taskData)
    await writeFile(tempJsonPath, jsonString, 'utf-8')

    const jsonStats = await stat(tempJsonPath)
    const jsonSize = jsonStats.size
    console.log(`准备导出任务文件，JSON 大小: ${(jsonSize / 1024 / 1024).toFixed(2)} MB`)

    if (progressCallback) progressCallback({ percent: 10, stage: 'compressing' })

    // 第二步：压缩到临时文件
    tempGzPath = join(tmpdir(), `r2stb-export-${Date.now()}.gz`)
    const readStream = fs.createReadStream(tempJsonPath)
    const gzipStream = createGzip({ level: 9 }) // 最高压缩级别
    const gzipWriteStream = fs.createWriteStream(tempGzPath)

    let processedBytes = 0
    const progressTransform = new Transform({
      transform(chunk, encoding, callback) {
        processedBytes += chunk.length
        const percent = Math.min(50, 10 + Math.floor((processedBytes / jsonSize) * 40))
        if (progressCallback && processedBytes % (5 * 1024 * 1024) < 256 * 1024) {
          progressCallback({
            percent,
            stage: 'compressing',
            processed: processedBytes,
            total: jsonSize
          })
        }
        callback(null, chunk)
      }
    })

    await pipeline(readStream, progressTransform, gzipStream, gzipWriteStream)

    const gzStats = await stat(tempGzPath)
    const gzSize = gzStats.size
    console.log(
      `压缩完成，gzip 大小: ${(gzSize / 1024 / 1024).toFixed(2)} MB，压缩率: ${((1 - gzSize / jsonSize) * 100).toFixed(1)}%`
    )

    if (progressCallback) progressCallback({ percent: 60, stage: 'encrypting' })

    // 第三步：加密（如果有密码）
    const gzData = await fs.promises.readFile(tempGzPath)
    let finalData = gzData

    if (password) {
      // 使用 AES-256-CBC 加密
      const key = crypto.createHash('sha256').update(password).digest()
      const iv = crypto.randomBytes(16)
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)

      const encrypted = Buffer.concat([cipher.update(gzData), cipher.final()])
      // 将 IV 放在加密数据前面
      finalData = Buffer.concat([iv, encrypted])
      console.log('已使用密码加密')
    }

    if (progressCallback) progressCallback({ percent: 80, stage: 'writing' })

    // 第四步：添加文件头并写入临时最终文件
    // 添加自定义文件头：R2STB + 版本号(1字节) + 标志位(1字节)
    // 标志位：bit 0 = 是否加密, bit 1-7 = 保留
    const header = Buffer.from('R2STB', 'utf-8')
    const version = Buffer.from([0x01]) // 版本 1
    const flags = Buffer.from([password ? 0x01 : 0x00]) // 加密标志

    const finalFile = Buffer.concat([header, version, flags, finalData])
    tempFinalPath = join(tmpdir(), `r2stb-export-${Date.now()}.r2stb`)
    await fs.promises.writeFile(tempFinalPath, finalFile)

    const finalStats = await stat(tempFinalPath)
    console.log(`临时文件创建完成，大小: ${(finalStats.size / 1024 / 1024).toFixed(2)} MB`)

    if (progressCallback) progressCallback({ percent: 100, stage: 'complete' })

    // 清理中间临时文件
    await unlink(tempJsonPath).catch(() => {})
    await unlink(tempGzPath).catch(() => {})
    tempJsonPath = null
    tempGzPath = null

    // 第五步：弹出保存对话框
    const { dialog } = await import('electron')
    const { BrowserWindow } = await import('electron')
    const win = BrowserWindow.getFocusedWindow()

    const result = await dialog.showSaveDialog(win, {
      title: t('dialog.exportTask'),
      defaultPath: filename,
      filters: [
        { name: 'R2STB Task Files', extensions: ['r2stb'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled) {
      // 清理临时文件
      await unlink(tempFinalPath).catch(() => {})
      return { success: false, canceled: true }
    }

    // 第六步：复制临时文件到目标位置
    await copyFile(tempFinalPath, result.filePath)

    // 清理临时文件
    await unlink(tempFinalPath).catch(() => {})

    console.log(`任务文件导出成功: ${result.filePath}`)
    console.log(`最终文件大小: ${(finalStats.size / 1024 / 1024).toFixed(2)} MB`)

    return { success: true, filePath: result.filePath }
  } catch (error) {
    console.error('保存任务文件失败:', error)

    // 清理所有临时文件
    if (tempJsonPath) await unlink(tempJsonPath).catch(() => {})
    if (tempGzPath) await unlink(tempGzPath).catch(() => {})
    if (tempFinalPath) await unlink(tempFinalPath).catch(() => {})

    return { success: false, error: error.message }
  }
}

/**
 * 加载任务文件（二进制格式 + XOR 反混淆）
 * 使用流式读取处理大文件
 */
async function loadTaskFile(progressCallback = null, password = null) {
  try {
    const { dialog } = await import('electron')
    const { BrowserWindow } = await import('electron')

    // 获取当前窗口
    const win = BrowserWindow.getFocusedWindow()

    // 显示打开对话框
    const result = await dialog.showOpenDialog(win, {
      title: t('dialog.importTask'),
      filters: [
        { name: 'R2STB Task Files', extensions: ['r2stb'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    if (result.canceled) {
      return { success: false, error: 'cancelled' }
    }

    const filePath = result.filePaths[0]
    return await loadTaskFileByPath(filePath, progressCallback, password)
  } catch (error) {
    console.error('加载任务文件失败:', error)
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

  ipcMain.handle('storage:saveTaskFile', async (event, { filename, taskData, password }) => {
    const { BrowserWindow } = await import('electron')
    const win = BrowserWindow.fromWebContents(event.sender)

    // 创建进度回调
    const progressCallback = (progress) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('storage:saveTaskProgress', progress)
      }
    }

    return saveTaskFile(filename, taskData, password, progressCallback)
  })

  ipcMain.handle('storage:loadTaskFile', async (event, { password } = {}) => {
    const { BrowserWindow } = await import('electron')
    const win = BrowserWindow.fromWebContents(event.sender)

    // 创建进度回调
    const progressCallback = (progress) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('storage:loadTaskProgress', progress)
      }
    }

    return loadTaskFile(progressCallback, password)
  })

  ipcMain.handle('storage:loadTaskFileByPath', async (event, { filePath, password }) => {
    const { BrowserWindow } = await import('electron')
    const win = BrowserWindow.fromWebContents(event.sender)

    // 创建进度回调
    const progressCallback = (progress) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('storage:loadTaskProgress', progress)
      }
    }

    return loadTaskFileByPath(filePath, progressCallback, password)
  })

  // 保存拖拽的任务文件到临时目录
  ipcMain.handle('storage:saveDroppedTaskFile', async (_event, { fileName, fileData }) => {
    return saveDroppedTaskFile(fileName, fileData)
  })

  console.log('✓ 存储处理器已注册')
}

/**
 * 直接从指定路径加载任务文件（新方案：恢复文件头 → 解密 → 解压 → 解析 JSON）
 */
async function loadTaskFileByPath(filePath, progressCallback = null, password = null) {
  const fs = await import('fs')
  const { stat, unlink } = await import('fs/promises')
  const { tmpdir } = await import('os')
  const { join } = await import('path')
  const { createGunzip } = await import('zlib')
  const { pipeline } = await import('stream/promises')
  const crypto = await import('crypto')

  try {
    // 检查文件大小
    const fileStats = await stat(filePath)
    const fileSize = fileStats.size
    console.log(`加载任务文件: ${filePath}, 大小: ${(fileSize / 1024 / 1024).toFixed(2)} MB`)

    if (progressCallback) progressCallback({ percent: 0, stage: 'reading' })

    // 第一步：读取文件并解析文件头
    const fileData = await fs.promises.readFile(filePath)

    // 验证文件头
    if (fileData.length < 7) {
      throw new Error('Invalid file format: file too small')
    }

    const header = fileData.subarray(0, 5).toString('utf-8')
    if (header !== 'R2STB') {
      throw new Error('Invalid file format: incorrect header')
    }

    const version = fileData[5]
    const flags = fileData[6]
    const isEncrypted = (flags & 0x01) !== 0

    console.log(`文件版本: ${version}, 加密: ${isEncrypted}`)

    if (progressCallback) progressCallback({ percent: 10, stage: 'reading' })

    // 第二步：提取数据部分
    let dataToProcess = fileData.subarray(7)

    // 第三步：解密（如果需要）
    if (isEncrypted) {
      if (!password) {
        return { success: false, needPassword: true }
      }

      if (progressCallback) progressCallback({ percent: 20, stage: 'decrypting' })

      try {
        const key = crypto.createHash('sha256').update(password).digest()
        const iv = dataToProcess.subarray(0, 16)
        const encrypted = dataToProcess.subarray(16)

        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
        dataToProcess = Buffer.concat([decipher.update(encrypted), decipher.final()])
        console.log('解密成功')
      } catch (decryptError) {
        console.error('解密失败:', decryptError)
        return { success: false, error: 'Decryption failed: incorrect password or corrupted file' }
      }
    }

    if (progressCallback) progressCallback({ percent: 40, stage: 'decompressing' })

    // 第四步：解压缩到临时文件
    const tempGzPath = join(tmpdir(), `r2stb-decompress-${Date.now()}.gz`)
    const tempJsonPath = join(tmpdir(), `r2stb-decompress-${Date.now()}.json`)

    // 写入临时 gz 文件
    await fs.promises.writeFile(tempGzPath, dataToProcess)

    // 解压缩
    const readStream = fs.createReadStream(tempGzPath)
    const gunzipStream = createGunzip()
    const writeStream = fs.createWriteStream(tempJsonPath)

    await pipeline(readStream, gunzipStream, writeStream)

    if (progressCallback) progressCallback({ percent: 80, stage: 'parsing' })

    // 第五步：读取并解析 JSON
    const jsonString = await fs.promises.readFile(tempJsonPath, 'utf-8')
    const taskData = JSON.parse(jsonString)

    // 清理临时文件
    await unlink(tempGzPath).catch(() => {})
    await unlink(tempJsonPath).catch(() => {})

    if (progressCallback) progressCallback({ percent: 100, stage: 'complete' })

    console.log('任务文件解析成功')
    return { success: true, data: taskData, filePath }
  } catch (error) {
    console.error('加载任务文件失败，详细错误:', error)
    console.error('错误堆栈:', error.stack)
    return { success: false, error: error.message || 'Unknown error occurred' }
  }
}

/**
 * 保存拖拽的任务文件到临时目录
 * @param {string} fileName - 文件名
 * @param {Uint8Array} fileData - 文件数据
 * @returns {Promise<{success: boolean, filePath?: string, error?: string}>}
 */
async function saveDroppedTaskFile(fileName, fileData) {
  const { tmpdir } = await import('os')
  const { join } = await import('path')
  const { writeFile } = await import('fs/promises')

  try {
    // 生成临时文件路径
    const tempDir = tmpdir()
    const timestamp = Date.now()
    const tempFilePath = join(tempDir, `dropped_${timestamp}_${fileName}`)

    console.log(`保存拖拽文件到临时目录: ${tempFilePath}`)

    // 将 Uint8Array 转换为 Buffer 并写入文件
    const buffer = Buffer.from(fileData)
    await writeFile(tempFilePath, buffer)

    console.log(`拖拽文件保存成功: ${tempFilePath}`)
    return { success: true, filePath: tempFilePath }
  } catch (error) {
    console.error('保存拖拽文件失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 使用流式方式解析 JSON 文件
 */

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
      error: PROXY_IP_INFO_PARSE_FAILED
    }
  } catch (error) {
    console.error('测试代理失败:', error)

    // 提供更详细的错误信息
    let errorMessage = error.message
    if (error.code === 'ECONNREFUSED') {
      errorMessage = PROXY_CONNECTION_REFUSED
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = PROXY_TIMEOUT
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = PROXY_HOST_NOT_FOUND
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
