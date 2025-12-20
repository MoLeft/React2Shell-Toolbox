<template>
  <div class="stats-section">
    <div class="stats-header">
      <v-icon size="20" class="mr-2">mdi-filter-variant</v-icon>
      <span>{{ $t('batch.stats.filterTitle', { count: selectedAssetCount }) }}</span>
      <v-spacer />
      <v-chip v-if="selectedFilters.length > 0" size="x-small" color="primary">
        {{ selectedFilters.length }}
      </v-chip>
      <v-menu v-if="searchQuery">
        <template #activator="{ props }">
          <v-btn icon="mdi-dots-vertical" size="x-small" variant="text" v-bind="props"></v-btn>
        </template>
        <v-list density="compact">
          <v-list-item :disabled="anyLoading" @click="$emit('load-all')">
            <v-list-item-title>{{ $t('batch.stats.loadAll') }}</v-list-item-title>
          </v-list-item>
          <v-list-item @click="$emit('toggle-all')">
            <v-list-item-title>{{ $t('batch.stats.toggleAll') }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </div>
    <v-divider />
    <div class="stats-body">
      <v-list density="compact" class="stats-list">
        <template v-for="(group, index) in filterGroups" :key="group.field">
          <stats-filter-group
            :field="group.field"
            :title="group.title"
            :icon="group.icon"
            :items="stats[group.field] || []"
            :selected-filters="selectedFilters"
            :loading="currentLoadingField === group.field"
            :failed="failedFields[group.field]"
            :in-queue="isFieldInQueue(group.field)"
            :cooldown="getFieldCooldown(group.field)"
            :search-query="searchQuery"
            :any-loading="anyLoading"
            @toggle-field="$emit('toggle-field', $event)"
            @toggle-item="(field, value) => $emit('toggle-item', field, value)"
            @load="$emit('load-field', $event)"
            @retry="$emit('retry-field', $event)"
            @group-click="(field, event) => $emit('group-click', field, event)"
          />
          <v-divider v-if="index < filterGroups.length - 1" />
        </template>
      </v-list>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import StatsFilterGroup from './StatsFilterGroup.vue'

const { t } = useI18n()

const props = defineProps({
  stats: { type: Object, required: true },
  selectedFilters: { type: Array, default: () => [] },
  selectedAssetCount: { type: String, default: '0' },
  searchQuery: { type: String, default: '' },
  currentLoadingField: { type: String, default: null },
  failedFields: { type: Object, default: () => ({}) },
  loadQueue: { type: Array, default: () => [] },
  queueCooldown: { type: Number, default: 0 },
  anyLoading: { type: Boolean, default: false }
})

defineEmits([
  'toggle-field',
  'toggle-item',
  'load-field',
  'retry-field',
  'load-all',
  'toggle-all',
  'group-click'
])

const filterGroups = computed(() => [
  { field: 'protocol', title: t('batch.stats.protocol'), icon: 'mdi-protocol' },
  { field: 'domain', title: t('batch.stats.domain'), icon: 'mdi-web' },
  { field: 'port', title: t('batch.stats.port'), icon: 'mdi-lan' },
  { field: 'title', title: t('batch.stats.httpTitle'), icon: 'mdi-text' },
  { field: 'os', title: t('batch.stats.os'), icon: 'mdi-desktop-classic' },
  { field: 'server', title: t('batch.stats.httpServer'), icon: 'mdi-server' },
  { field: 'country', title: t('batch.stats.countryCity'), icon: 'mdi-earth' },
  { field: 'asn', title: t('batch.stats.asn'), icon: 'mdi-network' },
  { field: 'org', title: t('batch.stats.org'), icon: 'mdi-domain' },
  { field: 'asset_type', title: t('batch.stats.assetType'), icon: 'mdi-shape' },
  { field: 'fid', title: t('batch.stats.fid'), icon: 'mdi-fingerprint' },
  { field: 'icp', title: t('batch.stats.icp'), icon: 'mdi-file-document' }
])

const isFieldInQueue = (field) => {
  return props.loadQueue.includes(field) || props.currentLoadingField === field
}

const getFieldCooldown = (field) => {
  if (props.queueCooldown > 0) {
    if (props.loadQueue.length > 0 && props.loadQueue[0] === field) {
      return props.queueCooldown
    }
    if (!props.stats[field] || props.stats[field].length === 0) {
      if (!props.failedFields[field] && !isFieldInQueue(field)) {
        return props.queueCooldown
      }
    }
  }
  return 0
}
</script>

<style scoped>
.stats-section {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.stats-header {
  font-size: 14px;
  font-weight: 500;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  min-height: 40px;
}

.stats-body {
  flex: 1;
  overflow-y: auto;
}

.stats-list {
  padding: 0;
}
</style>
