<template>
  <!-- 浮动按钮 -->
  <div
    v-if="!expanded"
    ref="fabButton"
    class="log-fab"
    :style="{ left: `${position.x}px`, top: `${position.y}px` }"
    @mousedown="startDrag"
    @touchstart="startDrag"
    @click="handleClick"
  >
    <div class="log-fab-inner">
      <v-icon color="white" size="20">mdi-console</v-icon>
      <v-badge
        v-if="unreadCount > 0"
        :content="unreadCount > 99 ? '99+' : unreadCount"
        color="error"
        floating
        offset-x="-2"
        offset-y="-2"
      />
    </div>
  </div>

  <!-- 日志查看器窗口 -->
  <v-dialog v-model="expanded" max-width="900" scrollable>
    <v-card rounded="lg" elevation="16">
      <!-- 标题栏 -->
      <v-toolbar color="primary" density="compact">
        <v-icon class="ml-2">mdi-console</v-icon>
        <v-toolbar-title class="text-subtitle-1">
          {{ $t('settings.developer.logViewer.title') }}
        </v-toolbar-title>
        <v-spacer />
        <v-btn icon="mdi-window-minimize" size="small" @click="minimized = !minimized" />
        <v-btn icon="mdi-close" size="small" @click="expanded = false" />
      </v-toolbar>

      <!-- 工具栏 -->
      <v-card-text v-if="!minimized" class="pa-3 bg-surface-light">
        <v-row dense align="center">
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="searchText"
              density="compact"
              variant="solo"
              flat
              bg-color="surface"
              :placeholder="$t('settings.developer.logViewer.search')"
              prepend-inner-icon="mdi-magnify"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="6" sm="3">
            <v-select
              v-model="selectedLevel"
              density="compact"
              variant="solo"
              flat
              bg-color="surface"
              :items="levelOptions"
              :placeholder="$t('settings.developer.logViewer.level')"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="6" sm="3" class="d-flex justify-end">
            <v-btn icon="mdi-delete-sweep" variant="text" @click="handleClear" />
            <v-btn icon="mdi-download" variant="text" @click="handleExport" />
            <v-btn
              :icon="autoScroll ? 'mdi-arrow-down-bold' : 'mdi-arrow-down-bold-outline'"
              :color="autoScroll ? 'primary' : undefined"
              variant="text"
              @click="autoScroll = !autoScroll"
            />
          </v-col>
        </v-row>
      </v-card-text>

      <!-- 日志列表 -->
      <v-card-text v-if="!minimized" class="pa-0">
        <v-virtual-scroll
          ref="scrollContainer"
          :items="filteredLogs"
          :height="450"
          class="log-scroll"
        >
          <template #default="{ item }">
            <div
              :class="['log-item', `log-${item.level.toLowerCase()}`]"
              @click="selectedLog = selectedLog === item ? null : item"
            >
              <div class="log-header">
                <v-chip
                  :color="getLevelColor(item.level)"
                  size="x-small"
                  label
                  class="font-weight-bold"
                >
                  {{ item.level }}
                </v-chip>
                <span class="log-time">{{ formatTime(item.timestamp) }}</span>
                <span class="log-module">{{ item.module }}</span>
              </div>
              <div class="log-message">
                <span v-for="(arg, index) in item.args" :key="index">
                  {{ formatArg(arg) }}
                </span>
              </div>
              <v-expand-transition>
                <div v-if="selectedLog === item" class="log-details">
                  <pre>{{ JSON.stringify(item, null, 2) }}</pre>
                </div>
              </v-expand-transition>
            </div>
          </template>
        </v-virtual-scroll>
      </v-card-text>

      <!-- 底部状态栏 -->
      <v-divider v-if="!minimized" />
      <v-card-actions v-if="!minimized" class="px-4 py-2">
        <span class="text-caption text-medium-emphasis">
          {{ filteredLogs.length }} / {{ logs.length }} logs
        </span>
        <v-spacer />
        <v-chip v-if="selectedLevel" size="x-small" closable @click:close="selectedLevel = null">
          {{ selectedLevel }}
        </v-chip>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { getLogs, clearLogs, addLogListener, removeLogListener } from '../utils/logger'

const { t } = useI18n()

const expanded = ref(false)
const minimized = ref(false)
const logs = ref([])
const searchText = ref('')
const selectedLevel = ref(null)
const selectedLog = ref(null)
const autoScroll = ref(true)
const unreadCount = ref(0)
const scrollContainer = ref(null)
const fabButton = ref(null)

// 拖动相关状态
const position = ref({ x: window.innerWidth - 70, y: window.innerHeight - 70 })
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })

const levelOptions = [
  { title: 'DEBUG', value: 'DEBUG' },
  { title: 'INFO', value: 'INFO' },
  { title: 'SUCCESS', value: 'SUCCESS' },
  { title: 'WARN', value: 'WARN' },
  { title: 'ERROR', value: 'ERROR' }
]

const filteredLogs = computed(() => {
  let result = logs.value

  if (selectedLevel.value) {
    result = result.filter((log) => log.level === selectedLevel.value)
  }

  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    result = result.filter((log) => {
      const content = JSON.stringify(log).toLowerCase()
      return content.includes(search)
    })
  }

  return result
})

