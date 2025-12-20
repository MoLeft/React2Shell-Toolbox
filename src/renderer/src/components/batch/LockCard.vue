<template>
  <v-card class="lock-card view-content" elevation="2">
    <v-card-text class="lock-content">
      <v-icon size="80" color="grey-lighten-1">mdi-lock-outline</v-icon>
      <div class="lock-title">{{ $t('batch.lockCard.title') }}</div>
      <div class="lock-desc">{{ $t('batch.lockCard.desc') }}</div>
      <v-btn color="primary" size="large" class="mt-6" @click="$emit('go-to-settings')">
        <v-icon start>mdi-cog</v-icon>
        {{ $t('batch.lockCard.goToSettings') }}
      </v-btn>
    </v-card-text>
  </v-card>
</template>

<script setup>
defineEmits(['go-to-settings'])
</script>

<style scoped>
.lock-card {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.lock-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px;
}

.lock-title {
  font-size: 24px;
  font-weight: 500;
  margin-top: 24px;
  color: rgba(0, 0, 0, 0.87);
}

.lock-desc {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.6);
  margin-top: 12px;
  max-width: 400px;
}
</style>
