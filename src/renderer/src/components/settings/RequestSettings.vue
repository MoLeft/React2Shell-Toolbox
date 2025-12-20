<template>
  <div class="setting-section">
    <h3 class="section-title">{{ $t('settings.request.title') }}</h3>

    <!-- 响应超时时间 -->
    <div class="setting-item">
      <div class="setting-header">
        <div class="setting-info">
          <div class="setting-name">{{ $t('settings.request.timeout') }}</div>
          <div class="setting-desc">{{ $t('settings.request.timeoutDesc') }}</div>
        </div>
      </div>
      <v-text-field
        v-model.number="timeout"
        type="number"
        variant="outlined"
        density="compact"
        suffix="ms"
        :min="1000"
        :max="60000"
        class="mt-3"
        style="max-width: 300px"
      />
    </div>

    <v-divider class="my-4" />

    <!-- 忽略 SSL 证书错误 -->
    <div class="setting-item">
      <div class="setting-header">
        <div class="setting-info">
          <div class="setting-name">{{ $t('settings.request.ignoreCertErrors') }}</div>
          <div class="setting-desc">{{ $t('settings.request.ignoreCertErrorsDesc') }}</div>
        </div>
        <v-switch v-model="ignoreCertErrors" color="warning" density="compact" hide-details />
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

const emit = defineEmits(['save', 'update:field'])

// 更新字段的辅助函数
const updateField = (field, value) => {
  props.settings[field] = value
  emit('save')
}

// 使用计算属性避免直接修改 prop
const timeout = computed({
  get: () => props.settings.timeout,
  set: (val) => updateField('timeout', val)
})

const ignoreCertErrors = computed({
  get: () => props.settings.ignoreCertErrors,
  set: (val) => updateField('ignoreCertErrors', val)
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
