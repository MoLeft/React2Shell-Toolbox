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
        编辑挂黑页面模板
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-0">
        <div ref="editorContainer" style="height: 500px; width: 100%"></div>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-btn variant="text" prepend-icon="mdi-eye" @click="handlePreview">预览</v-btn>
        <v-btn variant="text" prepend-icon="mdi-restore" @click="handleReset">恢复默认</v-btn>
        <v-spacer />
        <v-btn variant="text" @click="handleCancel">取消</v-btn>
        <v-btn color="primary" variant="flat" @click="handleSave">保存</v-btn>
      </v-card-actions>
    </v-card>

    <!-- 预览对话框 -->
    <v-dialog v-model="showPreview" max-width="800">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-eye</v-icon>
          预览挂黑页面
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-0">
          <iframe
            :srcdoc="previewHtml"
            style="width: 100%; height: 500px; border: none"
            sandbox="allow-same-origin"
          ></iframe>
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showPreview = false">关闭</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'

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

const getDefaultHtml = () => {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>网站维护中</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            color: #fff;
        }
        .container {
            text-align: center;
            padding: 40px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        h1 { font-size: 48px; margin-bottom: 20px; }
        p { font-size: 18px; opacity: 0.9; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚧 网站维护中</h1>
        <p>我们正在进行系统升级，请稍后再访问</p>
    </div>
</body>
</html>`
}

// 初始化编辑器
const initEditor = async () => {
  if (!editorContainer.value || editor) return

  await nextTick()

  const monaco = await import('monaco-editor')
  editor = monaco.editor.create(editorContainer.value, {
    value: props.htmlContent || getDefaultHtml(),
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
      console.error('销毁编辑器失败:', e)
    }
    editor = null
  }
})
</script>
