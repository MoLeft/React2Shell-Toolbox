<template>
  <v-container fluid class="batch-view">
    <!-- 页面标题 -->
    <div class="view-header">
      <h2>批量验证</h2>
      <div class="header-right">
        <fofa-user-info
          :connected="fofaConnected"
          :email="fofaEmail"
          :user-info="userInfo"
          :testing="testingConnection"
          @refresh="handleRefreshConnection"
        />
      </div>
    </div>

    <!-- 锁定状态（未连接时显示） -->
    <lock-card v-if="!fofaConnected" @go-to-settings="goToSettings" />

    <!-- 主内容卡片（连接后显示） -->
    <v-card v-else class="main-card view-content" elevation="2">
      <!-- 搜索框 -->
      <fofa-search-bar
        v-model="searchQuery"
        :disabled="!fofaConnected"
        :searching="searching"
        :loading-stats="loadingStats"
        :history="searchHistory"
        @search="handleSearch"
        @select-history="handleSelectHistory"
        @delete-history="deleteHistory"
      />

      <v-divider />

      <!-- 内容区域：左侧树形 + 右侧结果 -->
      <div class="content-wrapper">
        <!-- 左侧：统计聚合树 -->
        <stats-filter-panel
          :stats="stats"
          :selected-filters="selectedFilters"
          :selected-asset-count="selectedAssetCount"
          :search-query="searchQuery"
          :current-loading-field="currentLoadingField"
          :failed-fields="failedFields"
          :load-queue="loadQueue"
          :queue-cooldown="queueCooldown"
          :any-loading="isAnyLoading"
          @toggle-field="toggleFieldSelection"
          @toggle-item="toggleFilter"
          @load-field="(field) => loadFieldStats(field, showSnackbar)"
          @retry-field="openRetryDialog"
          @load-all="() => loadAllFields(showSnackbar)"
          @toggle-all="toggleAllSelections"
          @group-click="handleGroupClick"
        />

        <v-divider vertical />

        <!-- 右侧：搜索结果 -->
        <div class="results-section">
          <results-header
            :show="hasSearched && searchResults.length > 0"
            :stats="batchVerifyStats"
            :verifying="batchVerifying"
            :paused="batchVerifyPaused"
            :has-searched="hasSearched"
            :total-results="totalResults"
            :loaded-count="loadedCount"
            :show-results="searchResults.length > 0"
            :auto-load-status="autoLoadStatus"
            :batch-hijack-enabled="autoHijackEnabled"
            @toggle-verify="() => toggleBatchVerify(loadPageData, showSnackbar)"
            @toggle-auto-load="() => toggleAutoLoad(showSnackbar)"
            @pause-auto-load="() => pauseAutoLoad(showSnackbar)"
            @export="handleExport"
            @open-settings="handleOpenSettings"
          />
          <v-divider />

          <!-- 结果表格 -->
          <results-table
            ref="resultsTableRef"
            :results="paginatedResults"
            :has-searched="hasSearched"
            :searching="searching"
            :loading-page="loadingPage"
            :batch-hijack-enabled="autoHijackEnabled"
          >
            <template #pagination>
              <custom-pagination
                v-model:current-page="currentPage"
                v-model:page-input="pageInput"
                v-model:items-per-page="itemsPerPage"
                :total-pages="totalPages"
                :items-per-page-options="itemsPerPageOptions"
                :disabled="loadingPage || batchVerifying"
                @go-to-page="handleGoToPage"
                @update:items-per-page="onItemsPerPageChange"
              />
            </template>
          </results-table>
        </div>
      </div>
    </v-card>

    <!-- 重试对话框 -->
    <retry-dialog
      v-model="retryDialog"
      :field="retryField"
      :error="retryError"
      @retry="() => retryLoadField(showSnackbar)"
    />

    <!-- 批量验证设置对话框 -->
    <settings-dialog
      v-model="settingsDialog"
      :settings="tempSettings"
      @save="handleSaveSettings"
      @cancel="cancelSettings"
      @go-to-settings="handleGoToSettings"
    />

    <!-- 自动加载失败对话框 -->
    <auto-load-error-dialog
      v-model="autoLoadErrorDialog"
      :page="autoLoadErrorPage"
      :error-message="autoLoadErrorMessage"
      @retry="() => retryAutoLoadPage(batchSettings, showSnackbar)"
    />

    <!-- 导出对话框 -->
    <export-dialog
      v-model="exportDialog"
      :stats="exportStats"
      :export-scope="exportScope"
      :export-format="exportFormat"
      :batch-hijack-enabled="autoHijackEnabled"
      @export="handleExecuteExport"
      @cancel="closeExportDialog"
    />

    <notification-snackbar
      v-model:show="snackbar.show"
      :text="snackbar.text"
      :color="snackbar.color"
      :timeout="3000"
    />
  </v-container>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'

