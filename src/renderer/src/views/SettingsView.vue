<template>
  <v-container fluid class="settings-view">
    <v-row class="fill-height" no-gutters>
      <!-- 左侧分类导航 -->
      <v-col cols="3" class="settings-sidebar">
        <v-list density="compact" nav>
          <v-list-item
            v-for="category in categories"
            :key="category.id"
            :value="category.id"
            :active="activeCategory === category.id"
            @click="activeCategory = category.id"
          >
            <template #prepend>
              <v-icon>{{ category.icon }}</v-icon>
            </template>
            <v-list-item-title>{{ category.title }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-col>

      <!-- 右侧设置详情 -->
      <v-col cols="9" class="settings-content">
        <div class="content-wrapper">
          <!-- 请求设置 -->
          <div v-show="activeCategory === 'request'" class="setting-section">
            <h3 class="section-title">请求设置</h3>

            <!-- 响应超时时间 -->
            <div class="setting-item">
              <div class="setting-header">
                <div class="setting-info">
                  <div class="setting-name">响应超时时间</div>
                  <div class="setting-desc">设置请求的最大等待时间</div>
                </div>
              </div>
              <v-text-field
                v-model.number="settings.timeout"
                type="number"
                variant="outlined"
                density="compact"
                suffix="ms"
                :min="1000"
                :max="60000"
                class="mt-3"
                style="max-width: 300px"
                @update:model-value="saveSettings"
              />
            </div>

            <v-divider class="my-4" />

            <!-- 忽略 SSL 证书错误 -->
            <div class="setting-item">
              <div class="setting-header">
                <div class="setting-info">
                  <div class="setting-name">忽略 SSL 证书错误</div>
                  <div class="setting-desc">允许访问自签名证书的网站（降低安全性）</div>
                </div>
                <v-switch
                  v-model="settings.ignoreCertErrors"
                  color="warning"
                  density="compact"
                  hide-details
                  @update:model-value="saveSettings"
                />
              </div>
            </div>
          </div>

          <!-- 代理设置 -->
          <div v-show="activeCategory === 'proxy'" class="setting-section">
            <h3 class="section-title">代理设置</h3>

            <!-- 启用代理开关 -->
            <div class="setting-item">
              <div class="setting-header">
                <div class="setting-info">
                  <div class="setting-name">启用全局代理</div>
                  <div class="setting-desc">通过代理服务器转发所有请求</div>
                </div>
                <v-switch
                  v-model="settings.proxyEnabled"
                  color="primary"
                  density="compact"
                  hide-details
                  @update:model-value="saveSettings"
                />
              </div>
            </div>

            <!-- 代理配置表单 -->
            <div v-if="settings.proxyEnabled" class="proxy-form">
              <v-divider class="my-4" />

              <!-- 代理协议 -->
              <div class="setting-item">
                <div class="setting-name mb-2">代理协议</div>
                <v-select
                  v-model="settings.proxyProtocol"
                  :items="proxyProtocols"
                  variant="outlined"
                  density="compact"
                  style="max-width: 300px"
                  @update:model-value="saveSettings"
                />
              </div>

              <!-- 代理地址和端口 -->
              <div class="setting-item">
                <div class="setting-name mb-2">代理服务器</div>
                <v-row dense style="max-width: 500px">
                  <v-col cols="8">
                    <v-text-field
                      v-model="settings.proxyHost"
                      label="地址"
                      variant="outlined"
                      density="compact"
                      placeholder="127.0.0.1"
                      @update:model-value="saveSettings"
                    />
                  </v-col>
                  <v-col cols="4">
                    <v-text-field
                      v-model.number="settings.proxyPort"
                      label="端口"
                      type="number"
                      variant="outlined"
                      density="compact"
                      placeholder="8080"
                      @update:model-value="saveSettings"
                    />
                  </v-col>
                </v-row>
              </div>

              <!-- 代理认证开关 -->
              <div class="setting-item">
                <div class="setting-header">
                  <div class="setting-info">
                    <div class="setting-name">需要认证</div>
                    <div class="setting-desc">代理服务器需要用户名和密码</div>
                  </div>
                  <v-switch
                    v-model="settings.proxyAuth"
                    color="primary"
                    density="compact"
                    hide-details
                    @update:model-value="saveSettings"
                  />
                </div>
              </div>

              <!-- 认证信息 -->
              <div v-if="settings.proxyAuth" class="auth-form">
                <div class="setting-item">
                  <div class="setting-name mb-2">用户名</div>
                  <v-text-field
                    v-model="settings.proxyUsername"
                    variant="outlined"
                    density="compact"
                    style="max-width: 300px"
                    @update:model-value="saveSettings"
                  >
                    <template #prepend-inner>
                      <v-icon size="18">mdi-account</v-icon>
                    </template>
                  </v-text-field>
                </div>

                <div class="setting-item">
                  <div class="setting-name mb-2">密码</div>
                  <v-text-field
                    v-model="settings.proxyPassword"
                    type="password"
                    variant="outlined"
                    density="compact"
                    style="max-width: 300px"
                    @update:model-value="saveSettings"
                  >
                    <template #prepend-inner>
                      <v-icon size="18">mdi-lock</v-icon>
                    </template>
                  </v-text-field>
                </div>
              </div>

              <!-- 测试代理按钮 -->
              <div class="setting-item">
                <v-btn
                  color="success"
                  variant="tonal"
                  :loading="testingProxy"
                  @click="testProxyConnection"
                >
                  <v-icon start>mdi-network-outline</v-icon>
                  测试代理连接
                </v-btn>
              </div>
            </div>
          </div>

          <!-- 国内镜像 -->
          <div v-show="activeCategory === 'mirror'" class="setting-section">
            <h3 class="section-title">国内镜像</h3>

            <!-- 启用国内镜像开关 -->
            <div class="setting-item">
              <div class="setting-header">
                <div class="setting-info">
                  <div class="setting-name">启用 GitHub 国内镜像</div>
                  <div class="setting-desc">通过镜像加速访问 GitHub 资源</div>
                </div>
                <v-switch
                  v-model="settings.githubMirrorEnabled"
                  color="primary"
                  density="compact"
                  hide-details
                  @update:model-value="saveSettings"
                />
              </div>
            </div>

            <!-- 镜像配置表单 -->
            <div v-if="settings.githubMirrorEnabled" class="mirror-form">
              <v-divider class="my-4" />

              <!-- 镜像方式和地址（整合在同一行） -->
              <div class="setting-item">
                <div class="setting-name mb-2">镜像配置</div>
                <v-row dense style="max-width: 700px">
                  <v-col cols="4">
                    <v-select
                      v-model="settings.githubMirrorType"
                      :items="mirrorTypes"
                      variant="outlined"
                      density="compact"
                      @update:model-value="saveSettings"
                    />
                  </v-col>
                  <v-col cols="8">
                    <v-text-field
                      v-model="settings.githubMirrorUrl"
                      variant="outlined"
                      density="compact"
                      :placeholder="
                        settings.githubMirrorType === 'prefix'
                          ? 'https://mirror.ghproxy.com/'
                          : 'hub.gitmirror.com'
                      "
                      @update:model-value="saveSettings"
                    >
                      <template #prepend-inner>
                        <v-icon size="18">mdi-web</v-icon>
                      </template>
                    </v-text-field>
                  </v-col>
                </v-row>
                <div class="text-caption text-grey mt-1">
                  <div v-if="settings.githubMirrorType === 'prefix'">
                    前置代理：在 URL 前添加镜像地址，示例：https://mirror.ghproxy.com/ 或
                    https://ghproxy.com/
                  </div>
                  <div v-else>
                    域名替换：替换 GitHub 域名，示例：hub.gitmirror.com 或 gitclone.com
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 关于软件 -->
          <div v-show="activeCategory === 'about'" class="setting-section">
            <h3 class="section-title">关于软件</h3>

            <!-- 软件信息 -->
            <div class="about-content">
              <div class="d-flex align-center mb-4">
                <v-avatar size="64" rounded="lg" class="mr-4">
                  <v-img :src="logoImage" alt="应用图标" />
                </v-avatar>
                <div>
                  <div class="text-h6">React2Shell 漏洞检测工具</div>
                  <div class="text-caption text-grey">React2Shell ToolBox</div>
                </div>
              </div>

              <v-divider class="my-3" />

              <!-- 启动时自动检查更新 -->
              <div class="setting-item">
                <div class="setting-header">
                  <div class="setting-info">
                    <div class="setting-name">启动时自动检查更新</div>
                    <div class="setting-desc">应用启动时自动检查是否有新版本</div>
                  </div>
                  <v-switch
                    v-model="settings.autoCheckUpdate"
                    color="primary"
                    density="compact"
                    hide-details
                    @update:model-value="saveSettings"
                  />
                </div>
              </div>

              <v-divider class="my-3" />

              <!-- 版本信息 -->
              <div class="setting-item">
                <div class="d-flex justify-space-between align-center">
                  <div>
                    <div class="setting-name">当前版本</div>
                    <div class="setting-desc">v{{ appVersion }}</div>
                  </div>
                  <v-btn
                    color="primary"
                    variant="tonal"
                    size="small"
                    :loading="checkingUpdate"
                    @click="checkForUpdates"
                  >
                    <v-icon start>mdi-update</v-icon>
                    检查更新
                  </v-btn>
                </div>
              </div>

              <v-divider class="my-3" />

              <!-- 开源地址 -->
              <div class="setting-item">
                <div class="setting-name mb-2">开源地址</div>
                <v-btn
                  href="https://github.com/MoLeft/React2Shell-Toolbox"
                  target="_blank"
                  variant="outlined"
                  prepend-icon="mdi-github"
                >
                  GitHub
                </v-btn>
              </div>

              <v-divider class="my-3" />

              <!-- 其他信息 -->
              <div class="setting-item">
                <div class="text-caption text-grey">
                  <div class="mb-1">
                    <v-icon size="16" class="mr-1">mdi-license</v-icon>
                    开源协议：MIT License
                  </div>
                  <div class="mb-1">
                    <v-icon size="16" class="mr-1">mdi-code-tags</v-icon>
                    技术栈：Electron + Vue 3 + Vuetify
                  </div>
                  <div>
                    <v-icon size="16" class="mr-1">mdi-copyright</v-icon>
                    {{ new Date().getFullYear() }} React2Shell Toolbox. All rights reserved.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- 提示 Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="2000" location="top">
      {{ snackbar.text }}
    </v-snackbar>

    <!-- 代理测试结果弹窗 -->
    <v-dialog v-model="testDialog.show" max-width="500">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon :color="testDialog.success ? 'success' : 'error'" class="mr-2" size="24">
            {{ testDialog.success ? 'mdi-check-circle' : 'mdi-alert-circle' }}
          </v-icon>
          {{ testDialog.success ? '代理测试成功' : '代理测试失败' }}
        </v-card-title>
        <v-card-text>
          <div v-if="testDialog.success">
            <v-list density="compact">
              <v-list-item>
                <template #prepend>
                  <v-icon>mdi-ip-network</v-icon>
                </template>
                <v-list-item-title>出口 IP</v-list-item-title>
                <v-list-item-subtitle>{{ testDialog.ip }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <template #prepend>
                  <v-icon>mdi-map-marker</v-icon>
                </template>
                <v-list-item-title>归属地</v-list-item-title>
                <v-list-item-subtitle>{{ testDialog.address }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>
          <div v-else>
            <v-list density="compact">
              <v-list-item>
                <v-list-item-title class="text-error">测试失败</v-list-item-title>
                <v-list-item-subtitle>{{ testDialog.error }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="text" @click="testDialog.show = false"> 关闭 </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 更新检查弹窗 -->
    <v-dialog v-model="updateDialog.show" max-width="600">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon :color="updateDialog.hasUpdate ? 'success' : 'info'" class="mr-2" size="24">
            {{ updateDialog.hasUpdate ? 'mdi-update' : 'mdi-check-circle' }}
          </v-icon>
          {{ updateDialog.hasUpdate ? '发现新版本' : '已是最新版本' }}
        </v-card-title>

        <v-card-text>
          <div v-if="updateDialog.hasUpdate">
            <div class="mb-3">
              <div class="text-body-2 mb-1">
                <span class="font-weight-medium">当前版本：</span>v{{ updateDialog.currentVersion }}
              </div>
              <div class="text-body-2">
                <span class="font-weight-medium">最新版本：</span>v{{ updateDialog.version }}
              </div>
            </div>

            <v-divider class="my-3" />

            <div v-if="updateDialog.releaseNotes" class="release-notes">
              <div class="text-subtitle-2 mb-2">更新内容：</div>
              <div class="markdown-content" v-html="renderedReleaseNotes"></div>
            </div>

            <div class="text-caption text-grey mt-4">
              点击"前往下载"将打开 GitHub Releases 页面，请选择对应平台的安装包下载
            </div>
          </div>

          <div v-else>
            <div class="text-body-2">当前已是最新版本 v{{ updateDialog.currentVersion }}</div>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="updateDialog.show = false">
            {{ updateDialog.hasUpdate ? '稍后更新' : '关闭' }}
          </v-btn>
          <v-btn
            v-if="updateDialog.hasUpdate"
            color="primary"
            variant="flat"
            @click="downloadUpdate"
          >
            前往下载
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { marked } from 'marked'
import logoImage from '@renderer/assets/logo.png'

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true
})

// 分类列表
const categories = [
  { id: 'request', title: '请求设置', icon: 'mdi-timer-outline' },
  { id: 'proxy', title: '代理设置', icon: 'mdi-server-network' },
  { id: 'mirror', title: '国内镜像', icon: 'mdi-web' },
  { id: 'about', title: '关于软件', icon: 'mdi-information-outline' }
]

const activeCategory = ref('request')

// 代理协议选项
const proxyProtocols = [
  { title: 'HTTP', value: 'http' },
  { title: 'HTTPS', value: 'https' },
  { title: 'SOCKS5', value: 'socks5' }
]

// 镜像类型选项
const mirrorTypes = [
  { title: '前置代理', value: 'prefix' },
  { title: '域名替换', value: 'replace' }
]

// 默认设置
const defaultSettings = {
  timeout: 10000,
  proxyEnabled: false,
  proxyProtocol: 'http',
  proxyHost: '127.0.0.1',
  proxyPort: 8080,
  proxyAuth: false,
  proxyUsername: '',
  proxyPassword: '',
  ignoreCertErrors: false,
  autoCheckUpdate: true, // 启动时自动检查更新
  githubMirrorEnabled: false, // 启用 GitHub 镜像
  githubMirrorType: 'prefix', // 镜像类型：prefix-前置代理, replace-域名替换
  githubMirrorUrl: '' // 镜像地址
}

const settings = ref({ ...defaultSettings })
const testingProxy = ref(false)
const appVersion = ref('1.0.0')
const checkingUpdate = ref(false)

const snackbar = ref({
  show: false,
  text: '',
  color: 'info'
})

const updateDialog = ref({
  show: false,
  hasUpdate: false,
  releaseUrl: '',
  version: '',
  currentVersion: '',
  releaseNotes: '',
  downloaded: false
})

// 渲染 markdown 格式的更新内容
const renderedReleaseNotes = computed(() => {
  if (!updateDialog.value.releaseNotes) return ''
  return marked.parse(updateDialog.value.releaseNotes)
})

const testDialog = ref({
  show: false,
  success: false,
  ip: '',
  address: '',
  error: '',
  details: null
})

const showSnackbar = (text, color = 'info') => {
  snackbar.value = { show: true, text, color }
}

// 加载设置
const loadSettings = async () => {
  try {
    const result = await window.api.storage.loadSettings()
    if (result.success && result.settings) {
      settings.value = { ...defaultSettings, ...result.settings }
    }
  } catch (error) {
    console.error('加载设置失败:', error)
  }
}

// 保存设置（实时保存）
const saveSettings = async () => {
  try {
    const settingsToSave = JSON.parse(JSON.stringify(settings.value))
    const result = await window.api.storage.saveSettings(settingsToSave)
    if (result.success) {
      showSnackbar('设置已保存', 'success')
    } else {
      showSnackbar('保存失败: ' + result.error, 'error')
    }
  } catch (error) {
    console.error('保存设置失败:', error)
    showSnackbar('保存失败: ' + error.message, 'error')
  }
}

// 测试代理连接
const testProxyConnection = async () => {
  testingProxy.value = true

  try {
    const proxyConfig = {
      proxyProtocol: settings.value.proxyProtocol,
      proxyHost: settings.value.proxyHost,
      proxyPort: settings.value.proxyPort,
      proxyAuth: settings.value.proxyAuth,
      proxyUsername: settings.value.proxyUsername,
      proxyPassword: settings.value.proxyPassword
    }

    console.log('测试代理配置:', proxyConfig)
    const result = await window.api.storage.testProxy(proxyConfig)
    console.log('代理测试结果:', result)
    console.log('result.success:', result.success)
    console.log('result.ip:', result.ip)
    console.log('result.address:', result.address)
    console.log('result.error:', result.error)
    console.log('result.details:', result.details)

    const dialogData = {
      show: true,
      success: result.success,
      ip: result.ip || '',
      address: result.address || '',
      error: result.error || '未知错误',
      details: result.details || null
    }

    console.log('准备显示的弹窗数据:', dialogData)
    testDialog.value = dialogData
  } catch (error) {
    console.error('代理测试异常:', error)
    testDialog.value = {
      show: true,
      success: false,
      ip: '',
      address: '',
      error: error.message,
      details: null
    }
  } finally {
    testingProxy.value = false
  }
}

// 加载应用版本
const loadAppVersion = async () => {
  try {
    const versionInfo = await window.api.getVersion()
    appVersion.value = versionInfo.version
  } catch (error) {
    console.error('加载版本信息失败:', error)
  }
}

// 检查更新
const checkForUpdates = async () => {
  checkingUpdate.value = true

  try {
    const result = await window.api.updater.checkForUpdates()

    if (result.error) {
      showSnackbar(result.error, 'error')
      return
    }

    updateDialog.value = {
      show: true,
      hasUpdate: result.hasUpdate,
      version: result.version || '',
      currentVersion: result.currentVersion || appVersion.value,
      releaseNotes: result.releaseNotes || '',
      releaseUrl: result.releaseUrl || result.downloadUrl || ''
    }

    if (!result.hasUpdate) {
      showSnackbar('当前已是最新版本', 'success')
    }
  } catch (error) {
    console.error('检查更新失败:', error)
    showSnackbar('检查更新失败: ' + error.message, 'error')
  } finally {
    checkingUpdate.value = false
  }
}

// 打开下载页面
const downloadUpdate = async () => {
  try {
    const releaseUrl = updateDialog.value.releaseUrl
    const result = await window.api.updater.downloadUpdate(releaseUrl)

    if (result.success) {
      showSnackbar('已打开下载页面', 'success')
      updateDialog.value.show = false
    } else {
      showSnackbar('打开下载页面失败: ' + result.error, 'error')
    }
  } catch (error) {
    console.error('打开下载页面失败:', error)
    showSnackbar('打开下载页面失败: ' + error.message, 'error')
  }
}

onMounted(() => {
  loadSettings()
  loadAppVersion()
})
</script>

<style scoped>
.settings-view {
  height: 100%;
  padding: 0;
}

.settings-sidebar {
  background-color: #f5f5f5;
  border-right: 1px solid #e0e0e0;
  height: 100vh;
  overflow-y: auto;
}

.settings-content {
  height: 100vh;
  overflow-y: auto;
  background-color: #fff;
}

.content-wrapper {
  padding: 24px 32px;
  max-width: 800px;
}

.section-title {
  font-size: 20px;
  font-weight: 500;
  margin-bottom: 24px;
  color: rgba(0, 0, 0, 0.87);
}

.setting-section {
  margin-bottom: 32px;
}

.setting-item {
  margin-bottom: 24px;
}

.setting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.setting-info {
  flex: 1;
}

.setting-name {
  font-size: 15px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.87);
  margin-bottom: 4px;
}

.setting-desc {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.6);
}

