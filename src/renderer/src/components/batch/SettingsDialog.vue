<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="text-h6 d-flex align-center">
        <v-icon class="mr-2">mdi-cog</v-icon>
        {{ $t('batch.settingsDialog.title') }}
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-4">
        <!-- 每页数量设置 -->
        <div class="mb-6">
          <div class="text-subtitle-2 mb-2">{{ $t('batch.settingsDialog.pageSize') }}</div>
          <v-radio-group v-model="localSettings.pageSize" inline hide-details>
            <v-radio label="20" :value="20" />
            <v-radio label="50" :value="50" />
            <v-radio label="100" :value="100" />
            <v-radio label="200" :value="200" />
            <v-radio :label="$t('batch.settingsDialog.custom')" :value="0" />
          </v-radio-group>
          <v-text-field
            v-if="localSettings.pageSize === 0"
            v-model.number="localSettings.customPageSize"
            type="number"
            :label="$t('batch.settingsDialog.customSize')"
            variant="outlined"
            density="compact"
            class="mt-3"
            :rules="[
              (v) => !!v || $t('batch.settingsDialog.enterSize'),
              (v) => v > 0 || $t('batch.settingsDialog.sizeGreaterThanZero'),
              (v) => v <= 10000 || $t('batch.settingsDialog.sizeMax')
            ]"
            :hint="$t('batch.settingsDialog.customSizeHint')"
            persistent-hint
          />
        </div>

        <!-- FOFA 最大数量设置 -->
        <div class="mb-6">
          <div class="text-subtitle-2 mb-2">{{ $t('batch.settingsDialog.maxResults') }}</div>
          <v-text-field
            v-model.number="localSettings.maxFofaResults"
            type="number"
            :label="$t('batch.settingsDialog.maxResultsLabel')"
            variant="outlined"
            density="compact"
            :rules="[
              (v) => !!v || $t('batch.settingsDialog.enterSize'),
              (v) => v > 0 || $t('batch.settingsDialog.sizeGreaterThanZero'),
              (v) => v <= 10000 || $t('batch.settingsDialog.sizeMax')
            ]"
            :hint="$t('batch.settingsDialog.maxResultsHint')"
            persistent-hint
          />
        </div>

        <!-- 验证命令设置 -->
        <div class="mb-6">
          <div class="text-subtitle-2 mb-2">{{ $t('batch.settingsDialog.verifyCommand') }}</div>
          <v-text-field
            v-model="localSettings.verifyCommand"
            :label="$t('batch.settingsDialog.command')"
            variant="outlined"
            density="compact"
            placeholder="whoami"
            :hint="$t('batch.settingsDialog.commandHint')"
            persistent-hint
          />
        </div>

        <!-- 线程数设置 -->
        <div class="mb-4">
          <div class="text-subtitle-2 mb-2">
            {{ $t('batch.settingsDialog.threadCount', { count: localSettings.threadCount || 1 }) }}
          </div>
          <v-slider
            v-model="localSettings.threadCount"
            :min="1"
            :max="32"
            :step="1"
            thumb-label
            color="primary"
            track-color="grey-lighten-2"
            :hint="$t('batch.settingsDialog.threadHint')"
            persistent-hint
          />
        </div>
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('cancel')">{{ $t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="flat" @click="handleSave">{{ $t('common.save') }}</v-btn>
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

const localSettings = ref({
  pageSize: 50,
  customPageSize: 50,
  verifyCommand: 'whoami',
  maxFofaResults: 10000,
  threadCount: 1,
  ...props.settings
})

watch(
  () => props.settings,
  (newSettings) => {
    localSettings.value = {
      pageSize: 50,
      customPageSize: 50,
      verifyCommand: 'whoami',
      maxFofaResults: 10000,
      threadCount: 1,
      ...newSettings
    }
  },
  { deep: true }
)

const handleSave = () => {
  emit('save', localSettings.value)
}
</script>
