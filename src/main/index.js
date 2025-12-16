import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { executePOC } from './poc-handler.js'
import { registerTerminalHandlers } from './terminal-handler.js'
import { registerStorageHandlers } from './storage-handler.js'
import { registerFofaHandlers } from './fofa-handler.js'
import {
  initAutoUpdater,
  checkForUpdates,
  downloadUpdate,
  quitAndInstall,
  onDownloadProgress,
  onUpdateDownloaded
} from './updater.js'

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // 获取应用版本信息
  ipcMain.handle('app:getVersion', () => {
    return {
      version: app.getVersion(),
      name: app.getName()
    }
  })

  // POC 执行处理器
  ipcMain.handle('poc:execute', async (event, { url, command }) => {
    try {
      // 加载设置
      const { loadSettings } = await import('./storage-handler.js')
      const settingsResult = await loadSettings()
      const settings = settingsResult.success ? settingsResult.settings : null

      const result = await executePOC(url, command, settings)
      return { success: true, data: result }
    } catch (error) {
      console.error('POC execution error:', error)
      return { success: false, error: error.message }
    }
  })

  // 注册终端处理器
  registerTerminalHandlers()

  // 注册存储处理器
  registerStorageHandlers()

  // 注册 FOFA 处理器
  registerFofaHandlers()

  // 初始化自动更新（开发和生产环境都支持）
  initAutoUpdater()

  // 注册更新相关的 IPC 处理器
  ipcMain.handle('updater:check', async () => {
    return await checkForUpdates()
  })

  ipcMain.handle('updater:download', async (event, releaseUrl) => {
    return await downloadUpdate(releaseUrl)
  })

  ipcMain.handle('updater:install', () => {
    if (!is.dev) {
      quitAndInstall()
    }
  })

  // 监听下载进度
  onDownloadProgress((progress) => {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach((win) => {
      win.webContents.send('updater:progress', {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
        bytesPerSecond: progress.bytesPerSecond
      })
    })
  })

  // 监听下载完成
  onUpdateDownloaded((info) => {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach((win) => {
      win.webContents.send('updater:downloaded', {
        version: info.version,
        releaseDate: info.releaseDate
      })
    })
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
