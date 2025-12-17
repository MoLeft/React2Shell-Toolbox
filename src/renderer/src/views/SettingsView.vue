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
          <RequestSettings
            v-show="activeCategory === 'request'"
            :settings="settings"
            @save="saveSettings"
          />

          <ProxySettings
            v-show="activeCategory === 'proxy'"
            :settings="settings"
            :testing="testingProxy"
            @save="saveSettings"
            @test="handleTestProxy"
          />

          <FofaSettings
            v-show="activeCategory === 'fofa'"
            :settings="settings"
            :testing="testingFofa"
            @save="saveSettings"
            @test="handleTestFofa"
          />

          <MirrorSettings
            v-show="activeCategory === 'mirror'"
            :settings="settings"
            @save="saveSettings"
          />

          <AdvancedSettings
            v-show="activeCategory === 'advanced'"
            :settings="settings"
            @save="saveSettings"
            @disable-advanced="showDisableDialog = true"
            @edit-hijack-template="handleEditHijackTemplate"
            @show-snackbar="showSnackbar"
          />

          <AboutSection
            v-show="activeCategory === 'about'"
            :version="updateStore.appVersion"
            :checking="updateStore.checkingUpdate"
            :settings="settings"
            @check-update="handleCheckUpdate"
            @save="saveSettings"
          />
        </div>
      </v-col>
    </v-row>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="top">
      {{ snackbar.text }}
    </v-snackbar>

    <!-- 检查更新 Loading -->
    <v-snackbar v-model="updateStore.checkingUpdate" :timeout="-1" location="top">
      <div class="d-flex align-center">
        <v-progress-circular indeterminate size="20" width="2" class="mr-3" />
        正在检查更新...
      </div>
    </v-snackbar>

    <!-- 代理测试结果对话框 -->
    <proxy-test-dialog
      :show="testDialog.show"
      :success="testDialog.success"
      :ip="testDialog.ip"
      :address="testDialog.address"
      :error="testDialog.error"
      :details="testDialog.details"
      @close="testDialog.show = false"
    />

    <!-- 禁用高级功能确认对话框 -->
    <disable-advanced-dialog
      :show="showDisableDialog"
      @cancel="showDisableDialog = false"
      @confirm="handleDisableAdvanced"
    />

    <!-- 更新对话框 -->
    <update-dialog
      :show="updateDialog.show"
      :has-update="updateDialog.hasUpdate"
      :version="updateDialog.version"
      :current-version="updateDialog.currentVersion"
      :release-notes="updateDialog.releaseNotes"
      :rendered-notes="updateStore.renderedReleaseNotes"
      @close="updateDialog.show = false"
      @download="handleDownloadUpdate"
    />

    <!-- 挂黑模板编辑对话框 -->
    <hijack-template-dialog
      v-model="hijackTemplateDialog"
      :html-content="hijackHtmlContent"
      @save="handleSaveHijackTemplate"
      @cancel="hijackTemplateDialog = false"
    />
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSettingsData } from '../composables/useSettingsData'
import { useProxyTest } from '../composables/useProxyTest'
import { useFofaTest } from '../composables/useFofaTest'
import { useUpdateStore } from '../stores/updateStore'
import { useSettingsStore } from '../stores/settingsStore'

import RequestSettings from '../components/settings/RequestSettings.vue'
import ProxySettings from '../components/settings/ProxySettings.vue'
import FofaSettings from '../components/settings/FofaSettings.vue'
import MirrorSettings from '../components/settings/MirrorSettings.vue'
import AdvancedSettings from '../components/settings/AdvancedSettings.vue'
import AboutSection from '../components/settings/AboutSection.vue'
import ProxyTestDialog from '../components/settings/ProxyTestDialog.vue'
import DisableAdvancedDialog from '../components/settings/DisableAdvancedDialog.vue'
import UpdateDialog from '../components/settings/UpdateDialog.vue'
import HijackTemplateDialog from '../components/batch/HijackTemplateDialog.vue'

// 使用 composables 和 stores
const { settings, loadSettings, saveSettings } = useSettingsData()
const { testingProxy, testDialog, testProxy } = useProxyTest()
const { testingFofa, testFofa } = useFofaTest()
const updateStore = useUpdateStore()
const settingsStore = useSettingsStore()

// 分类列表
const categories = [
  { id: 'request', title: '请求设置', icon: 'mdi-web' },
  { id: 'proxy', title: '代理设置', icon: 'mdi-server-network' },
  { id: 'fofa', title: 'FOFA 设置', icon: 'mdi-database-search' },
  { id: 'mirror', title: '国内镜像', icon: 'mdi-web' },
  { id: 'advanced', title: '高级功能', icon: 'mdi-shield-star' },
  { id: 'about', title: '关于软件', icon: 'mdi-information-outline' }
]

