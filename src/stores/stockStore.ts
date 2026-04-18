import { useStockListStore } from './stockListStore'
import { useStockApiStore } from './stockApiStore'
import { useStockUIStore } from './stockUIStore'

/**
 * Backward-compatible facade that combines all 3 domain stores.
 * Components that previously used `useStockStore()` continue to work unchanged.
 */
export function useStockStore() {
  const list = useStockListStore()
  const api = useStockApiStore()
  const ui = useStockUIStore()

  return {
    // State (from list store) - use getters for reactive ref access
    get stocks() { return list.stocks },
    get sortedStocks() { return list.sortedStocks },
    get stockCount() { return list.stockCount },

    // State (from UI store)
    get loading() { return ui.loading },
    get error() { return ui.error },
    get apiTestResults() { return ui.apiTestResults },
    get isApiAvailable() { return ui.isApiAvailable },
    get searchResults() { return ui.searchResults },
    get isSearching() { return ui.isSearching },
    get updateProgress() { return ui.updateProgress },
    get isUpdatingAllStocks() { return ui.isUpdatingAllStocks },
    get currentlyUpdatingIds() { return ui.currentlyUpdatingIds },

    // Actions (from list store)
    loadStocks: list.loadStocks,
    addStock: list.addStock,
    deleteStock: list.deleteStock,
    getStockById: list.getStockById,
    updateStock: list.updateStock,
    recalculateStock: list.recalculateStock,
    updateTargetPriceConfig: list.updateTargetPriceConfig,
    getTargetPrice: list.getTargetPrice,
    resetTargetPriceConfig: list.resetTargetPriceConfig,
    updateTotalShares: list.updateTotalShares,

    // Actions (from API store)
    testAPIs: api.testAPIs,
    fetchStockInfo: api.fetchStockInfo,
    fetchFinancialReport: api.fetchFinancialReport,
    updateStockMarketCap: api.updateStockMarketCap,
    updateStockWithRecalculation: api.updateStockWithRecalculation,
    updateAllStocks: api.updateAllStocks,
    searchStocks: api.searchStocks,

    // Actions (from UI store)
    clearError: ui.clearError,
    clearSearchResults: ui.clearSearchResults,
  }
}

// Re-export individual stores for direct access
export { useStockListStore } from './stockListStore'
export { useStockApiStore } from './stockApiStore'
export { useStockUIStore } from './stockUIStore'
