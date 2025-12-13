<template>
  <v-app class="app-root">
    <v-navigation-drawer permanent width="200" class="sidebar">
      <div class="logo">
        <v-icon size="24" color="primary">mdi-shield-check</v-icon>
        <span class="logo-text">React2Shell</span>
        <span class="pro-badge" @click="handleProClick">PRO</span>
      </div>

      <v-list density="compact" nav>
        <v-list-item
          prepend-icon="mdi-bug"
          title="POC验证"
          value="poc"
          :to="{ path: '/poc' }"
          :active="activeMenu === '/poc'"
        />
        <v-list-item
          prepend-icon="mdi-format-list-bulleted"
          title="批量验证"
          value="batch"
          :to="{ path: '/batch' }"
          :active="activeMenu === '/batch'"
        />
        <v-list-item
          prepend-icon="mdi-cog"
          title="设置"
          value="settings"
          :to="{ path: '/settings' }"
          :active="activeMenu === '/settings'"
        />
      </v-list>
    </v-navigation-drawer>

    <v-main class="main-content">
      <div class="main-wrapper">
        <router-view />
      </div>
    </v-main>

    <!-- 密码解锁对话框 -->
    <v-dialog v-model="showPasswordDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">解锁高级功能</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="password"
            label="请输入密码"
            type="password"
            variant="outlined"
            density="comfortable"
            autofocus
            @keyup.enter="checkPassword"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="showPasswordDialog = false">取消</v-btn>
          <v-btn color="primary" @click="checkPassword">确认</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 解锁成功提示 -->
    <v-snackbar v-model="showUnlockSnackbar" color="success" :timeout="2000">
      高级功能已解锁！
    </v-snackbar>

    <!-- 密码错误提示 -->
    <v-snackbar v-model="showErrorSnackbar" color="error" :timeout="2000">
      密码错误，请重试
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { computed, ref, provide } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeMenu = computed(() => route.path)

// 全局状态：是否检测到漏洞
const isVulnerable = ref(false)
const currentUrl = ref('')

// 解锁相关状态
const proClickCount = ref(0)
const showPasswordDialog = ref(false)
const password = ref('')
const isHijackUnlocked = ref(false)
const showUnlockSnackbar = ref(false)
const showErrorSnackbar = ref(false)
let clickTimer = null

// 处理 PRO 徽标点击
const handleProClick = () => {
  proClickCount.value++

  // 清除之前的定时器
  if (clickTimer) {
    clearTimeout(clickTimer)
  }

  // 2秒内没有新点击则重置计数
  clickTimer = setTimeout(() => {
    proClickCount.value = 0
  }, 2000)

  // 连续点击5次后显示密码对话框
  if (proClickCount.value >= 5) {
    proClickCount.value = 0
    showPasswordDialog.value = true
    password.value = ''
  }
}

// 检查密码
const checkPassword = () => {
  if (password.value === 'xuboyang666') {
    isHijackUnlocked.value = true
    showPasswordDialog.value = false
    showUnlockSnackbar.value = true
    // 保存解锁状态到 localStorage
    localStorage.setItem('hijackUnlocked', 'true')
  } else {
    showErrorSnackbar.value = true
    password.value = ''
  }
}

// 从 localStorage 恢复解锁状态
if (localStorage.getItem('hijackUnlocked') === 'true') {
  isHijackUnlocked.value = true
}

// 提供给子组件
provide('isVulnerable', isVulnerable)
provide('currentUrl', currentUrl)
</script>

<style scoped>
.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  color: #333;
  font-weight: bold;
  font-size: 15px;
}

.logo-text {
  margin-left: 8px;
}

.pro-badge {
  margin-left: 6px;
  padding: 1px 5px;
  background-color: rgb(var(--v-theme-primary));
  color: white;
  font-size: 9px;
  font-weight: 600;
  border-radius: 3px;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  opacity: 0.9;
  cursor: pointer;
  user-select: none;
  transition: opacity 0.2s;
}

.pro-badge:hover {
  opacity: 1;
}

.pro-badge:active {
  transform: scale(0.95);
}

.sidebar {
  background-color: #fafafa;
}

.main-content {
  background-color: #fff;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content :deep(.v-main) {
  padding: 0;
}

.main-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.main-content :deep(.v-main__wrap) {
  display: flex;
  flex: 1;
  min-height: 0;
}

.app-root {
  min-height: 100vh;
}
</style>
