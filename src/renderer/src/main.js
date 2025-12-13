import './assets/main.css'
import { createApp } from 'vue'
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

app.use(router)
app.use(vuetify)
app.mount('#app')
