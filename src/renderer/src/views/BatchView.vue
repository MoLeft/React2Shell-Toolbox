<template>
  <v-container fluid class="batch-view">
    <div class="view-header">
      <h2>批量验证</h2>
    </div>
    <div class="view-content">
      <div class="empty-state">
        <v-icon size="72" color="grey">mdi-clipboard-list-outline</v-icon>
        <div class="empty-title">批量验证功能建设中</div>
        <div class="empty-sub">我们正在为你准备批量导入、批量检测等能力，敬请期待</div>
      </div>
    </div>
  </v-container>
</template>

<script setup>
// 批量验证视图
</script>

<style scoped>
.batch-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.view-header h2 {
  margin: 0 0 20px 0;
  color: rgba(0, 0, 0, 0.87);
  font-size: 24px;
  font-weight: 500;
}

.view-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state {
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  color: rgba(0, 0, 0, 0.65);
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
}

.empty-sub {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.55);
}
</style>
