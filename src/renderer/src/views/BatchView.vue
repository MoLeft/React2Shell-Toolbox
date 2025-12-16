<template>
  <v-container fluid class="batch-view">
    <!-- 页面标题 -->
    <div class="view-header">
      <h2>批量验证</h2>
      <div class="header-right">
        <!-- FOFA 用户信息 -->
        <div v-if="fofaConnected" class="fofa-info">
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
            <span class="fofa-email">{{ fofaEmail }}</span>
          </div>
          <v-divider vertical class="mx-3" />
          <v-chip size="small" color="warning" variant="flat" class="mr-2">
            F币: {{ userInfo.fcoin || 0 }}
          </v-chip>
          <v-chip size="small" color="info" variant="flat" class="mr-2">
            F点: {{ userInfo.fofa_point || 0 }}
          </v-chip>
          <v-divider vertical class="mx-3" />
          <v-chip size="small" color="success" variant="flat" class="mr-2"> 已连接 </v-chip>
          <v-btn
            icon="mdi-refresh"
            size="small"
            variant="text"
            :loading="testingConnection"
            @click="testFofaConnection"
          />
        </div>
        <!-- 未连接状态 + 刷新按钮 -->
        <div v-else class="fofa-info">
          <v-chip color="error" size="small" variant="flat" class="mr-2"> 未连接 </v-chip>
          <v-btn
            icon="mdi-refresh"
            size="small"
            variant="text"
            :loading="testingConnection"
            @click="testFofaConnection"
          />
        </div>
      </div>
    </div>

    <!-- 锁定状态（未连接时显示） -->
    <v-card v-if="!fofaConnected" class="lock-card view-content" elevation="2">
      <v-card-text class="lock-content">
        <v-icon size="80" color="grey-lighten-1">mdi-lock-outline</v-icon>
        <div class="lock-title">FOFA 功能已锁定</div>
        <div class="lock-desc">请先在设置中配置 FOFA API 信息以解锁此功能</div>
        <v-btn color="primary" size="large" class="mt-6" @click="goToSettings">
          <v-icon start>mdi-cog</v-icon>
          前往设置
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- 主内容卡片（连接后显示） -->
    <v-card v-else class="main-card view-content" elevation="2">
      <!-- 搜索框 -->
      <div class="search-section">
        <div class="search-input-wrapper">
          <v-text-field
            v-model="searchQuery"
            label="FOFA 搜索语句"
            placeholder='例如：app="Apache-Tomcat"'
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-magnify"
            clearable
            hide-details
            :disabled="!fofaConnected"
            @keyup.enter="handleSearch"
            @focus="showHistoryDropdown = true"
            @blur="handleSearchBlur"
          >
            <template #append>
              <v-btn
                color="primary"
                height="40"
                :disabled="!searchQuery || !fofaConnected"
                :loading="searching"
                @click="handleSearch"
              >
                <v-icon start>mdi-magnify</v-icon>
                搜索
              </v-btn>
            </template>
            <template #append-inner>
              <v-progress-circular
                v-if="loadingStats"
                indeterminate
                size="20"
                width="2"
                color="primary"
                class="mr-2"
              />
            </template>
          </v-text-field>
          <!-- 历史记录下拉框 -->
          <div v-if="showHistoryDropdown" class="history-dropdown">
            <template v-if="searchHistory.length > 0">
              <div
                v-for="(item, index) in searchHistory"
                :key="index"
                class="history-item"
                @mousedown.prevent="selectHistory(item)"
              >
                <v-icon size="16" class="history-icon">mdi-history</v-icon>
                <span class="history-text">{{ item }}</span>
                <v-btn
                  icon
                  size="x-small"
                  variant="text"
                  color="error"
                  class="delete-btn"
                  @mousedown.prevent.stop="deleteHistory(index)"
                >
                  <v-icon size="16">mdi-close</v-icon>
                </v-btn>
              </div>
            </template>
            <div v-else class="history-empty">
              <v-icon size="16" class="history-icon">mdi-information-outline</v-icon>
              <span class="history-text">暂无搜索历史</span>
            </div>
          </div>
        </div>
      </div>

      <v-divider />

      <!-- 内容区域：左侧树形 + 右侧结果 -->
      <div class="content-wrapper">
        <!-- 左侧：统计聚合树 -->
        <div class="stats-section">
          <div class="stats-header">
            <v-icon size="20" class="mr-2">mdi-filter-variant</v-icon>
            <span>筛选条件 ({{ selectedAssetCount }}资产)</span>
            <v-spacer />
            <v-chip v-if="selectedFilters.length > 0" size="x-small" color="primary">
              {{ selectedFilters.length }}
            </v-chip>
            <v-menu v-if="searchQuery">
              <template #activator="{ props }">
                <v-btn
                  icon="mdi-dots-vertical"
                  size="x-small"
                  variant="text"
                  v-bind="props"
                ></v-btn>
              </template>
              <v-list density="compact">
                <v-list-item :disabled="isAnyLoading" @click="loadAllFields">
                  <v-list-item-title>一键加载</v-list-item-title>
                </v-list-item>
                <v-list-item @click="toggleAllSelections">
                  <v-list-item-title>一键反选</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
          <v-divider />
          <div class="stats-body">
            <v-list density="compact" class="stats-list">
              <!-- 协议 -->
              <v-list-group value="protocol" :disabled="!stats.protocol.length">
                <template #activator="{ props }">
                  <v-list-item
                    v-bind="stats.protocol.length ? props : {}"
                    class="group-item"
                    @click="handleGroupClick('protocol', $event)"
                  >
                    <template #prepend>
                      <v-checkbox-btn
                        :model-value="isFieldAllSelected('protocol')"
                        :indeterminate="isFieldPartiallySelected('protocol')"
                        :disabled="!stats.protocol.length"
                        density="compact"
                        @click.stop
                        @update:model-value="toggleFieldSelection('protocol')"
                      />
                      <v-icon>mdi-protocol</v-icon>
                    </template>
                    <v-list-item-title>协议</v-list-item-title>
                    <template #append>
                      <v-btn
                        v-if="!stats.protocol.length && !failedFields.protocol"
                        icon="mdi-download"
                        size="x-small"
                        variant="text"
                        :loading="currentLoadingField === 'protocol'"
                        :disabled="!searchQuery || isAnyLoading"
                        @click.stop="loadFieldStats('protocol')"
                      >
                        <span v-if="isFieldCoolingDown('protocol')" class="cooldown-text">{{
                          getFieldCooldown('protocol')
                        }}</span>
                        <v-icon
                          v-else-if="
                            isFieldInQueue('protocol') && currentLoadingField !== 'protocol'
                          "
                          >mdi-clock-outline</v-icon
                        >
                        <v-icon v-else>mdi-download</v-icon>
                      </v-btn>
                      <v-btn
                        v-else-if="failedFields.protocol"
                        icon
                        size="x-small"
                        variant="text"
                        color="error"
                        :disabled="isAnyLoading"
                        @click.stop="openRetryDialog('protocol')"
                      >
                        <v-icon size="small">mdi-alert-circle</v-icon>
                      </v-btn>
                      <v-btn v-else icon size="x-small" variant="text" disabled>
                        <v-icon size="small" color="success">mdi-check-circle</v-icon>
                      </v-btn>
                    </template>
                  </v-list-item>
                </template>
                <v-list-item
                  v-for="item in stats.protocol"
                  :key="item.value"
                  :title="`${item.value} (${item.count})`"
                  density="compact"
                  class="stat-item"
                >
                  <template #prepend>
                    <v-checkbox-btn
                      :model-value="isFilterSelected('protocol', item.value)"
                      density="compact"
                      @update:model-value="toggleFilter('protocol', item.value)"
                    />
                  </template>
                </v-list-item>
                <v-list-item v-if="!stats.protocol.length" class="empty-hint">
                  <v-list-item-title class="text-center text-caption text-grey"
                    >先输入fofa搜索语句，然后再点击右侧按钮加载数据</v-list-item-title
                  >
                </v-list-item>
              </v-list-group>
              <v-divider />

              <!-- 域名 -->
              <v-list-group value="domain" :disabled="!stats.domain.length">
                <template #activator="{ props }">
                  <v-list-item
                    v-bind="stats.domain.length ? props : {}"
                    class="group-item"
                    @click="handleGroupClick('domain', $event)"
                  >
                    <template #prepend>
                      <v-checkbox-btn
                        :model-value="isFieldAllSelected('domain')"
                        :indeterminate="isFieldPartiallySelected('domain')"
                        :disabled="!stats.domain.length"
                        density="compact"
                        @click.stop
                        @update:model-value="toggleFieldSelection('domain')"
                      />
                      <v-icon>mdi-web</v-icon>
                    </template>
                    <v-list-item-title>域名</v-list-item-title>
                    <template #append>
                      <v-btn
                        v-if="!stats.domain.length && !failedFields.domain"
                        icon="mdi-download"
                        size="x-small"
                        variant="text"
                        :loading="currentLoadingField === 'domain'"
                        :disabled="!searchQuery || isAnyLoading"
                        @click.stop="loadFieldStats('domain')"
                      >
                        <span v-if="isFieldCoolingDown('domain')" class="cooldown-text">{{
                          getFieldCooldown('domain')
                        }}</span>
                        <v-icon
                          v-else-if="isFieldInQueue('domain') && currentLoadingField !== 'domain'"
                          >mdi-clock-outline</v-icon
                        >
                        <v-icon v-else>mdi-download</v-icon>
                      </v-btn>
                      <v-btn
                        v-else-if="failedFields.domain"
                        icon
                        size="x-small"
                        variant="text"
                        color="error"
                        :disabled="isAnyLoading"
                        @click.stop="openRetryDialog('domain')"
                      >
                        <v-icon size="small">mdi-alert-circle</v-icon>
                      </v-btn>
                      <v-btn v-else icon size="x-small" variant="text" disabled>
                        <v-icon size="small" color="success">mdi-check-circle</v-icon>
                      </v-btn>
                    </template>
                  </v-list-item>
                </template>
                <v-list-item
                  v-for="item in stats.domain"
                  :key="item.value"
                  :title="`${item.value} (${item.count})`"
                  density="compact"
                  class="stat-item"
                >
                  <template #prepend>
                    <v-checkbox-btn
                      :model-value="isFilterSelected('domain', item.value)"
                      density="compact"
                      @update:model-value="toggleFilter('domain', item.value)"
                    />
                  </template>
                </v-list-item>
                <v-list-item v-if="!stats.domain.length" class="empty-hint">
                  <v-list-item-title class="text-center text-caption text-grey"
                    >先输入fofa搜索语句，然后再点击右侧按钮加载数据</v-list-item-title
                  >
                </v-list-item>
              </v-list-group>
              <v-divider />

              <!-- 端口 -->
              <v-list-group value="port" :disabled="!stats.port.length">
                <template #activator="{ props }">
                  <v-list-item
                    v-bind="stats.port.length ? props : {}"
                    class="group-item"
                    @click="handleGroupClick('port', $event)"
                  >
                    <template #prepend>
                      <v-checkbox-btn
                        :model-value="isFieldAllSelected('port')"
                        :indeterminate="isFieldPartiallySelected('port')"
                        :disabled="!stats.port.length"
                        density="compact"
                        @click.stop
                        @update:model-value="toggleFieldSelection('port')"
                      />
                      <v-icon>mdi-lan</v-icon>
                    </template>
                    <v-list-item-title>端口</v-list-item-title>
                    <template #append>
                      <v-btn
                        v-if="!stats.port.length && !failedFields.port"
                        icon="mdi-download"
                        size="x-small"
                        variant="text"
                        :loading="currentLoadingField === 'port'"
                        :disabled="!searchQuery || isAnyLoading"
                        @click.stop="loadFieldStats('port')"
                      >
                        <span v-if="isFieldCoolingDown('port')" class="cooldown-text">{{
                          getFieldCooldown('port')
                        }}</span>
                        <v-icon v-else-if="isFieldInQueue('port') && currentLoadingField !== 'port'"
                          >mdi-clock-outline</v-icon
                        >
                        <v-icon v-else>mdi-download</v-icon>
                      </v-btn>
                      <v-btn
                        v-else-if="failedFields.port"
                        icon
                        size="x-small"
                        variant="text"
                        color="error"
                        :disabled="isAnyLoading"
                        @click.stop="openRetryDialog('port')"
                      >
                        <v-icon size="small">mdi-alert-circle</v-icon>
                      </v-btn>
                      <v-btn v-else icon size="x-small" variant="text" disabled>
                        <v-icon size="small" color="success">mdi-check-circle</v-icon>
                      </v-btn>
                    </template>
                  </v-list-item>
                </template>
                <v-list-item
                  v-for="item in stats.port"
                  :key="item.value"
                  :title="`${item.value} (${item.count})`"
                  density="compact"
                  class="stat-item"
                >
                  <template #prepend>
                    <v-checkbox-btn
                      :model-value="isFilterSelected('port', item.value)"
                      density="compact"
                      @update:model-value="toggleFilter('port', item.value)"
                    />
                  </template>
                </v-list-item>
                <v-list-item v-if="!stats.port.length" class="empty-hint">
                  <v-list-item-title class="text-center text-caption text-grey"
                    >先输入fofa搜索语句，然后再点击右侧按钮加载数据</v-list-item-title
                  >
                </v-list-item>
              </v-list-group>
              <v-divider />

              <!-- HTTP 标题 -->
              <v-list-group value="title" :disabled="!stats.title.length">
                <template #activator="{ props }">
                  <v-list-item
                    v-bind="stats.title.length ? props : {}"
                    class="group-item"
                    @click="handleGroupClick('title', $event)"
                  >
                    <template #prepend>
                      <v-checkbox-btn
                        :model-value="isFieldAllSelected('title')"
                        :indeterminate="isFieldPartiallySelected('title')"
                        :disabled="!stats.title.length"
                        density="compact"
                        @click.stop
                        @update:model-value="toggleFieldSelection('title')"
                      />
                      <v-icon>mdi-text</v-icon>
                    </template>
                    <v-list-item-title>HTTP 标题</v-list-item-title>
                    <template #append>
                      <v-btn
                        v-if="!stats.title.length && !failedFields.title"
                        icon="mdi-download"
                        size="x-small"
                        variant="text"
                        :loading="currentLoadingField === 'title'"
                        :disabled="!searchQuery || isAnyLoading"
                        @click.stop="loadFieldStats('title')"
                      >
                        <span v-if="isFieldCoolingDown('title')" class="cooldown-text">{{
                          getFieldCooldown('title')
                        }}</span>
                        <v-icon
                          v-else-if="isFieldInQueue('title') && currentLoadingField !== 'title'"
                          >mdi-clock-outline</v-icon
                        >
                        <v-icon v-else>mdi-download</v-icon>
                      </v-btn>
                      <v-btn
                        v-else-if="failedFields.title"
                        icon
                        size="x-small"
                        variant="text"
                        color="error"
                        :disabled="isAnyLoading"
                        @click.stop="openRetryDialog('title')"
                      >
                        <v-icon size="small">mdi-alert-circle</v-icon>
                      </v-btn>
                      <v-btn v-else icon size="x-small" variant="text" disabled>
                        <v-icon size="small" color="success">mdi-check-circle</v-icon>
                      </v-btn>
                    </template>
                  </v-list-item>
                </template>
                <v-list-item
                  v-for="item in stats.title"
                  :key="item.value"
                  :title="`${item.value} (${item.count})`"
                  density="compact"
                  class="stat-item"
                >
                  <template #prepend>
                    <v-checkbox-btn
                      :model-value="isFilterSelected('title', item.value)"
                      density="compact"
                      @update:model-value="toggleFilter('title', item.value)"
                    />
                  </template>
                </v-list-item>
                <v-list-item v-if="!stats.title.length" class="empty-hint">
                  <v-list-item-title class="text-center text-caption text-grey"
                    >先输入fofa搜索语句，然后再点击右侧按钮加载数据</v-list-item-title
                  >
                </v-list-item>
              </v-list-group>
              <v-divider />

              <!-- 操作系统 -->
              <v-list-group value="os" :disabled="!stats.os.length">
                <template #activator="{ props }">
                  <v-list-item
                    v-bind="stats.os.length ? props : {}"
                    class="group-item"
                    @click="handleGroupClick('os', $event)"
                  >
                    <template #prepend>
                      <v-checkbox-btn
                        :model-value="isFieldAllSelected('os')"
                        :indeterminate="isFieldPartiallySelected('os')"
                        :disabled="!stats.os.length"
                        density="compact"
                        @click.stop
                        @update:model-value="toggleFieldSelection('os')"
                      />
                      <v-icon>mdi-desktop-classic</v-icon>
                    </template>
                    <v-list-item-title>操作系统</v-list-item-title>
                    <template #append>
                      <v-btn
                        v-if="!stats.os.length && !failedFields.os"
                        icon="mdi-download"
                        size="x-small"
                        variant="text"
                        :loading="currentLoadingField === 'os'"
                        :disabled="!searchQuery || isAnyLoading"
                        @click.stop="loadFieldStats('os')"
                      >
                        <span v-if="isFieldCoolingDown('os')" class="cooldown-text">{{
                          getFieldCooldown('os')
                        }}</span>
                        <v-icon v-else-if="isFieldInQueue('os') && currentLoadingField !== 'os'"
                          >mdi-clock-outline</v-icon
                        >
                        <v-icon v-else>mdi-download</v-icon>
                      </v-btn>
                      <v-btn
                        v-else-if="failedFields.os"
                        icon
                        size="x-small"
                        variant="text"
                        color="error"
                        :disabled="isAnyLoading"
                        @click.stop="openRetryDialog('os')"
                      >
                        <v-icon size="small">mdi-alert-circle</v-icon>
                      </v-btn>
                      <v-btn v-else icon size="x-small" variant="text" disabled>
                        <v-icon size="small" color="success">mdi-check-circle</v-icon>
                      </v-btn>
                    </template>
                  </v-list-item>
                </template>
                <v-list-item
                  v-for="item in stats.os"
                  :key="item.value"
                  :title="`${item.value} (${item.count})`"
                  density="compact"
                  class="stat-item"
                >
                  <template #prepend>
                    <v-checkbox-btn
                      :model-value="isFilterSelected('os', item.value)"
                      density="compact"
                      @update:model-value="toggleFilter('os', item.value)"
                    />
                  </template>
                </v-list-item>
                <v-list-item v-if="!stats.os.length" class="empty-hint">
                  <v-list-item-title class="text-center text-caption text-grey"
                    >先输入fofa搜索语句，然后再点击右侧按钮加载数据</v-list-item-title
                  >
                </v-list-item>
              </v-list-group>
              <v-divider />

              <!-- HTTP Server -->
              <v-list-group value="server" :disabled="!stats.server.length">
                <template #activator="{ props }">
                  <v-list-item
                    v-bind="stats.server.length ? props : {}"
                    class="group-item"
                    @click="handleGroupClick('server', $event)"
                  >
                    <template #prepend>
                      <v-checkbox-btn
                        :model-value="isFieldAllSelected('server')"
                        :indeterminate="isFieldPartiallySelected('server')"
                        :disabled="!stats.server.length"
                        density="compact"
                        @click.stop
                        @update:model-value="toggleFieldSelection('server')"
                      />
                      <v-icon>mdi-server</v-icon>
                    </template>
                    <v-list-item-title>HTTP Server</v-list-item-title>
                    <template #append>
                      <v-btn
                        v-if="!stats.server.length && !failedFields.server"
                        icon="mdi-download"
                        size="x-small"
                        variant="text"
                        :loading="currentLoadingField === 'server'"
                        :disabled="!searchQuery || isAnyLoading"
                        @click.stop="loadFieldStats('server')"
                      >
                        <span v-if="isFieldCoolingDown('server')" class="cooldown-text">{{
                          getFieldCooldown('server')
                        }}</span>
                        <v-icon
                          v-else-if="isFieldInQueue('server') && currentLoadingField !== 'server'"
                          >mdi-clock-outline</v-icon
                        >
                        <v-icon v-else>mdi-download</v-icon>
                      </v-btn>
                      <v-btn
                        v-else-if="failedFields.server"
                        icon
                        size="x-small"
                        variant="text"
                        color="error"
                        :disabled="isAnyLoading"
                        @click.stop="openRetryDialog('server')"
                      >
                        <v-icon size="small">mdi-alert-circle</v-icon>
                      </v-btn>
                      <v-btn v-else icon size="x-small" variant="text" disabled>
                        <v-icon size="small" color="success">mdi-check-circle</v-icon>
                      </v-btn>
                    </template>
                  </v-list-item>
                </template>
                <v-list-item
                  v-for="item in stats.server"
                  :key="item.value"
                  :title="`${item.value} (${item.count})`"
                  density="compact"
                  class="stat-item"
                >
                  <template #prepend>
                    <v-checkbox-btn
                      :model-value="isFilterSelected('server', item.value)"
                      density="compact"
                      @update:model-value="toggleFilter('server', item.value)"
                    />
                  </template>
                </v-list-item>
                <v-list-item v-if="!stats.server.length" class="empty-hint">
                  <v-list-item-title class="text-center text-caption text-grey"
                    >先输入fofa搜索语句，然后再点击右侧按钮加载数据</v-list-item-title
                  >
                </v-list-item>
              </v-list-group>
              <v-divider />

              <!-- 国家/城市 -->
              <v-list-group value="country" :disabled="!stats.country.length">
                <template #activator="{ props }">
                  <v-list-item
                    v-bind="stats.country.length ? props : {}"
                    class="group-item"
                    @click="handleGroupClick('country', $event)"
                  >
                    <template #prepend>
                      <v-checkbox-btn
                        :model-value="isFieldAllSelected('country')"
                        :indeterminate="isFieldPartiallySelected('country')"
                        :disabled="!stats.country.length"
                        density="compact"
                        @click.stop
                        @update:model-value="toggleFieldSelection('country')"
                      />
                      <v-icon>mdi-earth</v-icon>
                    </template>
                    <v-list-item-title>国家/城市</v-list-item-title>
                    <template #append>
                      <v-btn
                        v-if="!stats.country.length && !failedFields.country"
                        icon="mdi-download"
                        size="x-small"
                        variant="text"
                        :loading="currentLoadingField === 'country'"
                        :disabled="!searchQuery || isAnyLoading"
                        @click.stop="loadFieldStats('country')"
                      >
                        <span v-if="isFieldCoolingDown('country')" class="cooldown-text">{{
                          getFieldCooldown('country')
                        }}</span>
                        <v-icon
                          v-else-if="isFieldInQueue('country') && currentLoadingField !== 'country'"
                          >mdi-clock-outline</v-icon
                        >
                        <v-icon v-else>mdi-download</v-icon>
                      </v-btn>
                      <v-btn
                        v-else-if="failedFields.country"
                        icon
                        size="x-small"
                        variant="text"
                        color="error"
                        :disabled="isAnyLoading"
                        @click.stop="openRetryDialog('country')"
                      >
                        <v-icon size="small">mdi-alert-circle</v-icon>
                      </v-btn>
                      <v-btn v-else icon size="x-small" variant="text" disabled>
                        <v-icon size="small" color="success">mdi-check-circle</v-icon>
                      </v-btn>
                    </template>
                  </v-list-item>
                </template>
                <v-list-item
                  v-for="item in stats.country"
                  :key="item.value"
                  :title="`${item.value} (${item.count})`"
                  density="compact"
                  class="stat-item"
                >
                  <template #prepend>
                    <v-checkbox-btn
                      :model-value="isFilterSelected('country', item.value)"
                      density="compact"
                      @update:model-value="toggleFilter('country', item.value)"
                    />
                  </template>
                </v-list-item>
                <v-list-item v-if="!stats.country.length" class="empty-hint">
                  <v-list-item-title class="text-center text-caption text-grey"
                    >先输入fofa搜索语句，然后再点击右侧按钮加载数据</v-list-item-title
                  >
                </v-list-item>
              </v-list-group>
              <v-divider />

              <!-- ASN 编号 -->
              <v-list-group value="asn" :disabled="!stats.asn.length">
                <template #activator="{ props }">
                  <v-list-item
                    v-bind="stats.asn.length ? props : {}"
                    class="group-item"
                    @click="handleGroupClick('asn', $event)"
                  >
                    <template #prepend>
                      <v-checkbox-btn
                        :model-value="isFieldAllSelected('asn')"
                        :indeterminate="isFieldPartiallySelected('asn')"
                        :disabled="!stats.asn.length"
                        density="compact"
                        @click.stop
                        @update:model-value="toggleFieldSelection('asn')"
                      />
                      <v-icon>mdi-network</v-icon>
                    </template>
                    <v-list-item-title>ASN 编号</v-list-item-title>
                    <template #append>
                      <v-btn
                        v-if="!stats.asn.length && !failedFields.asn"
                        icon="mdi-download"
                        size="x-small"
                        variant="text"
                        :loading="currentLoadingField === 'asn'"
                        :disabled="!searchQuery || isAnyLoading"
                        @click.stop="loadFieldStats('asn')"
                      >
                        <span v-if="isFieldCoolingDown('asn')" class="cooldown-text">{{
                          getFieldCooldown('asn')
                        }}</span>
                        <v-icon v-else-if="isFieldInQueue('asn') && currentLoadingField !== 'asn'"
                          >mdi-clock-outline</v-icon
                        >
                        <v-icon v-else>mdi-download</v-icon>
                      </v-btn>
                      <v-btn
                        v-else-if="failedFields.asn"
                        icon
                        size="x-small"
                        variant="text"
                        color="error"
                        :disabled="isAnyLoading"
                        @click.stop="openRetryDialog('asn')"
                      >
                        <v-icon size="small">mdi-alert-circle</v-icon>
                      </v-btn>
                      <v-btn v-else icon size="x-small" variant="text" disabled>
                        <v-icon size="small" color="success">mdi-check-circle</v-icon>
                      </v-btn>
                    </template>
                  </v-list-item>
                </template>
                <v-list-item
                  v-for="item in stats.asn"
                  :key="item.value"
                  :title="`${item.value} (${item.count})`"
                  density="compact"
                  class="stat-item"
                >
                  <template #prepend>
                    <v-checkbox-btn
                      :model-value="isFilterSelected('asn', item.value)"
                      density="compact"
                      @update:model-value="toggleFilter('asn', item.value)"
                    />
                  </template>
                </v-list-item>
                <v-list-item v-if="!stats.asn.length" class="empty-hint">
                  <v-list-item-title class="text-center text-caption text-grey"
                    >先输入fofa搜索语句，然后再点击右侧按钮加载数据</v-list-item-title
                  >
                </v-list-item>
              </v-list-group>
              <v-divider />

              <!-- ASN 组织 -->
              <v-list-group value="org" :disabled="!stats.org.length">
                <template #activator="{ props }">
                  <v-list-item
                    v-bind="stats.org.length ? props : {}"
                    class="group-item"
                    @click="handleGroupClick('org', $event)"
                  >
                    <template #prepend>
                      <v-checkbox-btn
                        :model-value="isFieldAllSelected('org')"
                        :indeterminate="isFieldPartiallySelected('org')"
                        :disabled="!stats.org.length"
                        density="compact"
                        @click.stop
                        @update:model-value="toggleFieldSelection('org')"
                      />
                      <v-icon>mdi-domain</v-icon>
                    </template>
                    <v-list-item-title>ASN 组织</v-list-item-title>
                    <template #append>
                      <v-btn
                        v-if="!stats.org.length && !failedFields.org"
                        icon="mdi-download"
                        size="x-small"
                        variant="text"
                        :loading="currentLoadingField === 'org'"
                        :disabled="!searchQuery || isAnyLoading"
                        @click.stop="loadFieldStats('org')"
                      >
                        <span v-if="isFieldCoolingDown('org')" class="cooldown-text">{{
                          getFieldCooldown('org')
                        }}</span>
                        <v-icon v-else-if="isFieldInQueue('org') && currentLoadingField !== 'org'"
                          >mdi-clock-outline</v-icon
                        >
                        <v-icon v-else>mdi-download</v-icon>
                      </v-btn>
                      <v-btn
                        v-else-if="failedFields.org"
                        icon
                        size="x-small"
                        variant="text"
                        color="error"
                        :disabled="isAnyLoading"
                        @click.stop="openRetryDialog('org')"
                      >
                        <v-icon size="small">mdi-alert-circle</v-icon>
                      </v-btn>
                      <v-btn v-else icon size="x-small" variant="text" disabled>
                        <v-icon size="small" color="success">mdi-check-circle</v-icon>
                      </v-btn>
                    </template>
                  </v-list-item>
                </template>
                <v-list-item
                  v-for="item in stats.org"
                  :key="item.value"
                  :title="`${item.value} (${item.count})`"
                  density="compact"
                  class="stat-item"
                >
                  <template #prepend>
                    <v-checkbox-btn
                      :model-value="isFilterSelected('org', item.value)"
                      density="compact"
                      @update:model-value="toggleFilter('org', item.value)"
                    />
                  </template>
                </v-list-item>
                <v-list-item v-if="!stats.org.length" class="empty-hint">
                  <v-list-item-title class="text-center text-caption text-grey"
                    >先输入fofa搜索语句，然后再点击右侧按钮加载数据</v-list-item-title
                  >
                </v-list-item>
              </v-list-group>
              <v-divider />

              <!-- 资产类型 -->
              <v-list-group value="asset_type" :disabled="!stats.asset_type.length">
                <template #activator="{ props }">
                  <v-list-item
                    v-bind="stats.asset_type.length ? props : {}"
                    class="group-item"
                    @click="handleGroupClick('asset_type', $event)"
                  >
                    <template #prepend>
                      <v-checkbox-btn
                        :model-value="isFieldAllSelected('asset_type')"
                        :indeterminate="isFieldPartiallySelected('asset_type')"
                        :disabled="!stats.asset_type.length"
                        density="compact"
                        @click.stop
                        @update:model-value="toggleFieldSelection('asset_type')"
                      />
                      <v-icon>mdi-shape</v-icon>
                    </template>
                    <v-list-item-title>资产类型</v-list-item-title>
                    <template #append>
                      <v-btn
                        v-if="!stats.asset_type.length && !failedFields.asset_type"
                        icon="mdi-download"
                        size="x-small"
                        variant="text"
                        :loading="currentLoadingField === 'asset_type'"
                        :disabled="!searchQuery || isAnyLoading"
                        @click.stop="loadFieldStats('asset_type')"
                      >
                        <span v-if="isFieldCoolingDown('asset_type')" class="cooldown-text">{{
                          getFieldCooldown('asset_type')
                        }}</span>
                        <v-icon
                          v-else-if="
                            isFieldInQueue('asset_type') && currentLoadingField !== 'asset_type'
                          "
                          >mdi-clock-outline</v-icon
                        >
                        <v-icon v-else>mdi-download</v-icon>
                      </v-btn>
                      <v-btn
                        v-else-if="failedFields.asset_type"
                        icon
                        size="x-small"
                        variant="text"
                        color="error"
                        :disabled="isAnyLoading"
                        @click.stop="openRetryDialog('asset_type')"
                      >
                        <v-icon size="small">mdi-alert-circle</v-icon>
                      </v-btn>
                      <v-btn v-else icon size="x-small" variant="text" disabled>
                        <v-icon size="small" color="success">mdi-check-circle</v-icon>
                      </v-btn>
                    </template>
                  </v-list-item>
                </template>
                <v-list-item
                  v-for="item in stats.asset_type"
                  :key="item.value"
                  :title="`${item.value} (${item.count})`"
                  density="compact"
                  class="stat-item"
                >
                  <template #prepend>
                    <v-checkbox-btn
                      :model-value="isFilterSelected('asset_type', item.value)"
                      density="compact"
                      @update:model-value="toggleFilter('asset_type', item.value)"
                    />
                  </template>
                </v-list-item>
                <v-list-item v-if="!stats.asset_type.length" class="empty-hint">
                  <v-list-item-title class="text-center text-caption text-grey"
                    >先输入fofa搜索语句，然后再点击右侧按钮加载数据</v-list-item-title
                  >
                </v-list-item>
              </v-list-group>
              <v-divider />

              <!-- FID 统计 -->
              <v-list-group value="fid" :disabled="!stats.fid.length">
                <template #activator="{ props }">
                  <v-list-item
                    v-bind="stats.fid.length ? props : {}"
                    class="group-item"
                    @click="handleGroupClick('fid', $event)"
                  >
                    <template #prepend>
                      <v-checkbox-btn
                        :model-value="isFieldAllSelected('fid')"
                        :indeterminate="isFieldPartiallySelected('fid')"
                        :disabled="!stats.fid.length"
                        density="compact"
                        @click.stop
                        @update:model-value="toggleFieldSelection('fid')"
                      />
                      <v-icon>mdi-fingerprint</v-icon>
                    </template>
                    <v-list-item-title>FID 统计</v-list-item-title>
                    <template #append>
                      <v-btn
                        v-if="!stats.fid.length && !failedFields.fid"
                        icon="mdi-download"
                        size="x-small"
                        variant="text"
                        :loading="currentLoadingField === 'fid'"
                        :disabled="!searchQuery || isAnyLoading"
                        @click.stop="loadFieldStats('fid')"
                      >
                        <span v-if="isFieldCoolingDown('fid')" class="cooldown-text">{{
                          getFieldCooldown('fid')
                        }}</span>
                        <v-icon v-else-if="isFieldInQueue('fid') && currentLoadingField !== 'fid'"
                          >mdi-clock-outline</v-icon
                        >
                        <v-icon v-else>mdi-download</v-icon>
                      </v-btn>
                      <v-btn
                        v-else-if="failedFields.fid"
                        icon
                        size="x-small"
                        variant="text"
                        color="error"
                        :disabled="isAnyLoading"
                        @click.stop="openRetryDialog('fid')"
                      >
                        <v-icon size="small">mdi-alert-circle</v-icon>
                      </v-btn>
                      <v-btn v-else icon size="x-small" variant="text" disabled>
                        <v-icon size="small" color="success">mdi-check-circle</v-icon>
                      </v-btn>
                    </template>
                  </v-list-item>
                </template>
                <v-list-item
                  v-for="item in stats.fid"
                  :key="item.value"
                  :title="`${item.value} (${item.count})`"
                  density="compact"
                  class="stat-item"
                >
                  <template #prepend>
                    <v-checkbox-btn
                      :model-value="isFilterSelected('fid', item.value)"
                      density="compact"
                      @update:model-value="toggleFilter('fid', item.value)"
                    />
                  </template>
                </v-list-item>
                <v-list-item v-if="!stats.fid.length" class="empty-hint">
                  <v-list-item-title class="text-center text-caption text-grey"
                    >先输入fofa搜索语句，然后再点击右侧按钮加载数据</v-list-item-title
                  >
                </v-list-item>
              </v-list-group>
              <v-divider />

              <!-- ICP 备案 -->
              <v-list-group value="icp" :disabled="!stats.icp.length">
                <template #activator="{ props }">
                  <v-list-item
                    v-bind="stats.icp.length ? props : {}"
                    class="group-item"
                    @click="handleGroupClick('icp', $event)"
                  >
                    <template #prepend>
                      <v-checkbox-btn
                        :model-value="isFieldAllSelected('icp')"
                        :indeterminate="isFieldPartiallySelected('icp')"
                        :disabled="!stats.icp.length"
                        density="compact"
                        @click.stop
                        @update:model-value="toggleFieldSelection('icp')"
                      />
                      <v-icon>mdi-file-document</v-icon>
                    </template>
                    <v-list-item-title>ICP 备案</v-list-item-title>
                    <template #append>
                      <v-btn
                        v-if="!stats.icp.length && !failedFields.icp"
                        icon="mdi-download"
                        size="x-small"
                        variant="text"
                        :loading="currentLoadingField === 'icp'"
                        :disabled="!searchQuery || isAnyLoading"
                        @click.stop="loadFieldStats('icp')"
                      >
                        <span v-if="isFieldCoolingDown('icp')" class="cooldown-text">{{
                          getFieldCooldown('icp')
                        }}</span>
                        <v-icon v-else-if="isFieldInQueue('icp') && currentLoadingField !== 'icp'"
                          >mdi-clock-outline</v-icon
                        >
                        <v-icon v-else>mdi-download</v-icon>
                      </v-btn>
                      <v-btn
                        v-else-if="failedFields.icp"
                        icon
                        size="x-small"
                        variant="text"
                        color="error"
                        :disabled="isAnyLoading"
                        @click.stop="openRetryDialog('icp')"
                      >
                        <v-icon size="small">mdi-alert-circle</v-icon>
                      </v-btn>
                      <v-btn v-else icon size="x-small" variant="text" disabled>
                        <v-icon size="small" color="success">mdi-check-circle</v-icon>
                      </v-btn>
                    </template>
                  </v-list-item>
                </template>
                <v-list-item
                  v-for="item in stats.icp"
                  :key="item.value"
                  :title="`${item.value} (${item.count})`"
                  density="compact"
                  class="stat-item"
                >
                  <template #prepend>
                    <v-checkbox-btn
                      :model-value="isFilterSelected('icp', item.value)"
                      density="compact"
                      @update:model-value="toggleFilter('icp', item.value)"
                    />
                  </template>
                </v-list-item>
                <v-list-item v-if="!stats.icp.length" class="empty-hint">
                  <v-list-item-title class="text-center text-caption text-grey"
                    >先输入fofa搜索语句，然后再点击右侧按钮加载数据</v-list-item-title
                  >
                </v-list-item>
              </v-list-group>
            </v-list>
          </div>
        </div>

        <v-divider vertical />

        <!-- 右侧：搜索结果 -->
        <div class="results-section">
          <div class="results-header">
            <v-icon size="20" class="mr-2">mdi-database-search</v-icon>
            <span>搜索结果</span>

            <!-- 批量验证统计信息框 - Material Design 风格 -->
            <div v-if="hasSearched && searchResults.length > 0" class="verify-stats-box">
              <v-tooltip text="安全" location="bottom">
                <template #activator="{ props }">
                  <div class="stat-item safe-item" v-bind="props">
                    <v-icon size="18">mdi-shield-check</v-icon>
                    <span class="stat-number">{{ batchVerifyStats.safe }}</span>
                  </div>
                </template>
              </v-tooltip>
              <v-tooltip text="存在漏洞" location="bottom">
                <template #activator="{ props }">
                  <div class="stat-item vulnerable-item" v-bind="props">
                    <v-icon size="18">mdi-alert-circle</v-icon>
                    <span class="stat-number">{{ batchVerifyStats.vulnerable }}</span>
                  </div>
                </template>
              </v-tooltip>
              <v-tooltip text="验证出错" location="bottom">
                <template #activator="{ props }">
                  <div class="stat-item error-item" v-bind="props">
                    <v-icon size="18">mdi-alert-remove</v-icon>
                    <span class="stat-number">{{ batchVerifyStats.error }}</span>
                  </div>
                </template>
              </v-tooltip>
              <!-- 批量验证按钮 - 支持暂停/继续 -->
              <v-tooltip
                :text="batchVerifying ? '暂停验证' : batchVerifyPaused ? '继续验证' : '批量验证'"
                location="bottom"
              >
                <template #activator="{ props }">
                  <v-btn
                    icon
                    size="small"
                    :color="batchVerifyPaused ? 'warning' : 'primary'"
                    variant="tonal"
                    v-bind="props"
                    @click="toggleBatchVerify"
                  >
                    <v-icon>{{
                      batchVerifying ? 'mdi-pause' : batchVerifyPaused ? 'mdi-play' : 'mdi-play'
                    }}</v-icon>
                  </v-btn>
                </template>
              </v-tooltip>
            </div>

            <v-spacer />
            <div v-if="hasSearched && totalResults > 0" class="result-count">
              共 {{ totalResults }} 条 (已加载 {{ loadedCount }} 条)
            </div>
            <!-- 自动加载按钮 -->
            <v-btn
              v-if="searchResults.length > 0 && autoLoadStatus !== 'loading'"
              icon
              size="small"
              :color="
                autoLoadStatus === 'completed'
                  ? 'success'
                  : autoLoadStatus === 'error'
                    ? 'error'
                    : 'default'
              "
              :variant="autoLoadStatus === 'idle' || autoLoadStatus === 'paused' ? 'text' : 'tonal'"
              class="ml-3"
              @click="toggleAutoLoad"
            >
              <v-icon v-if="autoLoadStatus === 'completed'">mdi-check-circle</v-icon>
              <v-icon v-else-if="autoLoadStatus === 'error'">mdi-alert-circle</v-icon>
              <v-icon v-else>mdi-reload</v-icon>
              <v-tooltip activator="parent" location="bottom">
                <template v-if="autoLoadStatus === 'completed'">所有数据已加载</template>
                <template v-else-if="autoLoadStatus === 'error'">加载失败，点击重试</template>
                <template v-else-if="autoLoadStatus === 'paused'">继续自动加载</template>
                <template v-else>自动加载所有数据</template>
              </v-tooltip>
            </v-btn>
            <!-- 停止按钮（加载中时显示） -->
            <v-btn
              v-if="searchResults.length > 0 && autoLoadStatus === 'loading'"
              icon
              size="small"
              color="warning"
              variant="tonal"
              class="ml-3"
              @click="pauseAutoLoad"
            >
              <v-icon>mdi-stop</v-icon>
              <v-tooltip activator="parent" location="bottom">停止自动加载</v-tooltip>
            </v-btn>
            <v-btn
              v-if="searchResults.length > 0"
              size="small"
              color="primary"
              variant="tonal"
              prepend-icon="mdi-download"
              class="ml-2"
            >
              导出
            </v-btn>

            <v-btn
              size="small"
              color="secondary"
              variant="tonal"
              prepend-icon="mdi-cog"
              class="ml-2"
              @click="openSettingsDialog"
            >
              设置
            </v-btn>
          </div>
          <v-divider />
          <div ref="resultsBodyRef" class="results-body" :class="{ loading: loadingPage }">
            <!-- 加载遮罩 - 覆盖整个结果区域 -->
            <div v-if="loadingPage" class="results-loading-overlay">
              <v-progress-circular indeterminate color="primary" size="48" />
              <div class="loading-text">正在加载页面数据...</div>
            </div>

            <div v-if="!hasSearched" class="empty-state">
              <v-icon size="64" color="grey-lighten-1">mdi-magnify</v-icon>
              <div class="empty-title">请输入 FOFA 搜索语句</div>
              <div class="empty-desc">
                先输入顶部 FOFA 搜索语句，再点击左侧筛选条件右侧的加载按钮，可突破 FOFA 的 10000
                条数据限制
              </div>
            </div>

            <div v-else-if="searching" class="loading-state">
              <v-progress-circular indeterminate color="primary" size="48" />
              <div class="loading-text">正在搜索...</div>
            </div>

            <div
              v-else-if="hasSearched && searchResults.length === 0 && !loadingPage"
              class="empty-state"
            >
              <v-icon size="64" color="grey-lighten-1">mdi-database-off</v-icon>
              <div class="empty-title">未找到结果</div>
              <div class="empty-desc">请尝试修改搜索条件</div>
            </div>

            <div v-else-if="hasSearched" class="table-wrapper">
              <v-data-table
                :headers="tableHeaders"
                :items="paginatedResults"
                class="results-table"
                density="comfortable"
                hide-default-footer
                fixed-header
                :items-per-page="-1"
              >
                <!-- 网站信息列 -->
                <template #[`item.site`]="{ item }">
                  <div class="site-cell">
                    <v-avatar size="32" class="site-avatar">
                      <v-img
                        v-if="item.icon && !item.iconError"
                        :src="item.icon"
                        @error="item.iconError = true"
                      />
                      <v-icon v-else size="16">mdi-web</v-icon>
                    </v-avatar>
                    <div class="site-info">
                      <div class="site-title-row">
                        <span class="site-title" :title="item.title">
                          {{ item.title }}
                        </span>
                        <span
                          v-if="item.latency !== undefined"
                          :class="['latency-badge', getLatencyClass(item.latency, item.accessible)]"
                        >
                          <template v-if="item.accessible">{{ item.latency }}ms</template>
                          <template v-else>
                            <v-icon size="14">mdi-alert-remove</v-icon>
                            <span>-1ms</span>
                          </template>
                        </span>
                        <span
                          v-else-if="item.checkingStatus"
                          class="latency-badge latency-checking"
                        >
                          ...
                        </span>
                      </div>
                      <a
                        :href="item.fullUrl"
                        target="_blank"
                        class="site-url"
                        :title="item.fullUrl"
                      >
                        {{ item.fullUrl }}
                      </a>
                    </div>
                  </div>
                </template>

                <!-- 地理位置列 -->
                <template #[`item.location`]="{ item }">
                  <div class="location-cell-stacked">
                    <div v-if="item.countryInfo" class="location-row">
                      <img
                        v-if="item.countryInfo.flagUrl"
                        :src="item.countryInfo.flagUrl"
                        :alt="item.countryInfo.name"
                        class="country-flag-inline"
                        @error="(e) => (e.target.style.display = 'none')"
                      />
                      <span v-else class="country-flag-emoji-inline">{{
                        item.countryInfo.flag
                      }}</span>
                      <span class="country-name">{{
                        item.countryInfo.name || item.country || '-'
                      }}</span>
                    </div>
                    <div v-if="item.region || item.city" class="location-detail">
                      {{ [item.region, item.city].filter(Boolean).join(' / ') }}
                    </div>
                    <span v-if="!item.countryInfo && !item.region && !item.city" class="text-grey"
                      >-</span
                    >
                  </div>
                </template>

                <!-- 系统/服务列 -->
                <template #[`item.osServer`]="{ item }">
                  <div class="os-server-cell">
                    <div class="os-line" :class="item.os === '-' ? 'text-grey' : ''">
                      {{ item.os }}
                    </div>
                    <div class="server-line" :class="item.server === '-' ? 'text-grey' : ''">
                      {{ item.server }}
                    </div>
                  </div>
                </template>

                <!-- 漏洞检测列 -->
                <template #[`item.poc`]="{ item }">
                  <v-chip
                    v-if="item.pocStatus === 'pending'"
                    size="small"
                    color="grey"
                    variant="outlined"
                  >
                    <v-icon start size="14">mdi-clock-outline</v-icon>
                    待检测
                  </v-chip>
                  <v-chip
                    v-else-if="item.pocStatus === 'checking'"
                    size="small"
                    color="info"
                    variant="flat"
                  >
                    <v-progress-circular indeterminate size="12" width="2" class="mr-1" />
                    检测中
                  </v-chip>
                  <v-chip
                    v-else-if="item.pocStatus === 'vulnerable'"
                    size="small"
                    color="error"
                    variant="flat"
                  >
                    <v-icon start size="14">mdi-alert-circle</v-icon>
                    存在漏洞
                  </v-chip>
                  <v-chip
                    v-else-if="item.pocStatus === 'safe'"
                    size="small"
                    color="success"
                    variant="flat"
                  >
                    <v-icon start size="14">mdi-shield-check</v-icon>
                    安全
                  </v-chip>
                  <v-chip v-else size="small" color="warning" variant="outlined">
                    <v-icon start size="14">mdi-alert</v-icon>
                    检测失败
                  </v-chip>
                </template>
                <!-- 自定义分页 -->
                <template #bottom>
                  <div class="custom-pagination">
                    <div class="pagination-left">
                      <span class="pagination-text">第</span>
                      <v-text-field
                        v-model.number="pageInput"
                        type="number"
                        density="compact"
                        variant="outlined"
                        hide-details
                        class="page-input"
                        @keyup.enter="goToInputPage"
                        @blur="goToInputPage"
                      />
                      <span class="pagination-text">页 / 共 {{ totalPages }} 页</span>
                    </div>
                    <div class="pagination-controls">
                      <v-btn
                        icon="mdi-chevron-left"
                        size="small"
                        variant="text"
                        :disabled="currentPage === 1"
                        @click="currentPage--"
                      />
                      <div class="page-numbers">
                        <v-btn
                          v-for="page in visiblePages"
                          :key="page"
                          :variant="page === currentPage ? 'flat' : 'text'"
                          :color="page === currentPage ? 'primary' : ''"
                          size="small"
                          :disabled="typeof page === 'string'"
                          @click="typeof page === 'number' && (currentPage = page)"
                        >
                          {{ page }}
                        </v-btn>
                      </div>
                      <v-btn
                        icon="mdi-chevron-right"
                        size="small"
                        variant="text"
                        :disabled="currentPage === totalPages"
                        @click="currentPage++"
                      />
                    </div>
                    <div class="pagination-right">
                      <span class="pagination-text">每页</span>
                      <v-select
                        v-model="itemsPerPage"
                        :items="itemsPerPageOptions"
                        density="compact"
                        variant="outlined"
                        hide-details
                        class="items-per-page-select"
                        @update:model-value="onItemsPerPageChange"
                      />
                      <span class="pagination-text">条</span>
                    </div>
                  </div>
                </template>
              </v-data-table>
            </div>
          </div>
        </div>
      </div>
    </v-card>

    <!-- 重试对话框 -->
    <v-dialog v-model="retryDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">加载失败</v-card-title>
        <v-card-text>
          <div class="mb-2">
            字段 <strong>{{ retryField }}</strong> 加载失败
          </div>
          <div v-if="retryError" class="text-error text-caption">错误信息: {{ retryError }}</div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="retryDialog = false">取消</v-btn>
          <v-btn color="primary" variant="flat" @click="retryLoadField">重试</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 批量验证设置对话框 -->
    <v-dialog v-model="settingsDialog" max-width="600">
      <v-card>
        <v-card-title class="text-h6 d-flex align-center">
          <v-icon class="mr-2">mdi-cog</v-icon>
          批量验证设置
        </v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <!-- 每页数量设置 -->
          <div class="mb-6">
            <div class="text-subtitle-2 mb-2">每页数量</div>
            <v-radio-group v-model="tempSettings.pageSize" inline hide-details>
              <v-radio label="20" :value="20" />
              <v-radio label="50" :value="50" />
              <v-radio label="100" :value="100" />
              <v-radio label="200" :value="200" />
              <v-radio label="自定义" :value="0" />
            </v-radio-group>
            <v-text-field
              v-if="tempSettings.pageSize === 0"
              v-model.number="tempSettings.customPageSize"
              type="number"
              label="自定义数量"
              variant="outlined"
              density="compact"
              class="mt-3"
              :rules="[
                (v) => !!v || '请输入数量',
                (v) => v > 0 || '数量必须大于0',
                (v) => v <= 10000 || '数量不能超过10000'
              ]"
              hint="最大不超过 10000"
              persistent-hint
            />
          </div>

          <!-- FOFA 最大数量设置 -->
          <div class="mb-6">
            <div class="text-subtitle-2 mb-2">FOFA 最大数量</div>
            <v-text-field
              v-model.number="tempSettings.maxFofaResults"
              type="number"
              label="最大数量"
              variant="outlined"
              density="compact"
              :rules="[
                (v) => !!v || '请输入数量',
                (v) => v > 0 || '数量必须大于0',
                (v) => v <= 10000 || '数量不能超过10000'
              ]"
              hint="限制从 FOFA 获取的最大数据量，默认 10000"
              persistent-hint
            />
          </div>

          <!-- 验证命令设置 -->
          <div class="mb-4">
            <div class="text-subtitle-2 mb-2">验证命令</div>
            <v-text-field
              v-model="tempSettings.verifyCommand"
              label="命令"
              variant="outlined"
              density="compact"
              placeholder="whoami"
              hint="默认命令为 whoami，可自定义其他命令"
              persistent-hint
            />
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="cancelSettings">取消</v-btn>
          <v-btn color="primary" variant="flat" @click="saveSettings">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 自动加载失败对话框 -->
    <v-dialog v-model="autoLoadErrorDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h6 d-flex align-center">
          <v-icon color="error" class="mr-2">mdi-alert-circle</v-icon>
          加载失败
        </v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <div class="mb-2">
            第 <strong>{{ autoLoadErrorPage }}</strong> 页加载失败
          </div>
          <div v-if="autoLoadErrorMessage" class="text-error text-caption">
            错误信息: {{ autoLoadErrorMessage }}
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="autoLoadErrorDialog = false">关闭</v-btn>
          <v-btn color="primary" variant="flat" @click="retryAutoLoadPage">重试</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="top">
      {{ snackbar.text }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getCountryInfoByName } from '../utils/countryMap'

