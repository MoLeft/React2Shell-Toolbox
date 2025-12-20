<template>
  <v-dialog :model-value="show" @update:model-value="$emit('close')" max-width="400">
    <v-card>
      <v-card-title>{{ $t('settings.advanced.revokeDialog.title') }}</v-card-title>
      <v-card-text>
        {{ $t('settings.advanced.revokeDialog.content') }}
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="$emit('cancel')">{{ $t('common.cancel') }}</v-btn>
        <v-btn color="error" @click="$emit('confirm')">{{ $t('settings.advanced.revokeDialog.confirmRevoke') }}</v-btn>
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
