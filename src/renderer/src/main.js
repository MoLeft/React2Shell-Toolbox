import './assets/main.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'

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
  console.warn(`[Vue warn]: ${msg}`, trace)
}

app.use(pinia)
app.use(router)
app.use(vuetify)
app.mount('#app')
