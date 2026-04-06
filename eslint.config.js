import pluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'

export default [
  // Vue files
  {
    files: ['src/**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    plugins: {
      vue: pluginVue,
      '@typescript-eslint': tsPlugin
    },
    rules: {
      // Vue recommended rules
      ...pluginVue.configs['flat/recommended'].rules,
      // TypeScript recommended rules
      ...tsPlugin.configs.recommended.rules,

      // No console (enforces structured logger usage per AGENTS.md)
      'no-console': 'error',

      // Allow unused vars starting with _ (common pattern)
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

      // Allow explicit any for Vue component refs
      '@typescript-eslint/no-explicit-any': 'warn',
    }
  },
  // TypeScript files (non-Vue)
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      // TypeScript recommended rules
      ...tsPlugin.configs.recommended.rules,

      // No console (enforces structured logger usage per AGENTS.md)
      'no-console': 'error',

      // Allow unused vars starting with _ (common pattern)
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

      // Allow explicit any for Vue component refs
      '@typescript-eslint/no-explicit-any': 'warn',
    }
  },
  // Test files - allow console
  {
    files: ['src/**/__tests__/**/*.ts', 'src/**/__tests__/**/*.vue'],
    rules: {
      'no-console': 'off',
    }
  },
  // Logger utility - allow console (it IS the logger)
  {
    files: ['src/utils/logger.ts'],
    rules: {
      'no-console': 'off',
    }
  },
  // Ignore patterns
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'playwright-report/**', 'test-results/**']
  }
]
