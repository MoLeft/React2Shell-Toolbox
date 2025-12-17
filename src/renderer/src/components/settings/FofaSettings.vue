<template>
  <div class="setting-section">
    <h3 class="section-title">FOFA 设置</h3>

    <v-alert type="info" variant="tonal" density="compact" class="mb-4">
      <div class="text-body-2">
        在 FOFA 个人中心获取 API 凭证：
        <a href="https://fofa.info/userInfo" target="_blank" class="text-primary">
          https://fofa.info/userInfo
        </a>
      </div>
      <div class="text-caption mt-1">修改 FOFA 配置后，建议重启应用以确保生效</div>
    </v-alert>

    <!-- FOFA API Email -->
    <div class="setting-item">
      <div class="setting-name mb-2">FOFA API Email</div>
      <v-text-field
        v-model="fofaApiEmail"
        variant="outlined"
        density="compact"
        placeholder="your-email@example.com"
        style="max-width: 400px"
      >
        <template #prepend-inner>
          <v-icon size="18">mdi-email</v-icon>
        </template>
      </v-text-field>
    </div>

    <!-- FOFA API Key -->
    <div class="setting-item">
      <div class="setting-name mb-2">FOFA API Key</div>
      <v-text-field
        v-model="fofaApiKey"
        type="password"
        variant="outlined"
        density="compact"
        placeholder="your-api-key"
        style="max-width: 400px"
      >
        <template #prepend-inner>
          <v-icon size="18">mdi-key</v-icon>
        </template>
      </v-text-field>
    </div>

    <v-divider class="my-4" />

    <!-- FOFA 接口超时时间 -->
    <div class="setting-item">
      <div class="setting-name mb-2">FOFA 接口超时时间</div>
      <v-text-field
        v-model.number="fofaTimeout"
        type="number"
        variant="outlined"
        density="compact"
        suffix="ms"
        :min="5000"
        :max="120000"
        style="max-width: 300px"
        hint="FOFA 查询可能需要较长时间，建议设置 30 秒以上"
        persistent-hint
      />
    </div>

    <v-divider class="my-4" />

    <!-- FOFA 绕过代理 -->
    <div class="setting-item">
      <div class="setting-header">
        <div class="setting-info">
          <div class="setting-name">FOFA 请求绕过代理</div>
          <div class="setting-desc">
            FOFA API 请求不使用全局代理设置（推荐开启，避免代理影响 FOFA 访问）
          </div>
        </div>
        <v-switch v-model="fofaBypassProxy" color="primary" density="compact" hide-details />
      </div>
    </div>

    <v-divider class="my-4" />

    <!-- 测试 FOFA 连接 -->
    <div class="setting-item">
      <v-btn
        color="success"
        variant="tonal"
        :loading="testing"
        :disabled="!settings.fofaApiEmail || !settings.fofaApiKey"
        @click="$emit('test')"
      >
        <v-icon start>mdi-database-check</v-icon>
        测试 FOFA 连接
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  settings: {
    type: Object,
    required: true
  },
  testing: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['save', 'test'])

// 更新字段的辅助函数
const updateField = (field, value) => {
  props.settings[field] = value
  emit('save')
}

// 使用计算属性避免直接修改 prop
const fofaApiEmail = computed({
  get: () => props.settings.fofaApiEmail,
  set: (val) => updateField('fofaApiEmail', val)
})

const fofaApiKey = computed({
  get: () => props.settings.fofaApiKey,
  set: (val) => updateField('fofaApiKey', val)
})

const fofaBypassProxy = computed({
  get: () => props.settings.fofaBypassProxy,
  set: (val) => updateField('fofaBypassProxy', val)
})

const fofaTimeout = computed({
  get: () => props.settings.fofaTimeout,
  set: (val) => updateField('fofaTimeout', val)
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