const router = useRouter()
const fofaConnected = ref(false)
const testingConnection = ref(false)
const fofaEmail = ref('')
const userInfo = ref({
  email: '',
  username: '',
  avatar: '',
  fcoin: 0,
  fofa_point: 0,
  remain_free_point: 0,
  isvip: false,
  vip_level: 0
})
const searchQuery = ref('')
const searching = ref(false)
const loadingStats = ref(false)
const hasSearched = ref(false)
const searchHistory = ref([])
const showHistoryDropdown = ref(false)
const loadingFields = ref({
  protocol: false,
  domain: false,
  port: false,
  title: false,
  os: false,
  server: false,
  country: false,
  asn: false,
  org: false,
  asset_type: false,
  fid: false,
  icp: false
})
const failedFields = ref({
  protocol: false,
  domain: false,
  port: false,
  title: false,
  os: false,
  server: false,
  country: false,
  asn: false,
  org: false,
  asset_type: false,
  fid: false,
  icp: false
})
// 队列系统
const loadQueue = ref([])
const currentLoadingField = ref(null)
const queueCooldown = ref(0)
let queueInterval = null
const isLoadingAll = ref(false)
const retryDialog = ref(false)
const retryField = ref('')
const retryError = ref('')

// 检查是否有任何加载活动（包括单个加载和一键加载）
const isAnyLoading = computed(() => {
  return currentLoadingField.value !== null || queueCooldown.value > 0 || isLoadingAll.value
})

