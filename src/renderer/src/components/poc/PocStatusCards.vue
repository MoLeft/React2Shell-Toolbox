<template>
  <v-row class="status-row" align="start">
    <v-col cols="6">
      <v-card :color="statusCardColor" variant="elevated" elevation="2" class="status-card outlined">
        <v-card-text class="status-card-text">
          <div class="status-content">
            <v-progress-circular
              v-if="isRunning"
              indeterminate
              :color="statusIconColor"
              size="24"
              width="2"
            />
            <v-icon v-else :color="statusIconColor" size="24">
              {{ statusIcon }}
            </v-icon>
            <div class="status-text">
              <div class="status-label">状态码</div>
              <div class="status-value">{{ statusText }}</div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col cols="6">
      <v-card :color="resultCardColor" variant="elevated" elevation="2" class="result-card outlined">
        <v-card-text class="status-card-text">
          <div class="status-content">
            <v-progress-circular
              v-if="isRunning"
              indeterminate
              :color="resultIconColor"
              size="24"
              width="2"
            />
            <v-icon v-else :color="resultIconColor" size="24">
              {{ resultIcon }}
            </v-icon>
            <div class="status-text">
              <div class="status-label">漏洞检测</div>
              <div class="status-value">{{ resultText }}</div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
defineProps({
  isRunning: { type: Boolean, default: false },
  statusCardColor: { type: String, default: 'surface' },
  statusIcon: { type: String, default: 'mdi-clock-outline' },
  statusIconColor: { type: String, default: 'info' },
  statusText: { type: String, default: '等待执行...' },
  resultCardColor: { type: String, default: 'surface' },
  resultIcon: { type: String, default: 'mdi-clock-outline' },
  resultIconColor: { type: String, default: 'info' },
  resultText: { type: String, default: '等待检测...' }
})
</script>

<style scoped>
.status-row {
  margin-bottom: 0;
  flex-shrink: 0;
}

.status-row :deep(.v-col) {
  align-self: flex-start;
}

.status-card-text {
  padding: 10px 12px;
}

.status-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-text {
  flex: 1;
}

.status-label {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 4px;
}

.status-value {
  font-size: 16px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.87);
}
</style>
