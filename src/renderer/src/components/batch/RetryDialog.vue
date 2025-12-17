<template>
  <v-dialog :model-value="modelValue" max-width="400" @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="text-h6">加载失败</v-card-title>
      <v-card-text>
        <div class="mb-2">
          字段 <strong>{{ field }}</strong> 加载失败
        </div>
        <div v-if="error" class="text-error text-caption">错误信息: {{ error }}</div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">取消</v-btn>
        <v-btn color="primary" variant="flat" @click="$emit('retry')">重试</v-btn>
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
