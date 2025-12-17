<template>
  <v-dialog :model-value="show" max-width="500" @update:model-value="$emit('close')">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon :color="success ? 'success' : 'error'" class="mr-2" size="24">
          {{ success ? 'mdi-check-circle' : 'mdi-alert-circle' }}
        </v-icon>
        {{ success ? '代理测试成功' : '代理测试失败' }}
      </v-card-title>

      <v-card-text>
        <div v-if="success">
          <v-list density="compact">
            <v-list-item>
              <template #prepend>
                <v-icon>mdi-ip-network</v-icon>
              </template>
              <v-list-item-title>出口 IP</v-list-item-title>
              <v-list-item-subtitle>{{ ip }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template #prepend>
                <v-icon>mdi-map-marker</v-icon>
              </template>
              <v-list-item-title>归属地</v-list-item-title>
              <v-list-item-subtitle>{{ address }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </div>

        <div v-else>
          <v-list density="compact">
            <v-list-item>
              <v-list-item-title class="text-error">测试失败</v-list-item-title>
              <v-list-item-subtitle>{{ error }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" variant="text" @click="$emit('close')">关闭</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
defineProps({
  show: {
    type: Boolean,
    default: false
  },
  success: {
    type: Boolean,
    default: false
  },
  ip: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: ''
  },
  details: {
    type: Object,
    default: null
  }
})

defineEmits(['close'])
</script>
