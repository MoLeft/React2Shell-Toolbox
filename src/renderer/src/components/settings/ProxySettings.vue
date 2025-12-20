<template>
  <div class="setting-section">
    <h3 class="section-title">{{ $t('settings.proxy.title') }}</h3>

    <!-- 启用代理开关 -->
    <div class="setting-item">
      <div class="setting-header">
        <div class="setting-info">
          <div class="setting-name">{{ $t('settings.proxy.enable') }}</div>
          <div class="setting-desc">{{ $t('settings.proxy.enableDesc') }}</div>
        </div>
        <v-switch v-model="proxyEnabled" color="primary" density="compact" hide-details />
      </div>
    </div>

    <!-- 代理配置表单 -->
    <div v-if="settings.proxyEnabled" class="proxy-form">
      <v-divider class="my-4" />

      <!-- 代理协议 -->
      <div class="setting-item">
        <div class="setting-name mb-2">{{ $t('settings.proxy.protocol') }}</div>
        <v-select
          v-model="proxyProtocol"
          :items="proxyProtocols"
          variant="outlined"
          density="compact"
          style="max-width: 300px"
        />
      </div>

      <!-- 代理地址和端口 -->
      <div class="setting-item">
        <div class="setting-name mb-2">{{ $t('settings.proxy.server') }}</div>
        <v-row dense style="max-width: 500px">
          <v-col cols="8">
            <v-text-field
              v-model="proxyHost"
              :label="$t('settings.proxy.host')"
              variant="outlined"
              density="compact"
              :placeholder="$t('settings.proxy.hostPlaceholder')"
            />
          </v-col>
          <v-col cols="4">
            <v-text-field
              v-model.number="proxyPort"
              :label="$t('settings.proxy.port')"
              type="number"
              variant="outlined"
              density="compact"
              :placeholder="$t('settings.proxy.portPlaceholder')"
            />
          </v-col>
        </v-row>
      </div>

      <!-- 代理认证开关 -->
      <div class="setting-item">
        <div class="setting-header">
          <div class="setting-info">
            <div class="setting-name">{{ $t('settings.proxy.auth') }}</div>
            <div class="setting-desc">{{ $t('settings.proxy.authDesc') }}</div>
          </div>
          <v-switch v-model="proxyAuth" color="primary" density="compact" hide-details />
        </div>
      </div>

      <!-- 认证信息 -->
      <div v-if="settings.proxyAuth" class="auth-form">
        <div class="setting-item">
          <div class="setting-name mb-2">{{ $t('settings.proxy.username') }}</div>
          <v-text-field
            v-model="proxyUsername"
            variant="outlined"
            density="compact"
            style="max-width: 300px"
          >
            <template #prepend-inner>
              <v-icon size="18">mdi-account</v-icon>
            </template>
          </v-text-field>
        </div>

        <div class="setting-item">
          <div class="setting-name mb-2">{{ $t('settings.proxy.password') }}</div>
          <v-text-field
            v-model="proxyPassword"
            type="password"
            variant="outlined"
            density="compact"
            style="max-width: 300px"
          >
            <template #prepend-inner>
              <v-icon size="18">mdi-lock</v-icon>
            </template>
          </v-text-field>
        </div>
      </div>

      <!-- 测试代理按钮 -->
      <div class="setting-item">
        <v-btn color="success" variant="tonal" :loading="testing" @click="$emit('test')">
          <v-icon start>mdi-network-outline</v-icon>
          {{ $t('settings.proxy.test') }}
        </v-btn>
      </div>
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

const proxyProtocols = computed(() => [
  { title: t('settings.proxy.protocolHttp'), value: 'http' },
  { title: t('settings.proxy.protocolHttps'), value: 'https' },
  { title: t('settings.proxy.protocolSocks5'), value: 'socks5' }
])

// 更新字段的辅助函数
const updateField = (field, value) => {
  props.settings[field] = value
  emit('save')
}

// 使用计算属性避免直接修改 prop
const proxyEnabled = computed({
  get: () => props.settings.proxyEnabled,
  set: (val) => updateField('proxyEnabled', val)
})

const proxyProtocol = computed({
  get: () => props.settings.proxyProtocol,
  set: (val) => updateField('proxyProtocol', val)
})

const proxyHost = computed({
  get: () => props.settings.proxyHost,
  set: (val) => updateField('proxyHost', val)
})

const proxyPort = computed({
  get: () => props.settings.proxyPort,
  set: (val) => updateField('proxyPort', val)
})

const proxyAuth = computed({
  get: () => props.settings.proxyAuth,
  set: (val) => updateField('proxyAuth', val)
})

const proxyUsername = computed({
  get: () => props.settings.proxyUsername,
  set: (val) => updateField('proxyUsername', val)
})

const proxyPassword = computed({
  get: () => props.settings.proxyPassword,
  set: (val) => updateField('proxyPassword', val)
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

.proxy-form,
.auth-form {
  margin-top: 16px;
}
</style>
