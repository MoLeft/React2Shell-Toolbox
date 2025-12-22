/**
 * 渲染进程日志工具
 * 支持彩色输出、日志级别、模块标识、日志收集
 */

// 日志级别
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
}

// 当前日志级别
let currentLogLevel = import.meta.env.DEV ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO

// 日志收集器
const logCollector = {
  enabled: false,
  logs: [],
  maxLogs: 1000,
  listeners: []
}

// 启用日志收集
export function enableLogCollection() {
  logCollector.enabled = true
}

// 禁用日志收集
export function disableLogCollection() {
  logCollector.enabled = false
}

// 获取所有日志
export function getLogs() {
  return logCollector.logs
}

// 清空日志
export function clearLogs() {
  logCollector.logs = []
  notifyListeners()
}

// 添加日志监听器
export function addLogListener(listener) {
  logCollector.listeners.push(listener)
}

// 移除日志监听器
export function removeLogListener(listener) {
  const index = logCollector.listeners.indexOf(listener)
  if (index > -1) {
    logCollector.listeners.splice(index, 1)
  }
}

// 通知所有监听器
function notifyListeners() {
  logCollector.listeners.forEach((listener) => {
    try {
      listener(logCollector.logs)
    } catch (e) {
      console.error('日志监听器错误:', e)
    }
  })
}

// 添加日志到收集器
function collectLog(level, module, args) {
  if (!logCollector.enabled) return

  const log = {
    id: Date.now() + Math.random(),
    timestamp: new Date().toISOString(),
    level,
    module,
    process: 'renderer',
    args: args.map((arg) => {
      if (arg instanceof Error) {
        return {
          type: 'error',
          message: arg.message,
          stack: arg.stack
        }
      }
      if (typeof arg === 'object') {
        try {
          return JSON.parse(JSON.stringify(arg))
        } catch (e) {
          return String(arg)
        }
      }
      return arg
    })
  }

  logCollector.logs.push(log)

  // 限制日志数量
  if (logCollector.logs.length > logCollector.maxLogs) {
    logCollector.logs.shift()
  }

  notifyListeners()
}

// 浏览器控制台样式
const styles = {
  timestamp: 'color: #888; font-size: 0.9em;',
  debug: 'color: #888; font-weight: bold;',
  info: 'color: #2196F3; font-weight: bold;',
  success: 'color: #4CAF50; font-weight: bold;',
  warn: 'color: #FF9800; font-weight: bold;',
  error: 'color: #F44336; font-weight: bold;',
  http: 'color: #9C27B0; font-weight: bold;',
  perf: 'color: #00BCD4; font-weight: bold;',
  module: 'color: #00BCD4; font-weight: normal;',
  label: 'font-weight: bold;'
}

/**
 * 格式化时间戳
 */
function getTimestamp() {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const ms = String(now.getMilliseconds()).padStart(3, '0')
  return `${hours}:${minutes}:${seconds}.${ms}`
}

/**
 * 创建日志记录器
 * @param {string} module - 模块名称
 */
export function createLogger(module = 'App') {
  const moduleTag = `[${module}]`

  return {
    /**
     * 调试日志
     */
    debug: (...args) => {
      if (currentLogLevel > LOG_LEVELS.DEBUG) return
      collectLog('DEBUG', moduleTag, args)
      console.log(
        `%c${getTimestamp()} %c🔍 DEBUG %c${moduleTag}`,
        styles.timestamp,
        styles.debug,
        styles.module,
        ...args
      )
    },

    /**
     * 信息日志
     */
    info: (...args) => {
      if (currentLogLevel > LOG_LEVELS.INFO) return
      collectLog('INFO', moduleTag, args)
      console.log(
        `%c${getTimestamp()} %cℹ️  INFO %c${moduleTag}`,
        styles.timestamp,
        styles.info,
        styles.module,
        ...args
      )
    },

    /**
     * 成功日志
     */
    success: (...args) => {
      if (currentLogLevel > LOG_LEVELS.INFO) return
      collectLog('SUCCESS', moduleTag, args)
      console.log(
        `%c${getTimestamp()} %c✓ SUCCESS %c${moduleTag}`,
        styles.timestamp,
        styles.success,
        styles.module,
        ...args
      )
    },

    /**
     * 警告日志
     */
    warn: (...args) => {
      if (currentLogLevel > LOG_LEVELS.WARN) return
      collectLog('WARN', moduleTag, args)
      console.warn(
        `%c${getTimestamp()} %c⚠️  WARN %c${moduleTag}`,
        styles.timestamp,
        styles.warn,
        styles.module,
        ...args
      )
    },

    /**
     * 错误日志
     */
    error: (...args) => {
      if (currentLogLevel > LOG_LEVELS.ERROR) return
      collectLog('ERROR', moduleTag, args)
      console.error(
        `%c${getTimestamp()} %c✗ ERROR %c${moduleTag}`,
        styles.timestamp,
        styles.error,
        styles.module,
        ...args
      )
    },

    /**
     * 网络请求日志
     */
    http: (method, url, status) => {
      if (currentLogLevel > LOG_LEVELS.DEBUG) return
      collectLog('HTTP', moduleTag, [method, url, status])
      const statusStyle = status >= 200 && status < 300 ? 'color: #4CAF50;' : 'color: #F44336;'
      console.log(
        `%c${getTimestamp()} %c🌐 HTTP %c${moduleTag} %c${method} %c${url} %c${status}`,
        styles.timestamp,
        styles.http,
        styles.module,
        'color: #4CAF50; font-weight: bold;',
        'color: inherit;',
        statusStyle
      )
    },

    /**
     * 性能日志
     */
    perf: (label, duration) => {
      if (currentLogLevel > LOG_LEVELS.DEBUG) return
      collectLog('PERF', moduleTag, [label, `${duration}ms`])
      const timeStyle =
        duration < 100 ? 'color: #4CAF50;' : duration < 500 ? 'color: #FF9800;' : 'color: #F44336;'
      console.log(
        `%c${getTimestamp()} %c⏱️  PERF %c${moduleTag} %c${label} %c${duration}ms`,
        styles.timestamp,
        styles.perf,
        styles.module,
        styles.label,
        timeStyle
      )
    },

    /**
     * 分组日志开始
     */
    group: (label) => {
      if (currentLogLevel > LOG_LEVELS.INFO) return
      console.group(
        `%c${getTimestamp()} %c${moduleTag} %c${label}`,
        styles.timestamp,
        styles.module,
        styles.label
      )
    },

    /**
     * 分组日志结束
     */
    groupEnd: () => {
      if (currentLogLevel > LOG_LEVELS.INFO) return
      console.groupEnd()
    },

    /**
     * 表格日志
     */
    table: (data) => {
      if (currentLogLevel > LOG_LEVELS.DEBUG) return
      console.log(`%c${getTimestamp()} %c${moduleTag}`, styles.timestamp, styles.module)
      console.table(data)
    }
  }
}

/**
 * 设置日志级别
 */
export function setLogLevel(level) {
  if (LOG_LEVELS[level] !== undefined) {
    currentLogLevel = LOG_LEVELS[level]
  }
}

/**
 * 获取当前日志级别
 */
export function getLogLevel() {
  return Object.keys(LOG_LEVELS).find((key) => LOG_LEVELS[key] === currentLogLevel)
}

export { LOG_LEVELS }
