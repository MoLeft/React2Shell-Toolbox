<template>
  <div class="setting-section">
    <h3 class="section-title">{{ $t('settings.developer.title') }}</h3>

    <!-- 启用日志显示 -->
    <div class="setting-item">
      <div class="setting-header">
        <div class="setting-info">
          <div class="setting-name">{{ $t('settings.developer.enableLogs') }}</div>
          <div class="setting-desc">{{ $t('settings.developer.enableLogsDesc') }}</div>
        </div>
        <v-switch v-model="logsEnabled" color="primary" density="compact" hide-details />
      </div>
    </div>

    <!-- 启用内置控制台 -->
    <div class="setting-item">
      <div class="setting-header">
        <div class="setting-info">
          <div class="setting-name">{{ $t('settings.developer.enableConsole') }}</div>
          <div class="setting-desc">{{ $t('settings.developer.enableConsoleDesc') }}</div>
        </div>
        <v-switch v-model="consoleEnabled" color="primary" density="compact" hide-details />
      </div>
    </div>

    <!-- 启用开发者工具 -->
    <div class="setting-item">
      <div class="setting-header">
        <div class="setting-info">
          <div class="setting-name">{{ $t('settings.developer.enableDevTools') }}</div>
          <div class="setting-desc">{{ $t('settings.developer.enableDevToolsDesc') }}</div>
        </div>
        <v-switch v-model="devToolsEnabled" color="primary" density="compact" hide-details />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  settings: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['save'])

// 使用计算属性避免直接修改 prop
const logsEnabled = computed({
  get: () => props.settings.developerLogsEnabled || false,
  set: (val) => {
    props.settings.developerLogsEnabled = val
    emit('save')
  }
})

const consoleEnabled = computed({
  get: () => props.settings.developerConsoleEnabled || false,
  set: (val) => {
    props.settings.developerConsoleEnabled = val
    emit('save')
  }
})

const devToolsEnabled = computed({
  get: () => props.settings.developerDevToolsEnabled || false,
  set: async (val) => {
    props.settings.developerDevToolsEnabled = val
    emit('save')
    // 通知主进程更新开发者工具状态
    if (window.api?.devTools) {
      await window.api.devTools.setEnabled(val)
    }
  }
})
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
