/**
 * POC Virtual Terminal Composable
 * Manages xterm.js terminal
 */
import { ref, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'

export function usePocTerminal() {
  const { t } = useI18n()
  const xtermContainer = ref(null)
  let terminal = null
  let fitAddon = null
  let terminalInitialized = false
  let terminalWebSocket = null
  let terminalSessionId = null
  let terminalConnecting = false
  let resizeObserver = null

  // Handle terminal resize
  const handleTerminalResize = () => {
    if (fitAddon && terminal) {
      try {
        fitAddon.fit()
      } catch (e) {
        console.error('Terminal resize failed:', e)
      }
    }
  }

  // Initialize terminal
  const initTerminal = async (currentUrl, targetPlatform) => {
    if (!xtermContainer.value || terminalInitialized || terminalConnecting) return

    if (targetPlatform === 'win32') {
      console.log('Target platform is Windows, skipping virtual terminal initialization')
      return
    }

    terminalConnecting = true

    try {
      // Clean up old SSE listeners
      if (window.api?.terminal?.removeSSEListeners) {
        window.api.terminal.removeSSEListeners()
        console.log('Old SSE listeners cleaned up')
      }

      // Clean up old terminal
      if (terminal) {
        terminal.dispose()
        terminal = null
      }

      if (terminalWebSocket) {
        terminalWebSocket.close()
        terminalWebSocket = null
      }

      // Create new terminal
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

      // Add plugins
      fitAddon = new FitAddon()
      terminal.loadAddon(fitAddon)
      terminal.loadAddon(new WebLinksAddon())

      // Mount to container
      terminal.open(xtermContainer.value)

      await nextTick()

      // Initialize ResizeObserver to monitor container size changes
      if (xtermContainer.value) {
        resizeObserver = new ResizeObserver(() => {
          handleTerminalResize()
        })
        resizeObserver.observe(xtermContainer.value)
      }

      // Delay fit call to ensure container has correct dimensions
      setTimeout(() => {
        handleTerminalResize()
      }, 100)

      // Display ASCII art
      terminal.writeln('\x1b[1;36m')
      terminal.writeln('    ____                  __  ___   _____ __         ____')
      terminal.writeln('   / __ \\___  ____ ______/ /_|__ \\ / ___// /_  ___  / / /')
      terminal.writeln('  / /_/ / _ \\/ __ `/ ___/ __/__/ / \\__ \\/ __ \\/ _ \\/ / / ')
      terminal.writeln(' / _, _/  __/ /_/ / /__/ /_ / __/ ___/ / / / /  __/ / /  ')
      terminal.writeln('/_/ |_|\\___/\\__,_/\\___/\\__//____//____/_/ /_/\\___/_/_/   ')
      terminal.writeln('\x1b[0m')
      terminal.writeln('\x1b[90m' + t('poc.terminal.target') + ': ' + currentUrl + '\x1b[0m')
      terminal.writeln('')
      terminal.writeln('\x1b[36m[*]\x1b[0m ' + t('poc.terminal.initializing'))

      // Extract domain root path, ensure API path is always based on domain root
      const urlObj = new URL(currentUrl)
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`
      const apiPath = '/_next/data/terminal'
      const apiUrl = baseUrl + apiPath

      terminal.writeln('\x1b[36m[*]\x1b[0m ' + t('poc.terminal.detectingBackend'))
      terminal.writeln('\x1b[90m    ' + t('poc.terminal.apiUrl') + ': ' + apiUrl + '\x1b[0m')

      let createResult = await window.api.terminal.createSession(apiUrl + '?action=create')
      let needsInjection = !createResult.success

      if (needsInjection) {
        terminal.writeln('\x1b[33m[*]\x1b[0m ' + t('poc.terminal.backendNotExist'))

        const injectResult = await window.api.terminal.create(baseUrl, apiPath)

        if (!injectResult.success) {
          terminal.writeln(
            '\x1b[31m[!]\x1b[0m ' + t('poc.terminal.injectFailed') + ': ' + injectResult.error
          )
          terminal.writeln('\x1b[90m    ' + t('poc.terminal.injectFailedHint') + '\x1b[0m')
          terminalConnecting = false
          return
        }

        terminal.writeln('\x1b[32m[✓]\x1b[0m ' + t('poc.terminal.injectSuccess'))
        terminal.writeln('\x1b[36m[*]\x1b[0m ' + t('poc.terminal.creatingSession'))
        createResult = await window.api.terminal.createSession(apiUrl + '?action=create')

        if (!createResult.success) {
          terminal.writeln(
            '\x1b[31m[!]\x1b[0m ' +
              t('poc.terminal.sessionCreateFailed') +
              ': ' +
              (createResult.error || 'Unknown error')
          )
          terminalConnecting = false
          return
        }
      } else {
        terminal.writeln('\x1b[32m[✓]\x1b[0m ' + t('poc.terminal.backendDetected'))
        terminal.writeln('\x1b[36m[*]\x1b[0m ' + t('poc.terminal.creatingSession'))
      }

      terminalSessionId = createResult.sessionId

      terminal.writeln('\x1b[32m[✓]\x1b[0m ' + t('poc.terminal.sessionCreated'))
      terminal.writeln('\x1b[32m[✓]\x1b[0m ' + t('poc.terminal.initComplete'))
      terminal.writeln('')
      terminal.writeln('\x1b[1;33m' + t('poc.terminal.pressEnter') + '\x1b[0m')
      terminal.writeln('')

      // Wait for user to press Enter key
      let waitingForEnter = true
      const enterKeyDisposable = terminal.onData((data) => {
        if (waitingForEnter && (data === '\r' || data === '\n')) {
          waitingForEnter = false
          enterKeyDisposable.dispose()
          connectSSE(terminal, apiUrl, terminalSessionId)
        }
      })

      // Listen for window resize
      window.addEventListener('resize', handleTerminalResize)
    } catch (error) {
      console.error('Terminal initialization failed:', error)
      if (terminal) {
        terminal.writeln('\x1b[31mError: ' + error.message + '\x1b[0m')
      }
    } finally {
      terminalConnecting = false
    }
  }

  // Connect SSE stream
  const connectSSE = async (terminal, apiUrl, sessionId) => {
    terminal.writeln('\x1b[36m[*]\x1b[0m ' + t('poc.terminal.connecting'))
    terminal.writeln('')

    const sseUrl = apiUrl + '?action=stream&sid=' + sessionId
    console.log('Connecting to SSE:', sseUrl)

    let sseConnectionId = null
    let connectionEstablished = false

    const connectTimeout = setTimeout(() => {
      if (!connectionEstablished) {
        console.warn('SSE connection timeout, connectionId:', sseConnectionId)
        terminal.writeln('\x1b[31m✗ ' + t('poc.terminal.sseTimeout') + '\x1b[0m')
        terminal.writeln('\x1b[90m' + t('poc.terminal.sseTimeoutHint') + '\x1b[0m')
        if (sseConnectionId) {
          window.api.terminal.closeSSE(sseConnectionId)
        }
      }
    }, 15000)

    // Register all event listeners in advance to avoid missing events
    const onOpenHandler = (data) => {
      console.log('Received sse-open event:', data)
      if (sseConnectionId && data.connectionId === sseConnectionId) {
        clearTimeout(connectTimeout)
        connectionEstablished = true
        console.log('SSE connection opened')
        terminal.writeln('\x1b[32m[✓]\x1b[0m ' + t('poc.terminal.sseConnected'))
      }
    }

    const onMessageHandler = (msgData) => {
      if (!sseConnectionId || msgData.connectionId !== sseConnectionId) return

      try {
        const data = JSON.parse(msgData.data)
        console.log('Received SSE message:', data.type)

        if (data.type === 'connected') {
          // Don't clear terminal immediately, show connection success message first
          terminal.writeln('\x1b[32m[✓]\x1b[0m ' + t('poc.terminal.terminalConnected'))
          terminal.writeln(
            '\x1b[90m    ' + t('poc.terminal.sessionId') + ': ' + sessionId + '\x1b[0m'
          )
          terminal.writeln('')

          terminalInitialized = true
          connectionEstablished = true
          clearTimeout(connectTimeout)

          // Delay sending initial command, wait for terminal to be fully ready
          setTimeout(async () => {
            try {
              const inputUrl = apiUrl + '?action=input&sid=' + sessionId
              console.log('Sending initial command to:', inputUrl)
              await window.api.terminal.sendInput(inputUrl, '\n')
            } catch (error) {
              console.error('Failed to send initial enter:', error)
              terminal.writeln(
                '\x1b[33m[!]\x1b[0m ' + t('poc.terminal.sendCommandFailed') + ': ' + error.message
              )
            }
          }, 1000)
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
            console.error('Failed to decode output:', error)
            const text = atob(data.data)
            if (terminal) {
              terminal.write(text)
            }
          }
        } else if (data.type === 'exit') {
          if (terminal) {
            terminal.writeln(
              '\r\n\x1b[33m' + t('poc.terminal.processExited') + ': ' + data.code + '\x1b[0m'
            )
          }
          terminalInitialized = false
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error, msgData.data)
      }
    }

    const onErrorHandler = (data) => {
      if (!sseConnectionId || data.connectionId !== sseConnectionId) return
      clearTimeout(connectTimeout)
      console.error('SSE error:', data.error)
      if (terminal) {
        terminal.writeln('\r\n\x1b[31m✗ ' + t('poc.terminal.sseError') + '\x1b[0m')
        terminal.writeln(
          '\x1b[90m' + t('poc.terminal.sseErrorHint') + ': ' + data.error + '\x1b[0m'
        )
      }
    }

    const onCloseHandler = (data) => {
      if (!sseConnectionId || data.connectionId !== sseConnectionId) return
      console.log('SSE connection closed, connectionEstablished:', connectionEstablished)

      if (terminal) {
        if (connectionEstablished) {
          // If connection was established, this is normal or abnormal closure
          terminal.writeln('\r\n\x1b[33m[!]\x1b[0m ' + t('poc.terminal.sseClosed'))
          if (!terminalInitialized) {
            terminal.writeln('\x1b[90m    ' + t('poc.terminal.sseClosedBeforeInit') + '\x1b[0m')
          }
        } else {
          // Connection was closed before it was established
          terminal.writeln('\r\n\x1b[31m[✗]\x1b[0m ' + t('poc.terminal.sseConnectionFailed'))
          terminal.writeln('\x1b[90m    ' + t('poc.terminal.sseConnectionFailedHint') + '\x1b[0m')
        }
      }

      terminalInitialized = false
      clearTimeout(connectTimeout)
    }

    // Register all listeners
    window.api.terminal.onSSEOpen(onOpenHandler)
    window.api.terminal.onSSEMessage(onMessageHandler)
    window.api.terminal.onSSEError(onErrorHandler)
    window.api.terminal.onSSEClose(onCloseHandler)

    try {
      // Initiate connection
      console.log('Initiating SSE connection...')
      const result = await window.api.terminal.connectSSE(sseUrl)

      if (!result.success) {
        clearTimeout(connectTimeout)
        terminal.writeln(
          '\x1b[31m✗ ' +
            t('poc.terminal.connectionFailed') +
            ': ' +
            (result.error || 'Unknown error') +
            '\x1b[0m'
        )
        return
      }

      sseConnectionId = result.connectionId
      console.log('SSE connection established, ID:', sseConnectionId)
      terminal.writeln(
        '\x1b[90m    ' + t('poc.terminal.connectionId') + ': ' + sseConnectionId + '\x1b[0m'
      )

      // Listen for user input
      terminal.onData(async (data) => {
        if (terminalInitialized && sessionId) {
          try {
            const inputUrl = apiUrl + '?action=input&sid=' + sessionId
            await window.api.terminal.sendInput(inputUrl, data)
          } catch (error) {
            console.error('Failed to send input:', error)
          }
        }
      })
    } catch (error) {
      clearTimeout(connectTimeout)
      console.error('Failed to connect SSE:', error)
      terminal.writeln(
        '\x1b[31m✗ ' + t('poc.terminal.connectionError') + ': ' + error.message + '\x1b[0m'
      )
    }
  }

  // Clean up terminal
  const cleanup = () => {
    if (window.api?.terminal?.removeSSEListeners) {
      window.api.terminal.removeSSEListeners()
    }

    if (terminalWebSocket) {
      try {
        terminalWebSocket.close()
      } catch (e) {
        console.error('Failed to close SSE connection:', e)
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
        console.error('Failed to dispose terminal:', e)
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