.proxy-form,
.auth-form {
  padding-left: 0;
}

.about-content {
  padding: 0;
}

.release-notes {
  max-height: 200px;
  overflow-y: auto;
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.markdown-content {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.7);
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin-top: 16px;
  margin-bottom: 8px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.87);
}

.markdown-content :deep(h1) {
  font-size: 1.5em;
}

.markdown-content :deep(h2) {
  font-size: 1.3em;
}

.markdown-content :deep(h3) {
  font-size: 1.1em;
}

.markdown-content :deep(p) {
  margin-bottom: 8px;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin-left: 20px;
  margin-bottom: 8px;
}

.markdown-content :deep(li) {
  margin-bottom: 4px;
}

.markdown-content :deep(code) {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.markdown-content :deep(pre) {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  margin-bottom: 8px;
}

.markdown-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
}

.markdown-content :deep(a) {
  color: #1976d2;
  text-decoration: none;
}

.markdown-content :deep(a:hover) {
  text-decoration: underline;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid #ddd;
  padding-left: 12px;
  margin-left: 0;
  color: rgba(0, 0, 0, 0.6);
}

.markdown-content :deep(hr) {
  border: none;
  border-top: 1px solid #ddd;
  margin: 16px 0;
}

.markdown-content :deep(strong) {
  font-weight: 600;
}

.markdown-content :deep(em) {
  font-style: italic;
}

.mirror-form {
  padding-left: 24px;
  margin-top: 12px;
}
</style>
