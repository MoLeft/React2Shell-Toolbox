<template>
  <v-dialog
    :model-value="modelValue"
    max-width="900"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-code-tags</v-icon>
        {{ $t('settings.advanced.editTemplate') }}
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-0">
        <div ref="editorContainer" style="height: 500px; width: 100%"></div>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-btn variant="text" prepend-icon="mdi-eye" @click="handlePreview">{{
          $t('poc.hijack.preview')
        }}</v-btn>
        <v-btn variant="text" prepend-icon="mdi-restore" @click="handleReset">{{
          $t('poc.hijack.resetTemplate')
        }}</v-btn>
        <v-spacer />
        <v-btn variant="text" @click="handleCancel">{{ $t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="flat" @click="handleSave">{{ $t('common.save') }}</v-btn>
      </v-card-actions>
    </v-card>

    <!-- 预览对话框 -->
    <v-dialog v-model="showPreview" max-width="800">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-eye</v-icon>
          {{ $t('poc.hijack.preview') }}
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-0">
          <iframe
            :srcdoc="previewHtml"
            style="width: 100%; height: 500px; border: none"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-downloads"
          ></iframe>
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showPreview = false">{{ $t('common.close') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { getDefaultHijackTemplate } from '../../config/hijackTemplate'
import { createLogger } from '@/utils/logger'

const logger = createLogger('HijackTemplateDialog')

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  htmlContent: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'save', 'cancel'])

const editorContainer = ref(null)
const showPreview = ref(false)
const previewHtml = ref('')
let editor = null

// 使用统一的默认模板
const getDefaultHtml = () => {
  return getDefaultHijackTemplate()
}

// 初始化编辑器
const initEditor = async () => {
  if (!editorContainer.value) return

  // 如果编辑器已存在，先销毁
  if (editor) {
    try {
      editor.dispose()
    } catch (e) {
      logger.error('销毁旧编辑器失败', e)
    }
    editor = null
  }

  await nextTick()

  const monaco = await import('monaco-editor')
  // 允许空内容，Monaco Editor 可以正常显示空编辑器
  // 只有当 htmlContent 是 undefined 或 null 时才使用默认模板
  // 空字符串 '' 是有效值，应该被保留
  let initialValue = props.htmlContent
  if (initialValue === undefined || initialValue === null) {
    initialValue = getDefaultHtml()
  }

  editor = monaco.editor.create(editorContainer.value, {
    value: initialValue,
    language: 'html',
    theme: 'vs',
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    padding: { top: 16, bottom: 16 }
  })
}

// 预览
const handlePreview = () => {
  if (editor) {
    previewHtml.value = editor.getValue()
    showPreview.value = true
  }
}

// 恢复默认
const handleReset = () => {
  if (editor) {
    editor.setValue(getDefaultHtml())
  }
}

// 保存
const handleSave = () => {
  if (editor) {
    const content = editor.getValue()
    // 允许保存空内容，用户可能想要清空模板
    emit('save', content)
    emit('update:modelValue', false)
  }
}

// 取消
const handleCancel = () => {
  emit('cancel')
  emit('update:modelValue', false)
}

// 监听对话框打开
watch(
  () => props.modelValue,
  async (newVal) => {
    if (newVal) {
      await nextTick()
      // 每次打开都重新初始化编辑器，确保显示最新内容
      await initEditor()
    }
  }
)

// 组件挂载
onMounted(() => {
  if (props.modelValue) {
    initEditor()
  }
})

// 组件卸载
onUnmounted(() => {
  if (editor) {
    try {
      editor.dispose()
    } catch (e) {
      logger.error('销毁编辑器失败', e)
    }
    editor = null
  }
})
</script>
