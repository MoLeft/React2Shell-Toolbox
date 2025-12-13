import { autoUpdater } from 'electron-updater'
import { app, dialog } from 'electron'

// 配置更新服务器
autoUpdater.autoDownload = false // 不自动下载，让用户选择
autoUpdater.autoInstallOnAppQuit = true // 退出时自动安装

// 设置更新日志
autoUpdater.logger = require('electron-log')
autoUpdater.logger.transports.file.level = 'info'

/**
 * 初始化自动更新
 */
export function initAutoUpdater() {
  // 检查更新错误
  autoUpdater.on('error', (error) => {
    console.error('更新错误:', error)
  })

  // 检查更新中
  autoUpdater.on('checking-for-update', () => {
    console.log('正在检查更新...')
  })

  // 发现新版本
  autoUpdater.on('update-available', (info) => {
    console.log('发现新版本:', info.version)
  })

  // 没有新版本
  autoUpdater.on('update-not-available', (info) => {
    console.log('当前已是最新版本:', info.version)
  })

  // 下载进度
  autoUpdater.on('download-progress', (progressObj) => {
    console.log(
      `下载进度: ${progressObj.percent.toFixed(2)}% (${progressObj.transferred}/${progressObj.total})`
    )
  })

  // 下载完成
  autoUpdater.on('update-downloaded', (info) => {
    console.log('更新下载完成:', info.version)
  })
}

/**
 * 检查更新
 * @returns {Promise<{hasUpdate: boolean, version?: string, releaseNotes?: string, error?: string}>}
 */
export async function checkForUpdates() {
  try {
    const result = await autoUpdater.checkForUpdates()
    if (!result) {
      return { hasUpdate: false, error: '无法检查更新' }
    }

    const { updateInfo } = result
    const currentVersion = app.getVersion()
    const latestVersion = updateInfo.version

    // 比较版本号
    if (latestVersion === currentVersion) {
      return {
        hasUpdate: false,
        version: currentVersion,
        message: '当前已是最新版本'
      }
    }

    return {
      hasUpdate: true,
      version: latestVersion,
      currentVersion: currentVersion,
      releaseNotes: updateInfo.releaseNotes || '',
      releaseDate: updateInfo.releaseDate || '',
      files: updateInfo.files || []
    }
  } catch (error) {
    console.error('检查更新失败:', error)
    return {
      hasUpdate: false,
      error: error.message || '检查更新失败'
    }
  }
}

/**
 * 下载更新
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function downloadUpdate() {
  try {
    await autoUpdater.downloadUpdate()
    return { success: true }
  } catch (error) {
    console.error('下载更新失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 安装更新并重启
 */
export function quitAndInstall() {
  autoUpdater.quitAndInstall(false, true)
}

/**
 * 获取下载进度
 * @param {Function} callback - 进度回调函数
 */
export function onDownloadProgress(callback) {
  autoUpdater.on('download-progress', callback)
}

/**
 * 监听更新下载完成
 * @param {Function} callback - 完成回调函数
 */
export function onUpdateDownloaded(callback) {
  autoUpdater.on('update-downloaded', callback)
}
