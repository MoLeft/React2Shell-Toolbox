<template>
  <v-container fluid class="pa-6">
    <h3 class="text-h5 font-weight-medium mb-6">{{ $t('settings.language.title') }}</h3>

    <div class="mb-4">
      <div class="text-body-1 font-weight-medium mb-4">
        {{ $t('settings.language.selectLanguage') }}
      </div>

      <!-- 语言宫格 -->
      <v-row dense style="max-width: 900px">
        <v-col v-for="lang in localeOptions" :key="lang.value" cols="12" sm="6" md="4" lg="3">
          <v-card
            variant="outlined"
            class="language-card bg-grey-lighten-5"
            @click="handleLocaleChange(lang.value)"
          >
            <v-card-text class="d-flex align-center justify-center pa-3">
              <div style="width: 48px; height: 32px" class="mr-3 flex-shrink-0">
                <v-img
                  :src="`https://flagcdn.com/${lang.flag}.svg`"
                  :alt="lang.label"
                  width="48"
                  height="32"
                  class="rounded-sm"
                  style="object-fit: fill"
                />
              </div>
              <span class="text-body-1 font-weight-medium text-center flex-grow-1">{{
                lang.label
              }}</span>
            </v-card-text>

            <!-- 选中遮罩 -->
            <v-overlay
              :model-value="currentLocale === lang.value"
              contained
              scrim="black"
              class="align-center justify-center"
            >
              <v-icon color="white" size="48" style="opacity: 0.8">mdi-check-circle</v-icon>
            </v-overlay>
          </v-card>
        </v-col>
      </v-row>

      <div class="text-caption text-medium-emphasis mt-4">
        {{ $t('settings.language.changeHint') }}
      </div>
    </div>
  </v-container>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLocale, availableLocales } from '../../locales'

const { locale, t } = useI18n()

const currentLocale = computed(() => locale.value)
const localeOptions = availableLocales

const emit = defineEmits(['show-snackbar'])

const handleLocaleChange = (newLocale) => {
  setLocale(newLocale)
  // 使用新语言的翻译
  emit('show-snackbar', t('settings.language.updated'), 'success')
}
</script>

<style scoped>
.language-card {
  border-color: #e0e0e0 !important;
}
</style>
