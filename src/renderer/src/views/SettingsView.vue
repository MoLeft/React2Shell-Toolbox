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
                <template #prepend>
                  <v-icon color="error">mdi-alert-circle</v-icon>
                </template>
                <v-list-item-title class="text-error">测试失败</v-list-item-title>
                <v-list-item-subtitle>{{ testDialog.error }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>
          v-list-item-subtitle>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="text" @click="testDialog.show = false"> 关闭 </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 更新检查弹窗 -->
    <v-dialog v-model="updateDialog.show" max-width="600" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon
            :color="updateDialog.hasUpdate ? 'success' : 'info'"
            class="mr-2"
            size="24"
          >
            {{ updateDialog.hasUpdate ? 'mdi-update' : 'mdi-check-circle' }}
          </v-icon>
          {{ updateDialog.hasUpdate ? '发现新版本' : '已是最新版本' }}
        </v-card-title>

        <v-card-text>
          <div v-if="updateDialog.hasUpdate">
            <v-list density="compact">
              <v-list-item>
                <template #prepend>
                  <v-icon>mdi-tag</v-icon>
                </template>
                <v-list-item-title>当前版本</v-list-item-title>
                <v-list-item-subtitle>v{{ updateDialog.currentVersion }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <template #prepend>
                  <v-icon color="success">mdi-tag-arrow-up</v-icon>
                </template>
                <v-list-item-title>最新版本</v-list-item-title>
                <v-list-item-subtitle>v{{ updateDialog.version }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>

            <v-divider class="my-3" />

            <div v-if="updateDialog.releaseNotes" class="release-notes">
              <div class="text-subtitle-2 mb-2">更新内容：</div>
              <div class="text-body-2 text-grey-darken-1" v-html="updateDialog.releaseNotes"></div>
            </div>

            <!-- 下载进度 -->
            <div v-if="downloadingUpdate" class="mt-4">
              <div class="d-flex justify-space-between mb-2">
                <span class="text-body-2">下载进度</span>
                <span class="text-body-2">{{ downloadProgress.toFixed(1) }}%</span>
              </div>
              <v-progress-linear
                :model-value="downloadProgress"
                color="primary"
                height="8"
                rounded
              />
            </div>

            <!-- 下载完成提示 -->
            <v-alert
              v-if="updateDialog.downloaded"
              type="success"
              variant="tonal"
              class="mt-4"
              density="compact"
            >
              <template #prepend>
                <v-icon>mdi-check-circle</v-icon>
              </template>
              更新已下载完成，点击"立即安装"重启应用以完成更新
            </v-alert>
          </div>

          <div v-else>
            <v-alert type="info" variant="tonal" density="compact">
              当前已是最新版本 v{{ updateDialog.currentVersion }}
            </v-alert>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            v-if="!updateDialog.hasUpdate"
            color="primary"
            variant="text"
            @click="updateDialog.show = false"
          >
            关闭
          </v-btn>
          <template v-else>
            <v-btn
              variant="text"
              @click="updateDialog.show = false"
              :disabled="downloadingUpdate"
            >
              稍后更新
            </v-btn>
            <v-btn
              v-if="!updateDialog.downloaded"
              color="primary"
              variant="flat"
              :loading="downloadingUpdate"
              @click="downloadUpdate"
            >
              <v-icon start>mdi-download</v-icon>
              下载更新
            </v-btn>
            <v-btn
              v-else
              color="success"
              variant="flat"
              @click="installUpdate"
            >
              <v-icon start>mdi-restart</v-icon>
              立即安装
            </v-btn>
          </template>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import logoImage from '@renderer/assets/logo.png'

// 分类列表
const categories = [
  { id: 'request', title: '请求设置', icon: 'mdi-timer-outline' },
  { id: 'proxy', title: '代理设置', icon: 'mdi-server-network' },
  { id: 'about', title: '关于软件', icon: 'mdi-information-outline' }
]

const activeCategory = ref('request')

// 代理协议选项
const proxyProtocols = [
  { title: 'HTTP', value: 'http' },
  { title: 'HTTPS', value: 'https' },
  { title: 'SOCKS5', value: 'socks5' }
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
  ignoreCertErrors: false
}

const settings = ref({ ...defaultSettings })
const testingProxy = ref(false)
const appVersion = ref('1.0.0')
const checkingUpdate = ref(false)
const downloadingUpdate = ref(false)
const downloadProgress = ref(0)

const snackbar = ref({
  show: false,
  text: '',
  color: 'info'
})

const updateDialog = ref({
  show: false,
  hasUpdate: false,
  version: '',
  currentVersion: '',
  releaseNotes: '',
  downloaded: false
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
      downloaded: false
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

// 下载更新
const downloadUpdate = async () => {
  downloadingUpdate.value = true
  downloadProgress.value = 0

  // 监听下载进度
  window.api.updater.onDownloadProgress((progress) => {
    downloadProgress.value = progress.percent
  })

  // 监听下载完成
  window.api.updater.onDownloadComplete(() => {
    downloadingUpdate.value = false
    updateDialog.value.downloaded = true
    showSnackbar('更新下载完成', 'success')
  })

  try {
    const result = await window.api.updater.downloadUpdate()

    if (!result.success) {
      downloadingUpdate.value = false
      showSnackbar('下载失败: ' + result.error, 'error')
    }
  } catch (error) {
    downloadingUpdate.value = false
    console.error('下载更新失败:', error)
    showSnackbar('下载失败: ' + error.message, 'error')
  }
}

// 安装更新
const installUpdate = async () => {
  try {
    await window.api.updater.installUpdate()
  } catch (error) {
    console.error('安装更新失败:', error)
    showSnackbar('安装失败: ' + error.message, 'error')
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
</style>
