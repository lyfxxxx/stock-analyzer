import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Tag, StockTag, TagPool } from '@/types/tag'
import type { StockData } from '@/types/stock'
import { DEFAULT_AUTO_TAGS } from '@/types/tag'
import { stockDB } from '@/db'
import { logger } from '@/utils/logger'

/**
 * 获取有效的估值1 — 与 StockCard.getCardValuation1() 保持一致
 *
 * 当流动比率 < 1.5 时，直接用市值/自由现金流计算（不扣除净现金）
 * 否则使用预计算的 valuation1（扣除净现金后的值）
 */
function getEffectiveValuation1(stock: StockData): number | null {
  if (stock.currentRatio !== null && stock.currentRatio < 1.5) {
    if (stock.freeCashFlow <= 0) return null
    return stock.marketCap / stock.freeCashFlow
  }
  return stock.valuation1
}

/**
 * 获取有效的估值2 — 与 StockCard.getCardValuation2() 保持一致
 *
 * 当流动比率 < 1.5 时，使用 PE 比率
 * 否则使用预计算的 valuation2
 */
function getEffectiveValuation2(stock: StockData): number | null {
  if (stock.currentRatio !== null && stock.currentRatio < 1.5) {
    return stock.peRatio
  }
  return stock.valuation2
}

/**
 * 获取有效的PRR值 — 与 StockTable.getSelectedPrrValue() 和 StockCard 保持一致
 *
 * 根据用户选择的 PRR 公式返回对应的 PRR 值，默认使用 base
 */
function getEffectivePRR(stock: StockData): number | null {
  switch (stock.prrSelectedFormula) {
    case 'base': return stock.prrBase ?? null
    case 'adjusted': return stock.prrAdjusted ?? null
    case 'cycle': return stock.prrCycle ?? null
    case 'index': return stock.prrIndex ?? null
    case 'derived': return stock.prrDerived ?? null
    default: return stock.prrBase ?? null
  }
}

/**
 * 纯函数：根据股票数据计算应分配的自动标签 ID 列表
 *
 * 规则：
 * - 市场标签：HK → auto-market-hk, A → auto-market-a
 * - 估值1标签：<10 → low, <20 → mid, >=20 → high（null 时不生成）
 * - 估值2标签：<10 → low, <20 → mid, >=20 → high
 * - 市赚率标签：<0.5 → low, <1.0 → mid, >=1.0 → high（无数据时不生成）
 * - 目标价标签（传统法）：按 valuationType 选估值字段，与 buyTargetValuation/sellTargetValuation 比较
 * - 目标价标签（PRR法）：按 prrAdjusted/prrBase 与 buyTargetPR/sellTargetPR 比较
 */
export function computeAutoTags(stock: StockData): string[] {
  const tagIds: string[] = []

  // ---- 市场标签 ----
  if (stock.market === 'HK') {
    tagIds.push('auto-market-hk')
  } else if (stock.market === 'A') {
    tagIds.push('auto-market-a')
  }

  // ---- 估值1标签 ----
  const effValuation1 = getEffectiveValuation1(stock)
  if (effValuation1 !== null) {
    if (effValuation1 < 10) {
      tagIds.push('auto-val1-low')
    } else if (effValuation1 < 20) {
      tagIds.push('auto-val1-mid')
    } else {
      tagIds.push('auto-val1-high')
    }
  }

  // ---- 估值2标签 ----
  const effValuation2 = getEffectiveValuation2(stock)
  if (effValuation2 !== null) {
    if (effValuation2 < 10) {
      tagIds.push('auto-val2-low')
    } else if (effValuation2 < 20) {
      tagIds.push('auto-val2-mid')
    } else {
      tagIds.push('auto-val2-high')
    }
  }

  // ---- 市赚率标签 ----
  const prr = getEffectivePRR(stock)
  if (prr !== null) {
    if (prr < 0.5) {
      tagIds.push('auto-prr-low')
    } else if (prr < 1.0) {
      tagIds.push('auto-prr-mid')
    } else {
      tagIds.push('auto-prr-high')
    }
  }

  // ---- 目标价标签 ----
  const targetConfig = stock.targetPriceConfig
  if (targetConfig && targetConfig.enabled === true) {
    const method = stock.targetPriceMethod ?? 'traditional'

    if (method === 'traditional') {
      const currentVal = targetConfig.valuationType === 1
        ? getEffectiveValuation1(stock)
        : getEffectiveValuation2(stock)
      if (currentVal !== null && currentVal !== undefined) {
        const buyThreshold = targetConfig.buyTargetValuation ?? 10
        const sellThreshold = targetConfig.sellTargetValuation ?? 20
        if (currentVal < buyThreshold) {
          tagIds.push('auto-target-buy')
        } else if (currentVal < sellThreshold) {
          tagIds.push('auto-target-hold')
        } else {
          tagIds.push('auto-target-sell')
        }
      }
    } else if (method === 'prr') {
      const currentPrr = getEffectivePRR(stock)
      if (currentPrr !== null) {
        const buyThreshold = stock.prrTargetPriceConfig?.buyTargetPR ?? 0.5
        const sellThreshold = stock.prrTargetPriceConfig?.sellTargetPR ?? 1.0
        if (currentPrr < buyThreshold) {
          tagIds.push('auto-target-buy')
        } else if (currentPrr < sellThreshold) {
          tagIds.push('auto-target-hold')
        } else {
          tagIds.push('auto-target-sell')
        }
      }
    }
  }

  return tagIds
}