const activeCategory = ref('request')
const snackbar = ref({ show: false, text: '', color: 'info' })
const showDisableDialog = ref(false)
const updateDialog = ref({
  show: false,
  hasUpdate: false,
  releaseUrl: '',
  version: '',
  currentVersion: '',
  releaseNotes: ''
})

// 挂黑模板相关
const hijackTemplateDialog = ref(false)
const hijackHtmlContent = ref('')

const showSnackbar = (text, color = 'info') => {
  snackbar.value = { show: true, text, color }
}

// 测试代理
const handleTestProxy = async () => {
  console.log('🔍 开始测试代理...', settings.value)
  const result = await testProxy(settings.value)
  console.log('✅ 代理测试结果:', result)
}

// 测试 FOFA
const handleTestFofa = async () => {
  const result = await testFofa(settings.value.fofaApiEmail, settings.value.fofaApiKey)
  if (result.success) {
    showSnackbar('FOFA 连接成功', 'success')
  } else {
    showSnackbar(result.error || 'FOFA 连接失败', 'error')
  }
}

// 禁用高级功能（现在通过取消授权实现）
const handleDisableAdvanced = async () => {
  try {
    await settingsStore.revokeGitHubAuth()
    
    // 同时禁用挂黑功能
    settings.value.pocHijackEnabled = false
    settings.value.batchHijackEnabled = false
    await saveSettings()
    
    showDisableDialog.value = false
    showSnackbar('已取消授权，高级功能已禁用', 'info')
  } catch (error) {
    console.error('禁用高级功能失败:', error)
    showSnackbar('操作失败，请稍后重试', 'error')
  }
}

// 检查更新
const handleCheckUpdate = async () => {
  try {
    // 开始检查更新（会自动显示 checkingUpdate 状态）
    await updateStore.checkForUpdates()

    if (updateStore.versionStatus === 'update') {
      // 有新版本，显示更新对话框（即使 releaseNotes 为空或是错误信息也显示）
      updateDialog.value = {
        show: true,
        hasUpdate: true,
        releaseUrl: updateStore.updateInfo.releaseUrl,
        version: updateStore.updateInfo.version,
        currentVersion: updateStore.updateInfo.currentVersion,
        releaseNotes:
          updateStore.updateInfo.releaseNotes || '无法获取更新说明，请访问 GitHub Releases 查看详情'
      }
    } else {
      // 已是最新版本，显示提示
      showSnackbar('已经是最新版啦', 'success')
    }
  } catch (error) {
    console.error('检查更新异常:', error)
    showSnackbar('检查更新失败，请稍后重试', 'error')
  }
}

// 加载批量挂黑模板（独立于 POC 挂黑模板）
const loadHijackTemplate = async () => {
  try {
    const result = await window.api.storage.loadSettings()
    if (result.success && result.settings?.batchHijackHtmlCache) {
      hijackHtmlContent.value = result.settings.batchHijackHtmlCache
    } else {
      // 使用默认模板
      hijackHtmlContent.value = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>网站维护中</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            color: #fff;
        }
        .container {
            text-align: center;
            padding: 40px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        h1 { font-size: 48px; margin-bottom: 20px; }
        p { font-size: 18px; opacity: 0.9; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚧 网站维护中</h1>
        <p>我们正在进行系统升级，请稍后再访问</p>
    </div>
</body>
</html>`
    }
  } catch (error) {
    console.error('加载批量挂黑模板失败:', error)
  }
}

// 打开挂黑模板编辑对话框
const handleEditHijackTemplate = () => {
  hijackTemplateDialog.value = true
}

// 保存批量挂黑模板（独立于 POC 挂黑模板）
const handleSaveHijackTemplate = async (content) => {
  try {
    const result = await window.api.storage.loadSettings()
    const currentSettings = result.success ? result.settings || {} : {}
    currentSettings.batchHijackHtmlCache = content
    await window.api.storage.saveSettings(currentSettings)
    hijackHtmlContent.value = content
    showSnackbar('批量挂黑模板保存成功', 'success')
  } catch (error) {
    console.error('保存批量挂黑模板失败:', error)
    showSnackbar('保存批量挂黑模板失败: ' + error.message, 'error')
  }
}

// 下载更新
const handleDownloadUpdate = async () => {
  const success = await updateStore.downloadUpdate()
  if (success) {
    updateDialog.value.show = false
  }
}

// 初始化
onMounted(async () => {
  await loadSettings()
  await loadHijackTemplate()
  if (!updateStore.appVersion || updateStore.appVersion === '...') {
    await updateStore.loadAppVersion()
  }
})
</script>

<style scoped>
.settings-view {
  height: 100vh;
  padding: 0 !important;
  overflow: hidden;
}

.settings-sidebar {
  background-color: #fafafa;
  border-right: 1px solid rgba(0, 0, 0, 0.12);
  height: 100vh;
  overflow-y: auto;
}

.settings-content {
  height: 100vh;
  overflow-y: auto;
  background-color: #fff;
}

.content-wrapper {
  min-height: 100%;
}
</style>
