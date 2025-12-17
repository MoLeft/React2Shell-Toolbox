/**
 * 批量导出功能 Composable
 * 负责批量导出数据逻辑
 */
import { ref, computed } from 'vue'

export function useBatchExport(searchResultsCache) {
  const exportDialog = ref(false)
  const exportScope = ref('all')
  const exportFormat = ref('txt')
  const exporting = ref(false)

  // 计算导出统计信息
  const exportStats = computed(() => {
    const allResults = []

    // 收集所有缓存的结果
    Object.values(searchResultsCache.value).forEach((pageResults) => {
      if (Array.isArray(pageResults)) {
        allResults.push(...pageResults)
      }
    })

    const stats = {
      all: allResults.length,
      safe: 0,
      vulnerable: 0,
      error: 0,
      pending: 0,
      hijacked: 0,
      hijackFailed: 0
    }

    allResults.forEach((item) => {
      if (item.pocStatus === 'safe') {
        stats.safe++
      } else if (item.pocStatus === 'vulnerable') {
        stats.vulnerable++
      } else if (item.pocStatus === 'error') {
        stats.error++
      } else if (item.pocStatus === 'hijacked') {
        stats.hijacked++
      } else if (item.pocStatus === 'hijack-failed') {
        stats.hijackFailed++
      } else if (item.pocStatus === 'pending' || !item.pocStatus) {
        stats.pending++
      }
    })

    return stats
  })

  // 打开导出对话框
  const openExportDialog = () => {
    exportDialog.value = true
  }

  // 关闭导出对话框
  const closeExportDialog = () => {
    exportDialog.value = false
  }

  // 根据范围过滤结果
  const filterResultsByScope = (scope) => {
    const allResults = []

    // 收集所有缓存的结果
    Object.values(searchResultsCache.value).forEach((pageResults) => {
      if (Array.isArray(pageResults)) {
        allResults.push(...pageResults)
      }
    })

    if (scope === 'all') {
      return allResults
    }

    return allResults.filter((item) => {
      if (scope === 'safe') return item.pocStatus === 'safe'
      if (scope === 'vulnerable') return item.pocStatus === 'vulnerable'
      if (scope === 'error') return item.pocStatus === 'error'
      if (scope === 'hijacked') return item.pocStatus === 'hijacked'
      if (scope === 'hijack-failed') return item.pocStatus === 'hijack-failed'
      if (scope === 'pending') return item.pocStatus === 'pending' || !item.pocStatus
      return false
    })
  }

  // 格式化为 TXT
  const formatAsTxt = (results) => {
    const lines = results.map((item) => {
      const status = item.pocStatus || 'pending'
      const statusText =
        {
          safe: '[安全]',
          vulnerable: '[漏洞]',
          error: '[错误]',
          hijacked: '[已挂黑]',
          'hijack-failed': '[挂黑失败]',
          pending: '[未验证]',
          checking: '[验证中]',
          hijacking: '[正在挂黑]'
        }[status] || '[未知]'

      return `${statusText} ${item.fullUrl}`
    })

    return lines.join('\n')
  }

  // 格式化为 CSV
  const formatAsCsv = (results) => {
    const header = 'URL,协议,主机,端口,状态\n'
    const rows = results.map((item) => {
      const status = item.pocStatus || 'pending'
      const statusText =
        {
          safe: '安全',
          vulnerable: '漏洞',
          error: '错误',
          hijacked: '已挂黑',
          'hijack-failed': '挂黑失败',
          pending: '未验证',
          checking: '验证中',
          hijacking: '正在挂黑'
        }[status] || '未知'

      // CSV 转义：如果字段包含逗号、引号或换行符，需要用引号包裹
      const escapeField = (field) => {
        if (!field) return ''
        const str = String(field)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }

      return `${escapeField(item.fullUrl)},${escapeField(item.protocol)},${escapeField(item.host)},${escapeField(item.port)},${escapeField(statusText)}`
    })

    return header + rows.join('\n')
  }

  // 格式化为 JSON
  const formatAsJson = (results) => {
    const data = results.map((item) => ({
      url: item.fullUrl,
      protocol: item.protocol,
      host: item.host,
      port: item.port,
      status: item.pocStatus || 'pending',
      ip: item.ip || '',
      domain: item.domain || '',
      country: item.country || '',
      city: item.city || '',
      isp: item.isp || ''
    }))

    return JSON.stringify(data, null, 2)
  }

  // 执行导出
  const executeExport = async (options, showSnackbar) => {
    try {
      exporting.value = true

      const { scope, format } = options

      // 过滤结果
      const results = filterResultsByScope(scope)

      if (results.length === 0) {
        showSnackbar('没有数据可导出', 'warning')
        return
      }

      // 格式化数据
      let content = ''
      let extension = ''

      if (format === 'txt') {
        content = formatAsTxt(results)
        extension = 'txt'
      } else if (format === 'csv') {
        content = formatAsCsv(results)
        extension = 'csv'
      } else if (format === 'json') {
        content = formatAsJson(results)
        extension = 'json'
      }

      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const scopeText =
        {
          all: '全部',
          safe: '安全',
          vulnerable: '漏洞',
          error: '错误',
          hijacked: '已挂黑',
          'hijack-failed': '挂黑失败',
          pending: '未验证'
        }[scope] || '导出'

      const filename = `批量验证_${scopeText}_${timestamp}.${extension}`

      // 调用 Electron API 保存文件
      const result = await window.api.storage.saveExportFile(filename, content)

      if (result.success) {
        showSnackbar(`导出成功：${result.filePath}`, 'success')
        closeExportDialog()
      } else {
        if (result.canceled) {
          showSnackbar('导出已取消', 'info')
        } else {
          showSnackbar(`导出失败：${result.error}`, 'error')
        }
      }
    } catch (error) {
      console.error('导出失败:', error)
      showSnackbar(`导出失败：${error.message}`, 'error')
    } finally {
      exporting.value = false
    }
  }

  return {
    exportDialog,
    exportScope,
    exportFormat,
    exporting,
    exportStats,
    openExportDialog,
    closeExportDialog,
    executeExport
  }
}
