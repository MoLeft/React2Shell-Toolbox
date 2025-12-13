import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
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
