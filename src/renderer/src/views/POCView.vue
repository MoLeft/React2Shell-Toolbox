<template>
  <v-container fluid class="poc-view">
    <div class="view-header">
      <h2>POC验证</h2>
    </div>

    <v-row class="view-content" align="stretch">
      <!-- 左侧输入区域 -->
      <v-col cols="12" md="4" class="panel-column left-panel">
        <div class="left-top">
          <poc-input-form
            :url="form.url"
            :command="form.command"
            :is-running="isRunning"
            @update:url="updateUrl"
            @update:command="updateCommand"
            @execute="handleExecute"
            @abort="handleAbort"
          />
        </div>
        <div class="left-bottom">
          <poc-history-list
            :history="vulnHistory"
            :loading="historyLoading"
            :favicon-cache="faviconCache"
            :favicon-loading="faviconLoading"
            @select="handleHistorySelect"
            @remove="(url) => removeVulnHistory(url, showSnackbar)"
            @clear="() => clearVulnHistory(showSnackbar)"
            @open-browser="openInBrowser"
          />
        </div>
      </v-col>

      <!-- 右侧结果区域 -->
      <v-col cols="12" md="8" class="panel-column right-panel">
        <!-- 状态码和检测结果 -->
        <div class="right-top">
          <poc-status-cards
            :is-running="isRunning"
            :status-card-color="statusCardColor"
            :status-icon="statusIcon"
            :status-icon-color="statusIconColor"
            :status-text="statusText"
            :result-card-color="isVulnerable ? 'error-lighten-5' : resultCardColor"
            :result-icon="isVulnerable ? 'mdi-alert-circle' : resultIcon"
            :result-icon-color="isVulnerable ? 'error' : resultIconColor"
            :result-text="isVulnerable ? '存在漏洞 (Vulnerable)' : resultText"
          />
        </div>

        <!-- Tab 切换 -->
        <div class="right-bottom">
          <v-card class="result-tabs" elevation="2">
            <div class="tabs-header">
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

              <!-- 视图切换按钮（仅在完整响应标签页且有响应内容时显示） -->
              <div v-if="activeTab === 'response' && responseText" class="view-toggle-buttons">
                <v-btn-toggle
                  v-model="responseViewMode"
                  mandatory
                  density="compact"
                  variant="outlined"
                  divided
                >
                  <v-tooltip text="源码视图" location="bottom">
                    <template #activator="{ props }">
                      <v-btn value="source" size="small" v-bind="props">
                        <v-icon size="18">mdi-code-tags</v-icon>
                      </v-btn>
                    </template>
                  </v-tooltip>
                  <v-tooltip text="网页视图" location="bottom">
                    <template #activator="{ props }">
                      <v-btn value="preview" size="small" v-bind="props">
                        <v-icon size="18">mdi-web</v-icon>
                      </v-btn>
                    </template>
                  </v-tooltip>
                </v-btn-toggle>
              </div>
            </div>

            <div class="tab-body">
              <v-window v-model="activeTab" class="tab-window">
                <!-- 完整响应 -->
                <v-window-item value="response" class="tab-pane">
                  <div class="tab-pane-text pane-surface">
                    <div v-if="!responseText" class="empty-state">
                      <v-icon size="64" color="grey">mdi-file-document-outline</v-icon>
                      <p>暂无响应内容</p>
                    </div>
                    <v-card v-else variant="flat" class="response-card">
                      <v-card-text class="pane-card-text">
                        <div v-if="responseViewMode === 'source'" class="source-view-container">
                          <div class="pre-scroll">
                            <pre class="response-text hljs" v-html="highlightedResponse"></pre>
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
                </v-window-item>

                <!-- 命令回显 -->
                <v-window-item value="output" class="tab-pane">
                  <div class="tab-pane-text pane-surface">
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
                  </div>
                </v-window-item>

                <!-- 虚拟终端 -->
                <v-window-item value="terminal" class="tab-pane">
                  <div class="tab-pane-text pane-surface">
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
                  </div>
                </v-window-item>

                <!-- 一键挂黑 -->
                <v-window-item v-if="pocHijackEnabled" value="hijack" class="tab-pane">
                  <div class="tab-pane-text pane-surface">
                    <div v-if="!hasExecuted" class="empty-state">
                      <v-icon size="64" color="grey">mdi-skull-crossbones-outline</v-icon>
                      <p>等待执行POC后显示一键挂黑功能</p>
                    </div>
                    <div v-else-if="!isVulnerable" class="empty-state">
                      <v-icon size="64" color="grey">mdi-shield-check</v-icon>
                      <p>未检测到漏洞，无法使用一键挂黑功能</p>
                    </div>
                    <div v-else class="hijack-editor-container">
                      <div class="hijack-toolbar">
                        <!-- 左侧：视图切换 -->
                        <div class="toolbar-left">
                          <v-btn-toggle
                            v-model="hijackViewMode"
                            mandatory
                            density="compact"
                            variant="outlined"
                            divided
                          >
                            <v-tooltip text="源码视图" location="bottom">
                              <template #activator="{ props }">
                                <v-btn value="source" size="small" v-bind="props">
                                  <v-icon size="18">mdi-code-tags</v-icon>
                                </v-btn>
                              </template>
                            </v-tooltip>
                            <v-tooltip text="预览视图" location="bottom">
                              <template #activator="{ props }">
                                <v-btn value="preview" size="small" v-bind="props">
                                  <v-icon size="18">mdi-web</v-icon>
                                </v-btn>
                              </template>
                            </v-tooltip>
                          </v-btn-toggle>
                        </div>

                        <!-- 右侧：操作按钮 -->
                        <div class="toolbar-right">
                          <v-tooltip text="注入临时路由并在浏览器中测试" location="bottom">
                            <template #activator="{ props }">
                              <v-btn
                                color="success"
                                size="small"
                                variant="tonal"
                                :disabled="!form.url || !isVulnerable"
                                v-bind="props"
                                @click="() => testHijack(form.url, isVulnerable, showSnackbar)"
                              >
                                <v-icon start size="18">mdi-open-in-new</v-icon>
                                测试
                              </v-btn>
                            </template>
                          </v-tooltip>
                          <v-tooltip text="注入挂黑代码" location="bottom">
                            <template #activator="{ props }">
                              <v-btn
                                color="error"
                                size="small"
                                :loading="isHijacking"
                                :disabled="!isVulnerable"
                                v-bind="props"
                                @click="
                                  () => showInjectDialog(form.url, isVulnerable, showSnackbar)
                                "
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
                                @click="
                                  () => showRestoreDialog(form.url, isVulnerable, showSnackbar)
                                "
                              >
                                <v-icon start size="18">mdi-restore</v-icon>
                                恢复
                              </v-btn>
                            </template>
                          </v-tooltip>
                        </div>
                      </div>

                      <!-- 源码编辑器 -->
                      <div
                        v-show="hijackViewMode === 'source'"
                        ref="hijackEditorContainer"
                        class="hijack-monaco-editor"
                      ></div>

                      <!-- 预览视图 -->
                      <div v-show="hijackViewMode === 'preview'" class="hijack-preview-container">
                        <iframe
                          :srcdoc="hijackHtmlContent"
                          class="hijack-preview-iframe-inline"
                          sandbox="allow-scripts"
                        ></iframe>
                      </div>
                    </div>
                  </div>
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
          <v-btn
            color="error"
            :loading="isHijacking"
            @click="() => confirmInjectHijack(form.url, showSnackbar)"
          >
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
          <v-btn
            color="warning"
            :loading="isRestoring"
            @click="() => confirmRestoreHijack(form.url, showSnackbar)"
          >
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
import 'highlight.js/styles/github.css'
import 'xterm/css/xterm.css'

