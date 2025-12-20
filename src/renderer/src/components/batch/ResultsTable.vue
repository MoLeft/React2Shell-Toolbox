<template>
  <div class="results-container">
    <div ref="resultsBodyRef" class="results-body" :class="{ loading: loadingPage }">
      <!-- 加载遮罩 -->
      <div v-if="loadingPage" class="results-loading-overlay">
        <v-progress-circular indeterminate color="primary" size="48" />
        <div class="loading-text">{{ $t('batch.table.loadingPage') }}</div>
      </div>

      <div v-if="!hasSearched" class="empty-state">
        <v-icon size="64" color="grey-lighten-1">mdi-magnify</v-icon>
        <div class="empty-title">{{ $t('batch.table.enterSearch') }}</div>
        <div class="empty-desc">
          {{ $t('batch.table.searchHint') }}
        </div>
      </div>

      <div v-else-if="searching" class="loading-state">
        <v-progress-circular indeterminate color="primary" size="48" />
        <div class="loading-text">{{ $t('batch.table.searching') }}</div>
      </div>

      <div v-else-if="hasSearched && results.length === 0 && !loadingPage" class="empty-state">
        <v-icon size="64" color="grey-lighten-1">mdi-database-off</v-icon>
        <div class="empty-title">{{ $t('batch.table.noResults') }}</div>
        <div class="empty-desc">{{ $t('batch.table.tryModifySearch') }}</div>
      </div>

      <div v-else-if="hasSearched" class="table-wrapper">
        <div class="table-scroll-container">
          <v-data-table
            :headers="tableHeaders"
            :items="results"
            class="results-table"
            density="comfortable"
            hide-default-footer
            :items-per-page="-1"
          >
          <!-- 网站信息列 -->
          <template #[`item.site`]="{ item }">
            <div class="site-cell">
              <v-avatar size="32" class="site-avatar">
                <v-img
                  v-if="item.icon && !item.iconError"
                  :src="item.icon"
                  @error="item.iconError = true"
                />
                <v-icon v-else size="16">mdi-web</v-icon>
              </v-avatar>
              <div class="site-info">
                <div class="site-title-row">
                  <span class="site-title" :title="item.title">{{ item.title }}</span>
                  <span
                    v-if="item.latency !== undefined"
                    :class="['latency-badge', getLatencyClass(item.latency, item.accessible)]"
                  >
                    <template v-if="item.accessible">{{ item.latency }}ms</template>
                    <template v-else>
                      <v-icon size="14">mdi-alert-remove</v-icon>
                      <span>-1ms</span>
                    </template>
                  </span>
                  <span v-else-if="item.checkingStatus" class="latency-badge latency-checking">
                    ...
                  </span>
                </div>
                <a :href="item.fullUrl" target="_blank" class="site-url" :title="item.fullUrl">
                  {{ item.fullUrl }}
                </a>
              </div>
            </div>
          </template>

          <!-- 地理位置列 -->
          <template #[`item.location`]="{ item }">
            <div class="location-cell-stacked">
              <div v-if="item.countryInfo" class="location-row">
                <img
                  v-if="item.countryInfo.flagUrl"
                  :src="item.countryInfo.flagUrl"
                  :alt="item.countryInfo.name"
                  class="country-flag-inline"
                  @error="(e) => (e.target.style.display = 'none')"
                />
                <span v-else class="country-flag-emoji-inline">{{ item.countryInfo.flag }}</span>
                <span class="country-name">{{ item.countryInfo.name || item.country || '-' }}</span>
              </div>
              <div v-if="item.region || item.city" class="location-detail">
                {{ [item.region, item.city].filter(Boolean).join(' / ') }}
              </div>
              <span v-if="!item.countryInfo && !item.region && !item.city" class="text-grey"
                >-</span
              >
            </div>
          </template>

          <!-- 系统/服务列 -->
          <template #[`item.osServer`]="{ item }">
            <div class="os-server-cell">
              <div class="os-line" :class="item.os === '-' ? 'text-grey' : ''">{{ item.os }}</div>
              <div class="server-line" :class="item.server === '-' ? 'text-grey' : ''">
                {{ item.server }}
              </div>
            </div>
          </template>

          <!-- 漏洞检测列 -->
          <template #[`item.poc`]="{ item }">
            <v-chip
              v-if="item.pocStatus === 'pending'"
              size="small"
              color="grey"
              variant="outlined"
            >
              <v-icon start size="14">mdi-clock-outline</v-icon>
              {{ $t('batch.status.pending') }}
            </v-chip>
            <v-chip
              v-else-if="item.pocStatus === 'checking'"
              size="small"
              color="info"
              variant="flat"
            >
              <v-progress-circular indeterminate size="12" width="2" class="mr-1" />
              {{ $t('batch.status.checking') }}
            </v-chip>
            <v-chip
              v-else-if="item.pocStatus === 'vulnerable'"
              size="small"
              color="error"
              variant="flat"
            >
              <v-icon start size="14">mdi-alert-circle</v-icon>
              {{ $t('batch.status.vulnerable') }}
            </v-chip>
            <v-chip
              v-else-if="batchHijackEnabled && item.pocStatus === 'hijacking'"
              size="small"
              color="purple"
              variant="flat"
            >
              <v-progress-circular indeterminate size="12" width="2" class="mr-1" />
              {{ $t('poc.hijack.inject') }}
            </v-chip>
            <v-chip
              v-else-if="batchHijackEnabled && item.pocStatus === 'hijacked'"
              size="small"
              color="grey-darken-2"
              variant="flat"
            >
              <v-icon start size="14">mdi-skull</v-icon>
              {{ $t('batch.exportDialog.scopeHijacked') }}
            </v-chip>
            <v-chip
              v-else-if="batchHijackEnabled && item.pocStatus === 'hijack-failed'"
              size="small"
              color="deep-orange"
              variant="flat"
            >
              <v-icon start size="14">mdi-skull-crossbones</v-icon>
              {{ $t('batch.exportDialog.scopeHijackFailed') }}
            </v-chip>
            <v-chip
              v-else-if="item.pocStatus === 'safe'"
              size="small"
              color="success"
              variant="flat"
            >
              <v-icon start size="14">mdi-shield-check</v-icon>
              {{ $t('batch.status.notVulnerable') }}
            </v-chip>
            <v-chip v-else size="small" color="warning" variant="outlined">
              <v-icon start size="14">mdi-alert</v-icon>
              {{ $t('batch.status.error') }}
            </v-chip>
          </template>
        </v-data-table>
        </div>
      </div>
    </div>

    <!-- 分页固定在底部 -->
    <div v-if="hasSearched && results.length > 0" class="pagination-footer">
      <slot name="pagination"></slot>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps({
  results: { type: Array, default: () => [] },
  hasSearched: { type: Boolean, default: false },
  searching: { type: Boolean, default: false },
  loadingPage: { type: Boolean, default: false },
  batchHijackEnabled: { type: Boolean, default: false }
})

