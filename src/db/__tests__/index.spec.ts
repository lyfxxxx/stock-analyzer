import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { StockDatabase } from '../index'

describe('StockDatabase v4', () => {
  let db: StockDatabase
  let origIndexedDB: unknown

  beforeEach(() => {
    origIndexedDB = (globalThis as any).indexedDB
    ;(globalThis as any).indexedDB = new IDBFactory()
    db = new StockDatabase()
  })

  afterEach(() => {
    ;(globalThis as any).indexedDB = origIndexedDB
  })

  // === V3 backward compatibility ===
  it('should still support stocks CRUD from v3', async () => {
    await db.add({ id: '1', code: '00700', name: 'Tencent' })
    const result = await db.get('1')
    expect(result).toBeTruthy()
    expect(result.code).toBe('00700')

    const all = await db.getAll()
    expect(all).toHaveLength(1)

    await db.put({ id: '1', code: '00700', name: 'Tencent Updated' })
    const updated = await db.get('1')
    expect(updated.name).toBe('Tencent Updated')

    await db.delete('1')
    const deleted = await db.get('1')
    expect(deleted).toBeNull()
  })

  it('should getByCode work', async () => {
    await db.add({ id: '1', code: '00700' })
    const result = await db.getByCode('00700')
    expect(result).toBeTruthy()
    expect(result.id).toBe('1')
  })

  // === Tags CRUD ===
  it('should addTag and getTag', async () => {
    await db.addTag({
      id: 't1',
      name: '港股',
      color: '#3B82F6',
      isAuto: true,
      sortOrder: 0,
      createdAt: 100,
    })
    const result = await db.getTag('t1')
    expect(result).toBeTruthy()
    expect(result.name).toBe('港股')
  })

  it('should getAllTags', async () => {
    await db.addTag({
      id: 't1',
      name: '港股',
      color: '#3B82F6',
      isAuto: true,
      sortOrder: 0,
      createdAt: 100,
    })
    await db.addTag({
      id: 't2',
      name: 'A股',
      color: '#EF4444',
      isAuto: true,
      sortOrder: 1,
      createdAt: 100,
    })
    const all = await db.getAllTags()
    expect(all).toHaveLength(2)
  })

  it('should putTag update existing tag', async () => {
    await db.addTag({
      id: 't1',
      name: '港股',
      color: '#3B82F6',
      isAuto: true,
      sortOrder: 0,
      createdAt: 100,
    })
    await db.putTag({
      id: 't1',
      name: '港股(已更新)',
      color: '#22C55E',
      isAuto: true,
      sortOrder: 1,
      createdAt: 100,
    })
    const result = await db.getTag('t1')
    expect(result.name).toBe('港股(已更新)')
    expect(result.sortOrder).toBe(1)
  })

  it('should deleteTag', async () => {
    await db.addTag({
      id: 't1',
      name: '港股',
      color: '#3B82F6',
      isAuto: true,
      sortOrder: 0,
      createdAt: 100,
    })
    await db.deleteTag('t1')
    const result = await db.getTag('t1')
    expect(result).toBeNull()
  })

  // === StockTags CRUD ===
  it('should addStockTag and getStockTags by stockId', async () => {
    await db.addStockTag({ id: 'st1', stockId: 's1', tagId: 't1', createdAt: 100 })
    await db.addStockTag({ id: 'st2', stockId: 's1', tagId: 't2', createdAt: 100 })
    await db.addStockTag({ id: 'st3', stockId: 's2', tagId: 't1', createdAt: 100 })

    const s1Tags = await db.getStockTags('s1')
    expect(s1Tags).toHaveLength(2)
    const s1TagIds = s1Tags.map((st: any) => st.tagId)
    expect(s1TagIds).toContain('t1')
    expect(s1TagIds).toContain('t2')

    const s2Tags = await db.getStockTags('s2')
    expect(s2Tags).toHaveLength(1)
    expect(s2Tags[0].tagId).toBe('t1')
  })

  it('should getStocksByTag', async () => {
    await db.addStockTag({ id: 'st1', stockId: 's1', tagId: 't1', createdAt: 100 })
    await db.addStockTag({ id: 'st2', stockId: 's2', tagId: 't1', createdAt: 100 })
    await db.addStockTag({ id: 'st3', stockId: 's3', tagId: 't2', createdAt: 100 })

    const stocks = await db.getStocksByTag('t1')
    expect(stocks).toHaveLength(2)
    const stockIds = stocks.map((s: any) => s.stockId)
    expect(stockIds).toContain('s1')
    expect(stockIds).toContain('s2')
  })

  it('should deleteStockTag', async () => {
    await db.addStockTag({ id: 'st1', stockId: 's1', tagId: 't1', createdAt: 100 })
    await db.deleteStockTag('st1')
    const result = await db.getStockTags('s1')
    expect(result).toHaveLength(0)
  })

  it('should deleteStockTagsByStockId', async () => {
    await db.addStockTag({ id: 'st1', stockId: 's1', tagId: 't1', createdAt: 100 })
    await db.addStockTag({ id: 'st2', stockId: 's1', tagId: 't2', createdAt: 100 })
    await db.deleteStockTagsByStockId('s1')
    const result = await db.getStockTags('s1')
    expect(result).toHaveLength(0)
  })

  it('should deleteStockTagsByTagId', async () => {
    await db.addStockTag({ id: 'st1', stockId: 's1', tagId: 't1', createdAt: 100 })
    await db.addStockTag({ id: 'st2', stockId: 's2', tagId: 't1', createdAt: 100 })
    await db.deleteStockTagsByTagId('t1')
    expect(await db.getStockTags('s1')).toHaveLength(0)
    expect(await db.getStockTags('s2')).toHaveLength(0)
  })

  // === TagPools CRUD ===
  it('should addTagPool and getTagPool', async () => {
    await db.addTagPool({
      id: 'p1',
      name: '默认分组',
      tagIds: [],
      isDefault: true,
      sortOrder: 0,
      createdAt: 100,
      updatedAt: 100,
    })
    const result = await db.getTagPool('p1')
    expect(result).toBeTruthy()
    expect(result.name).toBe('默认分组')
    expect(result.isDefault).toBe(true)
  })

  it('should getAllTagPools', async () => {
    await db.addTagPool({
      id: 'p1',
      name: '分组A',
      tagIds: [],
      isDefault: true,
      sortOrder: 0,
      createdAt: 100,
      updatedAt: 100,
    })
    await db.addTagPool({
      id: 'p2',
      name: '分组B',
      tagIds: [],
      isDefault: false,
      sortOrder: 1,
      createdAt: 100,
      updatedAt: 100,
    })
    const all = await db.getAllTagPools()
    expect(all).toHaveLength(2)
  })

  it('should putTagPool update existing', async () => {
    await db.addTagPool({
      id: 'p1',
      name: '原名称',
      tagIds: [],
      isDefault: true,
      sortOrder: 0,
      createdAt: 100,
      updatedAt: 100,
    })
    await db.putTagPool({
      id: 'p1',
      name: '新名称',
      tagIds: ['t1'],
      isDefault: false,
      sortOrder: 1,
      createdAt: 100,
      updatedAt: 200,
    })
    const result = await db.getTagPool('p1')
    expect(result.name).toBe('新名称')
    expect(result.tagIds).toEqual(['t1'])
    expect(result.updatedAt).toBe(200)
  })

  it('should deleteTagPool', async () => {
    await db.addTagPool({
      id: 'p1',
      name: '删除测试',
      tagIds: [],
      isDefault: true,
      sortOrder: 0,
      createdAt: 100,
      updatedAt: 100,
    })
    await db.deleteTagPool('p1')
    const result = await db.getTagPool('p1')
    expect(result).toBeNull()
  })

  // === Cascading delete ===
  it('should cascade delete stockTags when deleting a tag', async () => {
    await db.addTag({
      id: 't1',
      name: '港股',
      color: '#3B82F6',
      isAuto: true,
      sortOrder: 0,
      createdAt: 100,
    })
    await db.addStockTag({ id: 'st1', stockId: 's1', tagId: 't1', createdAt: 100 })
    await db.addStockTag({ id: 'st2', stockId: 's2', tagId: 't1', createdAt: 100 })

    await db.deleteTag('t1')

    // Tag itself should be gone
    expect(await db.getTag('t1')).toBeNull()
    // Associated stock tags should be gone
    expect(await db.getStockTags('s1')).toHaveLength(0)
    expect(await db.getStockTags('s2')).toHaveLength(0)
  })

  // === Edge cases ===
  it('should return empty array for getAllTags when no tags', async () => {
    const all = await db.getAllTags()
    expect(all).toEqual([])
  })

  it('should return null for non-existent tag', async () => {
    const result = await db.getTag('non-existent')
    expect(result).toBeNull()
  })

  it('should return empty array for getStockTags when none', async () => {
    const result = await db.getStockTags('non-existent')
    expect(result).toEqual([])
  })
})
