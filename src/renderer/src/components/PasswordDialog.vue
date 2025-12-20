<template>
  <v-dialog :model-value="modelValue" max-width="400" persistent>
    <v-card>
      <v-card-title class="text-h6">
        {{ title || $t('common.password') }}
      </v-card-title>
      <v-card-text>
        <v-text-field
          v-model="password"
          :label="label || $t('common.password')"
          :type="showPassword ? 'text' : 'password'"
          :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
          variant="outlined"
          density="comfortable"
          :error-messages="errorMessage"
          autofocus
          @click:append-inner="showPassword = !showPassword"
          @keyup.enter="handleConfirm"
        />
        <v-text-field
          v-if="requireConfirm"
          v-model="confirmPassword"
          :label="$t('settings.security.passwordDialog.confirmPassword')"
          :type="showConfirmPassword ? 'text' : 'password'"
          :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
          variant="outlined"
          density="comfortable"
          :error-messages="confirmErrorMessage"
          @click:append-inner="showConfirmPassword = !showConfirmPassword"
          @keyup.enter="handleConfirm"
        />
        <div v-if="hint" class="text-caption text-grey mt-2">
          {{ hint }}
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn v-if="!required" text @click="handleCancel">{{ $t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="elevated" @click="handleConfirm">{{
          $t('common.ok')
        }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  hint: {
    type: String,
    default: ''
  },
  requireConfirm: {
    type: Boolean,
    default: false
  },
  required: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const errorMessage = ref('')
const confirmErrorMessage = ref('')

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      password.value = ''
      confirmPassword.value = ''
      errorMessage.value = ''
      confirmErrorMessage.value = ''
      showPassword.value = false
      showConfirmPassword.value = false
    }
  }
)

const handleConfirm = () => {
  errorMessage.value = ''
  confirmErrorMessage.value = ''

  if (!password.value) {
    errorMessage.value = t('settings.security.passwordDialog.passwordEmpty')
    return
  }

  if (props.requireConfirm) {
    if (!confirmPassword.value) {
      confirmErrorMessage.value = t('settings.security.passwordDialog.passwordEmpty')
      return
    }
    if (password.value !== confirmPassword.value) {
      confirmErrorMessage.value = t('settings.security.passwordDialog.passwordMismatch')
      return
    }
  }

  emit('confirm', password.value)
}

const handleCancel = () => {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>