const resultsBodyRef = ref(null)

defineExpose({
  resultsBodyRef
})

const tableHeaders = computed(() => [
  { title: t('batch.table.siteInfo'), key: 'site', sortable: false, align: 'center' },
  { title: t('batch.table.location'), key: 'location', sortable: false, align: 'center' },
  { title: t('batch.table.osServer'), key: 'osServer', sortable: false, align: 'center' },
  { title: t('batch.table.pocDetection'), key: 'poc', sortable: false, align: 'center' }
])

const getLatencyClass = (latency, accessible) => {
  if (!accessible) return 'latency-unreachable'
  if (latency < 200) return 'latency-fast'
  if (latency < 500) return 'latency-medium'
  if (latency < 1000) return 'latency-slow'
  return 'latency-very-slow'
}
</script>

<style scoped>
.results-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: visible; /* 改为 visible */
  min-height: 0;
}

.results-body {
  flex: 1;
  position: relative;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: visible; /* 改为 visible */
}

.results-body.loading {
  overflow: hidden;
}

.pagination-footer {
  flex-shrink: 0;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  background: white;
}

.results-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(3px);
  pointer-events: all;
}

.results-loading-overlay .loading-text {
  margin-top: 16px;
  font-size: 16px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.87);
}

.table-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.table-scroll-container {
  flex: 1;
  overflow-y: scroll !important; /* 强制显示垂直滚动条 */
  overflow-x: auto;
  min-height: 0;
  position: relative;
}

