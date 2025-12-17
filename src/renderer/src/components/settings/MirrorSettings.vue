<template>
  <div class="setting-section">
    <h3 class="section-title">国内镜像</h3>

    <!-- 启用国内镜像开关 -->
    <div class="setting-item">
      <div class="setting-header">
        <div class="setting-info">
          <div class="setting-name">启用 GitHub 国内镜像</div>
          <div class="setting-desc">通过镜像加速访问 GitHub 资源</div>
        </div>
        <v-switch v-model="githubMirrorEnabled" color="primary" density="compact" hide-details />
      </div>
    </div>

    <!-- 镜像配置表单 -->
    <div v-if="settings.githubMirrorEnabled" class="mirror-form">
      <v-divider class="my-4" />

      <!-- 镜像方式和地址 -->
      <div class="setting-item">
        <div class="setting-name mb-2">镜像配置</div>
        <v-row dense style="max-width: 700px">
          <v-col cols="4">
            <v-select
              v-model="githubMirrorType"
              :items="mirrorTypes"
              variant="outlined"
              density="compact"
            />
          </v-col>
          <v-col cols="8">
            <v-text-field
              v-model="githubMirrorUrl"
              variant="outlined"
              density="compact"
              :placeholder="
                settings.githubMirrorType === 'prefix'
                  ? 'https://mirror.ghproxy.com/'
                  : 'hub.gitmirror.com'
              "
            >
              <template #prepend-inner>
                <v-icon size="18">mdi-web</v-icon>
              </template>
            </v-text-field>
          </v-col>
        </v-row>
        <div class="text-caption text-grey mt-1">
          <div v-if="settings.githubMirrorType === 'prefix'">
            前置代理：在 URL 前添加镜像地址，示例：https://mirror.ghproxy.com/ 或
            https://ghproxy.com/
          </div>
          <div v-else>域名替换：替换 GitHub 域名，示例：hub.gitmirror.com 或 gitclone.com</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  settings: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['save'])

const mirrorTypes = [
  { title: '前置代理', value: 'prefix' },
  { title: '域名替换', value: 'replace' }
]

// 更新字段的辅助函数
const updateField = (field, value) => {
  props.settings[field] = value
  emit('save')
}

// 使用计算属性避免直接修改 prop
const githubMirrorEnabled = computed({
  get: () => props.settings.githubMirrorEnabled,
  set: (val) => updateField('githubMirrorEnabled', val)
})

const githubMirrorType = computed({
  get: () => props.settings.githubMirrorType,
  set: (val) => updateField('githubMirrorType', val)
})

const githubMirrorUrl = computed({
  get: () => props.settings.githubMirrorUrl,
  set: (val) => updateField('githubMirrorUrl', val)
})
</script>

<style scoped>
.setting-section {
  padding: 24px;
}

.section-title {
  font-size: 20px;
  font-weight: 500;
  margin-bottom: 24px;
  color: rgba(0, 0, 0, 0.87);
}

.setting-item {
  margin-bottom: 16px;
}

.setting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.setting-info {
  flex: 1;
}

.setting-name {
  font-size: 15px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.87);
  margin-bottom: 4px;
}

.setting-desc {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.6);
}

.mirror-form {
  margin-top: 16px;
}
</style>
