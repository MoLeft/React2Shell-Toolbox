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

          <SecuritySettings
            v-show="activeCategory === 'security'"
            :settings="settings"
            @save="saveSettings"
            @show-snackbar="showSnackbar"
          />

          <AdvancedSettings
            v-show="activeCategory === 'advanced'"
            :settings="settings"
            @save="saveSettings"
            @disable-advanced="showDisableDialog = true"
            @edit-hijack-template="handleEditHijackTemplate"
            @show-snackbar="showSnackbar"
          />

          <DeveloperSettings
            v-show="activeCategory === 'developer'"
            :settings="settings"
            @save="saveSettings"
          />

          <LanguageSettings v-show="activeCategory === 'language'" @show-snackbar="showSnackbar" />

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
        {{ $t('settings.about.checking') }}
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

    <!-- 劫持模板编辑对话框 -->
    <hijack-template-dialog
      v-model="hijackTemplateDialog"
      :html-content="hijackHtmlContent"
      @save="handleSaveHijackTemplate"
      @cancel="hijackTemplateDialog = false"
    />
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsData } from '../composables/useSettingsData'
import { useProxyTest } from '../composables/useProxyTest'
import { useFofaTest } from '../composables/useFofaTest'
import { useUpdateStore } from '../stores/updateStore'
import { useSettingsStore } from '../stores/settingsStore'
import { getDefaultHijackTemplate } from '../config/hijackTemplate'
import { createLogger } from '@/utils/logger'

import RequestSettings from '../components/settings/RequestSettings.vue'
import ProxySettings from '../components/settings/ProxySettings.vue'
import FofaSettings from '../components/settings/FofaSettings.vue'
import MirrorSettings from '../components/settings/MirrorSettings.vue'
import SecuritySettings from '../components/settings/SecuritySettings.vue'
import AdvancedSettings from '../components/settings/AdvancedSettings.vue'
import DeveloperSettings from '../components/settings/DeveloperSettings.vue'
import LanguageSettings from '../components/settings/LanguageSettings.vue'
import AboutSection from '../components/settings/AboutSection.vue'
import ProxyTestDialog from '../components/settings/ProxyTestDialog.vue'
import DisableAdvancedDialog from '../components/settings/DisableAdvancedDialog.vue'
import UpdateDialog from '../components/settings/UpdateDialog.vue'
import HijackTemplateDialog from '../components/batch/HijackTemplateDialog.vue'

const logger = createLogger('SettingsView')

// 使用 composables 和 stores
const { settings, loadSettings, saveSettings } = useSettingsData()
const { testingProxy, testDialog, testProxy } = useProxyTest()
const { testingFofa, testFofa } = useFofaTest()
const updateStore = useUpdateStore()
const settingsStore = useSettingsStore()

// 使用 i18n
const { t } = useI18n()

// 分类列表（使用计算属性以支持动态语言切换）
const categories = computed(() => [
  { id: 'request', title: t('settings.categories.request'), icon: 'mdi-web' },
  { id: 'proxy', title: t('settings.categories.proxy'), icon: 'mdi-server-network' },
  { id: 'fofa', title: t('settings.categories.fofa'), icon: 'mdi-database-search' },
  { id: 'mirror', title: t('settings.categories.mirror'), icon: 'mdi-web' },
  { id: 'security', title: t('settings.categories.security'), icon: 'mdi-shield-lock' },
  { id: 'advanced', title: t('settings.categories.advanced'), icon: 'mdi-shield-star' },
  { id: 'developer', title: t('settings.categories.developer'), icon: 'mdi-code-braces' },
  { id: 'language', title: t('settings.categories.language'), icon: 'mdi-translate' },
  { id: 'about', title: t('settings.categories.about'), icon: 'mdi-information-outline' }
])

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

// 劫持模板相关
const hijackTemplateDialog = ref(false)
const hijackHtmlContent = ref('')

const showSnackbar = (text, color = 'info') => {
  snackbar.value = { show: true, text, color }
}

// 测试代理
const handleTestProxy = async () => {
  logger.debug('开始测试代理', { settings: settings.value })
  const result = await testProxy(settings.value)
  logger.info('代理测试结果', { result })
}

// 测试 FOFA
const handleTestFofa = async () => {
  const result = await testFofa(settings.value.fofaApiEmail, settings.value.fofaApiKey)
  if (result.success) {
    showSnackbar(t('settings.fofa.testSuccess'), 'success')
  } else {
    showSnackbar(result.error || t('settings.fofa.testFailed'), 'error')
  }
}

// 禁用高级功能（现在通过取消授权实现）
const handleDisableAdvanced = async () => {
  try {
    await settingsStore.revokeGitHubAuth()

    // 同时禁用劫持功能
    settings.value.pocHijackEnabled = false
    settings.value.batchHijackEnabled = false
    await saveSettings()

    showDisableDialog.value = false
    showSnackbar(t('messages.operationSuccess'), 'info')
  } catch (error) {
    logger.error('禁用高级功能失败', error)
    showSnackbar(t('messages.operationFailed'), 'error')
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
          updateStore.updateInfo.releaseNotes || t('settings.about.updateDialog.releaseNotes')
      }
    } else {
      // 已是最新版本，显示提示
      showSnackbar(t('settings.about.latestVersion'), 'success')
    }
  } catch (error) {
    logger.error('检查更新异常', error)
    showSnackbar(t('messages.operationFailed'), 'error')
  }
}

// 加载批量劫持模板（独立于 POC 劫持模板）
const loadHijackTemplate = async () => {
  try {
    const result = await window.api.storage.loadSettings()
    // 检查配置中是否存在 batchHijackHtmlCache 字段（包括空字符串）
    if (result.success && result.settings && 'batchHijackHtmlCache' in result.settings) {
      // 即使是空字符串也要使用，因为这是用户保存的值
      hijackHtmlContent.value = result.settings.batchHijackHtmlCache
    } else {
      // 只有当配置中不存在该字段时才使用统一的默认模板
      hijackHtmlContent.value = getDefaultHijackTemplate()
    }
  } catch (error) {
    logger.error('加载批量劫持模板失败', error)
  }
}

// 打开劫持模板编辑对话框
const handleEditHijackTemplate = () => {
  hijackTemplateDialog.value = true
}

// 保存批量劫持模板（独立于 POC 劫持模板）
const handleSaveHijackTemplate = async (content) => {
  try {
    const result = await window.api.storage.loadSettings()
    const currentSettings = result.success ? result.settings || {} : {}
    // 允许保存空内容，用户可能想要清空模板
    currentSettings.batchHijackHtmlCache = content
    await window.api.storage.saveSettings(currentSettings)
    hijackHtmlContent.value = content
    showSnackbar(t('messages.saveSuccess'), 'success')
  } catch (error) {
    logger.error('保存批量劫持模板失败', error)
    showSnackbar(t('messages.saveFailed') + ': ' + error.message, 'error')
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
