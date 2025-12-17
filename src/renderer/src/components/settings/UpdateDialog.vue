<template>
  <v-dialog :model-value="show" @update:model-value="$emit('close')" max-width="600" persistent>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon color="success" class="mr-2" size="24">mdi-update</v-icon>
        {{ hasUpdate ? '发现新版本' : '已是最新版本' }}
      </v-card-title>

      <v-card-text v-if="hasUpdate">
        <div class="mb-3">
          <div class="text-body-2 mb-1">
            <span class="font-weight-medium">当前版本：</span>v{{ currentVersion }}
          </div>
          <div class="text-body-2">
            <span class="font-weight-medium">最新版本：</span>v{{ version }}
          </div>
        </div>

        <v-divider class="my-3" />

        <div v-if="releaseNotes" class="release-notes">
          <div class="text-subtitle-2 mb-2">更新内容：</div>
          <div class="markdown-content" v-html="renderedNotes"></div>
        </div>

        <div class="text-caption text-grey mt-4">
          点击"前往下载"将打开 GitHub Releases 页面，请选择对应平台的安装包下载
        </div>
      </v-card-text>

      <v-card-text v-else>
        <v-alert type="success" variant="tonal">当前已是最新版本</v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn @click="$emit('close')">
          {{ hasUpdate ? '稍后更新' : '关闭' }}
        </v-btn>
        <v-btn v-if="hasUpdate" color="primary" @click="$emit('download')">前往下载</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>


const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  hasUpdate: {
    type: Boolean,
    default: false
  },
  version: {
    type: String,
    default: ''
  },
  currentVersion: {
    type: String,
    default: ''
  },
  releaseNotes: {
    type: String,
    default: ''
  },
  renderedNotes: {
    type: String,
    default: ''
  }
})

defineEmits(['close', 'download'])
</script>

<style scoped>
.release-notes {
  max-height: 300px;
  overflow-y: auto;
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.markdown-content {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.7);
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3) {
  margin-top: 16px;
  margin-bottom: 8px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.87);
}

.markdown-content :deep(p) {
  margin-bottom: 8px;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin-left: 20px;
  margin-bottom: 8px;
}

.markdown-content :deep(code) {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}
</style>