// 检查字段是否在队列中（包括等待和正在加载）
const isFieldInQueue = (field) => {
  return loadQueue.value.includes(field) || currentLoadingField.value === field
}

// 获取字段的倒计时
const getFieldCooldown = (field) => {
  // 如果正在倒计时
  if (queueCooldown.value > 0) {
    // 如果该字段在队列中且是第一个，显示倒计时
    if (loadQueue.value.length > 0 && loadQueue.value[0] === field) {
      return queueCooldown.value
    }
    // 如果该字段未加载且不在队列中，也显示倒计时（表示冷却期）
    if (!stats.value[field] || stats.value[field].length === 0) {
      if (!failedFields.value[field] && !isFieldInQueue(field)) {
        return queueCooldown.value
      }
    }
  }
  return 0
}

// 检查字段是否正在倒计时（显示倒计时数字）
const isFieldCoolingDown = (field) => {
  if (queueCooldown.value > 0) {
    // 队列中的第一个字段显示倒计时
    if (loadQueue.value.length > 0 && loadQueue.value[0] === field) {
      return true
    }
    // 未加载且不在队列中的字段也显示倒计时（冷却期）
    if (!stats.value[field] || stats.value[field].length === 0) {
      if (!failedFields.value[field] && !isFieldInQueue(field)) {
        return true
      }
    }
  }
  return false
}
const searchResults = ref([])
const totalResults = ref(0)
const searchResultsCache = ref({}) // 缓存各页数据 { pageNum: [...data] }
const loadingPages = ref(new Set()) // 正在加载的页码
const loadingPage = ref(false) // 当前是否正在加载页面
const resultsBodyRef = ref(null) // 结果区域的引用

