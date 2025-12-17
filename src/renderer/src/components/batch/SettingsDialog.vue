<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="text-h6 d-flex align-center">
        <v-icon class="mr-2">mdi-cog</v-icon>
        批量验证设置
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-4">
        <!-- 每页数量设置 -->
        <div class="mb-6">
          <div class="text-subtitle-2 mb-2">每页数量</div>
          <v-radio-group v-model="localSettings.pageSize" inline hide-details>
            <v-radio label="20" :value="20" />
            <v-radio label="50" :value="50" />
            <v-radio label="100" :value="100" />
            <v-radio label="200" :value="200" />
            <v-radio label="自定义" :value="0" />
          </v-radio-group>
          <v-text-field
            v-if="localSettings.pageSize === 0"
            v-model.number="localSettings.customPageSize"
            type="number"
            label="自定义数量"
            variant="outlined"
            density="compact"
            class="mt-3"
            :rules="[
              (v) => !!v || '请输入数量',
              (v) => v > 0 || '数量必须大于0',
              (v) => v <= 10000 || '数量不能超过10000'
            ]"
            hint="最大不超过 10000"
            persistent-hint
          />
        </div>

        <!-- FOFA 最大数量设置 -->
        <div class="mb-6">
          <div class="text-subtitle-2 mb-2">FOFA 最大数量</div>
          <v-text-field
            v-model.number="localSettings.maxFofaResults"
            type="number"
            label="最大数量"
            variant="outlined"
            density="compact"
            :rules="[
              (v) => !!v || '请输入数量',
              (v) => v > 0 || '数量必须大于0',
              (v) => v <= 10000 || '数量不能超过10000'
            ]"
            hint="限制从 FOFA 获取的最大数据量，默认 10000"
            persistent-hint
          />
        </div>

        <!-- 验证命令设置 -->
        <div class="mb-4">
          <div class="text-subtitle-2 mb-2">验证命令</div>
          <v-text-field
            v-model="localSettings.verifyCommand"
            label="命令"
            variant="outlined"
            density="compact"
            placeholder="whoami"
            hint="默认命令为 whoami，可自定义其他命令"
            persistent-hint
          />
        </div>

        <!-- 一键挂黑提示 -->
        <v-alert type="info" variant="tonal" density="compact" class="mb-4">
          <div class="d-flex align-center justify-space-between">
            <span>一键挂黑功能已移至"设置 → 高级功能"中配置</span>
            <v-btn size="x-small" variant="text" color="primary" @click="$emit('go-to-settings')">
              前往设置
            </v-btn>
          </div>
        </v-alert>
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('cancel')">取消</v-btn>
        <v-btn color="primary" variant="flat" @click="handleSave">保存</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  settings: {
    type: Object,
    default: () => ({
      pageSize: 50,
      customPageSize: 50,
      verifyCommand: 'whoami',
      maxFofaResults: 10000
    })
  }
})

const emit = defineEmits(['update:modelValue', 'save', 'cancel', 'go-to-settings'])

const localSettings = ref({ ...props.settings })

watch(
  () => props.settings,
  (newSettings) => {
    localSettings.value = { ...newSettings }
  },
  { deep: true }
)

const handleSave = () => {
  emit('save', localSettings.value)
}
</script>