// 导入组件
import PocInputForm from '../components/poc/PocInputForm.vue'
import PocHistoryList from '../components/poc/PocHistoryList.vue'
import PocStatusCards from '../components/poc/PocStatusCards.vue'

// 导入 Composables
import { usePocExecution } from '../composables/usePocExecution'
import { usePocHistory } from '../composables/usePocHistory'
import { usePocTerminal } from '../composables/usePocTerminal'
import { usePocHijack } from '../composables/usePocHijack'
import { usePocResponse } from '../composables/usePocResponse'
import { usePocSettings } from '../composables/usePocSettings'

// 注入全局状态
const isVulnerable = inject('isVulnerable')
const currentUrl = inject('currentUrl')

// 使用 Composables
const {
  form,
  isRunning,
  hasExecuted,
  outputText,
  responseText,
  targetPlatform,
  statusCardColor,
  resultCardColor,
  statusIcon,
  statusIconColor,
  resultIcon,
  resultIconColor,
  statusText,
  resultText,
  outputTextClass,
  executePOC,
  abortExecution
} = usePocExecution()

const {
  vulnHistory,
  historyLoading,
  faviconCache,
  faviconLoading,
  loadVulnHistory,
  addVulnHistory,
  removeVulnHistory,
  clearVulnHistory
} = usePocHistory()

const { xtermContainer, initTerminal, cleanup: cleanupTerminal } = usePocTerminal()

const {
  hijackRouteMode,
  hijackTargetRoute,
  isHijacking,
  isRestoring,
  hijackEditorContainer,
  showHijackInjectDialog,
  showHijackPreviewDialog,
  showHijackRestoreDialog,
  hijackHtmlContent,
  showInjectDialog,
  confirmInjectHijack,
  testHijack,
  showRestoreDialog,
  confirmRestoreHijack,
  initHijackEditor,
  cleanup: cleanupHijack
} = usePocHijack()

