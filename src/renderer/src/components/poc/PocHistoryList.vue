<template>
  <v-card class="history-card" elevation="2">
    <v-card-text class="history-body">
      <div class="history-header">
        <div class="history-header-left">
          <v-icon size="18" class="history-icon">mdi-history</v-icon>
          <span>{{ $t('poc.history.title') }}</span>
        </div>
        <v-btn
          v-if="history.length > 0"
          icon
          size="x-small"
          variant="text"
          color="error"
          @click="$emit('clear')"
        >
          <v-icon size="16">mdi-delete-sweep</v-icon>
        </v-btn>
      </div>
      <v-list v-if="!loading" density="comfortable" class="history-list">
        <v-list-item v-for="item in history" :key="item" class="history-list-item">
          <template #prepend>
            <v-avatar
              size="28"
              class="favicon-avatar"
              :color="faviconCache[item] ? 'white' : 'grey-lighten-3'"
            >
              <v-progress-circular
                v-if="faviconLoading[item]"
                indeterminate
                size="16"
                width="2"
                color="primary"
              />
              <v-img
                v-else-if="faviconCache[item]"
                :src="faviconCache[item]"
                class="favicon-img"
                contain
              />
              <v-icon v-else size="18" color="grey-darken-1">mdi-link-variant</v-icon>
            </v-avatar>
          </template>
          <template #title>
            <span class="history-url">{{ item }}</span>
          </template>
          <template #append>
            <v-btn icon size="small" variant="text" @click.stop="$emit('select', item)">
              <v-icon size="18">mdi-arrow-up</v-icon>
            </v-btn>
            <v-menu>
              <template #activator="{ props }">
                <v-btn icon size="small" variant="text" v-bind="props">
                  <v-icon size="18">mdi-dots-vertical</v-icon>
                </v-btn>
              </template>
              <v-list density="compact">
                <v-list-item @click="$emit('open-browser', item)">
                  <template #prepend>
                    <v-icon size="18">mdi-open-in-new</v-icon>
                  </template>
                  <v-list-item-title>{{ $t('common.open') }}</v-list-item-title>
                </v-list-item>
                <v-list-item @click="$emit('remove', item)">
                  <template #prepend>
                    <v-icon size="18" color="error">mdi-delete</v-icon>
                  </template>
                  <v-list-item-title class="text-error">{{
                    $t('common.delete')
                  }}</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </template>
        </v-list-item>
        <div v-if="history.length === 0" class="history-empty">
          <v-icon size="56" color="grey">mdi-history</v-icon>
          <p>{{ $t('poc.history.empty') }}</p>
        </div>
      </v-list>
      <div v-else class="history-loading">
        <v-progress-circular indeterminate color="primary" size="32"></v-progress-circular>
        <p>{{ $t('common.loading') }}</p>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
defineProps({
  history: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  faviconCache: { type: Object, default: () => ({}) },
  faviconLoading: { type: Object, default: () => ({}) }
})

defineEmits(['select', 'remove', 'clear', 'open-browser'])
</script>

<style scoped>
.history-card {
  flex: 1;
  display: flex !important;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  width: 100%;
}

.history-card :deep(.v-card-text) {
  flex: 1 !important;
  min-height: 0 !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  padding: 12px !important;
  height: 100% !important;
}

.history-body {
  display: flex !important;
  flex-direction: column !important;
  flex: 1 !important;
  min-height: 0 !important;
  overflow: hidden !important;
  height: 100% !important;
  width: 100% !important;
}

.history-header {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 0 0 auto;
}

.history-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.history-list {
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto !important;
  overflow-x: hidden;
  padding: 8px;
  height: 0;
}

.history-list :deep(.v-list) {
  background: transparent !important;
  padding: 0 !important;
}

.history-list-item {
  cursor: pointer;
  background: #fff;
  border: 1px solid #eaecef;
  border-radius: 8px;
  margin-bottom: 6px;
  padding: 6px 8px;
}

.history-url {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.85);
  word-break: break-all;
}

.favicon-avatar {
  border: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.favicon-avatar :deep(.v-img) {
  width: 100%;
  height: 100%;
}

.favicon-avatar :deep(.v-img__img) {
  object-fit: contain !important;
}

.favicon-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.history-empty {
  padding: 24px 12px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.55);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-align: center;
  height: 100%;
}

.history-loading {
  padding: 24px 12px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.55);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
  flex: 1;
  min-height: 0;
}
</style>
