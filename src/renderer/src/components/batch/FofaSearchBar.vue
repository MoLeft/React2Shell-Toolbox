<template>
  <div class="search-section">
    <div class="search-input-wrapper">
      <v-text-field
        :model-value="modelValue"
        label="FOFA 搜索语句"
        placeholder='例如：app="Apache-Tomcat"'
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
          <v-btn
            color="primary"
            height="40"
            :disabled="!modelValue || disabled"
            :loading="searching"
            @click="$emit('search')"
          >
            <v-icon start>mdi-magnify</v-icon>
            搜索
          </v-btn>
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
          <span class="history-text">暂无搜索历史</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  modelValue: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  searching: { type: Boolean, default: false },
  loadingStats: { type: Boolean, default: false },
  history: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue', 'search', 'select-history', 'delete-history'])

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