// 分页相关
const currentPage = ref(1)
const itemsPerPage = ref(50)
const pageInput = ref(1)

// 每页数量选项（包含自定义选项）
const itemsPerPageOptions = computed(() => {
  const presetSizes = [20, 50, 100, 200]
  const currentSize = itemsPerPage.value

  // 如果当前值不在预设中，添加到选项
  if (!presetSizes.includes(currentSize)) {
    return [...presetSizes, currentSize].sort((a, b) => a - b)
  }

  return presetSizes
})

// 计算分页后的结果 - 直接返回当前页数据
const paginatedResults = computed(() => {
  return searchResults.value
})

const totalPages = computed(() => {
  return Math.ceil(totalResults.value / itemsPerPage.value)
})

// 计算已加载的条数
const loadedCount = computed(() => {
  // 统计缓存中实际的数据条数
  let count = 0
  Object.values(searchResultsCache.value).forEach((pageData) => {
    if (Array.isArray(pageData)) {
      count += pageData.length
    }
  })
  return count
})

// 表格列定义
const tableHeaders = [
  { title: '网站信息', key: 'site', sortable: false, align: 'center' },
  { title: '地理位置', key: 'location', sortable: true, align: 'center' },
  { title: '系统/服务', key: 'osServer', sortable: true, align: 'center' },
  { title: '漏洞检测', key: 'poc', sortable: false, align: 'center' }
]
const stats = ref({
  protocol: [],
  domain: [],
  port: [],
  title: [],
  os: [],
  server: [],
  country: [],
  asn: [],
  org: [],
  asset_type: [],
  fid: [],
  icp: []
})
const selectedFilters = ref([])

