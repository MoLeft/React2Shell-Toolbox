<template>
  <div class="search-section">
    <div class="search-input-wrapper">
      <v-text-field
        :model-value="modelValue"
        :label="$t('batch.searchLabel')"
        :placeholder="$t('batch.searchPlaceholder')"
        variant="outlined"
        density="compact"
        prepend-inner-icon="mdi-magnify"
        clearable
        hide-details
        :disabled="disabled"
        @update:model-value="$emit('update:modelValue', $event)"
        @keyup.enter="$emit('search')"
        @focus="showHistory = true"
        @blur="handleBlur"
      >
        <template #append>
          <div class="search-btn-group">
            <v-btn
              color="primary"
              class="search-btn"
              :disabled="!modelValue || disabled"
              :loading="searching"
              elevation="0"
              @click="$emit('search')"
            >
              <v-icon start size="20">mdi-magnify</v-icon>
              {{ $t('batch.searchButton') }}
            </v-btn>
            <v-btn color="primary" class="menu-btn" icon elevation="0">
              <v-icon size="20">mdi-dots-vertical</v-icon>
              <v-menu activator="parent" location="bottom end">
                <v-list density="compact">
                  <v-list-item @click="$emit('export-task')">
                    <template #prepend>
                      <v-icon size="20">mdi-export</v-icon>
                    </template>
                    <v-list-item-title>{{ $t('messages.exportTask') }}</v-list-item-title>
                  </v-list-item>
                  <v-list-item @click="$emit('import-task')">
                    <template #prepend>
                      <v-icon size="20">mdi-import</v-icon>
                    </template>
                    <v-list-item-title>{{ $t('messages.importTask') }}</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </v-btn>
          </div>
        </template>
        <template #append-inner>
          <v-progress-circular
            v-if="loadingStats"
            indeterminate
            size="20"
            width="2"
            color="primary"
            class="mr-2"
          />
        </template>
      </v-text-field>

      <!-- 历史记录下拉框 -->
      <div v-if="showHistory" class="history-dropdown">
        <template v-if="history.length > 0">
          <div
            v-for="(item, index) in history"
            :key="index"
            class="history-item"
            @mousedown.prevent="selectHistory(item)"
          >
            <v-icon size="16" class="history-icon">mdi-history</v-icon>
            <span class="history-text">{{ item }}</span>
            <v-btn
              icon
              size="x-small"
              variant="text"
              color="error"
              class="delete-btn"
              @mousedown.prevent.stop="$emit('delete-history', index)"
            >
              <v-icon size="16">mdi-close</v-icon>
            </v-btn>
          </div>
        </template>
        <div v-else class="history-empty">
          <v-icon size="16" class="history-icon">mdi-information-outline</v-icon>
          <span class="history-text">{{ $t('batch.noSearchHistory') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  searching: { type: Boolean, default: false },
  loadingStats: { type: Boolean, default: false },
  history: { type: Array, default: () => [] }
})

const emit = defineEmits([
  'update:modelValue',
  'search',
  'select-history',
  'delete-history',
  'export-task',
  'import-task'
])

const showHistory = ref(false)

const selectHistory = (query) => {
  emit('select-history', query)
  showHistory.value = false
}

const handleBlur = () => {
  setTimeout(() => {
    showHistory.value = false
  }, 200)
}
</script>

<style scoped>
.search-section {
  flex-shrink: 0;
  padding: 8px 16px 8px 16px;
}

.search-input-wrapper {
  position: relative;
}

/* 按钮组样式 */
.search-btn-group {
  display: flex;
  height: 40px;
  gap: 0;
}

.search-btn-group .search-btn {
  height: 40px !important;
  border-radius: 4px 0 0 4px !important;
  padding: 0 16px !important;
  font-size: 14px;
  letter-spacing: 0.5px;
}

.search-btn-group .search-btn :deep(.v-btn__content) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.search-btn-group .menu-btn {
  height: 40px !important;
  width: 40px !important;
  min-width: 40px !important;
  border-radius: 0 4px 4px 0 !important;
  border-left: 1px solid rgba(255, 255, 255, 0.3) !important;
  padding: 0 !important;
}

.search-btn-group .menu-btn :deep(.v-btn__content) {
  display: flex;
  align-items: center;
  justify-content: center;
}

.history-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  margin-top: 4px;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  gap: 8px;
}

.history-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.history-icon {
  color: rgba(0, 0, 0, 0.54);
  flex-shrink: 0;
}

.history-text {
  flex: 1;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.87);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-btn {
  opacity: 0;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.history-item:hover .delete-btn {
  opacity: 1;
}

.history-empty {
  display: flex;
  align-items: center;
  padding: 12px;
  gap: 8px;
  color: rgba(0, 0, 0, 0.38);
  font-size: 13px;
  text-align: center;
  justify-content: center;
}
</style>
