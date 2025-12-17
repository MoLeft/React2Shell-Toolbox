<template>
  <div class="setting-section">
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
          <v-switch v-model="autoCheckUpdate" color="primary" density="compact" hide-details />
        </div>
      </div>

      <v-divider class="my-3" />

      <!-- 版本信息 -->
      <div class="setting-item">
        <div class="d-flex justify-space-between align-center">
          <div>
            <div class="setting-name">当前版本</div>
            <div class="setting-desc">v{{ version }}</div>
          </div>
          <v-btn
            color="primary"
            variant="tonal"
            size="small"
            :loading="checking"
            @click="$emit('check-update')"
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
            {{ new Date().getFullYear() }} MoLeft. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import logoImage from '@renderer/assets/logo.png'

import { computed } from 'vue'

const props = defineProps({
  version: {
    type: String,
    default: '1.0.0'
  },
  checking: {
    type: Boolean,
    default: false
  },
  settings: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['check-update', 'save'])

// 更新字段的辅助函数
const updateField = (field, value) => {
  props.settings[field] = value
  emit('save')
}

// 使用计算属性避免直接修改 prop
const autoCheckUpdate = computed({
  get: () => props.settings.autoCheckUpdate,
  set: (val) => updateField('autoCheckUpdate', val)
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

.setting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.setting-info {
  flex: 1;
}

.about-content {
  max-width: 600px;
}
</style>
