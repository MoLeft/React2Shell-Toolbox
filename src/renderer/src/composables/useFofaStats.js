/**
 * FOFA 统计数据管理 Composable
 * 负责统计数据加载、队列管理、筛选条件
 */
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { createLogger } from '@/utils/logger'

const logger = createLogger('FofaStats')

export function useFofaStats(searchQuery, batchSettings) {
  const { t } = useI18n()
  const stats = ref({
    protocol: [],
    domain: [],
    port: [],
    title: [],
    os: [],
    server: [],
    country: [],
    asn: [],
    org: [],
    asset_type: [],
    fid: [],
    icp: []
  })

  const selectedFilters = ref([])
  const loadingFields = ref({
    protocol: false,
    domain: false,
    port: false,
    title: false,
    os: false,
    server: false,
    country: false,
    asn: false,
    org: false,
    asset_type: false,
    fid: false,
    icp: false
  })
  const failedFields = ref({
    protocol: false,
    domain: false,
    port: false,
    title: false,
    os: false,
    server: false,
    country: false,
    asn: false,
    org: false,
    asset_type: false,
    fid: false,
    icp: false
  })

  // 队列系统
  const loadQueue = ref([])
  const currentLoadingField = ref(null)
  const queueCooldown = ref(0)
  let queueInterval = null
  const isLoadingAll = ref(false)
  const retryDialog = ref(false)
  const retryField = ref('')
  const retryError = ref('')

  // 检查是否有任何加载活动
  const isAnyLoading = computed(() => {
    return currentLoadingField.value !== null || queueCooldown.value > 0 || isLoadingAll.value
  })

  // 检查字段是否在队列中
  const isFieldInQueue = (field) => {
    return loadQueue.value.includes(field) || currentLoadingField.value === field
  }

  // 获取字段的倒计时
  const getFieldCooldown = (field) => {
    if (queueCooldown.value > 0) {
      if (loadQueue.value.length > 0 && loadQueue.value[0] === field) {
        return queueCooldown.value
      }
      if (!stats.value[field] || stats.value[field].length === 0) {
        if (!failedFields.value[field] && !isFieldInQueue(field)) {
          return queueCooldown.value
        }
      }
    }
    return 0
  }

  // 队列处理器
  const processQueue = async (showSnackbar) => {
    if (loadQueue.value.length === 0) {
      currentLoadingField.value = null
      queueCooldown.value = 0
      isLoadingAll.value = false
      if (queueInterval) {
        clearInterval(queueInterval)
        queueInterval = null
      }
      return
    }

    if (queueCooldown.value > 0) {
      return
    }

    const field = loadQueue.value.shift()
    currentLoadingField.value = field
    loadingFields.value[field] = true
    failedFields.value[field] = false

    try {
      const result = await window.api.fofa.stats(searchQuery.value, field, 100)

      logger.debug(`[${field}] 完整响应`, result)

      if (result.success && result.data) {
        const fieldMapping = {
          country: 'countries'
        }

        const aggsKey = fieldMapping[field] || field

        if (
          result.data.aggs &&
          result.data.aggs[aggsKey] !== null &&
          result.data.aggs[aggsKey] !== undefined
        ) {
          const aggsData = result.data.aggs[aggsKey]

          if (Array.isArray(aggsData) && aggsData.length > 0) {
            if (typeof aggsData[0] === 'object' && aggsData[0].name !== undefined) {
              stats.value[field] = aggsData.map((item) => ({
                value: item.name || item.name_code || '-',
                count: item.count || 0
              }))
            } else if (Array.isArray(aggsData[0])) {
              stats.value[field] = aggsData.map((item) => ({
                value: item[0],
                count: item[1]
              }))
            } else {
              stats.value[field] = []
              logger.warn(`[${field}] 未知的数据格式`, aggsData[0])
              failedFields.value[field] = true
              showSnackbar(t('messages.operationFailed'), 'warning')
            }
          } else {
            stats.value[field] = []
            failedFields.value[field] = true
            showSnackbar(t('messages.operationFailed'), 'warning')
          }

          if (stats.value[field].length > 0) {
            logger.debug(`[${field}] 解析后的数据`, stats.value[field].slice(0, 3))
            showSnackbar(t('messages.operationSuccess'), 'success')
            failedFields.value[field] = false
          }
        } else {
          stats.value[field] = []
          failedFields.value[field] = true
          retryError.value = t('batch.stats.noAggData')
          logger.warn(`[${field}] 未找到聚合数据`, { aggs: result.data.aggs })
          showSnackbar(t('messages.operationFailed'), 'warning')
        }
      } else {
        stats.value[field] = []
        failedFields.value[field] = true
        retryError.value = result.error || t('messages.unknownError')
        showSnackbar(`${t('messages.operationFailed')}: ${result.error}`, 'error')
      }
    } catch (error) {
      logger.error(`获取 ${field} 统计失败`, error)
      stats.value[field] = []
      failedFields.value[field] = true
      retryError.value = error.message || t('messages.unknownError')
      if (error.response?.status === 429) {
        const retryAfter = error.response?.headers?.['retry-after'] || 10
        showSnackbar(`${t('messages.operationFailed')}: ${retryAfter}s`, 'warning')
      } else {
        showSnackbar(t('messages.operationFailed'), 'error')
      }
    } finally {
      loadingFields.value[field] = false
      currentLoadingField.value = null

      queueCooldown.value = 10
      if (!queueInterval) {
        queueInterval = setInterval(() => {
          queueCooldown.value--
          if (queueCooldown.value <= 0) {
            queueCooldown.value = 0
            if (queueInterval) {
              clearInterval(queueInterval)
              queueInterval = null
            }
            if (loadQueue.value.length > 0) {
              processQueue(showSnackbar)
            } else {
              isLoadingAll.value = false
            }
          }
        }, 1000)
      }
    }
  }

  // 添加字段到加载队列
  const addToQueue = (field) => {
    if (!searchQuery.value) return

    if (isLoadingAll.value) return

    if (loadQueue.value.includes(field) || currentLoadingField.value === field) {
      return
    }

    if (stats.value[field] && stats.value[field].length > 0 && !failedFields.value[field]) {
      return
    }

    loadQueue.value.push(field)

    if (!currentLoadingField.value && queueCooldown.value === 0) {
      return true // 需要立即处理
    }
    return false
  }

  // 加载单个字段的统计数据
  const loadFieldStats = (field, showSnackbar) => {
    if (isLoadingAll.value) return
    const shouldProcess = addToQueue(field)
    if (shouldProcess) {
      processQueue(showSnackbar)
    }
  }

  // 一键加载所有字段
  const loadAllFields = (showSnackbar) => {
    if (!searchQuery.value) return

    const fields = [
      'protocol',
      'domain',
      'port',
      'title',
      'os',
      'server',
      'country',
      'asn',
      'org',
      'asset_type',
      'fid',
      'icp'
    ]

    const unloadedFields = fields.filter(
      (field) =>
        (!stats.value[field] || stats.value[field].length === 0) && !failedFields.value[field]
    )

    if (unloadedFields.length === 0) {
      showSnackbar(t('batch.autoLoad.allLoaded'), 'info')
      return
    }

    isLoadingAll.value = true
    loadQueue.value = []

    unloadedFields.forEach((field) => {
      loadQueue.value.push(field)
    })

    showSnackbar(t('common.loading'), 'info')

    processQueue(showSnackbar)
  }

  // 打开重试对话框
  const openRetryDialog = (field) => {
    retryField.value = field
    retryDialog.value = true
  }

  // 重试加载字段
  const retryLoadField = (showSnackbar) => {
    const field = retryField.value
    retryDialog.value = false

    if (field) {
      failedFields.value[field] = false
      stats.value[field] = []
      const shouldProcess = addToQueue(field)
      if (shouldProcess) {
        processQueue(showSnackbar)
      }
    }
  }

  // 切换筛选条件
  const toggleFilter = (field, value) => {
    const index = selectedFilters.value.findIndex((f) => f.field === field && f.value === value)
    if (index > -1) {
      selectedFilters.value.splice(index, 1)
    } else {
      selectedFilters.value.push({ field, value })
    }
  }

  // 检查某个字段是否全选
  const isFieldAllSelected = (field) => {
    if (!stats.value[field] || stats.value[field].length === 0) return false
    return stats.value[field].every((item) =>
      selectedFilters.value.some((f) => f.field === field && f.value === item.value)
    )
  }

  // 切换某个字段的全选状态
  const toggleFieldSelection = (field) => {
    if (!stats.value[field] || stats.value[field].length === 0) return

    const isAllSelected = isFieldAllSelected(field)

    if (isAllSelected) {
      selectedFilters.value = selectedFilters.value.filter((f) => f.field !== field)
    } else {
      selectedFilters.value = selectedFilters.value.filter((f) => f.field !== field)
      stats.value[field].forEach((item) => {
        selectedFilters.value.push({ field, value: item.value })
      })
    }
  }

  // 一键反选
  const toggleAllSelections = () => {
    if (selectedFilters.value.length === 0) {
      Object.keys(stats.value).forEach((field) => {
        if (stats.value[field] && stats.value[field].length > 0) {
          stats.value[field].forEach((item) => {
            if (!selectedFilters.value.some((f) => f.field === field && f.value === item.value)) {
              selectedFilters.value.push({ field, value: item.value })
            }
          })
        }
      })
    } else {
      selectedFilters.value = []
    }
  }

  // 格式化数字显示
  const formatNumber = (num) => {
    if (num === 0) return '0'
    if (num < 1000) return num.toString()
    if (num < 10000) return (num / 1000).toFixed(2) + 'k'
    if (num < 100000) return (num / 10000).toFixed(2) + 'w'
    if (num < 1000000) return (num / 10000).toFixed(2) + 'w'
    return (num / 1000000).toFixed(2) + 'm'
  }

  // 计算已选择的资产数量
  const selectedAssetCount = computed(() => {
    if (selectedFilters.value.length === 0) return '0'

    const maxResults = batchSettings.value.maxFofaResults || 10000
    let totalCount = 0
    selectedFilters.value.forEach((filter) => {
      const fieldData = stats.value[filter.field]
      if (fieldData) {
        const item = fieldData.find((d) => d.value === filter.value)
        if (item) {
          const itemCount = Math.min(item.count || 0, maxResults)
          totalCount += itemCount
        }
      }
    })

    return formatNumber(totalCount)
  })

  // 清理定时器
  const cleanup = () => {
    if (queueInterval) {
      clearInterval(queueInterval)
      queueInterval = null
    }
  }

  return {
    // 状态
    stats,
    selectedFilters,
    loadingFields,
    failedFields,
    loadQueue,
    currentLoadingField,
    queueCooldown,
    isLoadingAll,
    retryDialog,
    retryField,
    retryError,

    // 计算属性
    isAnyLoading,
    selectedAssetCount,

    // 方法
    isFieldInQueue,
    getFieldCooldown,
    processQueue,
    addToQueue,
    loadFieldStats,
    loadAllFields,
    openRetryDialog,
    retryLoadField,
    toggleFilter,
    isFieldAllSelected,
    toggleFieldSelection,
    toggleAllSelections,
    formatNumber,
    cleanup
  }
}
