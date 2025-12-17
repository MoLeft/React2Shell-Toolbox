<template>
  <v-dialog :model-value="show" @update:model-value="$emit('close')" max-width="400">
    <v-card>
      <v-card-title>确认取消授权？</v-card-title>
      <v-card-text>
        取消授权后，GitHub 授权信息将被清除，一键挂黑等高级功能将不可用。如需重新开启，请重新进行 GitHub 授权并 Star 项目。
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="$emit('cancel')">取消</v-btn>
        <v-btn color="error" @click="$emit('confirm')">确认取消授权</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

defineEmits(['cancel', 'confirm', 'close'])
</script>