// 队列管理相关
const queryQueue = ref([]) // 查询队列：[{ query, totalCount }]
const pageMapping = ref([]) // 页码映射：[{ queryIndex, queryPage, startIndex, endIndex }]
const queueTotalCount = ref(0) // 队列总数据量

const snackbar = ref({ show: false, text: '', color: 'info' })

// 批量验证设置
const settingsDialog = ref(false)
const batchSettings = ref({
  pageSize: 50,
  customPageSize: 50,
  verifyCommand: 'whoami',
  maxFofaResults: 10000
})
const tempSettings = ref({
  pageSize: 50,
  customPageSize: 50,
  verifyCommand: 'whoami',
  maxFofaResults: 10000
})

// 批量验证状态
const batchVerifying = ref(false)
const batchVerifyPaused = ref(false)
const batchVerifyStats = ref({
  total: 0,
  safe: 0,
  vulnerable: 0,
  error: 0
})
const currentHighlightedRow = ref(null) // 当前高亮的行元素

// 自动加载状态
const autoLoadStatus = ref('idle') // idle, loading, paused, completed, error
const autoLoadErrorDialog = ref(false)
const autoLoadErrorPage = ref(0)
const autoLoadErrorMessage = ref('')
const autoLoadAbortController = ref(null)
const autoLoadPausedPage = ref(0) // 暂停时的页码

const showSnackbar = (text, color = 'info') => {
  snackbar.value = { show: true, text, color }
}

// 处理分组点击事件 - 未加载数据时提示
const handleGroupClick = (field, event) => {
  // 如果该字段没有数据，阻止展开并提示
  if (!stats.value[field] || stats.value[field].length === 0) {
    event.preventDefault()
    event.stopPropagation()
    // 判断是否输入了搜索语句
    if (!searchQuery.value || searchQuery.value.trim().length === 0) {
      showSnackbar('请先输入 FOFA 搜索语句', 'warning')
    } else {
      showSnackbar('请先点击右侧按钮加载数据', 'warning')
    }
  }
}

// FOFA 语法验证函数（非常宽松，只检查是否为空）
// const validateFofaQuery = (query) => {
//   // 只检查是否为空或只有空格
//   return query && query.trim().length > 0
// }

// 邮箱脱敏函数
const maskEmail = (email) => {
  if (!email) return ''
  const [username, domain] = email.split('@')
  if (!username || !domain) return email

  if (username.length <= 4) {
    // 如果用户名太短，只显示第一个字符
    return `${username[0]}***@${domain}`
  }

  // 保留前2位和后2位
  const masked = `${username.slice(0, 2)}***${username.slice(-2)}@${domain}`
  return masked
}

const loadFofaEmail = async () => {
  try {
    const result = await window.api.storage.loadSettings()
    if (result.success && result.settings) {
      const email = result.settings.fofaApiEmail || ''
      fofaEmail.value = maskEmail(email)
    }
  } catch (error) {
    console.error('加载 FOFA 邮箱失败:', error)
  }
}
const testFofaConnection = async () => {
  testingConnection.value = true
  try {
    if (!window.api || !window.api.fofa || !window.api.fofa.testConnection) {
      fofaConnected.value = false
      showSnackbar('FOFA API 不可用，请完全关闭应用并重新启动', 'error')
      return
    }
    const result = await window.api.fofa.testConnection()
    if (result.success) {
      fofaConnected.value = true
      userInfo.value = result.userInfo
      showSnackbar('FOFA 连接成功', 'success')
    } else {
      fofaConnected.value = false
      showSnackbar('FOFA 连接失败: ' + result.error, 'error')
    }
  } catch (error) {
    fofaConnected.value = false
    showSnackbar('连接测试失败: ' + error.message, 'error')
  } finally {
    testingConnection.value = false
  }
}

const goToSettings = () => {
  router.push('/settings')
}

const buildFullQuery = () => {
  let query = searchQuery.value
  selectedFilters.value.forEach((filter) => {
    query += ` && ${filter.field}="${filter.value}"`
  })
  return query
}

/**
 * 生成查询队列和页码映射
 * 根据选中的筛选条件，生成多个查询，并预先计算每一页对应的查询和页码
 */
const buildQueryQueue = () => {
  queryQueue.value = []
  pageMapping.value = []
  queueTotalCount.value = 0

  // 获取 FOFA 最大数量限制
  const maxResults = batchSettings.value.maxFofaResults || 10000

  if (selectedFilters.value.length === 0) {
    // 没有筛选条件，使用原始查询
    queryQueue.value.push({
      query: searchQuery.value,
      totalCount: 0 // 将在搜索时更新
    })
  } else {
    // 为每个筛选条件生成一个查询
    selectedFilters.value.forEach((filter) => {
      const query = `${searchQuery.value} && ${filter.field}="${filter.value}"`

      // 从统计数据中获取该筛选条件的数量
      const fieldData = stats.value[filter.field]
      const item = fieldData?.find((i) => i.value === filter.value)
      // 应用 maxFofaResults 限制
      const count = Math.min(item?.count || 0, maxResults)

      queryQueue.value.push({
        query,
        totalCount: count
      })

      queueTotalCount.value += count
    })
  }

  // 构建页码映射
  buildPageMapping()

  console.log('生成查询队列:', queryQueue.value)
  console.log('队列总数据量:', queueTotalCount.value)
  console.log('FOFA 最大数量限制:', maxResults)
  console.log('页码映射:', pageMapping.value.slice(0, 5), '...')
}

/**
 * 构建页码映射表
 * 预先计算每一页对应哪个查询、该查询的第几页、以及数据范围
 */
const buildPageMapping = () => {
  pageMapping.value = []
  const pageSize = itemsPerPage.value
  let globalIndex = 0 // 全局数据索引

  queryQueue.value.forEach((queueItem, queryIndex) => {
    const queryTotalCount = queueItem.totalCount
    let queryDataIndex = 0 // 该查询内的数据索引

    while (queryDataIndex < queryTotalCount) {
      // 计算当前页在该查询中的起止位置
      const queryStartIndex = queryDataIndex
      const queryEndIndex = Math.min(queryDataIndex + pageSize, queryTotalCount)
      const itemCount = queryEndIndex - queryStartIndex

      // 计算该查询的页码（FOFA API 的页码）
      const queryPage = Math.floor(queryDataIndex / pageSize) + 1

      // 计算在该查询页面内的起止索引
      const pageStartOffset = queryDataIndex % pageSize
      const pageEndOffset = pageStartOffset + itemCount

      pageMapping.value.push({
        queryIndex, // 查询索引
        queryPage, // 该查询的页码
        pageStartOffset, // 在查询页面内的起始偏移
        pageEndOffset, // 在查询页面内的结束偏移
        globalStartIndex: globalIndex,
        globalEndIndex: globalIndex + itemCount,
        itemCount // 该段数据的数量
      })

      globalIndex += itemCount
      queryDataIndex += itemCount
    }
  })

  console.log(`构建了 ${pageMapping.value.length} 个页面映射`)
}

/**
 * 根据全局页码获取页面映射信息
 * @param {number} pageNum - 全局页码（从1开始）
 * @returns {Array} 该页需要的映射信息数组（可能跨多个查询）
 */
const getPageMappings = (pageNum) => {
  const pageSize = itemsPerPage.value
  const startIndex = (pageNum - 1) * pageSize
  const endIndex = startIndex + pageSize

  // 找到所有与该页相关的映射
  const mappings = pageMapping.value.filter((mapping) => {
    return mapping.globalStartIndex < endIndex && mapping.globalEndIndex > startIndex
  })

  // 调整每个映射的范围，只取该页需要的部分
  return mappings.map((mapping) => {
    const needStart = Math.max(startIndex, mapping.globalStartIndex)
    const needEnd = Math.min(endIndex, mapping.globalEndIndex)
    const offsetInMapping = needStart - mapping.globalStartIndex

    return {
      ...mapping,
      needStart: mapping.pageStartOffset + offsetInMapping,
      needEnd: mapping.pageStartOffset + offsetInMapping + (needEnd - needStart)
    }
  })
}

// 构建完整的URL（带协议头）
const buildFullUrl = (host, protocol) => {
  // 如果host已经包含协议头，直接返回
  if (host.startsWith('http://') || host.startsWith('https://')) {
    return host
  }

  // 根据protocol字段添加协议头
  // FOFA的protocol字段可能是 "https", "http", "ftp" 等
  const proto = protocol.toLowerCase()

  // 如果protocol包含协议名，使用它
  if (proto.includes('https')) {
    return `https://${host}`
  } else if (proto.includes('http')) {
    return `http://${host}`
  } else if (proto.includes('ftp')) {
    return `ftp://${host}`
  }

  // 默认使用http
  return `http://${host}`
}

const handleSearch = async () => {
  if (!searchQuery.value) return

  // 添加到历史记录 - 等待保存完成
  await addToHistory(searchQuery.value)

  searching.value = true
  hasSearched.value = true
  currentPage.value = 1

  // 清空缓存和队列
  searchResultsCache.value = {}
  searchResults.value = []
  loadingPages.value.clear()

  try {
    // 生成查询队列和页码映射
    buildQueryQueue()

    // 如果没有筛选条件，需要先获取总数
    if (selectedFilters.value.length === 0) {
      const result = await window.api.fofa.search(searchQuery.value, 1, 1, false, ['host'])
      if (result.success) {
        // 应用 maxFofaResults 限制
        const maxResults = batchSettings.value.maxFofaResults || 10000
        queryQueue.value[0].totalCount = Math.min(result.data.size, maxResults)
        queueTotalCount.value = queryQueue.value[0].totalCount
        buildPageMapping()
      }
    }

    // 加载第一页数据
    const pageData = await loadPageFromQueue(1)

    if (pageData && pageData.length > 0) {
      // 缓存第一页数据
      searchResultsCache.value[1] = pageData
      searchResults.value = pageData

      console.log('第一页数据加载完成，数量:', pageData.length)

      // 设置总结果数
      totalResults.value = queueTotalCount.value
      const displaySize =
        queueTotalCount.value > 10000 ? `${queueTotalCount.value}+` : queueTotalCount.value
      showSnackbar(
        `搜索成功，找到 ${displaySize} 条结果 (${queryQueue.value.length} 个查询)`,
        'success'
      )

      // 异步加载当前页的 icon 和检测状态
      loadResultsMetadata()
    } else {
      showSnackbar('搜索失败: 未找到结果', 'error')
      searchResults.value = []
      totalResults.value = 0
    }
  } catch (error) {
    showSnackbar('搜索失败: ' + error.message, 'error')
    searchResults.value = []
    totalResults.value = 0
  } finally {
    searching.value = false
  }
}

/**
 * 从队列中加载指定页的数据
 * 使用页码映射，按需加载对应的查询和页码
 * @param {number} pageNum - 页码（从1开始）
 * @returns {Promise<Array>} 页面数据
 */
const loadPageFromQueue = async (pageNum) => {
  console.log(`加载第 ${pageNum} 页`)

  // 获取该页的映射信息
  const mappings = getPageMappings(pageNum)

  if (mappings.length === 0) {
    console.log('没有找到页面映射')
    return []
  }

  console.log(`该页需要从 ${mappings.length} 个查询中获取数据`)

  const pageData = []

  // 遍历每个映射，加载对应的数据
  for (const mapping of mappings) {
    const queueItem = queryQueue.value[mapping.queryIndex]

    console.log(`从查询 ${mapping.queryIndex} 的第 ${mapping.queryPage} 页加载数据`)
    console.log(`查询: ${queueItem.query.substring(0, 60)}...`)
    console.log(`需要该页的索引范围: ${mapping.needStart} - ${mapping.needEnd}`)

    try {
      const result = await window.api.fofa.search(
        queueItem.query,
        mapping.queryPage,
        itemsPerPage.value,
        false,
        [
          'host',
          'ip',
          'port',
          'protocol',
          'title',
          'domain',
          'country',
          'country_name',
          'region',
          'city',
          'os',
          'server'
        ]
      )

      if (result.success && result.data.results.length > 0) {
        const items = result.data.results.map((item) => {
          const host = item[0] || ''
          const protocol = item[3] || 'http'
          const fullUrl = buildFullUrl(host, protocol)
          const countryCode = item[6] || ''
          const countryName = item[7] || ''
          const region = item[8] || ''
          const city = item[9] || ''

          return {
            host: host,
            fullUrl: fullUrl,
            ip: item[1] || '',
            port: item[2] || '',
            protocol: protocol,
            title: item[4] || '无标题',
            domain: item[5] || '',
            country: countryCode,
            countryName: countryName,
            region: region,
            city: city,
            countryInfo: getCountryInfoByName(countryName || countryCode),
            os: item[10] || '-',
            server: item[11] || '-',
            icon: null,
            iconError: false,
            checkingStatus: false,
            latency: undefined,
            accessible: undefined,
            pocStatus: 'pending'
          }
        })

        // 提取需要的部分
        const neededItems = items.slice(mapping.needStart, mapping.needEnd)
        console.log(`从该查询获取了 ${neededItems.length} 条数据`)

        pageData.push(...neededItems)
      } else {
        console.log('该查询没有返回数据')
      }
    } catch (error) {
      console.error(`加载查询 ${mapping.queryIndex} 失败:`, error)
    }
  }

  console.log(`第 ${pageNum} 页最终数据量: ${pageData.length}`)
  return pageData
}

// 加载指定页的数据
const loadPageData = async (pageNum) => {
  // 如果已经在缓存中，直接使用
  if (searchResultsCache.value[pageNum]) {
    searchResults.value = searchResultsCache.value[pageNum]
    // 即使有缓存，也要加载元数据（如果还没加载过）
    await loadResultsMetadata()
    return
  }

  // 如果正在加载，不重复加载
  if (loadingPages.value.has(pageNum)) {
    return
  }

  loadingPages.value.add(pageNum)
  loadingPage.value = true

  try {
    // 使用队列加载数据
    const pageData = await loadPageFromQueue(pageNum)

    if (pageData && pageData.length > 0) {
      // 缓存数据
      searchResultsCache.value[pageNum] = pageData

      // 如果是当前页，更新显示并加载元数据
      if (pageNum === currentPage.value) {
        searchResults.value = pageData
        // 加载完成后自动加载元数据
        await loadResultsMetadata()
      }
    } else {
      showSnackbar(`第${pageNum}页没有数据`, 'warning')
    }
  } catch (error) {
    console.error(`加载第${pageNum}页数据失败:`, error)
    showSnackbar(`加载第${pageNum}页数据失败`, 'error')
  } finally {
    loadingPages.value.delete(pageNum)
    loadingPage.value = false
  }
}