function getLevelColor(level) {
  const colors = {
    DEBUG: 'grey',
    INFO: 'blue',
    SUCCESS: 'green',
    WARN: 'orange',
    ERROR: 'red'
  }
  return colors[level] || 'grey'
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function formatArg(arg) {
  if (arg === null) return 'null'
  if (arg === undefined) return 'undefined'
  if (typeof arg === 'object') {
    if (arg.type === 'error') return `Error: ${arg.message}`
    return JSON.stringify(arg)
  }
  return String(arg)
}

function handleClear() {
  clearLogs()
  logs.value = []
  unreadCount.value = 0
}

function handleExport() {
  const content = JSON.stringify(logs.value, null, 2)
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `logs-${new Date().toISOString()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// 拖动功能
function startDrag(e) {
  isDragging.value = false
  const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX
  const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY

  dragStart.value = {
    x: clientX - position.value.x,
    y: clientY - position.value.y
  }

  const onMove = (moveEvent) => {
    isDragging.value = true
    const moveX = moveEvent.type === 'touchmove' ? moveEvent.touches[0].clientX : moveEvent.clientX
    const moveY = moveEvent.type === 'touchmove' ? moveEvent.touches[0].clientY : moveEvent.clientY

    let newX = moveX - dragStart.value.x
    let newY = moveY - dragStart.value.y

    // 限制在窗口范围内
    const maxX = window.innerWidth - 50
    const maxY = window.innerHeight - 50
    newX = Math.max(0, Math.min(newX, maxX))
    newY = Math.max(0, Math.min(newY, maxY))

    position.value = { x: newX, y: newY }
  }

  const onEnd = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onEnd)
    document.removeEventListener('touchmove', onMove)
    document.removeEventListener('touchend', onEnd)

    // 延迟重置拖动状态，避免触发点击
    setTimeout(() => {
      isDragging.value = false
    }, 100)
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onEnd)
  document.addEventListener('touchmove', onMove)
  document.addEventListener('touchend', onEnd)
}

function handleClick() {
  if (!isDragging.value) {
    expanded.value = true
  }
}

function onLogsUpdate(newLogs) {
  logs.value = [...newLogs]
  if (!expanded.value) {
    unreadCount.value++
  }
  if (autoScroll.value && expanded.value) {
    nextTick(() => {
      if (scrollContainer.value?.$el) {
        const el = scrollContainer.value.$el.querySelector('.v-virtual-scroll__container')
        if (el) {
          el.scrollTop = el.scrollHeight
        }
      }
    })
  }
}

watch(expanded, (val) => {
  if (val) {
    unreadCount.value = 0
  }
})

onMounted(() => {
  logs.value = getLogs()
  addLogListener(onLogsUpdate)

  // 监听窗口大小变化，调整按钮位置
  const handleResize = () => {
    const maxX = window.innerWidth - 70
    const maxY = window.innerHeight - 70
    if (position.value.x > maxX) position.value.x = maxX
    if (position.value.y > maxY) position.value.y = maxY
  }
  window.addEventListener('resize', handleResize)

  onUnmounted(() => {
    removeLogListener(onLogsUpdate)
    window.removeEventListener('resize', handleResize)
  })
})
</script>

<style scoped>
.log-fab {
  position: fixed;
  width: 44px;
  height: 44px;
  z-index: 10000;
  cursor: move;
  user-select: none;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.log-fab:active {
  transform: scale(0.95);
}

.log-fab-inner {
  width: 100%;
  height: 100%;
  background: rgba(128, 128, 128, 0.75);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.log-fab:hover .log-fab-inner {
  background: rgba(128, 128, 128, 0.85);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  transform: scale(1.05);
}

.bg-surface-light {
  background-color: rgba(var(--v-theme-surface-variant), 0.5);
}

.log-scroll {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  background-color: rgb(var(--v-theme-surface));
}

.log-item {
  padding: 10px 16px;
  border-left: 3px solid transparent;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  cursor: pointer;
  transition: all 0.15s ease;
}

.log-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.log-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.log-time {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-weight: 600;
  font-family: 'Consolas', 'Monaco', monospace;
}

.log-module {
  font-size: 12px;
  color: rgb(var(--v-theme-primary));
  font-weight: 700;
}

.log-message {
  color: rgba(var(--v-theme-on-surface), 0.95);
  line-height: 1.6;
  word-break: break-word;
  font-weight: 500;
}

.log-details {
  margin-top: 8px;
  padding: 12px;
  background-color: rgba(0, 0, 0, 0.6);
  border-radius: 6px;
  overflow-x: auto;
  border: 1px solid rgba(var(--v-theme-primary), 0.3);
}

.log-details pre {
  margin: 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
}

.log-debug {
  border-left-color: rgb(var(--v-theme-grey));
}

.log-info {
  border-left-color: rgb(var(--v-theme-info));
}

.log-success {
  border-left-color: rgb(var(--v-theme-success));
}

.log-warn {
  border-left-color: rgb(var(--v-theme-warning));
}

.log-error {
  border-left-color: rgb(var(--v-theme-error));
}
</style>