// 导入组件
import FofaUserInfo from '../components/batch/FofaUserInfo.vue'
import FofaSearchBar from '../components/batch/FofaSearchBar.vue'
import StatsFilterPanel from '../components/batch/StatsFilterPanel.vue'
import ResultsTable from '../components/batch/ResultsTable.vue'
import CustomPagination from '../components/batch/CustomPagination.vue'
import SettingsDialog from '../components/batch/SettingsDialog.vue'
import LockCard from '../components/batch/LockCard.vue'
import ResultsHeader from '../components/batch/ResultsHeader.vue'
import RetryDialog from '../components/batch/RetryDialog.vue'
import AutoLoadErrorDialog from '../components/batch/AutoLoadErrorDialog.vue'
import ExportDialog from '../components/batch/ExportDialog.vue'
import NotificationSnackbar from '../components/batch/NotificationSnackbar.vue'

// 导入 Composables
import { useFofaConnection } from '../composables/useFofaConnection'
import { useFofaSearch } from '../composables/useFofaSearch'
import { useFofaStats } from '../composables/useFofaStats'
import { useSearchHistory } from '../composables/useSearchHistory'
import { useBatchVerify } from '../composables/useBatchVerify'
import { useBatchSettings } from '../composables/useBatchSettings'
import { useAutoLoad } from '../composables/useAutoLoad'
import { useBatchExport } from '../composables/useBatchExport'

// 导入工具函数
import { getCountryInfoByName } from '../utils/countryMap'

const router = useRouter()

// 通知系统
const snackbar = ref({ show: false, text: '', color: 'info' })
const showSnackbar = (text, color = 'info') => {
  snackbar.value = { show: true, text, color }
}

// 辅助函数：构建完整的URL
const buildFullUrl = (host, protocol) => {
  if (host.startsWith('http://') || host.startsWith('https://')) {
    return host
  }

  const proto = protocol.toLowerCase()

  if (proto.includes('https')) {
    return `https://${host}`
  } else if (proto.includes('http')) {
    return `http://${host}`
  } else if (proto.includes('ftp')) {
    return `ftp://${host}`
  }

  return `http://${host}`
}

// 加载状态
const loadingStats = ref(false)

// 使用 Composables
const { fofaConnected, testingConnection, fofaEmail, userInfo, loadFofaEmail, testFofaConnection } =
  useFofaConnection()

const {
  settingsDialog,
  batchSettings,
  tempSettings,
  autoHijackEnabled,
  loadBatchSettings,
  saveBatchSettings,
  openSettingsDialog,
  cancelSettings,
  saveSettings
} = useBatchSettings()

const {
  searchQuery,
  searching,
  hasSearched,
  searchResults,
  totalResults,
  searchResultsCache,
  loadingPage,
  currentPage,
  itemsPerPage,
  pageInput,
  queryQueue,
  itemsPerPageOptions,
  paginatedResults,
  totalPages,
  loadedCount,
  buildQueryQueue,
  buildPageMapping,
  loadPageFromQueue,
  loadResultsMetadata,
  loadPageData,
  goToInputPage
} = useFofaSearch(batchSettings)

const {
  stats,
  selectedFilters,
  failedFields,
  loadQueue,
  currentLoadingField,
  queueCooldown,
  retryDialog,
  retryField,
  retryError,
  isAnyLoading,
  selectedAssetCount,
  loadFieldStats,
  loadAllFields,
  openRetryDialog,
  retryLoadField,
  toggleFilter,
  toggleFieldSelection,
  toggleAllSelections,
  cleanup: cleanupStats
} = useFofaStats(searchQuery, batchSettings)

const { searchHistory, loadSearchHistory, addToHistory, selectHistory, deleteHistory } =
  useSearchHistory()

const {
  batchVerifying,
  batchVerifyPaused,
  batchVerifyStats,
  resultsBodyRef: batchVerifyBodyRef,
  isChangingPage,
  toggleBatchVerify
} = useBatchVerify(batchSettings, searchResultsCache, currentPage, totalPages, autoHijackEnabled)

