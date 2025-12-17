<template>
  <div class="setting-section">
    <h3 class="section-title">高级功能</h3>

    <!-- GitHub 授权区域 -->
    <v-card class="mb-6" elevation="0" outlined>
      <v-card-text>
        <div class="github-auth-section">
          <div class="auth-header">
            <v-icon size="32" color="primary">mdi-github</v-icon>
            <h4 class="ml-3">GitHub 授权验证</h4>
          </div>

          <!-- 未授权状态 -->
          <div v-if="!settingsStore.isGithubAuthorized" class="auth-content mt-4">
            <!-- 授权中状态 -->
            <v-alert v-if="authorizing" type="info" variant="tonal" class="mb-4">
              <template #prepend>
                <v-progress-circular indeterminate size="24" width="3" />
              </template>
              <div class="font-weight-bold mb-2">{{ authStatus || '等待网页授权...' }}</div>
              <div class="text-body-2">{{ authHintText }}</div>
            </v-alert>

            <!-- 未授权状态 -->
            <v-alert v-else type="info" variant="tonal" class="mb-4">
              <div class="font-weight-bold mb-2">需要授权才能使用高级功能</div>
              <div class="text-body-2">请使用 GitHub 账号授权，并 Star 本项目即可解锁高级功能</div>
            </v-alert>

            <v-btn color="primary" size="large" :disabled="authorizing" @click="handleAuthorize">
              <v-icon class="mr-2">mdi-github</v-icon>
              使用 GitHub 授权
            </v-btn>
          </div>

          <!-- 已授权但未 Star -->
          <div v-else-if="!settingsStore.isHijackUnlocked" class="auth-content mt-4">
            <div class="user-info-compact mb-3">
              <v-avatar size="40" class="mr-3">
                <v-img
                  v-if="settingsStore.githubAvatar"
                  :src="settingsStore.githubAvatar"
                  alt="Avatar"
                />
                <v-icon v-else size="32">mdi-account-circle</v-icon>
              </v-avatar>
              <div>
                <div class="font-weight-medium">{{ settingsStore.githubUsername }}</div>
                <div class="text-caption text-grey">授权成功</div>
              </div>
            </div>

            <v-alert type="warning" variant="tonal" class="mb-4">
              <div class="font-weight-bold">未检测到 Star</div>
              <div class="text-body-2 mt-1">
                请前往 GitHub 为本项目点 Star，然后点击下方按钮重新验证
              </div>
            </v-alert>

            <div class="d-flex gap-2">
              <v-btn
                color="primary"
                prepend-icon="mdi-star"
                :loading="verifying"
                @click="handleVerify"
              >
                {{ verifying ? verifyStatus || '验证中...' : '重新验证' }}
              </v-btn>
              <v-btn
                color="primary"
                variant="outlined"
                prepend-icon="mdi-open-in-new"
                @click="openGitHubRepo"
              >
                前往 GitHub
              </v-btn>
              <v-btn color="error" variant="text" prepend-icon="mdi-logout" @click="handleRevoke">
                取消授权
              </v-btn>
            </div>
          </div>

          <!-- 已授权且已 Star -->
          <div v-else class="auth-content mt-4">
            <div class="user-info-compact mb-3">
              <v-avatar size="40" class="mr-3">
                <v-img
                  v-if="settingsStore.githubAvatar"
                  :src="settingsStore.githubAvatar"
                  alt="Avatar"
                />
                <v-icon v-else size="32">mdi-account-circle</v-icon>
              </v-avatar>
              <div>
                <div class="font-weight-medium">{{ settingsStore.githubUsername }}</div>
                <div class="text-caption text-success">
                  <v-icon size="14" class="mr-1">mdi-check-circle</v-icon>
                  高级功能已解锁
                </div>
              </div>
            </div>

            <div class="d-flex gap-2">
              <v-btn
                color="primary"
                variant="outlined"
                prepend-icon="mdi-open-in-new"
                size="small"
                @click="openGitHubRepo"
              >
                前往 GitHub
              </v-btn>
              <v-btn
                color="error"
                variant="text"
                prepend-icon="mdi-logout"
                size="small"
                @click="handleRevoke"
              >
                取消授权
              </v-btn>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- 高级功能配置（仅在已授权且已 Star 时显示） -->
    <template v-if="settingsStore.isHijackUnlocked">
      <!-- POC验证启用一键挂黑 -->
      <div class="setting-item">
        <div class="setting-header">
          <div class="setting-info">
            <div class="setting-name">POC验证启用一键挂黑</div>
            <div class="setting-desc">开启后，在POC验证页面检测到漏洞时将显示"一键挂黑"功能</div>
          </div>
          <v-switch v-model="pocHijackEnabled" color="error" density="compact" hide-details />
        </div>
      </div>

      <v-divider class="my-4" />

      <!-- 批量检测启用一键挂黑 -->
      <div class="setting-item">
        <div class="setting-header">
          <div class="setting-info">
            <div class="setting-name">批量检测启用一键挂黑</div>
            <div class="setting-desc">开启后，在批量检测页面检测到漏洞时自动挂黑网站</div>
          </div>
          <v-switch v-model="batchHijackEnabled" color="error" density="compact" hide-details />
        </div>

        <!-- 挂黑配置（仅在启用时显示） -->
        <div v-if="batchHijackEnabled" class="hijack-config mt-4">
          <!-- 注入路由 -->
          <div class="config-item mb-4">
            <div class="config-label">注入路由</div>
            <v-radio-group v-model="hijackRouteMode" hide-details density="compact">
              <v-radio label="指定路由" value="specific">
                <template #label>
                  <div class="d-flex align-center">
                    <span>指定路由</span>
                    <v-chip size="x-small" class="ml-2" color="primary" variant="tonal"
                      >推荐</v-chip
                    >
                  </div>
                </template>
              </v-radio>
              <v-radio label="全局劫持" value="global">
                <template #label>
                  <div class="d-flex align-center">
                    <span>全局劫持</span>
                    <v-chip size="x-small" class="ml-2" color="warning" variant="tonal"
                      >慎用</v-chip
                    >
                  </div>
                </template>
              </v-radio>
            </v-radio-group>
            <v-text-field
              v-if="hijackRouteMode === 'specific'"
              v-model="hijackTargetRoute"
              label="目标路由"
              variant="outlined"
              density="compact"
              class="mt-3"
              placeholder="/"
              hint="例如: / 或 /admin"
              persistent-hint
            />
          </div>

          <!-- HTML 黑页模板 -->
          <div class="config-item">
            <div class="config-label mb-2">HTML 黑页模板</div>
            <v-btn
              size="small"
              variant="tonal"
              color="primary"
              prepend-icon="mdi-pencil"
              @click="$emit('edit-hijack-template')"
            >
              编辑模板
            </v-btn>
            <div class="config-hint mt-2">点击按钮可自定义挂黑页面的 HTML 内容</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSettingsStore } from '../../stores/settingsStore'

