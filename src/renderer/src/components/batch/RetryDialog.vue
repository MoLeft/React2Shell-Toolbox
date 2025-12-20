<template>
  <v-dialog :model-value="modelValue" max-width="400" @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="text-h6">{{ $t('batch.retryDialog.title') }}</v-card-title>
      <v-card-text>
        <div class="mb-2">
          {{ $t('batch.retryDialog.fieldFailed', { field }) }}
        </div>
        <div v-if="error" class="text-error text-caption">{{ $t('batch.retryDialog.errorInfo') }}: {{ error }}</div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">{{ $t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="flat" @click="$emit('retry')">{{ $t('common.retry') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  field: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: ''
  }
})

defineEmits(['update:modelValue', 'retry'])
</script>
