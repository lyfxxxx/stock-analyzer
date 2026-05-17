import { computed, type ComputedRef, type Ref } from 'vue'
import type { StockData } from '@/types/stock'
import { useTagStore } from '@/stores/tagStore'

/**
 * 标签筛选组合式函数
 *
 * 根据 selectedTagIds（AND 逻辑）从 stocks 列表中筛选匹配的股票。
 * - selectedTagIds 为空 → 返回所有 stocks
 * - selectedTagIds 非空 → 调用 tagStore.getStocksByTagIds() 获取满足 AND 条件的 stockIds
 * - 响应式：selectedTagIds 变化时自动重新计算
 *
 * @param stocks - 股票列表（响应式）
 * @param selectedTagIds - 选中的标签 ID 列表（响应式）
 * @returns filteredStocks - 筛选后的股票列表（计算属性）
 */
export function useTagFilter(
  stocks: Ref<StockData[]>,
  selectedTagIds: Ref<string[]>
): { filteredStocks: ComputedRef<StockData[]> } {
  const tagStore = useTagStore()

  const filteredStocks = computed(() => {
    if (selectedTagIds.value.length === 0) {
      return stocks.value
    }

    const matchingStockIds = new Set(tagStore.getStocksByTagIds(selectedTagIds.value))
    return stocks.value.filter(stock => matchingStockIds.has(stock.id))
  })

  return {
    filteredStocks
  }
}