const { responseViewMode, getHighlightedResponse } = usePocResponse()

const { pocHijackEnabled, loadSettings } = usePocSettings()

// 本地状态
const activeTab = ref('response')
const hijackViewMode = ref('source') // 挂黑编辑器视图模式：source 或 preview
const snackbar = ref({ show: false, text: '', color: 'info' })

// 高亮的响应内容
const highlightedResponse = computed(() => getHighlightedResponse(responseText.value))

// 显示提示
const showSnackbar = (text, color = 'info') => {
  snackbar.value = { show: true, text, color }
}

// 更新表单字段
const updateUrl = (val) => {
  form.value.url = val
}

const updateCommand = (val) => {
  form.value.command = val
}

// 处理执行
const handleExecute = async () => {
  const result = await executePOC(isVulnerable, currentUrl, addVulnHistory, showSnackbar)

  if (result.success && result.vulnerable) {
    activeTab.value = 'output'
  } else if (result.success) {
    activeTab.value = 'response'
  }
}

// 处理终止
const handleAbort = () => {
  abortExecution()
  showSnackbar('已终止检测', 'info')
}

// 处理历史记录选择
const handleHistorySelect = (url) => {
  form.value.url = url
  currentUrl.value = url
  showSnackbar('已填充历史URL', 'info')
}

// 在浏览器中打开
const openInBrowser = (url) => {
  if (!url) return
  if (window.api?.openExternal) {
    window.api.openExternal(url)
  } else {
    window.open(url, '_blank')
  }
}

// 监听 activeTab 变化，初始化终端
watch(activeTab, async (newTab) => {
  if (newTab === 'terminal' && isVulnerable.value && targetPlatform.value !== 'win32') {
    await nextTick()
    await initTerminal(currentUrl.value, targetPlatform.value)
  }

  if (newTab === 'hijack' && pocHijackEnabled.value && isVulnerable.value) {
    await nextTick()
    await initHijackEditor()
  }
})

// 组件挂载
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

// 组件卸载
onBeforeUnmount(() => {
  cleanupTerminal()
  cleanupHijack()
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

.left-bottom {
  flex: 1;
  min-height: 0;
  display: flex;
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

.tabs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.tabs-bar {
  flex: 1;
  flex-shrink: 0;
}

.view-toggle-buttons {
  padding: 0 16px;
  display: flex;
  align-items: center;
}

.tab-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tab-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.tab-window :deep(.v-window__container) {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100% !important;
  width: 100%;
}

.tab-window :deep(.v-window-item) {
  flex: 1;
  display: flex !important;
  flex-direction: column;
  width: 100%;
  height: 100% !important;
}

.tab-window :deep(.v-window-item:not(.v-window-item--active)) {
  display: none !important;
}

.tab-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.tab-pane :deep(.v-card-text) {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 0 !important;
}

.tab-pane-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 0 !important;
}

.pane-surface {
  background: #fafafa;
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  width: 100%;
}

.empty-state p {
  margin-top: 16px;
  font-size: 15px;
  color: rgba(0, 0, 0, 0.6);
}

.response-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.response-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent !important;
}

.response-card :deep(.v-card-text) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 !important;
}

.pane-card-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 !important;
}

.source-view-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.pre-scroll {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.response-text {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.preview-scroll {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.response-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.output-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow: hidden;
  background: transparent !important;
}

.output-card :deep(.v-card-text) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 !important;
}

.output-text {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.text-success {
  color: #4caf50;
}

.text-error {
  color: #f44336;
}

.terminal-content {
  flex: 1;
  display: flex;
  width: 100%;
  overflow: hidden;
  /* padding: 16px; */
}

.xterm-container {
  flex: 1;
  width: 100%;
  height: 100%;
}

.xterm-container :deep(.xterm) {
  width: 100%;
  height: 100%;
  padding: 10px;
}

.xterm-container :deep(.xterm-viewport) {
  width: 100% !important;
}

.xterm-container :deep(.xterm-screen) {
  padding: 0px;
}

.hijack-editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow: hidden;
}

.hijack-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
  background: white;
}

.toolbar-left {
  display: flex;
  align-items: center;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hijack-monaco-editor {
  flex: 1;
  overflow: hidden;
}

.hijack-preview-container {
  flex: 1;
  overflow: hidden;
  background: white;
}

.hijack-preview-iframe-inline {
  width: 100%;
  height: 100%;
  border: none;
}

.hijack-preview-iframe {
  width: 100%;
  height: 600px;
  border: none;
}
</style>
