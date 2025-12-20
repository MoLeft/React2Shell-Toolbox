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
import {
  initiateGitHubAuth,
  checkUserStarred,
  validateToken,
  handleOAuthCallback
} from './github-oauth-handler.js'

// 增加 Node.js 内存限制，避免导入大文件时内存溢出
// 设置为 4GB（4096MB）
if (!process.env.NODE_OPTIONS) {
  process.env.NODE_OPTIONS = '--max-old-space-size=4096'
}

// 启用 V8 的增量标记和并发标记，提高 GC 性能
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096 --expose-gc')

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

    // 如果有待打开的文件，处理它
    if (pendingFileToOpen) {
      console.log('[FileOpen] 窗口就绪，打开待处理文件:', pendingFileToOpen)
      handleFileOpen(pendingFileToOpen, mainWindow)
      pendingFileToOpen = null
    }
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

  return mainWindow
}

// 存储待打开的文件路径
let pendingFileToOpen = null

// 注册自定义 URL scheme
if (process.defaultApp) {
  // 开发环境：需要指定 electron 可执行文件和当前目录
  if (process.argv.length >= 2) {
    console.log('[Protocol] 开发环境，注册 URL scheme')
    console.log('[Protocol] execPath:', process.execPath)
    console.log('[Protocol] argv:', process.argv)
    console.log('[Protocol] cwd:', process.cwd())

    // 在开发环境中，使用 process.cwd() 获取项目根目录
    // 然后传递 '.' 作为参数，让 electron 在项目根目录启动
    app.setAsDefaultProtocolClient('r2stb', process.execPath, [process.cwd()])
    console.log('[Protocol] 注册成功，项目路径:', process.cwd())
  }
} else {
  // 生产环境：直接注册
  console.log('[Protocol] 生产环境，注册 URL scheme')
  app.setAsDefaultProtocolClient('r2stb')

  // 检查启动参数中是否有文件路径（Windows/Linux 双击文件打开）
  if (process.argv.length >= 2) {
    const filePath = process.argv.find((arg) => arg.endsWith('.r2stb'))
    if (filePath) {
      console.log('[FileOpen] 启动时打开文件:', filePath)
      pendingFileToOpen = filePath
    }
  }
}

// 处理自定义 URL scheme（Windows 和 Linux）
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine) => {
    // 有人试图运行第二个实例，我们应该聚焦我们的窗口
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }

    // Windows 和 Linux 下处理协议 URL
    const url = commandLine.find((arg) => arg.startsWith('r2stb://'))
    if (url) {
      handleProtocolUrl(url)
    }

    // Windows 和 Linux 下处理文件打开
    const filePath = commandLine.find((arg) => arg.endsWith('.r2stb'))
    if (filePath && mainWindow) {
      console.log('[FileOpen] 第二实例打开文件:', filePath)
      handleFileOpen(filePath, mainWindow)
    }
  })
}

// macOS 下处理协议 URL
app.on('open-url', (event, url) => {
  event.preventDefault()
  handleProtocolUrl(url)
})

// macOS 下处理文件打开
app.on('open-file', (event, filePath) => {
  event.preventDefault()
  console.log('[FileOpen] macOS 打开文件:', filePath)

  const mainWindow = BrowserWindow.getAllWindows()[0]
  if (mainWindow) {
    handleFileOpen(filePath, mainWindow)
  } else {
    // 如果窗口还没创建，保存文件路径
    pendingFileToOpen = filePath
  }
})

// 处理文件打开
function handleFileOpen(filePath, mainWindow) {
  console.log('[FileOpen] 处理文件打开:', filePath)

  // 通知渲染进程导入文件
  mainWindow.webContents.send('file:open-task', filePath)

  // 聚焦窗口
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
}

// 处理协议 URL
async function handleProtocolUrl(url) {
  console.log('[Protocol] 收到协议 URL:', url)

  // 处理 GitHub OAuth 回调
  if (url.startsWith('r2stb://github/oauth2/callback')) {
    console.log('[Protocol] 处理 GitHub OAuth 回调')
    const result = await handleOAuthCallback(url)
    console.log('[Protocol] OAuth 回调处理结果:', result)

    // 通知渲染进程
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      console.log('[Protocol] 发送回调结果到渲染进程')
      windows[0].webContents.send('github:oauth-callback', result)

      // 聚焦窗口
      if (windows[0].isMinimized()) windows[0].restore()
      windows[0].focus()
    } else {
      console.error('[Protocol] 没有可用的窗口')
    }
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

  // 注册 GitHub OAuth 处理器
  ipcMain.handle('github:auth', async () => {
    return await initiateGitHubAuth()
  })

  ipcMain.handle('github:checkStar', async (event, { token }) => {
    return await checkUserStarred(token)
  })

  ipcMain.handle('github:validateToken', async (event, { token }) => {
    return await validateToken(token)
  })

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
