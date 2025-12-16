<template>
  <v-card>
    <v-card-title>FOFA API 调试信息</v-card-title>
    <v-card-text>
      <v-list density="compact">
        <v-list-item>
          <template #prepend>
            <v-icon :color="apiStatus.hasApi ? 'success' : 'error'">
              {{ apiStatus.hasApi ? 'mdi-check-circle' : 'mdi-close-circle' }}
            </v-icon>
          </template>
          <v-list-item-title>window.api 存在</v-list-item-title>
          <v-list-item-subtitle>{{ apiStatus.hasApi ? '是' : '否' }}</v-list-item-subtitle>
        </v-list-item>

        <v-list-item>
          <template #prepend>
            <v-icon :color="apiStatus.hasFofa ? 'success' : 'error'">
              {{ apiStatus.hasFofa ? 'mdi-check-circle' : 'mdi-close-circle' }}
            </v-icon>
          </template>
          <v-list-item-title>window.api.fofa 存在</v-list-item-title>
          <v-list-item-subtitle>{{ apiStatus.hasFofa ? '是' : '否' }}</v-list-item-subtitle>
        </v-list-item>

        <v-list-item>
          <template #prepend>
            <v-icon :color="apiStatus.hasTestConnection ? 'success' : 'error'">
              {{ apiStatus.hasTestConnection ? 'mdi-check-circle' : 'mdi-close-circle' }}
            </v-icon>
          </template>
          <v-list-item-title>testConnection 方法存在</v-list-item-title>
          <v-list-item-subtitle>
            {{ apiStatus.hasTestConnection ? '是' : '否' }}
          </v-list-item-subtitle>
        </v-list-item>

        <v-list-item v-if="apiStatus.hasFofa">
          <v-list-item-title>可用方法</v-list-item-title>
          <v-list-item-subtitle>
            <v-chip
              v-for="method in apiStatus.methods"
              :key="method"
              size="x-small"
              class="mr-1 mt-1"
            >
              {{ method }}
            </v-chip>
          </v-list-item-subtitle>
        </v-list-item>
      </v-list>

      <v-alert v-if="!apiStatus.hasTestConnection" type="error" variant="tonal" class="mt-4">
        <div class="text-subtitle-2 mb-2">FOFA API 不可用</div>
        <div class="text-caption">
          请完全关闭应用并重新启动（不是热重载）。如果问题仍然存在，请检查以下文件：
        </div>
        <ul class="text-caption mt-2">
          <li>src/main/fofa-handler.js - 是否存在</li>
          <li>src/main/index.js - 是否调用 registerFofaHandlers()</li>
          <li>src/preload/index.js - 是否暴露 fofa API</li>
        </ul>
      </v-alert>

      <v-btn v-if="apiStatus.hasTestConnection" color="primary" class="mt-4" @click="testApi">
        测试 FOFA 连接
      </v-btn>

      <v-alert v-if="testResult" :type="testResult.type" variant="tonal" class="mt-4">
        {{ testResult.message }}
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const apiStatus = ref({
  hasApi: false,
  hasFofa: false,
  hasTestConnection: false,
  methods: []
})

const testResult = ref(null)

const checkApiStatus = () => {
  apiStatus.value = {
    hasApi: !!window.api,
    hasFofa: !!window.api?.fofa,
    hasTestConnection: typeof window.api?.fofa?.testConnection === 'function',
    methods: window.api?.fofa ? Object.keys(window.api.fofa) : []
  }

  console.log('API 状态检查:', apiStatus.value)
  console.log('window.api:', window.api)
  console.log('window.api.fofa:', window.api?.fofa)
}

const testApi = async () => {
  testResult.value = null
  try {
    const result = await window.api.fofa.testConnection()
    if (result.success) {
      testResult.value = {
        type: 'success',
        message: `连接成功！用户: ${result.userInfo.username}`
      }
    } else {
      testResult.value = {
        type: 'error',
        message: `连接失败: ${result.error}`
      }
    }
  } catch (error) {
    testResult.value = {
      type: 'error',
      message: `测试失败: ${error.message}`
    }
  }
}

onMounted(() => {
  checkApiStatus()
})
</script>