const props = defineProps({
  settings: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['save', 'disable-advanced', 'edit-hijack-template', 'show-snackbar'])

const settingsStore = useSettingsStore()
const authorizing = ref(false)
const verifying = ref(false)

// 更新字段的辅助函数
const updateField = (field, value) => {
  console.log(`[AdvancedSettings] updateField called: ${field} = ${value}`)
  const before = JSON.parse(JSON.stringify(props.settings))
  console.log('[AdvancedSettings] advancedUnlocked BEFORE:', before.advancedUnlocked)
  console.log('[AdvancedSettings] pocHijackEnabled BEFORE:', before.pocHijackEnabled)

  props.settings[field] = value

  const after = JSON.parse(JSON.stringify(props.settings))
  console.log('[AdvancedSettings] advancedUnlocked AFTER:', after.advancedUnlocked)
  console.log('[AdvancedSettings] pocHijackEnabled AFTER:', after.pocHijackEnabled)

  emit('save')
}

// 使用计算属性避免直接修改 prop
const pocHijackEnabled = computed({
  get: () => props.settings.pocHijackEnabled,
  set: (val) => updateField('pocHijackEnabled', val)
})

const batchHijackEnabled = computed({
  get: () => props.settings.batchHijackEnabled,
  set: (val) => updateField('batchHijackEnabled', val)
})

const hijackRouteMode = computed({
  get: () => props.settings.hijackRouteMode || 'specific',
  set: (val) => updateField('hijackRouteMode', val)
})

const hijackTargetRoute = computed({
  get: () => props.settings.hijackTargetRoute || '/',
  set: (val) => updateField('hijackTargetRoute', val)
})

// 授权状态
const authStatus = ref('')
const verifyStatus = ref('')

// 根据授权状态显示不同的提示内容
const authHintText = computed(() => {
  const status = authStatus.value
  if (!status || status === '等待网页授权...') {
    return '请在 GitHub 网页中授权账号，并在浏览器显示的"尝试打开应用"提示中点击"打开"'
  } else if (status === '授权成功，正在获取信息...') {
    return '正在获取您的 GitHub 账号信息和 Star 状态，请稍候...'
  } else if (status === '正在保存授权信息...') {
    return '正在保存授权信息到本地配置文件...'
  } else if (status === '授权成功！') {
    return '授权流程已完成，即将跳转...'
  }
  return '处理中，请稍候...'
})

// GitHub 授权处理
const handleAuthorize = async () => {
  try {
    console.log('[AdvancedSettings] 开始授权流程')
    authorizing.value = true
    authStatus.value = '等待网页授权...'
    console.log(
      '[AdvancedSettings] authorizing:',
      authorizing.value,
      'authStatus:',
      authStatus.value
    )

    const result = await settingsStore.authorizeGitHub((status) => {
      console.log('[AdvancedSettings] 状态更新:', status)
      authStatus.value = status
    })

    console.log('[AdvancedSettings] 授权结果:', result)

    if (result.success) {
      if (result.starred) {
        authStatus.value = '授权成功！'
        emit('show-snackbar', `授权成功！欢迎 ${result.username}，高级功能已解锁`, 'success')
      } else {
        authStatus.value = '授权成功！'
        emit('show-snackbar', `授权成功！但检测到您未 Star 项目，请 Star 后重新验证`, 'warning')
      }
    } else {
      authStatus.value = ''
      emit('show-snackbar', `授权失败: ${result.error}`, 'error')
    }
  } catch (error) {
    console.error('[AdvancedSettings] 授权异常:', error)
    authStatus.value = ''
    emit('show-snackbar', '授权异常，请稍后重试', 'error')
  } finally {
    setTimeout(() => {
      console.log('[AdvancedSettings] 重置授权状态')
      authorizing.value = false
      authStatus.value = ''
    }, 1000)
  }
}

// 验证 Star 状态
const handleVerify = async () => {
  try {
    verifying.value = true
    verifyStatus.value = '正在验证...'

    const result = await settingsStore.verifyGitHubStar()

    if (result.success) {
      if (result.starred) {
        verifyStatus.value = '验证成功！'
        emit('show-snackbar', '验证成功！高级功能已解锁', 'success')
      } else {
        verifyStatus.value = ''
        emit('show-snackbar', '仍未检测到 Star，请确认已 Star 项目', 'warning')
      }
    } else {
      verifyStatus.value = ''
      emit('show-snackbar', `验证失败: ${result.error}`, 'error')
    }
  } catch (error) {
    console.error('验证异常:', error)
    verifyStatus.value = ''
    emit('show-snackbar', '验证异常，请稍后重试', 'error')
  } finally {
    setTimeout(() => {
      verifying.value = false
      verifyStatus.value = ''
    }, 1000)
  }
}

// 取消授权
const handleRevoke = async () => {
  try {
    await settingsStore.revokeGitHubAuth()
    emit('show-snackbar', '已取消授权，高级功能已禁用', 'info')
  } catch (error) {
    console.error('取消授权失败:', error)
    emit('show-snackbar', '取消授权失败', 'error')
  }
}

// 打开 GitHub 仓库
const openGitHubRepo = () => {
  window.open('https://github.com/MoLeft/React2Shell-Toolbox', '_blank')
}
</script>

<style scoped>
.setting-section {
  padding: 24px;
}

.section-title {
  font-size: 20px;
  font-weight: 500;
  margin-bottom: 24px;
  color: rgba(0, 0, 0, 0.87);
}

.setting-item {
  margin-bottom: 16px;
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

.hijack-config {
  padding: 16px;
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.config-item {
  margin-bottom: 12px;
}

.config-item:last-child {
  margin-bottom: 0;
}

.config-label {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.87);
  margin-bottom: 8px;
}

.config-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
}

.github-auth-section {
  padding: 8px;
}

.auth-header {
  display: flex;
  align-items: center;
}

.auth-header h4 {
  font-size: 18px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.87);
}

.auth-content {
  padding: 8px 0;
}

.user-info-compact {
  display: flex;
  align-items: center;
}

.gap-2 {
  gap: 8px;
}
</style>
