/**
 * 统一的日志工具
 * 支持彩色输出、日志级别、模块标识
 */

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // 前景色
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // 背景色
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m'
}

// 日志级别
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
}

// 当前日志级别（可通过环境变量配置）
let currentLogLevel = process.env.LOG_LEVEL
  ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()]
  : LOG_LEVELS.INFO

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
function createLogger(module = 'App') {
  const moduleTag = `[${module}]`

  return {
    /**
     * 调试日志 - 灰色
     */
    debug: (...args) => {
      if (currentLogLevel > LOG_LEVELS.DEBUG) return
      const timestamp = colors.gray + getTimestamp() + colors.reset
      const tag = colors.gray + '🔍 DEBUG' + colors.reset
      const mod = colors.gray + moduleTag + colors.reset
      console.log(timestamp, tag, mod, ...args)
    },

    /**
     * 信息日志 - 蓝色
     */
    info: (...args) => {
      if (currentLogLevel > LOG_LEVELS.INFO) return
      const timestamp = colors.gray + getTimestamp() + colors.reset
      const tag = colors.blue + 'ℹ️  INFO' + colors.reset
      const mod = colors.cyan + moduleTag + colors.reset
      console.log(timestamp, tag, mod, ...args)
    },

    /**
     * 成功日志 - 绿色
     */
    success: (...args) => {
      if (currentLogLevel > LOG_LEVELS.INFO) return
      const timestamp = colors.gray + getTimestamp() + colors.reset
      const tag = colors.green + '✓ SUCCESS' + colors.reset
      const mod = colors.cyan + moduleTag + colors.reset
      console.log(timestamp, tag, mod, ...args)
    },

    /**
     * 警告日志 - 黄色
     */
    warn: (...args) => {
      if (currentLogLevel > LOG_LEVELS.WARN) return
      const timestamp = colors.gray + getTimestamp() + colors.reset
      const tag = colors.yellow + '⚠️  WARN' + colors.reset
      const mod = colors.cyan + moduleTag + colors.reset
      console.warn(timestamp, tag, mod, ...args)
    },

    /**
     * 错误日志 - 红色
     */
    error: (...args) => {
      if (currentLogLevel > LOG_LEVELS.ERROR) return
      const timestamp = colors.gray + getTimestamp() + colors.reset
      const tag = colors.red + colors.bright + '✗ ERROR' + colors.reset
      const mod = colors.cyan + moduleTag + colors.reset
      console.error(timestamp, tag, mod, ...args)
    },

    /**
     * 网络请求日志 - 品红色
     */
    http: (method, url, status) => {
      if (currentLogLevel > LOG_LEVELS.DEBUG) return
      const timestamp = colors.gray + getTimestamp() + colors.reset
      const tag = colors.magenta + '🌐 HTTP' + colors.reset
      const mod = colors.cyan + moduleTag + colors.reset
      const methodColor = method === 'GET' ? colors.green : colors.yellow
      const statusColor = status >= 200 && status < 300 ? colors.green : colors.red
      console.log(
        timestamp,
        tag,
        mod,
        methodColor + method + colors.reset,
        url,
        statusColor + status + colors.reset
      )
    },

    /**
     * 性能日志 - 青色
     */
    perf: (label, duration) => {
      if (currentLogLevel > LOG_LEVELS.DEBUG) return
      const timestamp = colors.gray + getTimestamp() + colors.reset
      const tag = colors.cyan + '⏱️  PERF' + colors.reset
      const mod = colors.cyan + moduleTag + colors.reset
      const time = duration < 100 ? colors.green : duration < 500 ? colors.yellow : colors.red
      console.log(timestamp, tag, mod, label, time + `${duration}ms` + colors.reset)
    },

    /**
     * 分组日志开始
     */
    group: (label) => {
      if (currentLogLevel > LOG_LEVELS.INFO) return
      const timestamp = colors.gray + getTimestamp() + colors.reset
      const mod = colors.cyan + moduleTag + colors.reset
      console.group(timestamp, mod, colors.bright + label + colors.reset)
    },

    /**
     * 分组日志结束
     */
    groupEnd: () => {
      if (currentLogLevel > LOG_LEVELS.INFO) return
      console.groupEnd()
    }
  }
}

/**
 * 设置日志级别
 */
function setLogLevel(level) {
  if (LOG_LEVELS[level] !== undefined) {
    currentLogLevel = LOG_LEVELS[level]
  }
}

/**
 * 获取当前日志级别
 */
function getLogLevel() {
  return Object.keys(LOG_LEVELS).find((key) => LOG_LEVELS[key] === currentLogLevel)
}

export { createLogger, setLogLevel, getLogLevel, LOG_LEVELS }