const {
  autoLoadStatus,
  autoLoadErrorDialog,
  autoLoadErrorPage,
  autoLoadErrorMessage,
  toggleAutoLoad,
  pauseAutoLoad,
  retryAutoLoadPage
} = useAutoLoad(searchResultsCache, totalPages, loadPageFromQueue)

const {
  exportDialog,
  exportScope,
  exportFormat,
  exportStats,
  openExportDialog,
  closeExportDialog,
  executeExport
} = useBatchExport(searchResultsCache)

// 刷新连接
const handleRefreshConnection = async () => {
  const result = await testFofaConnection()
  if (result.success) {
    showSnackbar(result.message, 'success')
  } else {
    showSnackbar(result.error, 'error')
  }
}

// 跳转到设置页面
const goToSettings = () => {
  router.push('/settings')
}

// 导出功能
const handleExport = () => {
  openExportDialog()
}

// 执行导出
const handleExecuteExport = async (options) => {
  await executeExport(options, showSnackbar)
}

// 打开设置对话框
const handleOpenSettings = () => {
  openSettingsDialog()
}

// 处理历史记录选择
const handleSelectHistory = (query) => {
  selectHistory(query, searchQuery)
}

// 处理分组点击事件
const handleGroupClick = (field, event) => {
  if (!stats.value[field] || stats.value[field].length === 0) {
    event.preventDefault()
    event.stopPropagation()
    if (!searchQuery.value || searchQuery.value.trim().length === 0) {
      showSnackbar('请先输入 FOFA 搜索语句', 'warning')
    } else {
      showSnackbar('请先点击右侧按钮加载数据', 'warning')
    }
  }
}

// 处理搜索
const handleSearch = async () => {
  if (!searchQuery.value) return

  await addToHistory(searchQuery.value)

  searching.value = true
  hasSearched.value = true
  currentPage.value = 1

  searchResultsCache.value = {}
  searchResults.value = []

  try {
    buildQueryQueue(selectedFilters.value, stats.value)

    let pageData = []

    if (selectedFilters.value.length === 0) {
      // 没有筛选条件时，直接获取第一页数据（同时获取总数）
      const result = await window.api.fofa.search(searchQuery.value, 1, itemsPerPage.value, false, [
        'host',
        'ip',
        'port',
        'protocol',
        'title',
        'domain',
        'country',
        'country_name',
        'region',
        'city',
        'os',
        'server'
      ])

      if (result.success) {
        const maxResults = batchSettings.value.maxFofaResults || 10000
        const totalCount = Math.min(result.data.size, maxResults)

        // 更新第一个查询的总数
        if (queryQueue.value.length > 0) {
          queryQueue.value[0].totalCount = totalCount
          totalResults.value = totalCount
          buildPageMapping()
        }

        // 直接处理第一页数据，避免重复请求
        if (result.data.results.length > 0) {
          pageData = result.data.results.map((item) => {
            const host = item[0] || ''
            const protocol = item[3] || 'http'
            const fullUrl = buildFullUrl(host, protocol)
            const countryCode = item[6] || ''
            const countryName = item[7] || ''
            const region = item[8] || ''
            const city = item[9] || ''

            return {
              host: host,
              fullUrl: fullUrl,
              ip: item[1] || '',
              port: item[2] || '',
              protocol: protocol,
              title: item[4] || '无标题',
              domain: item[5] || '',
              country: countryCode,
              countryName: countryName,
              region: region,
              city: city,
              countryInfo: getCountryInfoByName(countryName || countryCode),
              os: item[10] || '-',
              server: item[11] || '-',
              icon: null,
              iconError: false,
              checkingStatus: false,
              latency: undefined,
              accessible: undefined,
              pocStatus: 'pending'
            }
          })
        }
      } else {
        // 搜索失败，显示具体错误信息
        throw new Error(result.error || '未知错误')
      }
    } else {
      // 有筛选条件时，使用队列的总数
      totalResults.value = queryQueue.value.reduce((sum, q) => sum + q.totalCount, 0)
      // 重新构建页码映射
      buildPageMapping()

      // 从队列加载第一页数据
      pageData = await loadPageFromQueue(1)
    }

    if (pageData && pageData.length > 0) {
      searchResultsCache.value[1] = pageData
      searchResults.value = pageData

      const displaySize = totalResults.value > 10000 ? `${totalResults.value}+` : totalResults.value
      showSnackbar(`搜索成功，找到 ${displaySize} 条结果`, 'success')

      loadResultsMetadata()
    } else {
      showSnackbar('搜索失败: 未找到结果', 'error')
      searchResults.value = []
      totalResults.value = 0
    }
  } catch (error) {
    console.error('搜索失败:', error)
    // 直接显示 FOFA 返回的原始错误信息
    const errorMsg = error.message || '未知错误'
    showSnackbar('搜索失败: ' + errorMsg, 'error')
    searchResults.value = []
    totalResults.value = 0
  } finally {
    searching.value = false
  }
}