// 加载结果的元数据（icon 和状态）- 只加载当前页
const loadResultsMetadata = async () => {
  // 直接遍历当前页的 searchResults
  for (let i = 0; i < searchResults.value.length; i++) {
    const item = searchResults.value[i]

    // 如果已经加载过（icon 和 latency 都有值），跳过
    if (item.icon !== null && item.latency !== undefined) continue

    // 并行加载 icon 和检测状态
    item.checkingStatus = true

    Promise.all([
      // 获取真实 icon（使用完整URL）
      window.api.fofa
        .fetchRealIcon(item.fullUrl)
        .then((iconResult) => {
          if (iconResult.success) {
            item.icon = iconResult.dataUrl
          }
        })
        .catch(() => {
          // 忽略错误
        }),

      // 检测网站状态（使用完整URL）
      window.api.fofa
        .checkSiteStatus(item.fullUrl)
        .then((statusResult) => {
          if (statusResult.success) {
            item.accessible = statusResult.accessible
            item.latency = statusResult.latency
          } else {
            // 检测失败，设置为不可访问
            item.accessible = false
            item.latency = 0
          }
        })
        .catch(() => {
          // 出错时设置为不可访问
          item.accessible = false
          item.latency = 0
        })
    ]).finally(() => {
      item.checkingStatus = false
    })

    // 每次请求之间添加小延迟，避免过载
    if (i < searchResults.value.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
}

// 根据延迟获取CSS类名
const getLatencyClass = (latency, accessible) => {
  if (!accessible) return 'latency-unreachable'
  if (latency < 200) return 'latency-fast'
  if (latency < 500) return 'latency-medium'
  if (latency < 1000) return 'latency-slow'
  return 'latency-very-slow'
}

// 计算可见的页码 - 当前页居中显示
const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value

  if (total <= 9) {
    // 总页数少于等于9页，全部显示
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // 当前页 <= 4：1,2,3,4,5,6,...,200
    if (current <= 4) {
      for (let i = 1; i <= 6; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    }
    // 当前页 = 5：1,...,3,4,5,6,7,...,200
    else if (current === 5) {
      pages.push(1)
      pages.push('...')
      for (let i = 3; i <= 7; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    }
    // 当前页 >= total-3：1,...,195,196,197,198,199,200
    else if (current >= total - 3) {
      pages.push(1)
      pages.push('...')
      for (let i = total - 5; i <= total; i++) {
        pages.push(i)
      }
    }
    // 当前页在中间，左右各2个：1,...,n-2,n-1,n,n+1,n+2,...,200
    else {
      pages.push(1)
      pages.push('...')
      for (let i = current - 2; i <= current + 2; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    }
  }

  return pages
})

// 每页数量变化时的处理
const onItemsPerPageChange = async () => {
  // 同步更新 batchSettings
  const presetSizes = [20, 50, 100, 200]
  if (presetSizes.includes(itemsPerPage.value)) {
    batchSettings.value.pageSize = itemsPerPage.value
  } else {
    batchSettings.value.pageSize = 0
    batchSettings.value.customPageSize = itemsPerPage.value
  }

  // 清空缓存
  searchResultsCache.value = {}
  currentPage.value = 1
  pageInput.value = 1

  // 如果有搜索结果，重新加载第一页
  if (hasSearched.value && searchQuery.value) {
    await loadPageData(1)
  }

  // 保存到设置
  await saveBatchSettings()
}

// 加载批量验证设置
const loadBatchSettings = async () => {
  try {
    const result = await window.api.storage.loadSettings()
    if (result.success && result.settings) {
      // 优先加载新的批量验证设置
      if (result.settings.batchVerifySettings) {
        const saved = result.settings.batchVerifySettings
        batchSettings.value = {
          pageSize: saved.pageSize || 50,
          customPageSize: saved.customPageSize || 50,
          verifyCommand: saved.verifyCommand || 'whoami',
          maxFofaResults: saved.maxFofaResults || 10000
        }
      } else if (result.settings.batchViewItemsPerPage) {
        // 向后兼容：如果有旧的 itemsPerPage 设置，迁移到新格式
        const oldPageSize = result.settings.batchViewItemsPerPage
        const presetSizes = [20, 50, 100, 200]
        if (presetSizes.includes(oldPageSize)) {
          batchSettings.value.pageSize = oldPageSize
        } else {
          batchSettings.value.pageSize = 0
          batchSettings.value.customPageSize = oldPageSize
        }
      }

      // 同步 itemsPerPage
      const pageSize =
        batchSettings.value.pageSize === 0
          ? batchSettings.value.customPageSize
          : batchSettings.value.pageSize
      itemsPerPage.value = pageSize
    }
  } catch (error) {
    console.error('加载批量验证设置失败:', error)
  }
}

// 保存批量验证设置
const saveBatchSettings = async () => {
  try {
    const result = await window.api.storage.loadSettings()
    if (result.success) {
      const settings = result.settings || {}
      settings.batchVerifySettings = {
        pageSize: batchSettings.value.pageSize,
        customPageSize: batchSettings.value.customPageSize,
        verifyCommand: batchSettings.value.verifyCommand,
        maxFofaResults: batchSettings.value.maxFofaResults
      }
      await window.api.storage.saveSettings(settings)
    }
  } catch (error) {
    console.error('保存批量验证设置失败:', error)
  }
}

// 切换批量验证状态（开始/暂停/继续）
const toggleBatchVerify = () => {
  if (batchVerifying.value) {
    // 正在验证，点击暂停
    pauseBatchVerify()
  } else if (batchVerifyPaused.value) {
    // 已暂停，点击继续
    resumeBatchVerify()
  } else {
    // 未开始，点击开始
    startBatchVerify()
  }
}

// 暂停批量验证
const pauseBatchVerify = () => {
  batchVerifying.value = false
  batchVerifyPaused.value = true
  clearHighlightedRow() // 清除高亮
  showSnackbar('批量验证已暂停', 'info')
}

// 继续批量验证
const resumeBatchVerify = async () => {
  batchVerifyPaused.value = false
  batchVerifying.value = true
  showSnackbar('继续批量验证...', 'info')
  await executeBatchVerify()
}

// 批量验证函数
const startBatchVerify = async () => {
  if (batchVerifying.value) return

  batchVerifying.value = true
  batchVerifyPaused.value = false

  // 重置统计
  batchVerifyStats.value = {
    total: 0,
    safe: 0,
    vulnerable: 0,
    error: 0
  }

  showSnackbar('开始批量验证...', 'info')
  await executeBatchVerify()
}

// 清除之前高亮的行
const clearHighlightedRow = () => {
  if (currentHighlightedRow.value) {
    currentHighlightedRow.value.style.backgroundColor = ''
    currentHighlightedRow.value = null
  }
}

// 滚动到正在验证的行
const scrollToVerifyingRow = async (rowIndex) => {
  try {
    // 等待 DOM 更新
    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 150))

    if (!resultsBodyRef.value) {
      console.log('[滚动] resultsBodyRef 不存在')
      return
    }

    // 查找所有表格行（直接从 resultsBodyRef 查找）
    const rows = resultsBodyRef.value.querySelectorAll('.results-table tbody tr')
    console.log(`[滚动] 找到 ${rows.length} 行，尝试滚动到第 ${rowIndex} 行`)

    if (!rows || rows.length === 0) {
      console.log('[滚动] 未找到表格行')
      return
    }

    if (rowIndex >= rows.length) {
      console.log(`[滚动] 行索引超出范围: ${rowIndex} >= ${rows.length}`)
      return
    }

    const targetRow = rows[rowIndex]
    if (!targetRow) {
      console.log('[滚动] 目标行不存在')
      return
    }

    // 清除之前的高亮
    clearHighlightedRow()

    // 高亮正在验证的行（不自动取消）
    targetRow.style.transition = 'background-color 0.3s ease'
    targetRow.style.backgroundColor = 'rgba(33, 150, 243, 0.2)'
    currentHighlightedRow.value = targetRow

    // 滚动容器就是 resultsBodyRef
    const scrollContainer = resultsBodyRef.value

    // 计算目标行相对于容器顶部的偏移量
    const rowOffsetTop = targetRow.offsetTop
    const containerHeight = scrollContainer.clientHeight
    const rowHeight = targetRow.clientHeight

    // 计算滚动位置，让目标行显示在容器中间
    const targetScrollTop = rowOffsetTop - containerHeight / 2 + rowHeight / 2

    console.log('[滚动] 容器高度:', containerHeight)
    console.log('[滚动] 行偏移:', rowOffsetTop)
    console.log('[滚动] 目标滚动位置:', targetScrollTop)
    console.log('[滚动] 当前滚动位置:', scrollContainer.scrollTop)

    // 执行滚动
    scrollContainer.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth'
    })

    console.log('[滚动] ✓ 滚动命令已执行')
  } catch (error) {
    console.error('[滚动] 滚动失败:', error)
  }
}