.results-table {
  height: auto;
}

.results-table :deep(thead) {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #f5f5f5;
}

.results-table :deep(thead::after) {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 8px; /* 滚动条宽度 */
  height: 100%;
  background: #f5f5f5; /* 与表头背景色一致 */
  z-index: 11;
}

.results-table :deep(.v-table__wrapper) {
  overflow: visible !important; /* 让 sticky 表头生效 */
}

.results-table :deep(table) {
  table-layout: fixed;
  width: 100%;
}

.results-table :deep(th) {
  font-weight: 600 !important;
  background-color: #f5f5f5 !important; /* 不透明的浅灰色背景 */
  white-space: nowrap;
  height: 48px !important; /* 固定高度，与筛选标题一致 */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08) !important; /* 添加阴影增强悬浮效果 */
}

.results-table :deep(td) {
  padding: 12px 16px !important;
  vertical-align: middle;
}

.results-table :deep(td:first-child) {
  text-align: left !important;
}

.site-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-start;
}

.site-avatar {
  border: 1px solid rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}

.site-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.site-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
}

.site-title {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.87);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.latency-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 600;
  border-radius: 3px;
  white-space: nowrap;
  flex-shrink: 0;
}

.latency-fast {
  background-color: #4caf50;
  color: white;
}

.latency-medium {
  background-color: #ff9800;
  color: white;
}

.latency-slow {
  background-color: #ff5722;
  color: white;
}

.latency-very-slow {
  background-color: #c62828;
  color: white;
}

.latency-unreachable {
  background-color: #000000;
  color: white;
}

.latency-checking {
  background-color: #9e9e9e;
  color: white;
}

.site-url {
  font-size: 12px;
  color: #1976d2;
  text-decoration: none;
  transition: color 0.2s;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.site-url:hover {
  color: #1565c0;
  text-decoration: underline;
}

.location-cell-stacked {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
  text-align: center;
}

.location-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.country-flag-inline {
  width: 20px;
  height: 15px;
  object-fit: cover;
  border-radius: 2px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
}

.country-flag-emoji-inline {
  font-size: 16px;
  flex-shrink: 0;
}

.country-name {
  font-size: 12px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.87);
  white-space: nowrap;
}

.location-detail {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.6);
  line-height: 1.2;
  white-space: nowrap;
}

.os-server-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
  text-align: center;
}

.os-line {
  font-size: 12px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.87);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.server-line {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.text-grey {
  color: rgba(0, 0, 0, 0.38);
}

.empty-state,
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  min-height: 400px;
}

.empty-title,
.loading-text {
  font-size: 16px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.87);
  margin-top: 16px;
}

.empty-desc {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.6);
  margin-top: 8px;
}

/* 检测中的行高亮样式 - 淡蓝色条 */
.results-table :deep(tr.checking-row) {
  background-color: rgba(33, 150, 243, 0.12) !important;
  position: relative;
}

.results-table :deep(tr.checking-row::before) {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background-color: #2196f3;
}

.results-table :deep(tr.checking-row:hover) {
  background-color: rgba(33, 150, 243, 0.18) !important;
}
</style>
