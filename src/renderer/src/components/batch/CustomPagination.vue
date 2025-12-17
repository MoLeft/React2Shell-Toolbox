<template>
  <div class="custom-pagination" :class="{ disabled: disabled }">
    <div class="pagination-left">
      <span class="pagination-text">第</span>
      <v-text-field
        :model-value="pageInput"
        type="number"
        density="compact"
        variant="outlined"
        hide-details
        class="page-input"
        :disabled="disabled"
        @update:model-value="$emit('update:pageInput', Number($event) || 1)"
        @keyup.enter="$emit('go-to-page')"
        @blur="$emit('go-to-page')"
      />
      <span class="pagination-text">页 / 共 {{ totalPages }} 页</span>
    </div>
    <div class="pagination-controls">
      <v-btn
        icon="mdi-chevron-left"
        size="small"
        variant="text"
        :disabled="disabled || currentPage === 1"
        @click="$emit('update:currentPage', currentPage - 1)"
      />
      <div class="page-numbers">
        <v-btn
          v-for="page in visiblePages"
          :key="page"
          :variant="page === currentPage ? 'flat' : 'text'"
          :color="page === currentPage ? 'primary' : ''"
          size="small"
          :disabled="disabled || typeof page === 'string'"
          @click="typeof page === 'number' && $emit('update:currentPage', page)"
        >
          {{ page }}
        </v-btn>
      </div>
      <v-btn
        icon="mdi-chevron-right"
        size="small"
        variant="text"
        :disabled="disabled || currentPage === totalPages"
        @click="$emit('update:currentPage', currentPage + 1)"
      />
    </div>
    <div class="pagination-right">
      <span class="pagination-text">每页</span>
      <v-select
        :model-value="itemsPerPage"
        :items="itemsPerPageOptions"
        density="compact"
        variant="outlined"
        hide-details
        class="items-per-page-select"
        :disabled="disabled"
        @update:model-value="$emit('update:itemsPerPage', $event)"
      />
      <span class="pagination-text">条</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentPage: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  pageInput: { type: Number, required: true },
  itemsPerPage: { type: Number, required: true },
  itemsPerPageOptions: { type: Array, default: () => [20, 50, 100, 200] },
  disabled: { type: Boolean, default: false }
})

defineEmits(['update:currentPage', 'update:pageInput', 'update:itemsPerPage', 'go-to-page'])

const visiblePages = computed(() => {
  const pages = []
  const total = props.totalPages
  const current = props.currentPage

  if (total <= 9) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    if (current <= 4) {
      for (let i = 1; i <= 6; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    } else if (current === 5) {
      pages.push(1)
      pages.push('...')
      for (let i = 3; i <= 7; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    } else if (current >= total - 3) {
      pages.push(1)
      pages.push('...')
      for (let i = total - 5; i <= total; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      pages.push('...')
      for (let i = current - 2; i <= current + 2; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    }
  }

  return pages
})
</script>

<style scoped>
.custom-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  background: #ffffff;
  position: sticky;
  bottom: 0;
  z-index: 1;
}

.pagination-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-text {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.6);
  white-space: nowrap;
}

.page-input {
  width: 60px;
}

.page-input :deep(.v-field) {
  font-size: 13px;
}

.page-input :deep(.v-field__input) {
  min-height: 32px;
  padding: 4px 8px;
  text-align: center;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.page-numbers {
  display: flex;
  gap: 2px;
}

.page-numbers :deep(.v-btn) {
  min-width: 32px;
  padding: 0 8px;
}

.pagination-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.items-per-page-select {
  min-width: 70px;
  max-width: 100px;
  width: auto;
}

.items-per-page-select :deep(.v-field) {
  font-size: 13px;
}

.items-per-page-select :deep(.v-field__input) {
  min-height: 32px;
  padding: 4px 8px;
}

.items-per-page-select :deep(.v-select__selection-text) {
  white-space: nowrap;
}

.custom-pagination.disabled {
  opacity: 0.6;
  pointer-events: none;
}
</style>
