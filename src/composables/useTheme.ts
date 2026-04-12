import { ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'stock-analyzer-theme'

const mode = ref<ThemeMode>(loadStoredMode())
const resolved = ref<ResolvedTheme>('dark')

function loadStoredMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'system'
}

function resolveTheme(m: ThemeMode): ResolvedTheme {
  if (m === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return m
}

function applyTheme(r: ResolvedTheme): void {
  const html = document.documentElement
  if (r === 'dark') {
    html.classList.add('dark')
    html.classList.remove('light')
  } else {
    html.classList.add('light')
    html.classList.remove('dark')
  }
  // Update meta theme-color for mobile browsers
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', r === 'dark' ? '#0a0f1e' : '#f5f6fa')
  }
}

watch(mode, (m) => {
  localStorage.setItem(STORAGE_KEY, m)
  resolved.value = resolveTheme(m)
  applyTheme(resolved.value)
}, { immediate: true })

// Listen for system theme changes when in system mode
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', () => {
    if (mode.value === 'system') {
      resolved.value = resolveTheme('system')
      applyTheme(resolved.value)
    }
  })
}

export function useTheme() {
  const isDark = ref(resolved.value === 'dark')

  watch(resolved, (r) => {
    isDark.value = r === 'dark'
  })

  function setTheme(m: ThemeMode) {
    mode.value = m
  }

  function toggleTheme() {
    mode.value = resolved.value === 'dark' ? 'light' : 'dark'
  }

  return {
    mode,
    resolved,
    isDark,
    setTheme,
    toggleTheme,
  }
}