/**
 * Tag Store — 标签系统的核心 CRUD
 *
 * 管理标签（Tag）、股票-标签关联（StockTag）、标签池（TagPool）
 * 自动标签不可编辑、不可删除、不可从股票移除
 *
 * @module stores/tagStore
 */
export const useTagStore = defineStore('tags', () => {
  // ==================== 状态 ====================

  /** 所有标签列表 */
  const tags = ref<Tag[]>([])

  /** 所有股票-标签关联 */
  const stockTags = ref<StockTag[]>([])

  /** 所有标签池 */
  const tagPools = ref<TagPool[]>([])

  /** 加载状态 */
  const loading = ref(false)

  /** 是否已完成初始化 */
  const initialized = ref(false)

  /** 初始化进行中的 Promise（防止并发初始化） */
  let initPromise: Promise<void> | null = null

  // ==================== 计算属性 ====================

  /** 仅自动标签 */
  const autoTags = computed(() => tags.value.filter(t => t.isAuto))

  /** 仅手动标签 */
  const manualTags = computed(() => tags.value.filter(t => !t.isAuto))

  /** 按 sortOrder 排序的所有标签 */
  const sortedTags = computed(() => {
    return [...tags.value].sort((a, b) => a.sortOrder - b.sortOrder)
  })

  // ==================== 内部工具 ====================

  /**
   * 生成唯一标识
   */
  function generateId(): string {
    return crypto.randomUUID()
  }

  /**
   * 从已加载的 tags 和 stockTags 中查找与 stockId + tagId 匹配的 StockTag
   */
  function findStockTag(stockId: string, tagId: string): StockTag | undefined {
    return stockTags.value.find(st => st.stockId === stockId && st.tagId === tagId)
  }

  // ==================== init ====================

  /**
   * 初始化标签系统
   *
   * 1. 从 IndexedDB 加载所有 tags / stockTags / tagPools
   * 2. 确保所有默认自动标签存在
   */
  async function init() {
    if (initialized.value) return
    if (initPromise) {
      return initPromise
    }

    initPromise = (async () => {
      loading.value = true
      try {
        await stockDB.init()

        const [loadedTags, loadedStockTags, loadedTagPools] = await Promise.all([
          stockDB.getAllTags(),
          stockDB.getAllStockTags(),
          stockDB.getAllTagPools()
        ])

        tags.value = loadedTags as Tag[]
        stockTags.value = loadedStockTags as StockTag[]
        tagPools.value = loadedTagPools as TagPool[]

        // 确保所有默认自动标签存在
        const existingIds = new Set(tags.value.map(t => t.id))
        for (const defaultTag of DEFAULT_AUTO_TAGS) {
          if (!existingIds.has(defaultTag.id)) {
            await stockDB.putTag(defaultTag)
            tags.value.push({ ...defaultTag })
          }
        }

        initialized.value = true
      } catch (err) {
        logger.error('tagStore', 'Init error:', err)
        throw err
      } finally {
        loading.value = false
        initPromise = null
      }
    })()

    return initPromise
  }

  // ==================== 标签 CRUD ====================

  /**
   * 创建手动标签
   *
   * 检查名称冲突 → 生成 UUID → 分配 sortOrder → 写入 DB → 加入本地数组
   */
  async function createTag(name: string, color: string): Promise<Tag> {
    // 检查名称是否已存在（包括自动标签）
    const exists = tags.value.some(t => t.name === name)
    if (exists) {
      throw new Error('标签名称已存在')
    }

    // 计算最大 sortOrder
    const maxSortOrder = tags.value.reduce((max, t) => Math.max(max, t.sortOrder), -1)

    const tag: Tag = {
      id: generateId(),
      name,
      color,
      isAuto: false,
      sortOrder: maxSortOrder + 1,
      createdAt: Date.now()
    }

    await stockDB.addTag(tag)
    tags.value.push(tag)

    return tag
  }

  /**
   * 更新标签
   *
   * 自动标签不可编辑
   */
  async function updateTag(id: string, updates: Partial<Pick<Tag, 'name' | 'color'>>): Promise<void> {
    const tag = tags.value.find(t => t.id === id)
    if (!tag) {
      throw new Error('标签不存在')
    }
    if (tag.isAuto) {
      throw new Error('自动标签不可编辑')
    }

    if (updates.name !== undefined) {
      const duplicate = tags.value.some(t => t.id !== id && t.name === updates.name)
      if (duplicate) {
        throw new Error('标签名称已存在')
      }
      tag.name = updates.name
    }
    if (updates.color !== undefined) {
      tag.color = updates.color
    }

    await stockDB.putTag(tag)
    logger.info('tagStore', `Tag ${id} updated:`, { name: tag.name, color: tag.color })
  }

  /**
   * 删除标签
   *
   * 自动标签不可删除。删除后级联清理关联的 stockTags
   */
  async function deleteTag(id: string): Promise<void> {
    const tag = tags.value.find(t => t.id === id)
    if (!tag) {
      throw new Error('标签不存在')
    }
    if (tag.isAuto) {
      throw new Error('自动标签不可删除')
    }

    // DB 级联删除（标签 + 关联的 stockTags）
    await stockDB.deleteTag(id)
    // 清理本地 stockTags
    stockTags.value = stockTags.value.filter(st => st.tagId !== id)
    await stockDB.deleteStockTagsByTagId(id)

    // 从本地 tags 数组中移除
    tags.value = tags.value.filter(t => t.id !== id)

    logger.info('tagStore', `Tag ${id} deleted with cascade cleanup`)
  }

  // ==================== 股票-标签关联 ====================

  /**
   * 给股票添加标签
   *
   * 防重复检查。自动标签也可通过此方法添加（因为是系统分配的）
   */
  async function addTagToStock(stockId: string, tagId: string): Promise<void> {
    // 检查是否已关联
    const existing = findStockTag(stockId, tagId)
    if (existing) {
      throw new Error('该股票已拥有此标签')
    }

    const stockTag: StockTag = {
      id: generateId(),
      stockId,
      tagId,
      createdAt: Date.now()
    }

    await stockDB.addStockTag(stockTag)
    stockTags.value.push(stockTag)
  }

  /**
   * 从股票移除标签
   *
   * 自动标签不可手动移除，返回 false
   *
   * @returns true 表示成功移除，false 表示自动标签不可移除
   */
  async function removeTagFromStock(stockId: string, tagId: string): Promise<boolean> {
    const tag = tags.value.find(t => t.id === tagId)
    if (tag?.isAuto) {
      return false
    }

    const stockTag = findStockTag(stockId, tagId)
    if (!stockTag) {
      return false
    }

    await stockDB.deleteStockTag(stockTag.id)
    stockTags.value = stockTags.value.filter(st => st.id !== stockTag.id)

    return true
  }

  /**
   * 获取股票的所有标签对象
   */
  function getStockTags(stockId: string): Tag[] {
    const relatedTagIds = stockTags.value
      .filter(st => st.stockId === stockId)
      .map(st => st.tagId)
    const tagMap = new Map(tags.value.map(t => [t.id, t]))
    return relatedTagIds.map(id => tagMap.get(id)).filter((t): t is Tag => t !== undefined)
  }

  /**
   * 获取拥有所有指定标签的股票 ID（AND 逻辑）
   */
  function getStocksByTagIds(tagIds: string[]): string[] {
    if (tagIds.length === 0) return []

    // 按 tagId 分组，获取每组的 stockId 数组
    const stockIdsByTag = tagIds.map(tagId =>
      stockTags.value
        .filter(st => st.tagId === tagId)
        .map(st => st.stockId)
    )

    // AND 逻辑：求交集
    const [first, ...rest] = stockIdsByTag
    if (!first) return []
    return first.filter(stockId => rest.every(arr => arr.includes(stockId)))
  }

  // ==================== 自动标签计算 ====================

  /**
   * 同步单只股票的自动标签
   *
   * 1. 调用 computeAutoTags 获取期望标签
   * 2. 新增缺失的自动标签
   * 3. 移除过时的自动标签（直接操作 DB 绕过 removeTagFromStock 的 isAuto 检查）
   */
  async function syncAutoTags(stock: StockData): Promise<void> {
    const expectedTagIds = computeAutoTags(stock)
    const expectedSet = new Set(expectedTagIds)

    // 获取当前股票已有的自动标签
    const currentStockTags = stockTags.value.filter(st => {
      const tag = tags.value.find(t => t.id === st.tagId)
      return st.stockId === stock.id && tag?.isAuto
    })

    // 新增缺失的自动标签
    for (const tagId of expectedTagIds) {
      const existing = currentStockTags.some(st => st.tagId === tagId)
      if (!existing) {
        try {
          await addTagToStock(stock.id, tagId)
        } catch (err) {
          // 忽略重复关联错误（防并发）
          if (err instanceof Error && err.message === '该股票已拥有此标签') {
            continue
          }
          throw err
        }
      }
    }

    // 移除过时的自动标签（直接操作 DB 绕过 removeTagFromStock 的 isAuto 检查）
    const toRemove = currentStockTags.filter(st => !expectedSet.has(st.tagId))
    for (const st of toRemove) {
      await stockDB.deleteStockTag(st.id)
      stockTags.value = stockTags.value.filter(s => s.id !== st.id)
    }
  }

  /**
   * 批量更新所有股票的自动标签
   *
   * 遍历所有股票并调用 syncAutoTags
   */
  async function updateAllAutoTags(): Promise<void> {
    // FIXME: 跨 Store 导入 — 待提取股票列表时重构
    const { useStockListStore } = await import('./stockListStore')
    const stockListStore = useStockListStore()
    const stocks = stockListStore.stocks

    for (const stock of stocks) {
      await syncAutoTags(stock)
    }

    logger.info('tagStore', `updateAllAutoTags completed for ${stocks.length} stocks`)
  }

  // ==================== 标签池 CRUD ====================

  /**
   * 创建标签池
   *
   * 创建一个新的 TagPool 并持久化到 IndexedDB
   * 如 isDefault 为 true，会将其他标签池的 isDefault 设为 false
   */
  async function addTagPool(name: string, tagIds: string[], isDefault = false): Promise<TagPool> {
    const now = Date.now()

    // 如果设为默认，清除其他池的默认标记
    if (isDefault) {
      for (const pool of tagPools.value) {
        if (pool.isDefault) {
          pool.isDefault = false
          await stockDB.putTagPool(pool)
        }
      }
    }

    const newPool: TagPool = {
      id: generateId(),
      name,
      tagIds: [...tagIds],
      isDefault,
      sortOrder: tagPools.value.length,
      createdAt: now,
      updatedAt: now,
    }

    await stockDB.addTagPool(newPool)
    tagPools.value.push(newPool)

    logger.info('tagStore', `Tag pool created: ${name} (${newPool.id})`)
    return newPool
  }

  /**
   * 更新标签池
   *
   * 更新已有的 TagPool，同时持久化到 IndexedDB
   * 如 isDefault 变为 true，会将其他标签池的 isDefault 设为 false
   */
  async function putTagPool(pool: TagPool): Promise<void> {
    const existing = tagPools.value.find(p => p.id === pool.id)
    if (!existing) {
      throw new Error(`标签池不存在: ${pool.id}`)
    }

    // 如果设为默认，清除其他池的默认标记
    if (pool.isDefault) {
      for (const p of tagPools.value) {
        if (p.id !== pool.id && p.isDefault) {
          p.isDefault = false
          await stockDB.putTagPool(p)
        }
      }
    }

    Object.assign(existing, { ...pool, updatedAt: Date.now() })
    await stockDB.putTagPool(existing)

    logger.info('tagStore', `Tag pool updated: ${pool.name} (${pool.id})`)
  }

  /**
   * 删除标签池
   */
  async function deleteTagPool(poolId: string): Promise<void> {
    const index = tagPools.value.findIndex(p => p.id === poolId)
    if (index === -1) {
      throw new Error(`标签池不存在: ${poolId}`)
    }

    const pool = tagPools.value[index]
    if (!pool) {
      throw new Error(`标签池不存在: ${poolId}`)
    }
    tagPools.value.splice(index, 1)
    await stockDB.deleteTagPool(poolId)

    logger.info('tagStore', `Tag pool deleted: ${pool.name} (${poolId})`)
  }

  // ==================== 排序 ====================

  /**
   * 重新排序标签
   *
   * 将指定标签移动到 newOrder 位置，其他标签自动调整
   * 调用 stockDB.putTag() 持久化所有发生变化的标签
   */
  async function reorderTags(tagId: string, newOrder: number): Promise<void> {
    const tag = tags.value.find(t => t.id === tagId)
    if (!tag) {
      throw new Error('标签不存在')
    }

    // 限制范围
    const count = tags.value.length
    newOrder = Math.max(0, Math.min(newOrder, count - 1))

    // 按当前 sortOrder 排序
    const sorted = [...tags.value].sort((a, b) => a.sortOrder - b.sortOrder)

    // 查找当前位置
    const currentIndex = sorted.findIndex(t => t.id === tagId)
    if (currentIndex === newOrder) return // 无变化

    // 移除并插入新位置
    const [moved] = sorted.splice(currentIndex, 1)
    if (!moved) return
    sorted.splice(newOrder, 0, moved)

    // 重新分配 sortOrder 并收集变更
    const changed: Tag[] = []
    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i]
      if (!item) continue
      if (item.sortOrder !== i) {
        item.sortOrder = i
        changed.push(item)
      }
    }

    // 批量持久化
    await Promise.all(changed.map(t => stockDB.putTag(t)))

    logger.info('tagStore', `Tags reordered: ${tagId} → position ${newOrder}`)
  }

  /**
   * 重新排序标签池
   *
   * 逻辑同 reorderTags，作用于 tagPools
   */
  async function reorderTagPools(poolId: string, newOrder: number): Promise<void> {
    const pool = tagPools.value.find(p => p.id === poolId)
    if (!pool) {
      throw new Error('标签池不存在')
    }

    const count = tagPools.value.length
    newOrder = Math.max(0, Math.min(newOrder, count - 1))

    const sorted = [...tagPools.value].sort((a, b) => a.sortOrder - b.sortOrder)

    const currentIndex = sorted.findIndex(p => p.id === poolId)
    if (currentIndex === newOrder) return

    const [moved] = sorted.splice(currentIndex, 1)
    if (!moved) return
    sorted.splice(newOrder, 0, moved)

    const changed: TagPool[] = []
    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i]
      if (!item) continue
      if (item.sortOrder !== i) {
        item.sortOrder = i
        changed.push(item)
      }
    }

    await Promise.all(changed.map(p => stockDB.putTagPool(p)))

    logger.info('tagStore', `Tag pools reordered: ${poolId} → position ${newOrder}`)
  }

  return {
    // 状态
    tags,
    stockTags,
    tagPools,
    loading,
    initialized,

    // 计算属性
    autoTags,
    manualTags,
    sortedTags,

    // 方法
    init,
    createTag,
    updateTag,
    deleteTag,
    addTagToStock,
    removeTagFromStock,
    getStockTags,
    getStocksByTagIds,
    syncAutoTags,
    updateAllAutoTags,
    addTagPool,
    putTagPool,
    deleteTagPool,
    reorderTags,
    reorderTagPools
  }
})