// 跳转到输入的页码
const handleGoToPage = () => {
  const success = goToInputPage()
  if (!success) {
    showSnackbar('请输入有效的页码', 'warning')
  }
}

// 每页数量变化时的处理
const onItemsPerPageChange = async () => {
  const presetSizes = [20, 50, 100, 200]
  if (presetSizes.includes(itemsPerPage.value)) {
    batchSettings.value.pageSize = itemsPerPage.value
  } else {
    batchSettings.value.pageSize = 0
    batchSettings.value.customPageSize = itemsPerPage.value
  }

  searchResultsCache.value = {}
  currentPage.value = 1
  pageInput.value = 1

  if (hasSearched.value && searchQuery.value) {
    await loadPageData(1)
  }

  await saveBatchSettings()
}

// 保存设置
const handleSaveSettings = async (updatedSettings) => {
  // 更新 tempSettings
  if (updatedSettings) {
    tempSettings.value = { ...updatedSettings }
  }

  await saveSettings(
    itemsPerPage,
    hasSearched,
    buildPageMapping,
    currentPage,
    searchResultsCache,
    loadPageData,
    showSnackbar
  )
}

// 处理前往设置
const handleGoToSettings = () => {
  settingsDialog.value = false
  router.push('/settings')
}

// 监听搜索框变化，清空统计数据
watch(searchQuery, async () => {
  selectedFilters.value = []
  await nextTick()
  Object.keys(stats.value).forEach((key) => {
    stats.value[key] = []
  })
})

// 结果表格的 ref
const resultsTableRef = ref(null)

// 监听页码变化
watch(
  currentPage,
  async (newPage, oldPage) => {
    if (oldPage === undefined) return

    // 如果正在批量验证且不是自动切换，阻止手动切换页面
    if (batchVerifying.value && !isChangingPage.value) {
      // 恢复到旧页码，阻止手动切换
      currentPage.value = oldPage
      pageInput.value = oldPage
      return
    }

    pageInput.value = newPage

    // 滚动到顶部
    if (resultsTableRef.value?.resultsBodyRef) {
      resultsTableRef.value.resultsBodyRef.scrollTop = 0
    }

    if (searchResultsCache.value[newPage]) {
      searchResults.value = searchResultsCache.value[newPage]
      await loadResultsMetadata()
    } else if (hasSearched.value && searchQuery.value) {
      await loadPageData(newPage)
    }
  },
  { flush: 'post' }
)

// 同步 resultsBodyRef 给批量验证
watch(
  resultsTableRef,
  (newRef) => {
    if (newRef?.resultsBodyRef) {
      batchVerifyBodyRef.value = newRef.resultsBodyRef
    }
  },
  { immediate: true, flush: 'post' }
)

// 组件挂载
onMounted(async () => {
  // FOFA 连接状态已经在 App.vue 中测试过了，这里只需要加载邮箱显示
  loadFofaEmail()

  const pageSize = await loadBatchSettings()
  itemsPerPage.value = pageSize

  loadSearchHistory()

  // 确保 resultsBodyRef 同步
  await nextTick()
  if (resultsTableRef.value?.resultsBodyRef) {
    batchVerifyBodyRef.value = resultsTableRef.value.resultsBodyRef
  }
})

// 组件卸载
onUnmounted(() => {
  cleanupStats()
})
</script>

<style scoped>
.batch-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 20px;
  overflow: hidden;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.view-header h2 {
  margin: 0;
  color: rgba(0, 0, 0, 0.87);
  font-size: 24px;
  font-weight: 500;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.view-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.main-card {
  display: flex;
  flex-direction: column;
}

.content-wrapper {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.results-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@media (max-width: 960px) {
  .content-wrapper {
    flex-direction: column;
  }
}
</style>
