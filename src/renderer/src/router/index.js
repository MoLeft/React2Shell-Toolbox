import { createRouter, createWebHashHistory } from 'vue-router'
import POCView from '../views/POCView.vue'
import BatchView from '../views/BatchView.vue'
import SettingsView from '../views/SettingsView.vue'

const routes = [
  {
    path: '/',
    redirect: '/poc'
  },
  {
    path: '/poc',
    name: 'POC',
    component: POCView
  },
  {
    path: '/batch',
    name: 'Batch',
    component: BatchView
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
