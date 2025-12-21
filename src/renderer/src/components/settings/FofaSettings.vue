<template>
  <div class="setting-section">
    <h3 class="section-title">{{ $t('settings.fofa.title') }}</h3>

    <v-alert type="info" variant="tonal" density="compact" class="mb-4">
      <div class="text-body-2">
        {{ $t('settings.fofa.infoAlert') }}
        <a :href="$t('settings.fofa.infoLink')" target="_blank" class="text-primary">
          {{ $t('settings.fofa.infoLink') }}
        </a>
      </div>
      <div class="text-caption mt-1">{{ $t('settings.fofa.restartHint') }}</div>
    </v-alert>

    <!-- 自定义 FOFA API -->
    <div class="setting-item">
      <div class="setting-header">
        <div class="setting-info">
          <div class="setting-name">{{ $t('settings.fofa.customApi') }}</div>
          <div class="setting-desc">
            {{ $t('settings.fofa.customApiDesc') }}
          </div>
        </div>
        <v-switch v-model="fofaCustomApi" color="primary" density="compact" hide-details />
      </div>
    </div>

    <!-- 自定义 API 配置（仅在开关开启时显示） -->
    <v-expand-transition>
      <div v-if="fofaCustomApi" class="custom-api-config mt-4">
        <!-- API 地址 -->
        <div class="setting-item">
          <!-- <div class="setting-name mb-2">{{ $t('settings.fofa.apiDomain') }}</div> -->
          <div class="api-url-input">
            <v-select
              v-model="fofaApiProtocol"
              :items="apiProtocols"
              variant="outlined"
              density="compact"
              hide-details
              class="protocol-select"
            />
            <v-text-field
              v-model="fofaApiDomain"
              variant="outlined"
              density="compact"
              :placeholder="$t('settings.fofa.apiDomainPlaceholder')"
              suffix="/api/v1"
              hide-details
              class="domain-input"
            >
              <!-- <template #prepend-inner>
                <v-icon size="18">mdi-web</v-icon>
              </template> -->
            </v-text-field>
          </div>
          <div class="text-caption text-medium-emphasis mt-2">
            {{ $t('settings.fofa.apiDomainHint') }}
          </div>
        </div>

        <!-- 完整 API URL 预览 -->
        <v-alert type="info" variant="tonal" density="compact" class="mt-4">
          <div class="text-caption">
            <strong>{{ $t('common.preview') }}:</strong>
            {{ fullApiUrl }}
          </div>
        </v-alert>
      </div>
    </v-expand-transition>

    <v-divider class="my-4" />

    <!-- FOFA API Email -->
    <div class="setting-item">
      <div class="setting-name mb-2">{{ $t('settings.fofa.email') }}</div>
      <v-text-field
        v-model="fofaApiEmail"
        variant="outlined"
        density="compact"
        :placeholder="$t('settings.fofa.emailPlaceholder')"
        style="max-width: 400px"
      >
        <template #prepend-inner>
          <v-icon size="18">mdi-email</v-icon>
        </template>
      </v-text-field>
    </div>

    <!-- FOFA API Key -->
    <div class="setting-item">
      <div class="setting-name mb-2">{{ $t('settings.fofa.apiKey') }}</div>
      <v-text-field
        v-model="fofaApiKey"
        type="password"
        variant="outlined"
        density="compact"
        :placeholder="$t('settings.fofa.apiKeyPlaceholder')"
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
      <div class="setting-name mb-2">{{ $t('settings.fofa.timeout') }}</div>
      <v-text-field
        v-model.number="fofaTimeout"
        type="number"
        variant="outlined"
        density="compact"
        suffix="ms"
        :min="5000"
        :max="120000"
        style="max-width: 300px"
        :hint="$t('settings.fofa.timeoutHint')"
        persistent-hint
      />
    </div>

    <v-divider class="my-4" />

    <!-- FOFA 绕过代理 -->
    <div class="setting-item">
      <div class="setting-header">
        <div class="setting-info">
          <div class="setting-name">{{ $t('settings.fofa.bypassProxy') }}</div>
          <div class="setting-desc">
            {{ $t('settings.fofa.bypassProxyDesc') }}
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
        {{ $t('settings.fofa.test') }}
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

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

// API 协议选项
const apiProtocols = computed(() => [
  { title: 'https://', value: 'https' },
  { title: 'http://', value: 'http' }
])

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

const fofaCustomApi = computed({
  get: () => props.settings.fofaCustomApi || false,
  set: (val) => updateField('fofaCustomApi', val)
})

const fofaApiProtocol = computed({
  get: () => props.settings.fofaApiProtocol || 'https',
  set: (val) => updateField('fofaApiProtocol', val)
})

const fofaApiDomain = computed({
  get: () => props.settings.fofaApiDomain || 'fofa.info',
  set: (val) => updateField('fofaApiDomain', val)
})

// 完整 API URL 预览
const fullApiUrl = computed(() => {
  const protocol = fofaApiProtocol.value || 'https'
  const domain = fofaApiDomain.value || 'fofa.info'
  return `${protocol}://${domain}/api/v1`
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

.custom-api-config {
  padding-left: 16px;
  border-left: 3px solid rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.05);
  padding: 16px;
  border-radius: 4px;
}

.api-url-input {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 600px;
}

.protocol-select {
  flex: 0 0 140px;
  min-width: 140px;
}

.domain-input {
  flex: 1;
}
</style>