// 执行批量验证的核心逻辑
const executeBatchVerify = async () => {
  try {
    // 从当前页开始验证
    let currentPageNum = currentPage.value
    const totalPagesCount = totalPages.value

    while (currentPageNum <= totalPagesCount && batchVerifying.value) {
      // 确保当前页数据已加载
      if (!searchResultsCache.value[currentPageNum]) {
        await loadPageData(currentPageNum)
      }

      const pageResults = searchResultsCache.value[currentPageNum] || []

      // 验证当前页的所有结果
      for (let i = 0; i < pageResults.length; i++) {
        const item = pageResults[i]

        if (!batchVerifying.value) {
          // 已暂停
          clearHighlightedRow() // 清除高亮
          return
        }

        // 跳过已验证的项
        if (item.pocStatus !== 'pending') continue

        item.pocStatus = 'checking'
        batchVerifyStats.value.total++

        // 滚动到正在验证的行
        await scrollToVerifyingRow(i)

        try {
          // 执行 POC 验证
          const response = await window.api.executePOC(
            item.fullUrl,
            batchSettings.value.verifyCommand
          )

          if (!response.success) {
            item.pocStatus = 'error'
            batchVerifyStats.value.error++
            // 清除高亮
            clearHighlightedRow()
            continue
          }

          const result = response.data

          // 判断是否存在漏洞：只要有回显就算有漏洞
          if (result.is_vulnerable && result.digest_content) {
            item.pocStatus = 'vulnerable'
            batchVerifyStats.value.vulnerable++

            // 保存到 POC 验证历史记录
            await addToVulnHistory(item.fullUrl)
          } else if (result.command_failed || !result.is_vulnerable) {
            // 命令失败或没有漏洞
            if (result.command_failed) {
              item.pocStatus = 'error'
              batchVerifyStats.value.error++
            } else {
              item.pocStatus = 'safe'
              batchVerifyStats.value.safe++
            }
          } else {
            item.pocStatus = 'safe'
            batchVerifyStats.value.safe++
          }

          // 验证完成，清除高亮
          clearHighlightedRow()
        } catch (error) {
          console.error('POC 验证失败:', error)
          item.pocStatus = 'error'
          batchVerifyStats.value.error++
          // 清除高亮
          clearHighlightedRow()
        }

        // 添加小延迟避免过载
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      // 当前页验证完成，自动跳转到下一页
      if (currentPageNum < totalPagesCount) {
        currentPageNum++
        currentPage.value = currentPageNum
        pageInput.value = currentPageNum

        // 等待页面切换完成
        await nextTick()
        await new Promise((resolve) => setTimeout(resolve, 500))
      } else {
        break
      }
    }

    // 检查是否是正常完成还是被暂停
    if (batchVerifying.value) {
      clearHighlightedRow() // 清除高亮
      showSnackbar(
        `批量验证完成！安全: ${batchVerifyStats.value.safe}, 漏洞: ${batchVerifyStats.value.vulnerable}, 错误: ${batchVerifyStats.value.error}`,
        'success'
      )
      batchVerifying.value = false
      batchVerifyPaused.value = false
    }
  } catch (error) {
    console.error('批量验证出错:', error)
    clearHighlightedRow() // 清除高亮
    showSnackbar('批量验证出错: ' + error.message, 'error')
    batchVerifying.value = false
    batchVerifyPaused.value = false
  }
}

// 添加到漏洞历史记录
const addToVulnHistory = async (url) => {
  try {
    console.log('正在保存漏洞历史:', url)
    const result = await window.api.storage.addHistoryItem(url)
    if (result.success) {
      console.log('✓ 漏洞历史保存成功')
    } else {
      console.error('✗ 漏洞历史保存失败:', result.error)
    }
  } catch (error) {
    console.error('保存漏洞历史失败:', error)
  }
}

// 加载搜索历史
const loadSearchHistory = async () => {
  try {
    console.log('开始加载搜索历史...')
    const result = await window.api.storage.loadSettings()
    console.log('加载设置结果:', result)
    if (result.success && result.settings && result.settings.fofaSearchHistory) {
      searchHistory.value = result.settings.fofaSearchHistory
      console.log('✓ 搜索历史加载成功:', searchHistory.value)
    } else {
      console.log('没有找到搜索历史，使用空数组')
      searchHistory.value = []
    }
  } catch (error) {
    console.error('加载搜索历史失败:', error)
    searchHistory.value = []
  }
}

// 保存搜索历史
const saveSearchHistory = async () => {
  try {
    console.log('========== 开始保存搜索历史 ==========')
    console.log('当前历史记录数组:', JSON.stringify(searchHistory.value))
    console.log('数组长度:', searchHistory.value.length)

    const result = await window.api.storage.loadSettings()
    console.log('加载设置结果 success:', result.success)
    console.log('加载设置结果 settings:', result.settings)

    if (result.success) {
      const settings = result.settings || {}
      console.log('原始设置对象:', JSON.stringify(settings))

      // 将响应式数组转换为普通数组
      settings.fofaSearchHistory = [...searchHistory.value]
      console.log('添加历史记录后的设置:', JSON.stringify(settings))
      console.log('fofaSearchHistory 字段:', settings.fofaSearchHistory)

      const saveResult = await window.api.storage.saveSettings(settings)
      console.log('保存结果 success:', saveResult.success)
      console.log('保存结果 error:', saveResult.error)

      if (saveResult.success) {
        console.log('✓✓✓ 搜索历史保存成功 ✓✓✓')

        // 验证保存：重新加载设置
        const verifyResult = await window.api.storage.loadSettings()
        console.log('验证保存 - 重新加载的设置:', verifyResult.settings?.fofaSearchHistory)
      } else {
        console.error('✗✗✗ 搜索历史保存失败:', saveResult.error)
      }
    } else {
      console.error('✗✗✗ 加载设置失败，无法保存历史记录')
    }
    console.log('========== 保存流程结束 ==========')
  } catch (error) {
    console.error('✗✗✗ 保存搜索历史异常:', error)
    console.error('错误堆栈:', error.stack)
  }
}

// 添加到历史记录
const addToHistory = async (query) => {
  if (!query || !query.trim()) return

  const trimmedQuery = query.trim()

  // 如果已存在，先删除
  const existingIndex = searchHistory.value.indexOf(trimmedQuery)
  if (existingIndex > -1) {
    searchHistory.value.splice(existingIndex, 1)
  }

  // 添加到开头
  searchHistory.value.unshift(trimmedQuery)

  // 只保留最近10条
  if (searchHistory.value.length > 10) {
    searchHistory.value = searchHistory.value.slice(0, 10)
  }

  // 保存到本地 - 等待保存完成
  await saveSearchHistory()
}

// 选择历史记录
const selectHistory = (query) => {
  searchQuery.value = query
  showHistoryDropdown.value = false
}

// 删除历史记录
const deleteHistory = async (index) => {
  searchHistory.value.splice(index, 1)
  await saveSearchHistory()
}

// 处理搜索框失焦
const handleSearchBlur = () => {
  // 延迟关闭，以便点击事件能够触发
  setTimeout(() => {
    showHistoryDropdown.value = false
  }, 200)
}

// 跳转到输入的页码
const goToInputPage = () => {
  if (pageInput.value && pageInput.value >= 1 && pageInput.value <= totalPages.value) {
    currentPage.value = pageInput.value
  } else {
    // 如果输入无效，恢复为当前页
    pageInput.value = currentPage.value
    showSnackbar('请输入有效的页码', 'warning')
  }
}

// 队列处理器
const processQueue = async () => {
  if (loadQueue.value.length === 0) {
    currentLoadingField.value = null
    queueCooldown.value = 0
    isLoadingAll.value = false
    if (queueInterval) {
      clearInterval(queueInterval)
      queueInterval = null
    }
    return
  }

  // 如果正在冷却，等待
  if (queueCooldown.value > 0) {
    return
  }

  // 取出队列第一个任务
  const field = loadQueue.value.shift()
  currentLoadingField.value = field
  loadingFields.value[field] = true
  failedFields.value[field] = false

  try {
    const result = await window.api.fofa.stats(searchQuery.value, field, 100)

    console.log(`[${field}] 完整响应:`, JSON.stringify(result, null, 2))

    if (result.success && result.data) {
      const fieldMapping = {
        country: 'countries'
      }

      const aggsKey = fieldMapping[field] || field

      // 检查 aggs 是否存在且不为 null
      if (
        result.data.aggs &&
        result.data.aggs[aggsKey] !== null &&
        result.data.aggs[aggsKey] !== undefined
      ) {
        const aggsData = result.data.aggs[aggsKey]

        // 判断数据格式
        if (Array.isArray(aggsData) && aggsData.length > 0) {
          if (typeof aggsData[0] === 'object' && aggsData[0].name !== undefined) {
            // 对象格式：{name: "美国", count: 35452, ...}
            stats.value[field] = aggsData.map((item) => ({
              value: item.name || item.name_code || '-',
              count: item.count || 0
            }))
          } else if (Array.isArray(aggsData[0])) {
            // 数组格式：["http", 1234]
            stats.value[field] = aggsData.map((item) => ({
              value: item[0],
              count: item[1]
            }))
          } else {
            stats.value[field] = []
            console.warn(`[${field}] 未知的数据格式:`, aggsData[0])
            failedFields.value[field] = true
            showSnackbar(`${field} 数据格式错误`, 'warning')
          }
        } else {
          stats.value[field] = []
          failedFields.value[field] = true
          showSnackbar(`${field} 数据为空`, 'warning')
        }

        if (stats.value[field].length > 0) {
          console.log(`[${field}] 解析后的数据:`, stats.value[field].slice(0, 3))
          showSnackbar(`${field} 数据加载成功 (${stats.value[field].length} 条)`, 'success')
          failedFields.value[field] = false
        }
      } else {
        stats.value[field] = []
        failedFields.value[field] = true
        retryError.value = '未找到聚合数据'
        console.log(`[${field}] 未找到聚合数据，aggs:`, result.data.aggs)
        showSnackbar(`${field} 数据加载失败: 未找到聚合数据`, 'warning')
      }
    } else {
      stats.value[field] = []
      failedFields.value[field] = true
      retryError.value = result.error || '未知错误'
      showSnackbar(`${field} 数据加载失败: ${result.error}`, 'error')
    }
  } catch (error) {
    console.error(`获取 ${field} 统计失败:`, error)
    stats.value[field] = []
    failedFields.value[field] = true
    retryError.value = error.message || '未知错误'
    if (error.response?.status === 429) {
      const retryAfter = error.response?.headers?.['retry-after'] || 10
      showSnackbar(`请求过快，请等待 ${retryAfter} 秒后重试`, 'warning')
    } else {
      showSnackbar(`${field} 数据加载失败`, 'error')
    }
  } finally {
    loadingFields.value[field] = false
    currentLoadingField.value = null

    // 开始冷却倒计时（10秒）- 无论队列是否为空都要冷却
    queueCooldown.value = 10
    if (!queueInterval) {
      queueInterval = setInterval(() => {
        queueCooldown.value--
        if (queueCooldown.value <= 0) {
          queueCooldown.value = 0
          if (queueInterval) {
            clearInterval(queueInterval)
            queueInterval = null
          }
          // 如果队列中还有任务，继续处理
          if (loadQueue.value.length > 0) {
            processQueue()
          } else {
            // 队列已空，清理状态
            isLoadingAll.value = false
          }
        }
      }, 1000)
    }
  }
}

// 添加字段到加载队列
const addToQueue = (field) => {
  if (!searchQuery.value) return

  // 如果正在一键加载，不允许单独添加
  if (isLoadingAll.value) return

  // 检查是否已经在队列中或正在加载
  if (loadQueue.value.includes(field) || currentLoadingField.value === field) {
    return
  }

  // 检查是否已经加载成功
  if (stats.value[field] && stats.value[field].length > 0 && !failedFields.value[field]) {
    return
  }

  loadQueue.value.push(field)

  // 如果当前没有正在处理的任务，立即开始处理
  if (!currentLoadingField.value && queueCooldown.value === 0) {
    processQueue()
  }
}

// 加载单个字段的统计数据（通过队列）
const loadFieldStats = (field) => {
  if (isLoadingAll.value) return
  addToQueue(field)
}

// 批量加载所有字段（已废弃，保留以防需要）
// const fetchStats = async () => {
//   // 不再自动加载，改为手动加载每个字段
//   return
// }

const isFilterSelected = (field, value) => {
  return selectedFilters.value.some((f) => f.field === field && f.value === value)
}

const toggleFilter = (field, value) => {
  const index = selectedFilters.value.findIndex((f) => f.field === field && f.value === value)
  if (index > -1) {
    selectedFilters.value.splice(index, 1)
  } else {
    selectedFilters.value.push({ field, value })
  }
  // 不自动搜索，等待用户点击搜索按钮
}

// 检查某个字段是否全选
const isFieldAllSelected = (field) => {
  if (!stats.value[field] || stats.value[field].length === 0) return false
  return stats.value[field].every((item) =>
    selectedFilters.value.some((f) => f.field === field && f.value === item.value)
  )
}

// 检查某个字段是否部分选中
const isFieldPartiallySelected = (field) => {
  if (!stats.value[field] || stats.value[field].length === 0) return false
  const selectedCount = stats.value[field].filter((item) =>
    selectedFilters.value.some((f) => f.field === field && f.value === item.value)
  ).length
  return selectedCount > 0 && selectedCount < stats.value[field].length
}

// 切换某个字段的全选状态
const toggleFieldSelection = (field) => {
  if (!stats.value[field] || stats.value[field].length === 0) return

  const isAllSelected = isFieldAllSelected(field)

  if (isAllSelected) {
    // 取消全选：移除该字段的所有筛选
    selectedFilters.value = selectedFilters.value.filter((f) => f.field !== field)
  } else {
    // 全选：先移除该字段的所有筛选，再添加所有项
    selectedFilters.value = selectedFilters.value.filter((f) => f.field !== field)
    stats.value[field].forEach((item) => {
      selectedFilters.value.push({ field, value: item.value })
    })
  }
}

// 一键加载所有字段
const loadAllFields = () => {
  if (!searchQuery.value) return

  const fields = [
    'protocol',
    'domain',
    'port',
    'title',
    'os',
    'server',
    'country',
    'asn',
    'org',
    'asset_type',
    'fid',
    'icp'
  ]

  // 找出所有未加载的字段
  const unloadedFields = fields.filter(
    (field) =>
      (!stats.value[field] || stats.value[field].length === 0) && !failedFields.value[field]
  )

  if (unloadedFields.length === 0) {
    showSnackbar('所有字段已加载', 'info')
    return
  }

  // 设置加载状态，禁用所有按钮
  isLoadingAll.value = true

  // 清空现有队列
  loadQueue.value = []

  // 将所有未加载的字段添加到队列
  unloadedFields.forEach((field) => {
    loadQueue.value.push(field)
  })

  showSnackbar(`开始加载 ${unloadedFields.length} 个字段`, 'info')

  // 立即开始处理第一个任务
  processQueue()
}

// 打开重试对话框
const openRetryDialog = (field) => {
  retryField.value = field
  retryDialog.value = true
}

// 重试加载字段
const retryLoadField = () => {
  const field = retryField.value
  retryDialog.value = false

  if (field) {
    // 清除失败状态并添加到队列
    failedFields.value[field] = false
    stats.value[field] = []
    addToQueue(field)
  }
}

// 一键反选
const toggleAllSelections = () => {
  if (selectedFilters.value.length === 0) {
    // 如果当前没有选中任何项，则全选所有已加载的数据
    Object.keys(stats.value).forEach((field) => {
      if (stats.value[field] && stats.value[field].length > 0) {
        stats.value[field].forEach((item) => {
          if (!selectedFilters.value.some((f) => f.field === field && f.value === item.value)) {
            selectedFilters.value.push({ field, value: item.value })
          }
        })
      }
    })
  } else {
    // 如果有选中项，则清空所有选择
    selectedFilters.value = []
  }
}

// 格式化数字显示（保留2位小数）
const formatNumber = (num) => {
  if (num === 0) return '0'
  if (num < 1000) return num.toString()
  if (num < 10000) return (num / 1000).toFixed(2) + 'k'
  if (num < 100000) return (num / 10000).toFixed(2) + 'w'
  if (num < 1000000) return (num / 10000).toFixed(2) + 'w'
  return (num / 1000000).toFixed(2) + 'm'
}

// 计算已选择的资产数量（每个子项最多10000，然后求和）
const selectedAssetCount = computed(() => {
  if (selectedFilters.value.length === 0) return '0'

  // 获取每个筛选条件对应的资产数量，每个子项最多10000
  let totalCount = 0
  selectedFilters.value.forEach((filter) => {
    const fieldData = stats.value[filter.field]
    if (fieldData) {
      const item = fieldData.find((d) => d.value === filter.value)
      if (item) {
        // 每个子项的数量最多按10000计算
        const itemCount = Math.min(item.count || 0, 10000)
        totalCount += itemCount
      }
    }
  })

  return formatNumber(totalCount)
})

// 监听搜索框变化，清空统计数据
watch(searchQuery, async () => {
  // 清空之前的统计数据和筛选条件
  selectedFilters.value = []
  // 使用 nextTick 避免渲染冲突
  await nextTick()
  Object.keys(stats.value).forEach((key) => {
    stats.value[key] = []
  })
})

// 监听页码变化，同步输入框并加载新页面的数据
watch(
  currentPage,
  async (newPage, oldPage) => {
    // 避免初始化时触发
    if (oldPage === undefined) return

    pageInput.value = newPage

    console.log('页码变化:', oldPage, '->', newPage)
    console.log('缓存状态:', Object.keys(searchResultsCache.value))

    // 滚动到顶部
    if (resultsBodyRef.value) {
      resultsBodyRef.value.scrollTop = 0
    }

    // 检查是否有缓存
    if (searchResultsCache.value[newPage]) {
      console.log('使用缓存数据')
      searchResults.value = searchResultsCache.value[newPage]
      // 加载元数据（如果还没加载过）
      await loadResultsMetadata()
    } else if (hasSearched.value && searchQuery.value) {
      // 没有缓存，需要加载
      console.log('加载新页数据')
      await loadPageData(newPage)
    }
  },
  { flush: 'post' }
)

// 打开设置对话框
const openSettingsDialog = () => {
  // 复制当前设置到临时设置
  tempSettings.value = {
    pageSize: batchSettings.value.pageSize,
    customPageSize: batchSettings.value.customPageSize,
    verifyCommand: batchSettings.value.verifyCommand,
    maxFofaResults: batchSettings.value.maxFofaResults
  }
  settingsDialog.value = true
}

// 取消设置
const cancelSettings = () => {
  settingsDialog.value = false
}

// 保存设置
const saveSettings = () => {
  // 验证自定义页面大小
  if (tempSettings.value.pageSize === 0) {
    if (!tempSettings.value.customPageSize || tempSettings.value.customPageSize <= 0) {
      showSnackbar('请输入有效的页面数量', 'error')
      return
    }
    if (tempSettings.value.customPageSize > 10000) {
      showSnackbar('页面数量不能超过 10000', 'error')
      return
    }
  }

  // 验证 FOFA 最大数量
  if (!tempSettings.value.maxFofaResults || tempSettings.value.maxFofaResults <= 0) {
    showSnackbar('请输入有效的 FOFA 最大数量', 'error')
    return
  }
  if (tempSettings.value.maxFofaResults > 10000) {
    showSnackbar('FOFA 最大数量不能超过 10000', 'error')
    return
  }

  // 保存设置
  batchSettings.value = { ...tempSettings.value }

  // 更新 itemsPerPage
  const newPageSize =
    batchSettings.value.pageSize === 0
      ? batchSettings.value.customPageSize
      : batchSettings.value.pageSize

  if (newPageSize !== itemsPerPage.value) {
    itemsPerPage.value = newPageSize
    // 重新构建页码映射
    if (hasSearched.value) {
      buildPageMapping()
      // 重置到第一页
      currentPage.value = 1
      // 清空缓存
      searchResultsCache.value = {}
      // 重新加载第一页
      loadPageData(1)
    }
  }

  // 持久化保存设置
  saveBatchSettings()

  settingsDialog.value = false
  showSnackbar('设置已保存', 'success')
}

// 切换自动加载
const toggleAutoLoad = () => {
  if (autoLoadStatus.value === 'error') {
    // 如果加载失败，显示错误对话框
    autoLoadErrorDialog.value = true
  } else if (autoLoadStatus.value === 'completed') {
    // 如果已完成，提示用户
    showSnackbar('所有数据已加载完成', 'success')
  } else if (autoLoadStatus.value === 'paused') {
    // 如果已暂停，继续加载
    resumeAutoLoad()
  } else {
    // 开始自动加载
    startAutoLoad()
  }
}

// 暂停自动加载
const pauseAutoLoad = () => {
  if (autoLoadAbortController.value) {
    autoLoadAbortController.value.abort()
    autoLoadAbortController.value = null
  }
  autoLoadStatus.value = 'paused'
  showSnackbar('已暂停自动加载', 'info')
}

// 继续自动加载
const resumeAutoLoad = async () => {
  if (autoLoadStatus.value !== 'paused') {
    return
  }

  autoLoadStatus.value = 'loading'
  autoLoadAbortController.value = new AbortController()

  try {
    const totalPagesCount = totalPages.value

    // 从暂停的位置继续加载
    for (let page = autoLoadPausedPage.value || 2; page <= totalPagesCount; page++) {
      // 检查是否已取消
      if (autoLoadAbortController.value?.signal.aborted) {
        autoLoadPausedPage.value = page
        return
      }

      // 检查是否已缓存
      if (searchResultsCache.value[page]) {
        continue
      }

      try {
        const pageData = await loadPageFromQueue(page)
        if (pageData && pageData.length > 0) {
          searchResultsCache.value[page] = pageData
          console.log(`自动加载: 第 ${page} 页完成`)
        }

        // 添加延迟，避免请求过快
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`自动加载第 ${page} 页失败:`, error)
        autoLoadStatus.value = 'error'
        autoLoadErrorPage.value = page
        autoLoadErrorMessage.value = error.message
        autoLoadPausedPage.value = page
        return
      }
    }

    autoLoadStatus.value = 'completed'
    autoLoadPausedPage.value = 0
    showSnackbar('所有数据加载完成', 'success')
  } catch (error) {
    console.error('自动加载失败:', error)
    autoLoadStatus.value = 'error'
    autoLoadErrorMessage.value = error.message
  }
}

