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
        导出数据
      </v-card-title>

      <v-divider />

      <v-card-text class="pt-4">
        <!-- 导出范围选择 -->
        <div class="mb-4">
          <div class="text-subtitle-2 mb-2">导出范围</div>
          <v-radio-group v-model="localExportScope" hide-details>
            <v-radio label="全部" value="all">
              <template #label>
                <div class="d-flex align-center">
                  <span>全部</span>
                  <span class="ml-2 text-caption text-grey">({{ stats.all }} 条)</span>
                </div>
              </template>
            </v-radio>
            <v-radio label="安全" value="safe">
              <template #label>
                <div class="d-flex align-center">
                  <span>安全</span>
                  <span class="ml-2 text-caption text-success">({{ stats.safe }} 条)</span>
                </div>
              </template>
            </v-radio>
            <v-radio label="存在漏洞" value="vulnerable">
              <template #label>
                <div class="d-flex align-center">
                  <span>存在漏洞</span>
                  <span class="ml-2 text-caption text-error">({{ stats.vulnerable }} 条)</span>
                </div>
              </template>
            </v-radio>
            <v-radio label="验证出错" value="error">
              <template #label>
                <div class="d-flex align-center">
                  <span>验证出错</span>
                  <span class="ml-2 text-caption text-warning">({{ stats.error }} 条)</span>
                </div>
              </template>
            </v-radio>
            <v-radio label="未验证" value="pending">
              <template #label>
                <div class="d-flex align-center">
                  <span>未验证</span>
                  <span class="ml-2 text-caption text-grey">({{ stats.pending }} 条)</span>
                </div>
              </template>
            </v-radio>
            <v-radio v-if="batchHijackEnabled" label="已挂黑" value="hijacked">
              <template #label>
                <div class="d-flex align-center">
                  <span>已挂黑</span>
                  <span class="ml-2 text-caption text-grey">({{ stats.hijacked || 0 }} 条)</span>
                </div>
              </template>
            </v-radio>
            <v-radio v-if="batchHijackEnabled" label="挂黑失败" value="hijack-failed">
              <template #label>
                <div class="d-flex align-center">
                  <span>挂黑失败</span>
                  <span class="ml-2 text-caption text-deep-orange"
                    >({{ stats.hijackFailed || 0 }} 条)</span
                  >
                </div>
              </template>
            </v-radio>
          </v-radio-group>
        </div>

        <!-- 导出格式选择 -->
        <div class="mb-4">
          <div class="text-subtitle-2 mb-2">导出格式</div>
          <v-radio-group v-model="localExportFormat" hide-details>
            <v-radio label="TXT (纯文本)" value="txt" />
            <v-radio label="CSV (逗号分隔)" value="csv" />
            <v-radio label="JSON (结构化数据)" value="json" />
          </v-radio-group>
        </div>

        <!-- 导出提示 -->
        <v-alert v-if="getExportCount === 0" type="warning" variant="tonal" density="compact">
          所选范围没有数据可导出
        </v-alert>
        <v-alert v-else type="info" variant="tonal" density="compact">
          将导出 {{ getExportCount }} 条数据
        </v-alert>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="handleCancel">取消</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :disabled="getExportCount === 0"
          @click="handleExport"
        >
          导出
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
