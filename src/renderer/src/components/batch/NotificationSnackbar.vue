<template>
  <v-snackbar
    :model-value="show"
    :color="color"
    :timeout="timeout"
    location="top"
    @update:model-value="$emit('update:show', $event)"
  >
    {{ text }}
  </v-snackbar>
</template>

<script setup>
defineProps({
  show: {
    type: Boolean,
    default: false
  },
  text: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: 'info'
  },
  timeout: {
    type: Number,
    default: 3000
  }
})

defineEmits(['update:show'])
</script>
