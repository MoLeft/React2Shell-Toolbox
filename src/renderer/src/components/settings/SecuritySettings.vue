<template>
  <div class="setting-section">
    <h3 class="section-title">安全设置</h3>

    <!-- 应用密码保护 -->
    <div class="setting-item">
      <div class="setting-header">
        <div class="setting-info">
          <div class="setting-name">应用密码保护</div>
          <div class="setting-desc">启用后，每次打开应用时需要输入密码</div>
        </div>
        <v-switch
          v-model="enableAppPassword"
          color="primary"
          density="compact"
          hide-details
          @update:model-value="handleAppPasswordToggle"
        />
      </div>

      <v-expand-transition>
        <div v-if="enableAppPassword" class="mt-3">
          <v-btn
            color="primary"
            variant="tonal"
            size="small"
            prepend-icon="mdi-key"
            @click="showSetAppPasswordDialog = true"
          >
            {{ settings.security?.appPasswordHash ? '修改密码' : '设置密码' }}
          </v-btn>
        </div>
      </v-expand-transition>
    </div>

    <v-divider class="my-4" />

    <!-- 任务文件加密 -->
    <div class="setting-item">
      <div class="setting-header">
        <div class="setting-info">
          <div class="setting-name">任务文件加密</div>
          <div class="setting-desc">启用后，导出的任务文件将自动使用设置的密码加密</div>
        </div>
        <v-switch
          v-model="enableTaskEncryption"
          color="primary"
          density="compact"
          hide-details
          @update:model-value="handleTaskEncryptionToggle"
        />
      </div>

      <v-expand-transition>
        <div v-if="enableTaskEncryption" class="mt-3">
          <v-btn
            color="primary"
            variant="tonal"
            size="small"
            prepend-icon="mdi-key"
            @click="showSetTaskPasswordDialog = true"
          >
            {{ settings.security?.taskPasswordHash ? '修改密码' : '设置密码' }}
          </v-btn>
        </div>
      </v-expand-transition>
    </div>

    <!-- 设置应用密码对话框 -->
    <password-dialog
      v-model="showSetAppPasswordDialog"
      title="设置应用密码"
      label="请输入密码"
      hint="此密码将用于保护应用启动"
      :require-confirm="true"
      @confirm="handleSetAppPassword"
      @cancel="showSetAppPasswordDialog = false"
    />

    <!-- 设置任务加密密码对话框 -->
    <password-dialog
      v-model="showSetTaskPasswordDialog"
      title="设置任务加密密码"
      label="请输入密码"
      hint="此密码将用于加密导出的任务文件"
      :require-confirm="true"
      @confirm="handleSetTaskPassword"
      @cancel="showSetTaskPasswordDialog = false"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import PasswordDialog from '../PasswordDialog.vue'
import { encryptData } from '../../utils/crypto'

const props = defineProps({
  settings: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['save', 'show-snackbar'])

// 密码对话框
const showSetAppPasswordDialog = ref(false)
const showSetTaskPasswordDialog = ref(false)

// 确保 security 对象存在
if (!props.settings.security) {
  props.settings.security = {
    enableAppPassword: false,
    appPasswordHash: '',
    enableTaskEncryption: false
  }
}

// 更新字段的辅助函数
const updateField = (field, value) => {
  if (!props.settings.security) {
    props.settings.security = {
      enableAppPassword: false,
      appPasswordHash: '',
      enableTaskEncryption: false
    }
  }
  props.settings.security[field] = value
  emit('save')
}

// 使用计算属性避免直接修改 prop
const enableAppPassword = computed({
  get: () => props.settings.security?.enableAppPassword || false,
  set: (val) => updateField('enableAppPassword', val)
})

const enableTaskEncryption = computed({
  get: () => props.settings.security?.enableTaskEncryption || false,
  set: (val) => updateField('enableTaskEncryption', val)
})

// 处理应用密码开关
const handleAppPasswordToggle = (enabled) => {
  if (enabled && !props.settings.security?.appPasswordHash) {
    // 如果启用但没有设置密码，弹出密码对话框
    showSetAppPasswordDialog.value = true
  } else if (!enabled) {
    // 如果禁用，清除密码
    updateField('appPasswordHash', '')
  }
}

// 设置应用密码
const handleSetAppPassword = async (password) => {
  try {
    // 使用密码加密一个测试字符串作为密码哈希
    const testString = 'R2STB_APP_PASSWORD_VERIFICATION'
    const passwordHash = await encryptData(testString, password)
    updateField('appPasswordHash', passwordHash)
    showSetAppPasswordDialog.value = false
    emit('show-snackbar', '应用密码设置成功', 'success')
  } catch (error) {
    emit('show-snackbar', '密码设置失败: ' + error.message, 'error')
  }
}

// 处理任务加密开关
const handleTaskEncryptionToggle = (enabled) => {
  if (enabled && !props.settings.security?.taskPasswordHash) {
    // 如果启用但没有设置密码，弹出密码对话框
    showSetTaskPasswordDialog.value = true
  } else if (!enabled) {
    // 如果禁用，清除密码
    updateField('taskPasswordHash', '')
  }
}

// 设置任务加密密码
const handleSetTaskPassword = async (password) => {
  try {
    // 使用魔改的哈希函数生成密码哈希
    const { hashPassword } = await import('../../utils/crypto')
    const passwordHash = await hashPassword(password)
    updateField('taskPasswordHash', passwordHash)
    showSetTaskPasswordDialog.value = false
    emit('show-snackbar', '任务加密密码设置成功', 'success')
  } catch (error) {
    emit('show-snackbar', '密码设置失败: ' + error.message, 'error')
  }
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
</style>
