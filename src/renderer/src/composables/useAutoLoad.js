/**
 * 自动加载功能 Composable
 * 负责自动加载所有页面数据
 */
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

export function useAutoLoad(searchResultsCache, totalPages, loadPageFromQueue) {
  const { t } = useI18n()
  const autoLoadStatus = ref('idle') // idle, loading, paused, completed, error
  const autoLoadErrorDialog = ref(false)
  const autoLoadErrorPage = ref(0)
  const autoLoadErrorMessage = ref('')
  const autoLoadAbortController = ref(null)
  const autoLoadPausedPage = ref(0)

  // 启动自动加载
  const startAutoLoad = async (showSnackbar) => {
    if (autoLoadStatus.value === 'loading') {
      return
    }

    autoLoadStatus.value = 'loading'
    autoLoadAbortController.value = new AbortController()
    autoLoadPausedPage.value = 0

    try {
      const totalPagesCount = totalPages.value

      for (let page = 2; page <= totalPagesCount; page++) {
        if (autoLoadAbortController.value?.signal.aborted) {
          autoLoadPausedPage.value = page
          return
        }

        if (searchResultsCache.value[page]) {
          continue
        }

        try {
          const pageData = await loadPageFromQueue(page)
          if (pageData && pageData.length > 0) {
            searchResultsCache.value[page] = pageData
            console.log(`自动加载: 第 ${page} 页完成`)
          }

          await new Promise((resolve) => setTimeout(resolve, 500))
        } catch (error) {
          console.error(`自动加载第 ${page} 页失败:`, error)
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
      console.error('自动加载失败:', error)
      autoLoadStatus.value = 'error'
      autoLoadErrorMessage.value = error.message
    }
  }

  // 暂停自动加载
  const pauseAutoLoad = (showSnackbar) => {
    if (autoLoadAbortController.value) {
      autoLoadAbortController.value.abort()
      autoLoadAbortController.value = null
    }
    autoLoadStatus.value = 'paused'
    showSnackbar(t('messages.operationSuccess'), 'info')
  }

  // 继续自动加载
  const resumeAutoLoad = async (showSnackbar) => {
    if (autoLoadStatus.value !== 'paused') {
      return
    }

    autoLoadStatus.value = 'loading'
    autoLoadAbortController.value = new AbortController()

    try {
      const totalPagesCount = totalPages.value

      for (let page = autoLoadPausedPage.value || 2; page <= totalPagesCount; page++) {
        if (autoLoadAbortController.value?.signal.aborted) {
          autoLoadPausedPage.value = page
          return
        }

        if (searchResultsCache.value[page]) {
          continue
        }

        try {
          const pageData = await loadPageFromQueue(page)
          if (pageData && pageData.length > 0) {
            searchResultsCache.value[page] = pageData
            console.log(`自动加载: 第 ${page} 页完成`)
          }

          await new Promise((resolve) => setTimeout(resolve, 500))
        } catch (error) {
          console.error(`自动加载第 ${page} 页失败:`, error)
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
      console.error('自动加载失败:', error)
      autoLoadStatus.value = 'error'
      autoLoadErrorMessage.value = error.message
    }
  }

  // 切换自动加载
  const toggleAutoLoad = (showSnackbar) => {
    if (autoLoadStatus.value === 'error') {
      autoLoadErrorDialog.value = true
    } else if (autoLoadStatus.value === 'completed') {
      showSnackbar(t('batch.autoLoad.allLoaded'), 'success')
    } else if (autoLoadStatus.value === 'paused') {
      resumeAutoLoad(showSnackbar)
    } else {
      startAutoLoad(showSnackbar)
    }
  }

  // 重试自动加载失败的页面
  const retryAutoLoadPage = async (batchSettings, showSnackbar) => {
    autoLoadErrorDialog.value = false
    const page = autoLoadErrorPage.value

    try {
      const pageData = await loadPageFromQueue(page)
      if (pageData && pageData.length > 0) {
        searchResultsCache.value[page] = pageData
        showSnackbar(t('messages.operationSuccess'), 'success')

        if (batchSettings.value.autoLoad) {
          autoLoadStatus.value = 'loading'
          const totalPagesCount = totalPages.value
          for (let nextPage = page + 1; nextPage <= totalPagesCount; nextPage++) {
            if (autoLoadAbortController.value?.signal.aborted) {
              autoLoadStatus.value = 'idle'
              return
            }

            if (searchResultsCache.value[nextPage]) {
              continue
            }

            try {
              const nextPageData = await loadPageFromQueue(nextPage)
              if (nextPageData && nextPageData.length > 0) {
                searchResultsCache.value[nextPage] = nextPageData
                console.log(`自动加载: 第 ${nextPage} 页完成`)
              }
              await new Promise((resolve) => setTimeout(resolve, 500))
            } catch (error) {
              console.error(`自动加载第 ${nextPage} 页失败:`, error)
              autoLoadStatus.value = 'error'
              autoLoadErrorPage.value = nextPage
              autoLoadErrorMessage.value = error.message
              return
            }
          }
          autoLoadStatus.value = 'completed'
          showSnackbar(t('batch.autoLoad.allLoaded'), 'success')
        }
      }
    } catch (error) {
      showSnackbar(`${t('messages.operationFailed')}: ${error.message}`, 'error')
    }
  }

  return {
    autoLoadStatus,
    autoLoadErrorDialog,
    autoLoadErrorPage,
    autoLoadErrorMessage,
    autoLoadAbortController,
    autoLoadPausedPage,
    startAutoLoad,
    pauseAutoLoad,
    resumeAutoLoad,
    toggleAutoLoad,
    retryAutoLoadPage
  }
}
