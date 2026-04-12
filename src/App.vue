<script setup lang="ts">
import { RouterView } from 'vue-router'
import ErrorBoundary from './components/ErrorBoundary.vue'
import ThemeToggle from './components/ThemeToggle.vue'
</script>

<template>
  <ErrorBoundary>
    <div class="app-layout">
      <header class="app-header">
        <div class="header-inner">
          <div class="header-brand">
            <div class="brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                <polyline points="16 7 22 7 22 13"></polyline>
              </svg>
            </div>
            <span class="brand-text">StockAnalyzer</span>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main class="app-main">
        <RouterView />
      </main>
    </div>
  </ErrorBoundary>
</template>

<style>
/* App-level styles are now handled by theme.css */
</style>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: var(--header-bg);
  border-bottom: 1px solid var(--header-border);
  box-shadow: var(--header-shadow);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.header-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, var(--brand-primary), var(--brand-accent));
  border-radius: var(--radius-lg);
  color: white;
}

.brand-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.app-main {
  flex: 1;
}

@media (max-width: 768px) {
  .header-inner {
    padding: 0 16px;
    height: 52px;
  }

  .brand-text {
    font-size: 16px;
  }

  .brand-icon {
    width: 28px;
    height: 28px;
  }
}
</style>