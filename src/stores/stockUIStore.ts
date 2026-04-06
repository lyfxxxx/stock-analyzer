import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ApiTestResult, StockSearchResult } from '@/types/stock'

export const useStockUIStore = defineStore('stockUI', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const apiTestResults = ref<ApiTestResult[]>([])
  const isApiAvailable = ref(true)
  const searchResults = ref<StockSearchResult[]>([])
  const isSearching = ref(false)
  const updateProgress = ref({ updated: 0, total: 0 })
  const isUpdatingAllStocks = ref(false)
  const currentlyUpdatingIds = ref<Set<string>>(new Set())

  function clearError() {
    error.value = null
  }

  function clearSearchResults() {
    searchResults.value = []
  }

  return {
    loading,
    error,
    apiTestResults,
    isApiAvailable,
    searchResults,
    isSearching,
    updateProgress,
    isUpdatingAllStocks,
    currentlyUpdatingIds,
    clearError,
    clearSearchResults
  }
})
