<template>
  <div class="results-header">
    <v-icon size="20" class="mr-2">mdi-database-search</v-icon>
    <span>搜索结果</span>

    <!-- 批量验证统计信息框 -->
    <batch-verify-stats
      :show="show"
      :stats="stats"
      :verifying="verifying"
      :paused="paused"
      @toggle="$emit('toggle-verify')"
    />

    <v-spacer />

    <!-- 结果计数 -->
    <div v-if="hasSearched && totalResults > 0" class="result-count">
      共 {{ totalResults }} 条 (已加载 {{ loadedCount }} 条)
    </div>

    <!-- 自动加载按钮 -->
    <v-btn
      v-if="showResults && autoLoadStatus !== 'loading'"
      icon
      size="small"
      :color="getAutoLoadColor"
      :variant="getAutoLoadVariant"
      class="ml-3"
      @click="$emit('toggle-auto-load')"
    >
      <v-icon v-if="autoLoadStatus === 'completed'">mdi-check-circle</v-icon>
      <v-icon v-else-if="autoLoadStatus === 'error'">mdi-alert-circle</v-icon>
      <v-icon v-else>mdi-reload</v-icon>
      <v-tooltip activator="parent" location="bottom">
        <template v-if="autoLoadStatus === 'completed'">所有数据已加载</template>
        <template v-else-if="autoLoadStatus === 'error'">加载失败，点击重试</template>
        <template v-else-if="autoLoadStatus === 'paused'">继续自动加载</template>
        <template v-else>自动加载所有数据</template>
      </v-tooltip>
    </v-btn>

    <!-- 停止按钮（加载中时显示） -->
    <v-btn
      v-if="showResults && autoLoadStatus === 'loading'"
      icon
      size="small"
      color="warning"
      variant="tonal"
      class="ml-3"
      @click="$emit('pause-auto-load')"
    >
      <v-icon>mdi-stop</v-icon>
      <v-tooltip activator="parent" location="bottom">停止自动加载</v-tooltip>
    </v-btn>

    <!-- 导出按钮 -->
    <v-btn
      v-if="showResults"
      size="small"
      color="primary"
      variant="tonal"
      prepend-icon="mdi-download"
      class="ml-2"
      @click="$emit('export')"
    >
      导出
    </v-btn>

    <!-- 设置按钮 -->
    <v-btn
      size="small"
      color="secondary"
      variant="tonal"
      prepend-icon="mdi-cog"
      class="ml-2"
      @click="$emit('open-settings')"
    >
      设置
    </v-btn>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import BatchVerifyStats from './BatchVerifyStats.vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  stats: {
    type: Object,
    required: true
  },
  verifying: {
    type: Boolean,
    default: false
  },
  paused: {
    type: Boolean,
    default: false
  },
  hasSearched: {
    type: Boolean,
    default: false
  },
  totalResults: {
    type: Number,
    default: 0
  },
  loadedCount: {
    type: Number,
    default: 0
  },
  showResults: {
    type: Boolean,
    default: false
  },
  autoLoadStatus: {
    type: String,
    default: 'idle'
  }
})

defineEmits([
  'toggle-verify',
  'toggle-auto-load',
  'pause-auto-load',
  'export',
  'open-settings'
])

const getAutoLoadColor = computed(() => {
  if (props.autoLoadStatus === 'completed') return 'success'
  if (props.autoLoadStatus === 'error') return 'error'
  return 'default'
})

const getAutoLoadVariant = computed(() => {
  if (props.autoLoadStatus === 'idle' || props.autoLoadStatus === 'paused') {
    return 'text'
  }
  return 'tonal'
})
</script>

<style scoped>
.results-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: #f5f5f5;
  font-weight: 500;
  gap: 8px;
}

.result-count {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.6);
}
</style>
