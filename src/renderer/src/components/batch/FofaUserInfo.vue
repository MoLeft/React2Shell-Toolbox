<template>
  <div class="fofa-info">
    <template v-if="connected">
      <div class="avatar-wrapper">
        <v-avatar size="32" :class="{ 'vip-avatar': userInfo.isvip }">
          <v-img v-if="userInfo.avatar" :src="userInfo.avatar" alt="用户头像" />
          <v-icon v-else size="18">mdi-account-circle</v-icon>
        </v-avatar>
        <img
          v-if="userInfo.isvip"
          src="https://static.fofa.info/_nuxt/fofa/img/img-gaojivip-nav.4349166.png"
          class="vip-badge"
          alt="VIP"
        />
      </div>
      <div class="fofa-user">
        <span class="fofa-username">{{ userInfo.username || '未知用户' }}</span>
        <span class="fofa-email">{{ email }}</span>
      </div>
      <v-divider vertical class="mx-3" />
      <v-chip size="small" color="warning" variant="flat" class="mr-2">
        F币: {{ userInfo.fcoin || 0 }}
      </v-chip>
      <v-chip size="small" color="info" variant="flat" class="mr-2">
        F点: {{ userInfo.fofa_point || 0 }}
      </v-chip>
      <v-divider vertical class="mx-3" />
      <v-chip size="small" color="success" variant="flat" class="mr-2">已连接</v-chip>
    </template>
    <template v-else>
      <v-chip color="error" size="small" variant="flat" class="mr-2">未连接</v-chip>
    </template>
    <v-btn
      icon="mdi-refresh"
      size="small"
      variant="text"
      :loading="testing"
      @click="$emit('refresh')"
    />
  </div>
</template>

<script setup>
defineProps({
  connected: { type: Boolean, default: false },
  email: { type: String, default: '' },
  userInfo: {
    type: Object,
    default: () => ({
      username: '',
      avatar: '',
      fcoin: 0,
      fofa_point: 0,
      isvip: false
    })
  },
  testing: { type: Boolean, default: false }
})

defineEmits(['refresh'])
</script>

<style scoped>
.fofa-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
}

.avatar-wrapper {
  position: relative;
  margin-right: 8px;
}

.vip-avatar {
  border: 2px solid #ffe964 !important;
}

.vip-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: white;
  padding: 1px;
}

.fofa-user {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.fofa-username {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.87);
  line-height: 1.3;
}

.fofa-email {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.6);
  line-height: 1.3;
}
</style>
