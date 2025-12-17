<template>
  <v-card class="input-card" elevation="2">
    <v-card-text>
      <v-text-field
        :model-value="url"
        label="目标URL"
        placeholder="请输入目标URL (例如: http://localhost:3000)"
        variant="outlined"
        density="comfortable"
        class="mb-4"
        @update:model-value="$emit('update:url', $event)"
      />
      <v-text-field
        :model-value="command"
        label="执行命令"
        placeholder="请输入要执行的命令 (例如: ifconfig)"
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
          执行检测
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
