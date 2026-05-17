/**
 * 标签系统的类型定义和默认常量
 *
 * 标签分为两类：
 * - 自动标签（isAuto=true）：由系统自动计算和分配，不可手动删除
 * - 手动标签（isAuto=false）：用户创建的自定义标签
 *
 * @module types/tag
 */

/** 预设标签颜色调色板（12 种颜色） */
export const TAG_COLOR_PALETTE: readonly string[] = [
  '#EF4444', // 红
  '#F59E0B', // 琥珀
  '#22C55E', // 绿
  '#3B82F6', // 蓝
  '#8B5CF6', // 紫
  '#EC4899', // 粉
  '#06B6D4', // 青
  '#84CC16', // 黄绿
  '#F97316', // 橙
  '#6366F1', // 靛蓝
  '#14B8A6', // 碧绿
  '#E11D48', // 玫瑰红
] as const

/**
 * 标签接口
 * 表示一个可附加到股票上的标签
 */
export interface Tag {
  /** 标签唯一标识 */
  id: string
  /** 标签名称，如 "港股"、"估值1低估" */
  name: string
  /** 标签颜色，hex 格式 #RRGGBB */
  color: string
  /** 是否为自动标签（系统自动计算分配） */
  isAuto: boolean
  /** 排序序号，越小越靠前 */
  sortOrder: number
  /** 创建时间戳（毫秒） */
  createdAt: number
}

/**
 * 股票-标签关联接口
 * 记录某只股票被分配了哪个标签
 */
export interface StockTag {
  /** 关联记录唯一标识 */
  id: string
  /** 股票 ID */
  stockId: string
  /** 标签 ID */
  tagId: string
  /** 创建时间戳（毫秒） */
  createdAt: number
}

/**
 * 标签池接口
 * 用于对标签进行分组管理（如筛选视图、自定义分组）
 */
export interface TagPool {
  /** 标签池唯一标识 */
  id: string
  /** 标签池名称 */
  name: string
  /** 包含的标签 ID 列表 */
  tagIds: string[]
  /** 是否为默认标签池 */
  isDefault: boolean
  /** 排序序号，越小越靠前 */
  sortOrder: number
  /** 创建时间戳（毫秒） */
  createdAt: number
  /** 最后更新时间戳（毫秒） */
  updatedAt: number
}

/**
 * 默认自动标签列表
 *
 * 共 14 个标签，分 5 类：
 * 1. 市场类（2个）：港股、A股
 * 2. 估值1类（3个）：估值1低估/合理/高估
 * 3. 估值2类（3个）：估值2低估/合理/高估
 * 4. 市赚率类（3个）：市赚率低估/合理/高估
 * 5. 目标价类（3个）：低于目标买入/目标区间内/高于目标卖出
 *
 * 所有标签使用确定性 ID，isAuto 固定为 true
 */
export const DEFAULT_AUTO_TAGS: readonly Tag[] = [
  // ---- 市场类（2个）----
  {
    id: 'auto-market-hk',
    name: '港股',
    color: '#3B82F6',
    isAuto: true,
    sortOrder: 0,
    createdAt: 0,
  },
  {
    id: 'auto-market-a',
    name: 'A股',
    color: '#EF4444',
    isAuto: true,
    sortOrder: 1,
    createdAt: 0,
  },
  // ---- 估值1类（3个）----
  {
    id: 'auto-val1-low',
    name: '估值1低估',
    color: '#22C55E',
    isAuto: true,
    sortOrder: 2,
    createdAt: 0,
  },
  {
    id: 'auto-val1-mid',
    name: '估值1合理',
    color: '#F59E0B',
    isAuto: true,
    sortOrder: 3,
    createdAt: 0,
  },
  {
    id: 'auto-val1-high',
    name: '估值1高估',
    color: '#EF4444',
    isAuto: true,
    sortOrder: 4,
    createdAt: 0,
  },
  // ---- 估值2类（3个）----
  {
    id: 'auto-val2-low',
    name: '估值2低估',
    color: '#22C55E',
    isAuto: true,
    sortOrder: 5,
    createdAt: 0,
  },
  {
    id: 'auto-val2-mid',
    name: '估值2合理',
    color: '#F59E0B',
    isAuto: true,
    sortOrder: 6,
    createdAt: 0,
  },
  {
    id: 'auto-val2-high',
    name: '估值2高估',
    color: '#EF4444',
    isAuto: true,
    sortOrder: 7,
    createdAt: 0,
  },
  // ---- 市赚率类（3个）----
  {
    id: 'auto-prr-low',
    name: '市赚率低估',
    color: '#22C55E',
    isAuto: true,
    sortOrder: 8,
    createdAt: 0,
  },
  {
    id: 'auto-prr-mid',
    name: '市赚率合理',
    color: '#F59E0B',
    isAuto: true,
    sortOrder: 9,
    createdAt: 0,
  },
  {
    id: 'auto-prr-high',
    name: '市赚率高估',
    color: '#EF4444',
    isAuto: true,
    sortOrder: 10,
    createdAt: 0,
  },
  // ---- 目标价类（3个）----
  {
    id: 'auto-target-buy',
    name: '低于目标买入',
    color: '#22C55E',
    isAuto: true,
    sortOrder: 11,
    createdAt: 0,
  },
  {
    id: 'auto-target-hold',
    name: '目标区间内',
    color: '#F59E0B',
    isAuto: true,
    sortOrder: 12,
    createdAt: 0,
  },
  {
    id: 'auto-target-sell',
    name: '高于目标卖出',
    color: '#EF4444',
    isAuto: true,
    sortOrder: 13,
    createdAt: 0,
  },
] as const
