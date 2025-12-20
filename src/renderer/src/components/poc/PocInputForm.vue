<template>
  <v-card class="input-card" elevation="2">
    <v-card-text>
      <v-text-field
        :model-value="url"
        :label="$t('poc.targetUrl')"
        :placeholder="$t('poc.targetUrlPlaceholder')"
        variant="outlined"
        density="comfortable"
        class="mb-4"
        @update:model-value="$emit('update:url', $event)"
      />
      <v-text-field
        :model-value="command"
        :label="$t('poc.command')"
        :placeholder="$t('poc.commandPlaceholder')"
        variant="outlined"
        density="comfortable"
        class="mb-4"
        @update:model-value="$emit('update:command', $event)"
      />
      <div class="button-group">
        <v-btn
          color="primary"
          :loading="isRunning"
          :disabled="isRunning"
          size="large"
          class="flex-grow-1"
          @click="$emit('execute')"
        >
          <v-icon start>mdi-play</v-icon>
          {{ $t('poc.execute') }}
        </v-btn>
        <v-btn v-if="isRunning" color="error" size="large" variant="tonal" @click="$emit('abort')">
          <v-icon>mdi-stop</v-icon>
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
defineProps({
  url: { type: String, required: true },
  command: { type: String, required: true },
  isRunning: { type: Boolean, default: false }
})

defineEmits(['update:url', 'update:command', 'execute', 'abort'])
</script>

<style scoped>
.input-card {
  flex: 0 0 auto;
  width: 100%;
}

.button-group {
  display: flex;
  gap: 8px;
}

.flex-grow-1 {
  flex: 1;
}
</style>
