<template>
  <div class="setting-section">
    <h3 class="section-title">{{ $t('settings.advanced.title') }}</h3>

    <!-- GitHub 授权区域 -->
    <v-card class="mb-6 github-auth-card" elevation="0" outlined>
      <v-card-text>
        <div class="github-auth-section">
          <div class="auth-header">
            <v-icon size="32" color="primary">mdi-github</v-icon>
            <h4 class="ml-3">{{ $t('settings.advanced.githubAuth') }}</h4>
          </div>

          <!-- 未授权状态 -->
          <div v-if="!settingsStore.isGithubAuthorized" class="auth-content mt-4">
            <!-- 授权中状态 -->
            <v-alert v-if="authorizing" type="info" variant="tonal" class="mb-4">
              <template #prepend>
                <v-progress-circular indeterminate size="24" width="3" />
              </template>
              <div class="font-weight-bold mb-2">
                {{ authStatus || $t('settings.advanced.waitingAuth') }}
              </div>
              <div class="text-body-2">{{ authHintText }}</div>
            </v-alert>

            <!-- 未授权状态 -->
            <v-alert v-else type="info" variant="tonal" class="mb-4">
              <div class="font-weight-bold mb-2">{{ $t('settings.advanced.needAuth') }}</div>
              <div class="text-body-2">{{ $t('settings.advanced.authDesc') }}</div>
            </v-alert>

            <v-btn color="primary" size="large" :disabled="authorizing" @click="handleAuthorize">
              <v-icon class="mr-2">mdi-github</v-icon>
              {{ $t('settings.advanced.useGithubAuth') }}
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
                <div class="text-caption text-grey">{{ $t('settings.advanced.authSuccess') }}</div>
              </div>
            </div>

            <v-alert type="warning" variant="tonal" class="mb-4">
              <div class="font-weight-bold">{{ $t('settings.advanced.notStarred') }}</div>
              <div class="text-body-2 mt-1">
                {{ $t('settings.advanced.notStarredDesc') }}
              </div>
            </v-alert>

            <div class="d-flex gap-2">
              <v-btn
                color="primary"
                prepend-icon="mdi-star"
                :loading="verifying"
                @click="handleVerify"
              >
                {{
                  verifying
                    ? verifyStatus || $t('settings.advanced.verifying')
                    : $t('settings.advanced.verify')
                }}
              </v-btn>
              <v-btn
                color="primary"
                variant="outlined"
                prepend-icon="mdi-open-in-new"
                @click="openGitHubRepo"
              >
                {{ $t('settings.advanced.goToGithub') }}
              </v-btn>
              <v-btn color="error" variant="text" prepend-icon="mdi-logout" @click="handleRevoke">
                {{ $t('settings.advanced.revoke') }}
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
                  {{ $t('settings.advanced.unlocked') }}
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
                {{ $t('settings.advanced.goToGithub') }}
              </v-btn>
              <v-btn
                color="error"
                variant="text"
                prepend-icon="mdi-logout"
                size="small"
                @click="handleRevoke"
              >
                {{ $t('settings.advanced.revoke') }}
              </v-btn>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- 高级功能配置（仅在已授权且已 Star 时显示） -->
    <template v-if="settingsStore.isHijackUnlocked">
      <!-- POC验证启用劫持路由 -->
      <div class="setting-item">
        <div class="setting-header">
          <div class="setting-info">
            <div class="setting-name">{{ $t('settings.advanced.pocHijack') }}</div>
            <div class="setting-desc">{{ $t('settings.advanced.pocHijackDesc') }}</div>
          </div>
          <v-switch v-model="pocHijackEnabled" color="error" density="compact" hide-details />
        </div>
      </div>

      <v-divider class="my-4" />

      <!-- 批量检测启用劫持路由 -->
      <div class="setting-item">
        <div class="setting-header">
          <div class="setting-info">
            <div class="setting-name">{{ $t('settings.advanced.batchHijack') }}</div>
            <div class="setting-desc">{{ $t('settings.advanced.batchHijackDesc') }}</div>
          </div>
          <v-switch v-model="batchHijackEnabled" color="error" density="compact" hide-details />
        </div>

        <!-- 挂黑配置（仅在启用时显示） -->
        <div v-if="batchHijackEnabled" class="hijack-config mt-4">
          <!-- 注入路由 -->
          <div class="config-item mb-4">
            <div class="config-label">{{ $t('settings.advanced.injectRoute') }}</div>
            <v-radio-group v-model="hijackRouteMode" hide-details density="compact">
              <v-radio :label="$t('settings.advanced.specificRoute')" value="specific">
                <template #label>
                  <div class="d-flex align-center">
                    <span>{{ $t('settings.advanced.specificRoute') }}</span>
                    <v-chip size="x-small" class="ml-2" color="primary" variant="tonal">
                      {{ $t('settings.advanced.recommended') }}
                    </v-chip>
                  </div>
                </template>
              </v-radio>
              <v-radio :label="$t('settings.advanced.globalRoute')" value="global">
                <template #label>
                  <div class="d-flex align-center">
                    <span>{{ $t('settings.advanced.globalRoute') }}</span>
                    <v-chip size="x-small" class="ml-2" color="warning" variant="tonal">
                      {{ $t('settings.advanced.caution') }}
                    </v-chip>
                  </div>
                </template>
              </v-radio>
            </v-radio-group>
            <v-text-field
              v-if="hijackRouteMode === 'specific'"
              v-model="hijackTargetRoute"
              :label="$t('settings.advanced.targetRoute')"
              variant="outlined"
              density="compact"
              class="mt-3"
              :placeholder="$t('settings.advanced.targetRoutePlaceholder')"
              :hint="$t('settings.advanced.targetRouteHint')"
              persistent-hint
            />
          </div>

          <!-- HTML 黑页模板 -->
          <div class="config-item">
            <div class="config-label mb-2">{{ $t('settings.advanced.htmlTemplate') }}</div>
            <v-btn
              size="small"
              variant="tonal"
              color="primary"
              prepend-icon="mdi-pencil"
              @click="$emit('edit-hijack-template')"
            >
              {{ $t('settings.advanced.editTemplate') }}
            </v-btn>
            <div class="config-hint mt-2">{{ $t('settings.advanced.editTemplateHint') }}</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '../../stores/settingsStore'
