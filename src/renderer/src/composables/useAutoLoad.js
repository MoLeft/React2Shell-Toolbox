/**
 * 自动加载功能 Composable
 * 负责自动加载所有页面数据
 */
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { createLogger } from '@/utils/logger'

const logger = createLogger('AutoLoad')

export function useAutoLoad(searchResultsCache, totalPages, loadPageFromQueue) {
  const { t } = useI18n()
  const autoLoadStatus = ref('idle') // idle, loading, paused, completed, error
  const autoLoadErrorDialog = ref(false)
  const autoLoadErrorPage = ref(0)
  const autoLoadErrorMessage = ref('')
  const autoLoadPausedPage = ref(0)
  const shouldStop = ref(false) // 使用简单的标志而不是 AbortController

  // 启动自动加载
  const startAutoLoad = async (showSnackbar) => {
    if (autoLoadStatus.value === 'loading') {
      return
    }

    autoLoadStatus.value = 'loading'
    shouldStop.value = false
    autoLoadPausedPage.value = 0

    try {
      const totalPagesCount = totalPages.value

      for (let page = 2; page <= totalPagesCount; page++) {
        // 检查是否应该停止
        if (shouldStop.value) {
          logger.info(`在第 ${page} 页暂停`)
          autoLoadPausedPage.value = page
          autoLoadStatus.value = 'paused'
          return
        }

        if (searchResultsCache.value[page]) {
          continue
        }

        try {
          const pageData = await loadPageFromQueue(page)

          // 加载完成后再次检查是否应该停止
          if (shouldStop.value) {
            logger.info(`第 ${page} 页加载完成后暂停`)
            // 如果数据已加载，保存它
            if (pageData && pageData.length > 0) {
              searchResultsCache.value[page] = pageData
            }
            autoLoadPausedPage.value = page + 1
            autoLoadStatus.value = 'paused'
            return
          }

          if (pageData && pageData.length > 0) {
            searchResultsCache.value[page] = pageData
            logger.success(`第 ${page} 页完成`)
          }

          await new Promise((resolve) => setTimeout(resolve, 500))
        } catch (error) {
          logger.error(`自动加载第 ${page} 页失败`, error)
          autoLoadStatus.value = 'error'
          autoLoadErrorPage.value = page
          autoLoadErrorMessage.value = error.message
          autoLoadPausedPage.value = page
          autoLoadErrorDialog.value = true
          return
        }
      }

      autoLoadStatus.value = 'completed'
      autoLoadPausedPage.value = 0
      showSnackbar(t('batch.autoLoad.allLoaded'), 'success')
    } catch (error) {
      logger.error('自动加载失败', error)
      autoLoadStatus.value = 'error'
      autoLoadErrorMessage.value = error.message
    }
  }

  // 暂停自动加载
  const pauseAutoLoad = (showSnackbar) => {
    logger.info('请求暂停')
    shouldStop.value = true
    // 立即改变状态，让按钮立即响应
    // 注意：实际的暂停会在当前页加载完成后生效
    if (autoLoadStatus.value === 'loading') {
      autoLoadStatus.value = 'paused'
    }
    showSnackbar(t('messages.operationSuccess'), 'info')
  }

  // 继续自动加载
  const resumeAutoLoad = async (showSnackbar) => {
    if (autoLoadStatus.value !== 'paused') {
      return
    }

    logger.info(`从第 ${autoLoadPausedPage.value} 页继续`)
    autoLoadStatus.value = 'loading'
    shouldStop.value = false

    try {
      const totalPagesCount = totalPages.value

      for (let page = autoLoadPausedPage.value || 2; page <= totalPagesCount; page++) {
        // 检查是否应该停止
        if (shouldStop.value) {
          logger.info(`在第 ${page} 页暂停`)
          autoLoadPausedPage.value = page
          autoLoadStatus.value = 'paused'
          return
        }

        if (searchResultsCache.value[page]) {
          continue
        }

        try {
          const pageData = await loadPageFromQueue(page)

          // 加载完成后再次检查是否应该停止
          if (shouldStop.value) {
            logger.info(`第 ${page} 页加载完成后暂停`)
            // 如果数据已加载，保存它
            if (pageData && pageData.length > 0) {
              searchResultsCache.value[page] = pageData
            }
            autoLoadPausedPage.value = page + 1
            autoLoadStatus.value = 'paused'
            return
          }

          if (pageData && pageData.length > 0) {
            searchResultsCache.value[page] = pageData
            logger.success(`第 ${page} 页完成`)
          }

          await new Promise((resolve) => setTimeout(resolve, 500))
        } catch (error) {
          logger.error(`自动加载第 ${page} 页失败`, error)
          autoLoadStatus.value = 'error'
          autoLoadErrorPage.value = page
          autoLoadErrorMessage.value = error.message
          autoLoadPausedPage.value = page
          autoLoadErrorDialog.value = true
          return
        }
      }

      autoLoadStatus.value = 'completed'
      autoLoadPausedPage.value = 0
      showSnackbar(t('batch.autoLoad.allLoaded'), 'success')
    } catch (error) {
      logger.error('自动加载失败', error)
      autoLoadStatus.value = 'error'
      autoLoadErrorMessage.value = error.message
    }
  }

  // 切换自动加载
  const toggleAutoLoad = (showSnackbar) => {
    if (autoLoadStatus.value === 'loading') {
      // 如果正在加载，则暂停
      pauseAutoLoad(showSnackbar)
    } else if (autoLoadStatus.value === 'error') {
      // 如果出错，显示错误对话框
      autoLoadErrorDialog.value = true
    } else if (autoLoadStatus.value === 'completed') {
      // 如果已完成，提示用户
      showSnackbar(t('batch.autoLoad.allLoaded'), 'success')
    } else if (autoLoadStatus.value === 'paused') {
      // 如果已暂停，继续加载
      resumeAutoLoad(showSnackbar)
    } else {
      // 否则开始新的加载
      startAutoLoad(showSnackbar)
    }
  }

  // 重试自动加载失败的页面
  const retryAutoLoadPage = async (_batchSettings, showSnackbar) => {
    autoLoadErrorDialog.value = false
    const page = autoLoadErrorPage.value

    // 重置错误状态，开始加载
    autoLoadStatus.value = 'loading'
    shouldStop.value = false

    try {
      const pageData = await loadPageFromQueue(page)

      // 加载完成后检查是否应该停止
      if (shouldStop.value) {
        logger.info(`重试第 ${page} 页后暂停`)
        if (pageData && pageData.length > 0) {
          searchResultsCache.value[page] = pageData
        }
        autoLoadPausedPage.value = page + 1
        autoLoadStatus.value = 'paused'
        return
      }

      if (pageData && pageData.length > 0) {
        searchResultsCache.value[page] = pageData
        logger.success(`重试加载: 第 ${page} 页完成`)
        showSnackbar(t('messages.operationSuccess'), 'success')

        // 继续加载后续页面
        const totalPagesCount = totalPages.value
        for (let nextPage = page + 1; nextPage <= totalPagesCount; nextPage++) {
          // 检查是否应该停止
          if (shouldStop.value) {
            logger.info(`在第 ${nextPage} 页暂停`)
            autoLoadPausedPage.value = nextPage
            autoLoadStatus.value = 'paused'
            return
          }

          if (searchResultsCache.value[nextPage]) {
            continue
          }

          try {
            const nextPageData = await loadPageFromQueue(nextPage)

            // 加载完成后再次检查是否应该停止
            if (shouldStop.value) {
              logger.info(`第 ${nextPage} 页加载完成后暂停`)
              if (nextPageData && nextPageData.length > 0) {
                searchResultsCache.value[nextPage] = nextPageData
              }
              autoLoadPausedPage.value = nextPage + 1
              autoLoadStatus.value = 'paused'
              return
            }

            if (nextPageData && nextPageData.length > 0) {
              searchResultsCache.value[nextPage] = nextPageData
              logger.success(`第 ${nextPage} 页完成`)
            }
            await new Promise((resolve) => setTimeout(resolve, 500))
          } catch (error) {
            logger.error(`自动加载第 ${nextPage} 页失败`, error)
            autoLoadStatus.value = 'error'
            autoLoadErrorPage.value = nextPage
            autoLoadErrorMessage.value = error.message
            autoLoadPausedPage.value = nextPage
            autoLoadErrorDialog.value = true
            return
          }
        }

        // 所有页面加载完成
        autoLoadStatus.value = 'completed'
        autoLoadPausedPage.value = 0
        showSnackbar(t('batch.autoLoad.allLoaded'), 'success')
      }
    } catch (error) {
      logger.error(`重试加载第 ${page} 页失败`, error)
      autoLoadStatus.value = 'error'
      autoLoadErrorPage.value = page
      autoLoadErrorMessage.value = error.message
      autoLoadErrorDialog.value = true
      showSnackbar(`${t('messages.operationFailed')}: ${error.message}`, 'error')
    }
  }

  // 重置自动加载状态
  const resetAutoLoad = () => {
    shouldStop.value = true
    autoLoadStatus.value = 'idle'
    autoLoadPausedPage.value = 0
    autoLoadErrorPage.value = 0
    autoLoadErrorMessage.value = ''
    autoLoadErrorDialog.value = false
  }

  return {
    autoLoadStatus,
    autoLoadErrorDialog,
    autoLoadErrorPage,
    autoLoadErrorMessage,
    autoLoadPausedPage,
    shouldStop,
    startAutoLoad,
    pauseAutoLoad,
    resumeAutoLoad,
    toggleAutoLoad,
    retryAutoLoadPage,
    resetAutoLoad
  }
}
