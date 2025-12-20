<template>
  <v-dialog
    :model-value="modelValue"
    max-width="500"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-download</v-icon>
        {{ $t('batch.exportDialog.title') }}
      </v-card-title>

      <v-divider />

      <v-card-text class="pt-4">
        <!-- 导出范围选择 -->
        <div class="mb-4">
          <div class="text-subtitle-2 mb-2">{{ $t('batch.exportDialog.scope') }}</div>
          <v-radio-group v-model="localExportScope" hide-details>
            <v-radio value="all">
              <template #label>
                <div class="d-flex align-center">
                  <span>{{ $t('batch.exportDialog.scopeAll') }}</span>
                  <span class="ml-2 text-caption text-grey"
                    >({{ stats.all }} {{ $t('batch.exportDialog.items') }})</span
                  >
                </div>
              </template>
            </v-radio>
            <v-radio value="safe">
              <template #label>
                <div class="d-flex align-center">
                  <span>{{ $t('batch.exportDialog.scopeSafe') }}</span>
                  <span class="ml-2 text-caption text-success"
                    >({{ stats.safe }} {{ $t('batch.exportDialog.items') }})</span
                  >
                </div>
              </template>
            </v-radio>
            <v-radio value="vulnerable">
              <template #label>
                <div class="d-flex align-center">
                  <span>{{ $t('batch.exportDialog.scopeVulnerable') }}</span>
                  <span class="ml-2 text-caption text-error"
                    >({{ stats.vulnerable }} {{ $t('batch.exportDialog.items') }})</span
                  >
                </div>
              </template>
            </v-radio>
            <v-radio value="error">
              <template #label>
                <div class="d-flex align-center">
                  <span>{{ $t('batch.exportDialog.scopeError') }}</span>
                  <span class="ml-2 text-caption text-warning"
                    >({{ stats.error }} {{ $t('batch.exportDialog.items') }})</span
                  >
                </div>
              </template>
            </v-radio>
            <v-radio value="pending">
              <template #label>
                <div class="d-flex align-center">
                  <span>{{ $t('batch.exportDialog.scopePending') }}</span>
                  <span class="ml-2 text-caption text-grey"
                    >({{ stats.pending }} {{ $t('batch.exportDialog.items') }})</span
                  >
                </div>
              </template>
            </v-radio>
            <v-radio v-if="batchHijackEnabled" value="hijacked">
              <template #label>
                <div class="d-flex align-center">
                  <span>{{ $t('batch.exportDialog.scopeHijacked') }}</span>
                  <span class="ml-2 text-caption text-grey"
                    >({{ stats.hijacked || 0 }} {{ $t('batch.exportDialog.items') }})</span
                  >
                </div>
              </template>
            </v-radio>
            <v-radio v-if="batchHijackEnabled" value="hijack-failed">
              <template #label>
                <div class="d-flex align-center">
                  <span>{{ $t('batch.exportDialog.scopeHijackFailed') }}</span>
                  <span class="ml-2 text-caption text-deep-orange"
                    >({{ stats.hijackFailed || 0 }} {{ $t('batch.exportDialog.items') }})</span
                  >
                </div>
              </template>
            </v-radio>
          </v-radio-group>
        </div>

        <!-- 导出格式选择 -->
        <div class="mb-4">
          <div class="text-subtitle-2 mb-2">{{ $t('batch.exportDialog.format') }}</div>
          <v-radio-group v-model="localExportFormat" hide-details>
            <v-radio :label="$t('batch.exportDialog.formatTxt')" value="txt" />
            <v-radio :label="$t('batch.exportDialog.formatCsv')" value="csv" />
            <v-radio :label="$t('batch.exportDialog.formatJson')" value="json" />
          </v-radio-group>
        </div>

        <!-- 导出提示 -->
        <v-alert v-if="getExportCount === 0" type="warning" variant="tonal" density="compact">
          {{ $t('batch.exportDialog.noData') }}
        </v-alert>
        <v-alert v-else type="info" variant="tonal" density="compact">
          {{ $t('batch.exportDialog.willExport', { count: getExportCount }) }}
        </v-alert>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="handleCancel">{{ $t('common.cancel') }}</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :disabled="getExportCount === 0"
          @click="handleExport"
        >
          {{ $t('common.export') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  stats: {
    type: Object,
    required: true
  },
  exportScope: {
    type: String,
    default: 'all'
  },
  exportFormat: {
    type: String,
    default: 'txt'
  },
  batchHijackEnabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'export', 'cancel'])

const localExportScope = ref(props.exportScope)
const localExportFormat = ref(props.exportFormat)

// 监听 props 变化
watch(
  () => props.exportScope,
  (newVal) => {
    localExportScope.value = newVal
  }
)

watch(
  () => props.exportFormat,
  (newVal) => {
    localExportFormat.value = newVal
  }
)

// 计算导出数量
const getExportCount = computed(() => {
  const scope = localExportScope.value
  if (scope === 'all') return props.stats.all
  return props.stats[scope] || 0
})

// 处理导出
const handleExport = () => {
  emit('export', {
    scope: localExportScope.value,
    format: localExportFormat.value
  })
}

// 处理取消
const handleCancel = () => {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>

<style scoped>
.text-subtitle-2 {
  font-weight: 500;
  color: rgba(0, 0, 0, 0.87);
}
</style>
