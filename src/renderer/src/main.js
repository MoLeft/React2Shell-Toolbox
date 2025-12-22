import './assets/main.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import i18n from './locales'
import { createLogger } from './utils/logger'
import { autoCheckInDev } from './utils/i18nChecker'

const logger = createLogger('Main')

// 在开发环境中检查 i18n 翻译完整性
if (import.meta.env.DEV) {
  // 延迟执行，确保 i18n 已完全初始化
  setTimeout(() => {
    autoCheckInDev(i18n.global.messages)
  }, 1500)
}

// 配置 Monaco Editor
self.MonacoEnvironment = {
  getWorker(_) {
    // 禁用 worker，在主线程中运行
    return new Worker(URL.createObjectURL(new Blob([''], { type: 'application/javascript' })))
  }
}

const app = createApp(App)
const pinia = createPinia()

// 配置 Vue 警告处理器，过滤掉 prop 修改警告
app.config.warnHandler = (msg, instance, trace) => {
  // 忽略 prop 修改警告（我们的实现是安全的，因为修改的是响应式对象的属性）
  if (msg.includes('Unexpected mutation of')) {
    return
  }
  // 其他警告正常显示
  logger.warn('Vue 警告', msg, trace)
}

app.use(pinia)
app.use(router)
app.use(vuetify)
app.use(i18n)
app.mount('#app')