// 启动自动加载
const startAutoLoad = async () => {
  if (autoLoadStatus.value === 'loading') {
    return // 已经在加载中
  }

  autoLoadStatus.value = 'loading'
  autoLoadAbortController.value = new AbortController()
  autoLoadPausedPage.value = 0

  try {
    const totalPagesCount = totalPages.value

    // 从第2页开始加载（第1页已经加载）
    for (let page = 2; page <= totalPagesCount; page++) {
      // 检查是否已取消
      if (autoLoadAbortController.value?.signal.aborted) {
        autoLoadPausedPage.value = page
        return
      }

      // 检查是否已缓存
      if (searchResultsCache.value[page]) {
        continue
      }

      try {
        const pageData = await loadPageFromQueue(page)
        if (pageData && pageData.length > 0) {
          searchResultsCache.value[page] = pageData
          console.log(`自动加载: 第 ${page} 页完成`)
        }

        // 添加延迟，避免请求过快
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`自动加载第 ${page} 页失败:`, error)
        autoLoadStatus.value = 'error'
        autoLoadErrorPage.value = page
        autoLoadErrorMessage.value = error.message
        autoLoadPausedPage.value = page
        return
      }
    }

    autoLoadStatus.value = 'completed'
    autoLoadPausedPage.value = 0
    showSnackbar('所有数据加载完成', 'success')
  } catch (error) {
    console.error('自动加载失败:', error)
    autoLoadStatus.value = 'error'
    autoLoadErrorMessage.value = error.message
  }
}

// 重试自动加载失败的页面
const retryAutoLoadPage = async () => {
  autoLoadErrorDialog.value = false
  const page = autoLoadErrorPage.value

  try {
    const pageData = await loadPageFromQueue(page)
    if (pageData && pageData.length > 0) {
      searchResultsCache.value[page] = pageData
      showSnackbar(`第 ${page} 页重新加载成功`, 'success')

      // 继续自动加载
      if (batchSettings.value.autoLoad) {
        autoLoadStatus.value = 'loading'
        // 从下一页继续
        const totalPagesCount = totalPages.value
        for (let nextPage = page + 1; nextPage <= totalPagesCount; nextPage++) {
          if (autoLoadAbortController.value?.signal.aborted) {
            autoLoadStatus.value = 'idle'
            return
          }

          if (searchResultsCache.value[nextPage]) {
            continue
          }

          try {
            const nextPageData = await loadPageFromQueue(nextPage)
            if (nextPageData && nextPageData.length > 0) {
              searchResultsCache.value[nextPage] = nextPageData
              console.log(`自动加载: 第 ${nextPage} 页完成`)
            }
            await new Promise((resolve) => setTimeout(resolve, 500))
          } catch (error) {
            console.error(`自动加载第 ${nextPage} 页失败:`, error)
            autoLoadStatus.value = 'error'
            autoLoadErrorPage.value = nextPage
            autoLoadErrorMessage.value = error.message
            return
          }
        }
        autoLoadStatus.value = 'completed'
        showSnackbar('所有数据加载完成', 'success')
      }
    }
  } catch (error) {
    showSnackbar(`重试失败: ${error.message}`, 'error')
  }
}

onMounted(() => {
  loadFofaEmail()
  testFofaConnection()
  loadBatchSettings() // 先加载批量验证设置（包含 pageSize）
  loadSearchHistory()
})

onUnmounted(() => {
  // 清理定时器
  if (queueInterval) {
    clearInterval(queueInterval)
    queueInterval = null
  }
})
</script>

<style scoped>
.batch-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 20px;
  overflow: hidden;
}

/* 页面标题 */
.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.view-header h2 {
  margin: 0;
  color: rgba(0, 0, 0, 0.87);
  font-size: 24px;
  font-weight: 500;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

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

.view-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 锁定卡片 */
.lock-card {
  display: flex;
  align-items: center;
  justify-content: center;
}

.lock-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  text-align: center;
}

.lock-title {
  font-size: 20px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.87);
  margin-top: 20px;
}

.lock-desc {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.6);
  margin-top: 8px;
}

/* 主内容卡片 */
.main-card {
  display: flex;
  flex-direction: column;
}

.search-section {
  flex-shrink: 0;
  padding: 8px 16px 8px 16px;
}

.search-input-wrapper {
  position: relative;
}

/* 历史记录下拉框 */
.history-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  margin-top: 4px;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  gap: 8px;
}

.history-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.history-icon {
  color: rgba(0, 0, 0, 0.54);
  flex-shrink: 0;
}

.history-text {
  flex: 1;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.87);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-btn {
  opacity: 0;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.history-item:hover .delete-btn {
  opacity: 1;
}

.history-empty {
  display: flex;
  align-items: center;
  padding: 12px;
  gap: 8px;
  color: rgba(0, 0, 0, 0.38);
  font-size: 13px;
  text-align: center;
  justify-content: center;
}

.content-wrapper {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 左侧统计区域 */
.stats-section {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.stats-header {
  font-size: 14px;
  font-weight: 500;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  min-height: 40px;
}

.stats-body {
  flex: 1;
  overflow-y: auto;
}

.stats-list {
  padding: 0;
}

.group-item {
  background-color: rgba(0, 0, 0, 0.02);
}

.stat-item {
  padding-left: 48px;
}

.empty-hint {
  padding-left: 48px;
  pointer-events: none;
}

.cooldown-text {
  font-size: 11px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.6);
}

/* 右侧结果区域 */
.results-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.results-header {
  font-size: 14px;
  font-weight: 500;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  min-height: 40px;
}

.verify-stats-box {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 12px;
}

.verify-stats-box .v-btn {
  margin-left: 4px;
}

.verify-stats-box .stat-item {
  display: inline-flex;
  align-items: center;
  height: 28px;
  border-radius: 14px;
  padding: 0 10px 0 8px;
  cursor: help;
  transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.verify-stats-box .stat-item.safe-item {
  background-color: rgba(76, 175, 80, 0.12);
  color: #2e7d32;
}

.verify-stats-box .stat-item.safe-item:hover {
  background-color: rgba(76, 175, 80, 0.16);
}

.verify-stats-box .stat-item.vulnerable-item {
  background-color: rgba(244, 67, 54, 0.12);
  color: #c62828;
}

.verify-stats-box .stat-item.vulnerable-item:hover {
  background-color: rgba(244, 67, 54, 0.16);
}

.verify-stats-box .stat-item.error-item {
  background-color: rgba(255, 152, 0, 0.12);
  color: #e65100;
}

.verify-stats-box .stat-item.error-item:hover {
  background-color: rgba(255, 152, 0, 0.16);
}

.verify-stats-box .stat-item .v-icon {
  margin-right: 4px;
}

.verify-stats-box .stat-number {
  font-weight: 600;
  line-height: 1;
}

.result-count {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.6);
  font-weight: normal;
}

.results-body {
  flex: 1;
  overflow-y: auto;
  position: relative;
}

.results-body.loading {
  overflow: hidden;
}

/* 结果区域加载遮罩 - 绝对定位覆盖结果区域 */
.results-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(3px);
  pointer-events: all;
}

.results-loading-overlay .loading-text {
  margin-top: 16px;
  font-size: 16px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.87);
}

.table-wrapper {
  min-height: 400px;
}

.results-list {
  padding: 0;
}

/* 表格样式 */
.results-table {
  background: transparent;
  width: 100%;
}

.results-table :deep(.v-data-table__wrapper) {
  overflow-x: auto;
}

.results-table :deep(table) {
  table-layout: fixed;
  width: 100%;
}

.results-table :deep(th) {
  font-weight: 600 !important;
  background-color: rgba(0, 0, 0, 0.02) !important;
  white-space: nowrap;
}

.results-table :deep(td) {
  padding: 12px 16px !important;
  vertical-align: middle;
}

/* 网站信息单元格 */
.site-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-start;
}

/* 覆盖网站信息列的居中对齐，让内容左对齐 */
.results-table :deep(td:first-child) {
  text-align: left !important;
}

.site-avatar {
  border: 1px solid rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}

.site-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.site-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
}

.site-title {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.87);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

/* 延迟徽标 - 作为span显示在标题旁边 */
.latency-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 600;
  border-radius: 3px;
  white-space: nowrap;
  flex-shrink: 0;
}

.latency-badge .v-icon {
  margin-right: 2px;
}

.latency-fast {
  background-color: #4caf50;
  color: white;
}

.latency-medium {
  background-color: #ff9800;
  color: white;
}

.latency-slow {
  background-color: #ff5722;
  color: white;
}

.latency-very-slow {
  background-color: #c62828;
  color: white;
}

.latency-unreachable {
  background-color: #000000;
  color: white;
}

.latency-checking {
  background-color: #9e9e9e;
  color: white;
}

.site-url {
  font-size: 12px;
  color: #1976d2;
  text-decoration: none;
  transition: color 0.2s;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.site-url:hover {
  color: #1565c0;
  text-decoration: underline;
}

/* 地理位置单元格 - 堆叠布局 */
.location-cell-stacked {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
  text-align: center;
}

.location-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.country-flag-inline {
  width: 20px;
  height: 15px;
  object-fit: cover;
  border-radius: 2px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
}

.country-flag-emoji-inline {
  font-size: 16px;
  flex-shrink: 0;
}

.country-name {
  font-size: 12px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.87);
  white-space: nowrap;
}

.location-detail {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.6);
  line-height: 1.2;
  white-space: nowrap;
}

/* 旧的地理位置样式（保留以防其他地方使用） */
.location-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.country-flag-img {
  width: 28px;
  height: 21px;
  object-fit: cover;
  border-radius: 2px;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.country-flag-emoji {
  font-size: 18px;
  flex-shrink: 0;
}

.location-text {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.87);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 系统/服务单元格 */
.os-server-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
  text-align: center;
}

.os-line {
  font-size: 12px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.87);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.server-line {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.text-grey {
  color: rgba(0, 0, 0, 0.38);
}

/* 自定义分页 */
.custom-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  background: #ffffff;
  position: sticky;
  bottom: 0;
  z-index: 1;
}

.pagination-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-text {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.6);
  white-space: nowrap;
}

.page-input {
  width: 60px;
}

.page-input :deep(.v-field) {
  font-size: 13px;
}

.page-input :deep(.v-field__input) {
  min-height: 32px;
  padding: 4px 8px;
  text-align: center;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.page-numbers {
  display: flex;
  gap: 2px;
}

.page-numbers :deep(.v-btn) {
  min-width: 32px;
  padding: 0 8px;
}

.pagination-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.items-per-page-select {
  min-width: 70px;
  max-width: 100px;
  width: auto;
}

.items-per-page-select :deep(.v-field) {
  font-size: 13px;
}

.items-per-page-select :deep(.v-field__input) {
  min-height: 32px;
  padding: 4px 8px;
}

.items-per-page-select :deep(.v-select__selection-text) {
  white-space: nowrap;
}

.empty-state,
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  min-height: 400px;
}

.empty-title,
.loading-text {
  font-size: 16px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.87);
  margin-top: 16px;
}

.empty-desc {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.6);
  margin-top: 8px;
}

@media (max-width: 960px) {
  .content-wrapper {
    flex-direction: column;
  }

  .stats-section {
    width: 100%;
    max-height: 300px;
  }
}

/* 旋转动画 */
@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.rotating {
  animation: rotate 1s linear infinite;
}

/* 可点击样式 */
.clickable {
  cursor: pointer;
}

.clickable:hover {
  opacity: 0.8;
}
</style>
