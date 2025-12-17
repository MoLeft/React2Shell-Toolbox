<template>
  <v-dialog :model-value="modelValue" max-width="500" @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="text-h6 d-flex align-center">
        <v-icon color="error" class="mr-2">mdi-alert-circle</v-icon>
        加载失败
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-4">
        <div class="mb-2">
          第 <strong>{{ page }}</strong> 页加载失败
        </div>
        <div v-if="errorMessage" class="text-error text-caption">
          错误信息: {{ errorMessage }}
        </div>
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">关闭</v-btn>
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
  page: {
    type: Number,
    default: 0
  },
  errorMessage: {
    type: String,
    default: ''
  }
})

defineEmits(['update:modelValue', 'retry'])
</script>
