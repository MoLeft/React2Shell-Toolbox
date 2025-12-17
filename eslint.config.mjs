import eslintConfig from '@electron-toolkit/eslint-config'
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'
import eslintPluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'

export default [
  { ignores: ['**/node_modules', '**/dist', '**/out'] },
  eslintConfig,
  ...eslintPluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        },
        extraFileExtensions: ['.vue']
      }
    }
  },
  {
    files: ['**/*.{js,jsx,vue}'],
    rules: {
      'vue/require-default-prop': 'off',
      'vue/multi-word-component-names': 'off',
      'no-unused-vars': [
        'warn',
        {
          varsIgnorePattern:
            '^(SettingsDialog|RetryDialog|AutoLoadErrorDialog|UpdateDialog|ExportDialog|HijackTemplateDialog)$',
          argsIgnorePattern: '^_'
        }
      ]
    }
  },
  {
    files: ['**/AdvancedSettings.vue'],
    rules: {
      'vue/no-mutating-props': 'off'
    }
  },
  eslintConfigPrettier
]
