import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  /**
   * 获取应用版本信息
   * @returns {Promise<{version: string, name: string}>}
   */
  getVersion: async () => {
    return ipcRenderer.invoke('app:getVersion')
  },

  /**
   * 更新相关 API
   */
  updater: {
    /**
     * 检查更新
     * @returns {Promise<{hasUpdate: boolean, version?: string, currentVersion?: string, releaseNotes?: string, error?: string}>}
     */
    checkForUpdates: async () => {
      return ipcRenderer.invoke('updater:check')
    },

    /**
     * 下载更新
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    downloadUpdate: async () => {
      return ipcRenderer.invoke('updater:download')
    },

    /**
     * 安装更新并重启
     */
    installUpdate: async () => {
      return ipcRenderer.invoke('updater:install')
    },

    /**
     * 监听下载进度
     * @param {Function} callback - 进度回调函数
     */
    onDownloadProgress: (callback) => {
      ipcRenderer.on('updater:progress', (event, progress) => callback(progress))
    },

    /**
     * 监听下载完成
     * @param {Function} callback - 完成回调函数
     */
    onDownloadComplete: (callback) => {
      ipcRenderer.on('updater:downloaded', (event, info) => callback(info))
    },

    /**
     * 移除进度监听
     */
    removeProgressListener: () => {
      ipcRenderer.removeAllListeners('updater:progress')
    },

    /**
     * 移除下载完成监听
     */
    removeDownloadListener: () => {
      ipcRenderer.removeAllListeners('updater:downloaded')
    }
  },

  /**
   * 执行 POC 检测
   * @param {string} url - 目标 URL
   * @param {string} command - 要执行的命令
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  executePOC: async (url, command) => {
    return ipcRenderer.invoke('poc:execute', { url, command })
  },

  /**
   * 存储相关 API
   */
  storage: {
    /**
     * 加载历史记录
     * @returns {Promise<{success: boolean, history: string[], error?: string}>}
     */
    loadHistory: async () => {
      return ipcRenderer.invoke('storage:loadHistory')
    },

    /**
     * 保存历史记录
     * @param {string[]} history - 历史记录数组
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    saveHistory: async (history) => {
      return ipcRenderer.invoke('storage:saveHistory', { history })
    },

    /**
     * 添加历史记录项
     * @param {string} url - URL
     * @returns {Promise<{success: boolean, history?: string[], error?: string}>}
     */
    addHistoryItem: async (url) => {
      return ipcRenderer.invoke('storage:addHistoryItem', { url })
    },

    /**
     * 删除历史记录项
     * @param {string} url - URL
     * @returns {Promise<{success: boolean, history?: string[], error?: string}>}
     */
    removeHistoryItem: async (url) => {
      return ipcRenderer.invoke('storage:removeHistoryItem', { url })
    },

    /**
     * 清空历史记录
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    clearHistory: async () => {
      return ipcRenderer.invoke('storage:clearHistory')
    },

    /**
     * 获取 favicon（带缓存）
     * @param {string} url - 网站 URL
     * @returns {Promise<{success: boolean, dataUrl?: string, cached?: boolean, error?: string}>}
     */
    fetchFavicon: async (url) => {
      return ipcRenderer.invoke('storage:fetchFavicon', { url })
    },

    /**
     * 加载设置
     * @returns {Promise<{success: boolean, settings?: any, error?: string}>}
     */
    loadSettings: async () => {
      return ipcRenderer.invoke('storage:loadSettings')
    },

    /**
     * 保存设置
     * @param {object} settings - 设置对象
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    saveSettings: async (settings) => {
      return ipcRenderer.invoke('storage:saveSettings', { settings })
    },

    /**
     * 测试代理配置
     * @param {object} proxyConfig - 代理配置对象
     * @returns {Promise<{success: boolean, ip?: string, address?: string, error?: string}>}
     */
    testProxy: async (proxyConfig) => {
      return ipcRenderer.invoke('storage:testProxy', { proxyConfig })
    },

    /**
     * 保存导出文件
     * @param {string} filename - 文件名
     * @param {string} content - 文件内容
     * @returns {Promise<{success: boolean, filePath?: string, canceled?: boolean, error?: string}>}
     */
    saveExportFile: async (filename, content) => {
      return ipcRenderer.invoke('storage:saveExportFile', { filename, content })
    },

    /**
     * 保存任务文件
     * @param {string} filename - 文件名
     * @param {object} taskData - 任务数据
     * @param {string} password - 可选的混淆密码
     * @returns {Promise<{success: boolean, filePath?: string, canceled?: boolean, error?: string}>}
     */
    saveTaskFile: async (filename, taskData, password = null) => {
      return ipcRenderer.invoke('storage:saveTaskFile', { filename, taskData, password })
    },

    /**
     * 加载任务文件
     * @param {string} password - 可选的解密密码
     * @returns {Promise<{success: boolean, data?: object, filePath?: string, error?: string, needPassword?: boolean}>}
     */
    loadTaskFile: async (password = null) => {
      return ipcRenderer.invoke('storage:loadTaskFile', { password })
    },

    /**
     * 从指定路径加载任务文件（用于文件关联打开）
     * @param {string} filePath - 文件路径
     * @param {string} password - 可选的解密密码
     * @returns {Promise<{success: boolean, data?: object, filePath?: string, error?: string, needPassword?: boolean}>}
     */
    loadTaskFileByPath: async (filePath, password = null) => {
      return ipcRenderer.invoke('storage:loadTaskFileByPath', { filePath, password })
    },

    /**
     * 保存拖拽的任务文件到临时目录
     * @param {string} fileName - 文件名
     * @param {Uint8Array} fileData - 文件数据
     * @returns {Promise<{success: boolean, filePath?: string, error?: string}>}
     */
    saveDroppedTaskFile: async (fileName, fileData) => {
      return ipcRenderer.invoke('storage:saveDroppedTaskFile', { fileName, fileData })
    },

    /**
     * 监听文件打开事件
     * @param {Function} callback - 回调函数
     */
    onFileOpen: (callback) => {
      ipcRenderer.on('file:open-task', (_event, filePath) => callback(filePath))
    },

    /**
     * 移除文件打开事件监听
     */
    removeFileOpenListener: () => {
      ipcRenderer.removeAllListeners('file:open-task')
    },

    /**
     * 监听任务加载进度
     * @param {Function} callback - 回调函数，接收进度对象 {percent, stage, processed?, total?}
     */
    onLoadTaskProgress: (callback) => {
      ipcRenderer.on('storage:loadTaskProgress', (_event, progress) => callback(progress))
    },

    /**
     * 移除任务加载进度监听
     */
    removeLoadTaskProgressListener: () => {
      ipcRenderer.removeAllListeners('storage:loadTaskProgress')
    },

    /**
     * 监听任务保存进度
     * @param {Function} callback - 回调函数，接收进度对象 {percent, stage, processed?, total?}
     */
    onSaveTaskProgress: (callback) => {
      ipcRenderer.on('storage:saveTaskProgress', (_event, progress) => callback(progress))
    },

    /**
     * 移除任务保存进度监听
     */
    removeSaveTaskProgressListener: () => {
      ipcRenderer.removeAllListeners('storage:saveTaskProgress')
    }
  },

  /**
   * FOFA 相关 API
   */
  fofa: {
    /**
     * FOFA 搜索
     * @param {string} query - 搜索语句
     * @param {number} page - 页码
     * @param {number} size - 每页数量
     * @param {boolean} full - 是否完整数据
     * @param {string[]} fields - 返回字段
     * @returns {Promise<{success: boolean, data?: any, error?: string}>}
     */
    search: async (query, page, size, full, fields) => {
      return ipcRenderer.invoke('fofa:search', { query, page, size, full, fields })
    },

    /**
     * FOFA 统计
     * @param {string} query - 搜索语句
     * @param {string} field - 统计字段
     * @param {number} size - 返回数量
     * @returns {Promise<{success: boolean, data?: any, error?: string}>}
     */
    stats: async (query, field, size) => {
      return ipcRenderer.invoke('fofa:stats', { query, field, size })
    },

    /**
     * 获取用户信息
     * @returns {Promise<{success: boolean, data?: any, error?: string}>}
     */
    getUserInfo: async () => {
      return ipcRenderer.invoke('fofa:getUserInfo')
    },

    /**
     * 获取主机信息
     * @param {string} host - 主机地址
     * @param {boolean} detail - 是否详细信息
     * @returns {Promise<{success: boolean, data?: any, error?: string}>}
     */
    getHost: async (host, detail) => {
      return ipcRenderer.invoke('fofa:getHost', { host, detail })
    },

    /**
     * 测试连接
     * @returns {Promise<{success: boolean, data?: any, error?: string}>}
     */
    testConnection: async () => {
      return ipcRenderer.invoke('fofa:testConnection')
    },

    /**
     * 获取真实 icon
     * @param {string} url - 网站 URL
     * @returns {Promise<{success: boolean, iconUrl?: string, error?: string}>}
     */
    fetchRealIcon: async (url) => {
      return ipcRenderer.invoke('fofa:fetchRealIcon', { url })
    },

    /**
     * 检测网站状态
     * @param {string} url - 网站 URL
     * @returns {Promise<{success: boolean, accessible?: boolean, latency?: number, error?: string}>}
     */
    checkSiteStatus: async (url) => {
      return ipcRenderer.invoke('fofa:checkSiteStatus', { url })
    }
  },

  /**
   * GitHub OAuth 相关 API
   */
  github: {
    /**
     * 发起 GitHub OAuth 授权（在浏览器中打开）
     * @returns {Promise<{success: boolean, token?: string, error?: string}>}
     */
    auth: async () => {
      return ipcRenderer.invoke('github:auth')
    },

    /**
     * 监听 OAuth 回调
     * @param {Function} callback - 回调函数
     */
    onOAuthCallback: (callback) => {
      ipcRenderer.on('github:oauth-callback', (event, result) => callback(result))
    },

    /**
     * 移除 OAuth 回调监听
     */
    removeOAuthCallbackListener: () => {
      ipcRenderer.removeAllListeners('github:oauth-callback')
    },

    /**
     * 检查用户是否 star 了项目
     * @param {string} token - GitHub 访问令牌
     * @returns {Promise<{success: boolean, starred?: boolean, username?: string, error?: string}>}
     */
    checkStar: async (token) => {
      return ipcRenderer.invoke('github:checkStar', { token })
    },

    /**
     * 验证访问令牌是否有效
     * @param {string} token - GitHub 访问令牌
     * @returns {Promise<{success: boolean, valid?: boolean, error?: string}>}
     */
    validateToken: async (token) => {
      return ipcRenderer.invoke('github:validateToken', { token })
    }
  },

  /**
   * 终端相关 API
   */
  terminal: {
    /**
     * 创建终端会话（注入 HTTP 后端并返回 API URL）
     * @param {string} url - 目标服务器 URL
     * @param {string} apiPath - API 路径（可选，默认 /_next/data/terminal）
     * @returns {Promise<{success: boolean, sessionId?: string, apiUrl?: string, apiPath?: string, error?: string}>}
     */
    create: async (url, apiPath) => {
      return ipcRenderer.invoke('terminal:create', { url, apiPath })
    },

    /**
     * 通过 HTTP 创建终端会话（避免 CORS）
     * @param {string} createUrl - 完整的 create URL
     * @returns {Promise<{success: boolean, sessionId?: string, error?: string}>}
     */
    createSession: async (createUrl) => {
      return ipcRenderer.invoke('terminal:createSession', { createUrl })
    },

    /**
     * 发送终端输入（通过 HTTP POST）
     * @param {string} inputUrl - 完整的 input URL
     * @param {string} input - 输入内容
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    sendInput: async (inputUrl, input) => {
      return ipcRenderer.invoke('terminal:sendInput', { inputUrl, input })
    },

    /**
     * 连接 SSE 流（通过主进程避免 CORS）
     * @param {string} streamUrl - 完整的 stream URL
     * @returns {Promise<{success: boolean, connectionId?: string, error?: string}>}
     */
    connectSSE: async (streamUrl) => {
      return ipcRenderer.invoke('terminal:connectSSE', { streamUrl })
    },

    /**
     * 关闭 SSE 连接
     * @param {string} connectionId - 连接 ID
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    closeSSE: async (connectionId) => {
      return ipcRenderer.invoke('terminal:closeSSE', { connectionId })
    },

    /**
     * 监听 SSE 打开事件
     * @param {Function} callback - 回调函数
     */
    onSSEOpen: (callback) => {
      ipcRenderer.on('terminal:sse-open', (_event, data) => callback(data))
    },

    /**
     * 监听 SSE 消息
     * @param {Function} callback - 回调函数
     */
    onSSEMessage: (callback) => {
      ipcRenderer.on('terminal:sse-message', (_event, data) => callback(data))
    },

    /**
     * 监听 SSE 关闭事件
     * @param {Function} callback - 回调函数
     */
    onSSEClose: (callback) => {
      ipcRenderer.on('terminal:sse-close', (_event, data) => callback(data))
    },

    /**
     * 监听 SSE 错误事件
     * @param {Function} callback - 回调函数
     */
    onSSEError: (callback) => {
      ipcRenderer.on('terminal:sse-error', (_event, data) => callback(data))
    },

    /**
     * 移除 SSE 事件监听
     */
    removeSSEListeners: () => {
      ipcRenderer.removeAllListeners('terminal:sse-open')
      ipcRenderer.removeAllListeners('terminal:sse-message')
      ipcRenderer.removeAllListeners('terminal:sse-close')
      ipcRenderer.removeAllListeners('terminal:sse-error')
    },

    /**
     * 执行终端命令
     * @param {string} sessionId - 会话 ID
     * @param {string} command - 要执行的命令
     * @returns {Promise<{success: boolean, output?: string, error?: string}>}
     */
    execute: async (sessionId, command) => {
      return ipcRenderer.invoke('terminal:execute', { sessionId, command })
    },

    /**
     * 关闭终端会话
     * @param {string} sessionId - 会话 ID
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    close: async (sessionId) => {
      return ipcRenderer.invoke('terminal:close', { sessionId })
    },

    /**
     * 获取会话信息
     * @param {string} sessionId - 会话 ID
     * @returns {Promise<{success: boolean, session?: any, error?: string}>}
     */
    getSession: async (sessionId) => {
      return ipcRenderer.invoke('terminal:getSession', { sessionId })
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
