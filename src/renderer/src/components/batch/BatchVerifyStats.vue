<template>
  <div v-if="show" class="verify-stats-box">
    <v-tooltip :text="$t('batch.exportDialog.scopeSafe')" location="bottom">
      <template #activator="{ props }">
        <div class="stat-item safe-item" v-bind="props">
          <v-icon size="18">mdi-shield-check</v-icon>
          <span class="stat-number">{{ stats.safe }}</span>
        </div>
      </template>
    </v-tooltip>
    <v-tooltip :text="$t('batch.exportDialog.scopeVulnerable')" location="bottom">
      <template #activator="{ props }">
        <div class="stat-item vulnerable-item" v-bind="props">
          <v-icon size="18">mdi-alert-circle</v-icon>
          <span class="stat-number">{{ stats.vulnerable }}</span>
        </div>
      </template>
    </v-tooltip>
    <v-tooltip :text="$t('batch.exportDialog.scopeError')" location="bottom">
      <template #activator="{ props }">
        <div class="stat-item error-item" v-bind="props">
          <v-icon size="18">mdi-alert-remove</v-icon>
          <span class="stat-number">{{ stats.error }}</span>
        </div>
      </template>
    </v-tooltip>
    <v-tooltip
      v-if="batchHijackEnabled"
      :text="$t('batch.exportDialog.scopeHijacked')"
      location="bottom"
    >
      <template #activator="{ props }">
        <div class="stat-item hijacked-item" v-bind="props">
          <v-icon size="18">mdi-skull</v-icon>
          <span class="stat-number">{{ stats.hijacked || 0 }}</span>
        </div>
      </template>
    </v-tooltip>
    <v-tooltip
      v-if="batchHijackEnabled"
      :text="$t('batch.exportDialog.scopeHijackFailed')"
      location="bottom"
    >
      <template #activator="{ props }">
        <div class="stat-item hijack-failed-item" v-bind="props">
          <v-icon size="18">mdi-skull-crossbones</v-icon>
          <span class="stat-number">{{ stats.hijackFailed || 0 }}</span>
        </div>
      </template>
    </v-tooltip>
    <v-tooltip
      :text="verifying ? $t('batch.pause') : paused ? $t('batch.resume') : $t('batch.verify')"
      location="bottom"
    >
      <template #activator="{ props }">
        <v-btn
          icon
          size="small"
          :color="paused ? 'warning' : 'primary'"
          variant="tonal"
          v-bind="props"
          @click="$emit('toggle')"
        >
          <v-icon>{{ verifying ? 'mdi-pause' : paused ? 'mdi-play' : 'mdi-play' }}</v-icon>
        </v-btn>
      </template>
    </v-tooltip>
  </div>
</template>

<script setup>
defineProps({
  show: { type: Boolean, default: false },
  stats: {
    type: Object,
    default: () => ({ safe: 0, vulnerable: 0, error: 0, hijacked: 0, hijackFailed: 0 })
  },
  verifying: { type: Boolean, default: false },
  paused: { type: Boolean, default: false },
  batchHijackEnabled: { type: Boolean, default: false }
})

defineEmits(['toggle'])
</script>

<style scoped>
.verify-stats-box {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 12px;
}

.verify-stats-box .v-btn {
  margin-left: 4px;
}

.verify-stats-box .stat-item {
  display: inline-flex;
  align-items: center;
  height: 28px;
  border-radius: 14px;
  padding: 0 10px 0 8px;
  cursor: help;
  transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.verify-stats-box .stat-item.safe-item {
  background-color: rgba(76, 175, 80, 0.12);
  color: #2e7d32;
}

.verify-stats-box .stat-item.safe-item:hover {
  background-color: rgba(76, 175, 80, 0.16);
}

.verify-stats-box .stat-item.vulnerable-item {
  background-color: rgba(244, 67, 54, 0.12);
  color: #c62828;
}

.verify-stats-box .stat-item.vulnerable-item:hover {
  background-color: rgba(244, 67, 54, 0.16);
}

.verify-stats-box .stat-item.error-item {
  background-color: rgba(255, 152, 0, 0.12);
  color: #e65100;
}

.verify-stats-box .stat-item.error-item:hover {
  background-color: rgba(255, 152, 0, 0.16);
}

.verify-stats-box .stat-item.hijacked-item {
  background-color: rgba(158, 158, 158, 0.12);
  color: #616161;
}

.verify-stats-box .stat-item.hijacked-item:hover {
  background-color: rgba(158, 158, 158, 0.16);
}

.verify-stats-box .stat-item.hijack-failed-item {
  background-color: rgba(255, 87, 34, 0.12);
  color: #d84315;
}

.verify-stats-box .stat-item.hijack-failed-item:hover {
  background-color: rgba(255, 87, 34, 0.16);
}

.verify-stats-box .stat-item .v-icon {
  margin-right: 4px;
}

.verify-stats-box .stat-number {
  font-weight: 600;
  line-height: 1;
}
</style>