import { createLogger } from '@/utils/logger'

const logger = createLogger('AdvancedSettings')
const { t } = useI18n()

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
  logger.debug('updateField called', { field, value })
  const before = JSON.parse(JSON.stringify(props.settings))
  logger.debug('advancedUnlocked BEFORE', before.advancedUnlocked)
  logger.debug('pocHijackEnabled BEFORE', before.pocHijackEnabled)

  props.settings[field] = value

  const after = JSON.parse(JSON.stringify(props.settings))
  logger.debug('advancedUnlocked AFTER', after.advancedUnlocked)
  logger.debug('pocHijackEnabled AFTER', after.pocHijackEnabled)

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
  if (!status || status === t('settings.advanced.waitingAuth')) {
    return t('settings.advanced.authHints.waiting')
  } else if (status.includes('info') || status.includes('Getting')) {
    return t('settings.advanced.authHints.gettingInfo')
  } else if (status.includes('Saving') || status.includes('save')) {
    return t('settings.advanced.authHints.saving')
  } else if (status.includes('success') || status.includes('Success')) {
    return t('settings.advanced.authHints.success')
  }
  return t('settings.advanced.authHints.processing')
})

// GitHub 授权处理
const handleAuthorize = async () => {
  try {
    logger.info('开始授权流程')
    authorizing.value = true
    authStatus.value = t('settings.advanced.waitingAuth')
    logger.debug('授权状态', {
      authorizing: authorizing.value,
      authStatus: authStatus.value
    })

    const result = await settingsStore.authorizeGitHub((status) => {
      logger.debug('状态更新', status)
      authStatus.value = status
    })

    logger.info('授权结果', result)

    if (result.success) {
      if (result.starred) {
        authStatus.value = t('settings.advanced.authSuccess') + '！'
        emit(
          'show-snackbar',
          t('settings.advanced.authSuccessMsg', { username: result.username }),
          'success'
        )
      } else {
        authStatus.value = t('settings.advanced.authSuccess') + '！'
        emit('show-snackbar', t('settings.advanced.authSuccessNoStar'), 'warning')
      }
    } else {
      authStatus.value = ''
      emit('show-snackbar', `${t('settings.advanced.authFailed')}: ${result.error}`, 'error')
    }
  } catch (error) {
    logger.error('授权异常', error)
    authStatus.value = ''
    emit('show-snackbar', t('settings.advanced.authError'), 'error')
  } finally {
    setTimeout(() => {
      logger.debug('重置授权状态')
      authorizing.value = false
      authStatus.value = ''
    }, 1000)
  }
}

// 验证 Star 状态
const handleVerify = async () => {
  try {
    verifying.value = true
    verifyStatus.value = t('settings.advanced.verifying')

    const result = await settingsStore.verifyGitHubStar()

    if (result.success) {
      if (result.starred) {
        verifyStatus.value = t('settings.advanced.verifySuccess')
        emit('show-snackbar', t('settings.advanced.verifySuccess'), 'success')
      } else {
        verifyStatus.value = ''
        emit('show-snackbar', t('settings.advanced.verifyFailed'), 'warning')
      }
    } else {
      verifyStatus.value = ''
      emit('show-snackbar', `${t('settings.advanced.authFailed')}: ${result.error}`, 'error')
    }
  } catch (error) {
    logger.error('验证异常', error)
    verifyStatus.value = ''
    emit('show-snackbar', t('settings.advanced.verifyError'), 'error')
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
    emit('show-snackbar', t('settings.advanced.revokeSuccess'), 'info')
  } catch (error) {
    logger.error('取消授权失败', error)
    emit('show-snackbar', t('settings.advanced.revokeFailed'), 'error')
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

.github-auth-card {
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
