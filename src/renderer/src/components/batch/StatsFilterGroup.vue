<template>
  <v-list-group :value="field" :disabled="!items.length">
    <template #activator="{ props: groupProps }">
      <v-list-item
        v-bind="items.length ? groupProps : {}"
        class="group-item"
        @click="handleGroupClick"
      >
        <template #prepend>
          <v-checkbox-btn
            :model-value="isAllSelected"
            :indeterminate="isPartiallySelected"
            :disabled="!items.length"
            density="compact"
            @click.stop
            @update:model-value="$emit('toggle-field', field)"
          />
          <v-icon>{{ icon }}</v-icon>
        </template>
        <v-list-item-title>{{ title }}</v-list-item-title>
        <template #append>
          <v-btn
            v-if="!items.length && !failed"
            icon="mdi-download"
            size="x-small"
            variant="text"
            :loading="loading"
            :disabled="!searchQuery || anyLoading"
            @click.stop="$emit('load', field)"
          >
            <span v-if="cooldown > 0" class="cooldown-text">{{ cooldown }}</span>
            <v-icon v-else-if="inQueue && !loading">mdi-clock-outline</v-icon>
            <v-icon v-else>mdi-download</v-icon>
          </v-btn>
          <v-btn
            v-else-if="failed"
            icon
            size="x-small"
            variant="text"
            color="error"
            :disabled="anyLoading"
            @click.stop="$emit('retry', field)"
          >
            <v-icon size="small">mdi-alert-circle</v-icon>
          </v-btn>
          <v-btn v-else icon size="x-small" variant="text" disabled>
            <v-icon size="small" color="success">mdi-check-circle</v-icon>
          </v-btn>
        </template>
      </v-list-item>
    </template>
    <v-list-item
      v-for="item in items"
      :key="item.value"
      :title="`${item.value} (${item.count})`"
      density="compact"
      class="stat-item"
    >
      <template #prepend>
        <v-checkbox-btn
          :model-value="isItemSelected(item.value)"
          density="compact"
          @update:model-value="$emit('toggle-item', field, item.value)"
        />
      </template>
    </v-list-item>
    <v-list-item v-if="!items.length" class="empty-hint">
      <v-list-item-title class="text-center text-caption text-grey"
        >先输入fofa搜索语句，然后再点击右侧按钮加载数据</v-list-item-title
      >
    </v-list-item>
  </v-list-group>
</template>

<script setup>
const props = defineProps({
  field: { type: String, required: true },
  title: { type: String, required: true },
  icon: { type: String, required: true },
  items: { type: Array, default: () => [] },
  selectedFilters: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  failed: { type: Boolean, default: false },
  inQueue: { type: Boolean, default: false },
  cooldown: { type: Number, default: 0 },
  searchQuery: { type: String, default: '' },
  anyLoading: { type: Boolean, default: false }
})

const emit = defineEmits(['toggle-field', 'toggle-item', 'load', 'retry', 'group-click'])

const isAllSelected = computed(() => {
  if (!props.items || props.items.length === 0) return false
  return props.items.every((item) =>
    props.selectedFilters.some((f) => f.field === props.field && f.value === item.value)
  )
})

const isPartiallySelected = computed(() => {
  if (!props.items || props.items.length === 0) return false
  const selectedCount = props.items.filter((item) =>
    props.selectedFilters.some((f) => f.field === props.field && f.value === item.value)
  ).length
  return selectedCount > 0 && selectedCount < props.items.length
})

const isItemSelected = (value) => {
  return props.selectedFilters.some((f) => f.field === props.field && f.value === value)
}

const handleGroupClick = (event) => {
  emit('group-click', props.field, event)
}
</script>

<script>
import { computed } from 'vue'
</script>

<style scoped>
.group-item {
  background-color: rgba(0, 0, 0, 0.02);
}

.stat-item {
  padding-left: 48px;
}

.empty-hint {
  padding-left: 48px;
  pointer-events: none;
}

.cooldown-text {
  font-size: 11px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.6);
}
</style>
