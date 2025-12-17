import { ipcMain } from 'electron'
import { loadSettings } from './storage-handler.js'

/**
 * FOFA API 基础配置
 */
const FOFA_API_BASE_URL = 'https://fofa.info/api/v1'

/**
 * 创建 axios 实例（支持代理配置）
 * @param {boolean} bypassProxy - 是否绕过代理（true=不使用代理，false=使用全局代理设置）
 * @param {boolean} isFofaApi - 是否是 FOFA API 请求（true=使用 fofaTimeout，false=使用默认 timeout）
 */
async function createAxiosInstance(bypassProxy = false, isFofaApi = false) {
  const axios = (await import('axios')).default
  const https = await import('https')

  // 加载设置
  const settingsResult = await loadSettings()
  const settings = settingsResult.success ? settingsResult.settings : null

  if (!settings) {
    return axios.create({
      timeout: 30000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
  }

  // 根据是否是 FOFA API 请求选择超时时间
  const timeout = isFofaApi ? settings.fofaTimeout || 30000 : settings.timeout || 10000

  const config = {
    timeout,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  }

  // 配置 SSL 证书验证
  if (settings.ignoreCertErrors) {
    config.httpsAgent = new https.Agent({
      rejectUnauthorized: false,
      servername: undefined,
      checkServerIdentity: () => undefined
    })
  }

  // 判断是否使用代理
  // 只有当全局代理启用 且 没有要求绕过代理时，才使用代理
  const shouldUseProxy = settings.proxyEnabled && !bypassProxy

  if (shouldUseProxy) {
    const { HttpsProxyAgent } = await import('https-proxy-agent')
    const { SocksProxyAgent } = await import('socks-proxy-agent')

    // 构建代理 URL
    let proxyUrl = ''
    if (settings.proxyAuth && settings.proxyUsername) {
      proxyUrl = `${settings.proxyProtocol}://${settings.proxyUsername}:${settings.proxyPassword}@${settings.proxyHost}:${settings.proxyPort}`
    } else {
      proxyUrl = `${settings.proxyProtocol}://${settings.proxyHost}:${settings.proxyPort}`
    }

    // 配置代理
    const tlsOptions = settings.ignoreCertErrors
      ? {
          rejectUnauthorized: false,
          servername: undefined,
          checkServerIdentity: () => undefined
        }
      : {
          rejectUnauthorized: true
        }

    if (settings.proxyProtocol === 'socks5') {
      const agent = new SocksProxyAgent(proxyUrl, tlsOptions)
      config.httpsAgent = agent
      config.httpAgent = agent
    } else {
      config.httpsAgent = new HttpsProxyAgent(proxyUrl, tlsOptions)
    }

    // 不再打印日志，避免过多输出
    // console.log('使用代理:', proxyUrl.replace(/:[^:@]+@/, ':****@'))
  }

  return axios.create(config)
}

/**
 * 获取 FOFA API 认证信息
 */
async function getFofaCredentials() {
  const settingsResult = await loadSettings()
  const settings = settingsResult.success ? settingsResult.settings : null

  if (!settings || !settings.fofaApiEmail || !settings.fofaApiKey) {
    throw new Error('FOFA API 认证信息未配置，请在设置中配置 Email 和 API Key')
  }

  return {
    email: settings.fofaApiEmail,
    key: settings.fofaApiKey,
    bypassProxy: settings.fofaBypassProxy || false
  }
}

/**
 * FOFA 搜索
 * @param {string} query - 搜索查询语句（FOFA 语法）
 * @param {number} page - 页码（从 1 开始）
 * @param {number} size - 每页数量（最大 10000）
 * @param {boolean} full - 是否返回完整数据
 * @param {Array<string>} fields - 返回字段列表
 */
async function search(query, page = 1, size = 100, full = false, fields = null) {
  try {
    const { email, key, bypassProxy } = await getFofaCredentials()
    const axios = await createAxiosInstance(bypassProxy, true) // true 表示这是 FOFA API 请求

    // 默认字段
    const defaultFields = ['host', 'ip', 'port', 'protocol', 'title', 'domain', 'country']
    const selectedFields = fields || defaultFields

    // 构建请求参数
    const params = {
      email,
      key,
      qbase64: Buffer.from(query).toString('base64'),
      page,
      size,
      full: full ? 'true' : 'false',
      fields: selectedFields.join(',')
    }

    console.log('FOFA 搜索请求:', { query, page, size, fields: selectedFields })

    const response = await axios.get(`${FOFA_API_BASE_URL}/search/all`, { params })

    // console.log('FOFA 搜索响应：', JSON.stringify(response.data, null, 2))

    // 检查 HTTP 状态码
    if (response.status !== 200) {
      const errorMsg = response.data?.errmsg || `HTTP ${response.status} 错误`
      throw new Error(errorMsg)
    }

    // 检查响应中的 error 字段
    if (response.data.error) {
      throw new Error(response.data.errmsg || 'FOFA API 返回错误')
    }

    return {
      success: true,
      data: {
        results: response.data.results || [],
        size: response.data.size || 0,
        page: response.data.page || page,
        mode: response.data.mode || 'normal',
        query: response.data.query || query
      }
    }
  } catch (error) {
    console.error('FOFA 搜索失败:', error)

    // 提取错误信息
    let errorMessage = error.message

    // 如果是 axios 错误，尝试从响应中获取更详细的错误信息
    if (error.response) {
      const status = error.response.status
      const data = error.response.data

      if (data && data.errmsg) {
        errorMessage = data.errmsg
      } else if (status === 429) {
        errorMessage = '请求速度过快，请稍后再试'
      } else if (status >= 500) {
        errorMessage = 'FOFA 服务器错误'
      } else if (status >= 400) {
        errorMessage = `请求错误 (${status})`
      }
    }

    return {
      success: false,
      error: errorMessage,
      status: error.response?.status || null,
      details: error.response?.data || null
    }
  }
}

/**
 * FOFA 统计聚合
 * @param {string} query - 搜索查询语句
 * @param {string} field - 聚合字段（如：title, domain, country 等）
 * @param {number} size - 返回数量（最大 10000）
 */
async function stats(query, field = 'title', size = 100) {
  try {
    const { email, key, bypassProxy } = await getFofaCredentials()
    const axios = await createAxiosInstance(bypassProxy, true) // true 表示这是 FOFA API 请求

    const params = {
      email,
      key,
      qbase64: Buffer.from(query).toString('base64'),
      fields: field,
      size
    }

    console.log('FOFA 统计请求:', { query, field, size })

    const response = await axios.get(`${FOFA_API_BASE_URL}/search/stats`, { params })

    console.log(response.data)

    // 检查 HTTP 状态码
    if (response.status !== 200) {
      const errorMsg = response.data?.errmsg || `HTTP ${response.status} 错误`
      throw new Error(errorMsg)
    }

    // 检查响应中的 error 字段
    if (response.data.error) {
      throw new Error(response.data.errmsg || 'FOFA API 返回错误')
    }

    return {
      success: true,
      data: {
        distinct: response.data.distinct || {},
        aggs: response.data.aggs || {},
        lastupdatetime: response.data.lastupdatetime || ''
      }
    }
  } catch (error) {
    console.error('FOFA 统计失败:', error)

    // 提取错误信息
    let errorMessage = error.message

    // 如果是 axios 错误，尝试从响应中获取更详细的错误信息
    if (error.response) {
      const status = error.response.status
      const data = error.response.data

      if (data && data.errmsg) {
        errorMessage = data.errmsg
      } else if (status === 429) {
        errorMessage = '请求速度过快，请稍后再试'
      } else if (status >= 500) {
        errorMessage = 'FOFA 服务器错误'
      } else if (status >= 400) {
        errorMessage = `请求错误 (${status})`
      }
    }

    return {
      success: false,
      error: errorMessage,
      status: error.response?.status || null,
      details: error.response?.data || null
    }
  }
}

/**
 * 获取用户信息
 */
async function getUserInfo() {
  try {
    const { email, key, bypassProxy } = await getFofaCredentials()
    const axios = await createAxiosInstance(bypassProxy, true) // true 表示这是 FOFA API 请求

    const params = { email, key }

    console.log('获取 FOFA 用户信息')

    const response = await axios.get(`${FOFA_API_BASE_URL}/info/my`, { params })

    if (response.data.error) {
      throw new Error(response.data.errmsg || 'FOFA API 返回错误')
    }

    return {
      success: true,
      data: {
        email: response.data.email || '',
        username: response.data.username || '',
        avatar: response.data.avatar || '',
        fcoin: response.data.fcoin || 0,
        fofa_point: response.data.fofa_point || 0,
        remain_free_point: response.data.remain_free_point || 0,
        isvip: response.data.isvip || false,
        vip_level: response.data.vip_level || 0,
        remain_api_query: response.data.remain_api_query || 0,
        remain_api_data: response.data.remain_api_data || 0
      }
    }
  } catch (error) {
    console.error('获取 FOFA 用户信息失败:', error)
    return {
      success: false,
      error: error.message,
      details: error.response?.data || null
    }
  }
}

/**
 * 获取主机信息
 * @param {string} host - 主机地址（如：baidu.com 或 1.1.1.1）
 * @param {boolean} detail - 是否返回详细信息
 */
async function getHost(host, detail = false) {
  try {
    const { email, key, bypassProxy } = await getFofaCredentials()
    const axios = await createAxiosInstance(bypassProxy, true) // true 表示这是 FOFA API 请求

    const params = {
      email,
      key,
      host,
      detail: detail ? 'true' : 'false'
    }

    console.log('获取 FOFA 主机信息:', host)

    const response = await axios.get(`${FOFA_API_BASE_URL}/host/${host}`, { params })

    if (response.data.error) {
      throw new Error(response.data.errmsg || 'FOFA API 返回错误')
    }

    return {
      success: true,
      data: response.data
    }
  } catch (error) {
    console.error('获取 FOFA 主机信息失败:', error)
    return {
      success: false,
      error: error.message,
      details: error.response?.data || null
    }
  }
}

/**
 * 测试 FOFA API 连接
 */
async function testConnection() {
  try {
    const result = await getUserInfo()
    if (result.success) {
      return {
        success: true,
        message: 'FOFA API 连接成功',
        userInfo: result.data
      }
    } else {
      return {
        success: false,
        error: result.error
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 获取网站真实 icon
 * @param {string} url - 网站 URL
 * @returns {Promise<{success: boolean, dataUrl?: string, error?: string}>}
 */
async function fetchRealIcon(url) {
  try {
    // 注意：这里传入 false，表示不绕过代理
    // 即使 FOFA API 设置了绕过代理，这个函数仍然会使用全局代理设置
    const axios = await createAxiosInstance(false)

    // 尝试多个常见的 favicon 路径
    const paths = [
      '/favicon.ico',
      '/favicon.png',
      '/apple-touch-icon.png',
      '/apple-touch-icon-precomposed.png'
    ]

    const urlObj = new URL(url)
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`

    // 首先尝试从 HTML 中解析
    try {
      const htmlResponse = await axios.get(url, {
        timeout: 5000,
        maxRedirects: 3
      })

      const html = htmlResponse.data

      // 匹配 link 标签中的 icon
      const iconRegex =
        /<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)[^>]*href=["']([^"']+)["']/gi
      let match

      while ((match = iconRegex.exec(html)) !== null) {
        let iconUrl = match[1]

        // 处理相对路径
        if (iconUrl.startsWith('//')) {
          iconUrl = urlObj.protocol + iconUrl
        } else if (iconUrl.startsWith('/')) {
          iconUrl = baseUrl + iconUrl
        } else if (!iconUrl.startsWith('http')) {
          iconUrl = baseUrl + '/' + iconUrl
        }

        try {
          const iconResponse = await axios.get(iconUrl, {
            responseType: 'arraybuffer',
            timeout: 3000
          })

          const contentType = iconResponse.headers['content-type'] || 'image/x-icon'
          const base64 = Buffer.from(iconResponse.data).toString('base64')

          return {
            success: true,
            dataUrl: `data:${contentType};base64,${base64}`
          }
        } catch {
          continue
        }
      }
    } catch {
      // HTML 解析失败，继续尝试默认路径
    }

    // 尝试默认路径
    for (const path of paths) {
      try {
        const iconUrl = baseUrl + path
        const iconResponse = await axios.get(iconUrl, {
          responseType: 'arraybuffer',
          timeout: 3000
        })

        const contentType = iconResponse.headers['content-type'] || 'image/x-icon'
        const base64 = Buffer.from(iconResponse.data).toString('base64')

        return {
          success: true,
          dataUrl: `data:${contentType};base64,${base64}`
        }
      } catch {
        continue
      }
    }

    return {
      success: false,
      error: '未找到 favicon'
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 检测网站延迟和可访问性
 * @param {string} url - 网站 URL
 * @returns {Promise<{success: boolean, accessible?: boolean, latency?: number, error?: string}>}
 */
async function checkSiteStatus(url) {
  try {
    // 注意：这里传入 false，表示不绕过代理
    // 即使 FOFA API 设置了绕过代理，这个函数仍然会使用全局代理设置
    const axios = await createAxiosInstance(false)

    const startTime = Date.now()

    try {
      await axios.get(url, {
        timeout: 10000,
        maxRedirects: 3,
        validateStatus: (status) => status < 500 // 只要不是 5xx 就算成功
      })

      const latency = Date.now() - startTime

      return {
        success: true,
        accessible: true,
        latency
      }
    } catch (error) {
      const latency = Date.now() - startTime

      // 如果是超时或网络错误，标记为不可访问
      if (
        error.code === 'ECONNABORTED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNREFUSED'
      ) {
        return {
          success: true,
          accessible: false,
          latency,
          error: error.message
        }
      }

      // 其他错误也算可访问（比如 SSL 错误等）
      return {
        success: true,
        accessible: true,
        latency,
        error: error.message
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 注册 FOFA 相关的 IPC 处理器
 */
export function registerFofaHandlers() {
  // FOFA 搜索
  ipcMain.handle('fofa:search', async (_event, { query, page, size, full, fields }) => {
    return search(query, page, size, full, fields)
  })

  // FOFA 统计
  ipcMain.handle('fofa:stats', async (_event, { query, field, size }) => {
    return stats(query, field, size)
  })

  // 获取用户信息
  ipcMain.handle('fofa:getUserInfo', async () => {
    return getUserInfo()
  })

  // 获取主机信息
  ipcMain.handle('fofa:getHost', async (_event, { host, detail }) => {
    return getHost(host, detail)
  })

  // 测试连接
  ipcMain.handle('fofa:testConnection', async () => {
    return testConnection()
  })

  // 获取真实 icon
  ipcMain.handle('fofa:fetchRealIcon', async (_event, { url }) => {
    return fetchRealIcon(url)
  })

  // 检测网站状态
  ipcMain.handle('fofa:checkSiteStatus', async (_event, { url }) => {
    return checkSiteStatus(url)
  })

  console.log('✓ FOFA 处理器已注册')
}
