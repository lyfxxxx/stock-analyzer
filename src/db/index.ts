import { logger } from '@/utils/logger'

const DB_NAME = 'StockAnalyzerDB'
const DB_VERSION = 4
const STORE_NAME = 'stocks'
const TAGS_STORE = 'tags'
const STOCK_TAGS_STORE = 'stockTags'
const TAG_POOLS_STORE = 'tagPools'

export class StockDatabase {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null

  async init(): Promise<void> {
    if (this.db) return
    if (!this.initPromise) {
      this.initPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onerror = () => {
          this.initPromise = null
          reject(request.error)
        }
        request.onsuccess = () => {
          this.db = request.result
          this.initPromise = null
          resolve()
        }

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          const oldVersion = event.oldVersion

          // v1: create stocks store
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
            store.createIndex('code', 'code', { unique: false })
            store.createIndex('updatedAt', 'updatedAt', { unique: false })
          }

          // v4: create tags, stockTags, tagPools stores
          if (oldVersion < 4) {
            if (!db.objectStoreNames.contains(TAGS_STORE)) {
              const tagStore = db.createObjectStore(TAGS_STORE, { keyPath: 'id' })
              tagStore.createIndex('name', 'name', { unique: true })
              tagStore.createIndex('sortOrder', 'sortOrder', { unique: false })
              tagStore.createIndex('isAuto', 'isAuto', { unique: false })
            }

            if (!db.objectStoreNames.contains(STOCK_TAGS_STORE)) {
              const stockTagStore = db.createObjectStore(STOCK_TAGS_STORE, { keyPath: 'id' })
              stockTagStore.createIndex('stockId', 'stockId', { unique: false })
              stockTagStore.createIndex('tagId', 'tagId', { unique: false })
              stockTagStore.createIndex('stockId_tagId', ['stockId', 'tagId'], { unique: true })
            }

            if (!db.objectStoreNames.contains(TAG_POOLS_STORE)) {
              const tagPoolStore = db.createObjectStore(TAG_POOLS_STORE, { keyPath: 'id' })
              tagPoolStore.createIndex('name', 'name', { unique: true })
              tagPoolStore.createIndex('isDefault', 'isDefault', { unique: false })
              tagPoolStore.createIndex('sortOrder', 'sortOrder', { unique: false })
            }
          }
        }
      })
    }
    return this.initPromise
  }

  // ========== Stocks (v3) ==========

  async add(stock: any): Promise<void> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.add(stock)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async put(stock: any): Promise<void> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(stock)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async get(id: string): Promise<any | null> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async getAll(): Promise<any[]> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async delete(id: string): Promise<void> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getByCode(code: string): Promise<any | null> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const index = store.index('code')
      const request = index.get(code)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  // ========== Tags (v4) ==========

  async addTag(tag: any): Promise<void> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TAGS_STORE], 'readwrite')
      const store = transaction.objectStore(TAGS_STORE)
      const request = store.add(tag)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async putTag(tag: any): Promise<void> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TAGS_STORE], 'readwrite')
      const store = transaction.objectStore(TAGS_STORE)
      const request = store.put(tag)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getTag(id: string): Promise<any | null> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TAGS_STORE], 'readonly')
      const store = transaction.objectStore(TAGS_STORE)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async getAllTags(): Promise<any[]> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TAGS_STORE], 'readonly')
      const store = transaction.objectStore(TAGS_STORE)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async deleteTag(id: string): Promise<void> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TAGS_STORE, STOCK_TAGS_STORE], 'readwrite')
      const tagStore = transaction.objectStore(TAGS_STORE)
      const stockTagStore = transaction.objectStore(STOCK_TAGS_STORE)
      const tagIdIndex = stockTagStore.index('tagId')

      // Cascade delete: remove all stockTags referencing this tag
      const getReq = tagIdIndex.getAll(id)
      getReq.onsuccess = () => {
        const items = getReq.result
        for (const item of items) {
          stockTagStore.delete(item.id)
        }
        tagStore.delete(id)
      }

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  // ========== Stock-Tag Associations (v4) ==========

  async addStockTag(association: any): Promise<void> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STOCK_TAGS_STORE], 'readwrite')
      const store = transaction.objectStore(STOCK_TAGS_STORE)
      const request = store.add(association)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getStockTags(stockId: string): Promise<any[]> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STOCK_TAGS_STORE], 'readonly')
      const store = transaction.objectStore(STOCK_TAGS_STORE)
      const stockIdIndex = store.index('stockId')
      const request = stockIdIndex.getAll(stockId)

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async getAllStockTags(): Promise<any[]> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STOCK_TAGS_STORE], 'readonly')
      const store = transaction.objectStore(STOCK_TAGS_STORE)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async getStocksByTag(tagId: string): Promise<any[]> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STOCK_TAGS_STORE], 'readonly')
      const store = transaction.objectStore(STOCK_TAGS_STORE)
      const tagIdIndex = store.index('tagId')
      const request = tagIdIndex.getAll(tagId)

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async deleteStockTag(id: string): Promise<void> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STOCK_TAGS_STORE], 'readwrite')
      const store = transaction.objectStore(STOCK_TAGS_STORE)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async deleteStockTagsByStockId(stockId: string): Promise<void> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STOCK_TAGS_STORE], 'readwrite')
      const store = transaction.objectStore(STOCK_TAGS_STORE)
      const stockIdIndex = store.index('stockId')

      const getReq = stockIdIndex.getAll(stockId)
      getReq.onsuccess = () => {
        const items = getReq.result
        for (const item of items) {
          store.delete(item.id)
        }
      }

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async deleteStockTagsByTagId(tagId: string): Promise<void> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STOCK_TAGS_STORE], 'readwrite')
      const store = transaction.objectStore(STOCK_TAGS_STORE)
      const tagIdIndex = store.index('tagId')

      const getReq = tagIdIndex.getAll(tagId)
      getReq.onsuccess = () => {
        const items = getReq.result
        for (const item of items) {
          store.delete(item.id)
        }
      }

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  // ========== Tag Pools (v4) ==========

  async addTagPool(pool: any): Promise<void> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TAG_POOLS_STORE], 'readwrite')
      const store = transaction.objectStore(TAG_POOLS_STORE)
      const request = store.add(pool)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async putTagPool(pool: any): Promise<void> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TAG_POOLS_STORE], 'readwrite')
      const store = transaction.objectStore(TAG_POOLS_STORE)
      const request = store.put(pool)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getTagPool(id: string): Promise<any | null> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TAG_POOLS_STORE], 'readonly')
      const store = transaction.objectStore(TAG_POOLS_STORE)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async getAllTagPools(): Promise<any[]> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TAG_POOLS_STORE], 'readonly')
      const store = transaction.objectStore(TAG_POOLS_STORE)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async deleteTagPool(id: string): Promise<void> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TAG_POOLS_STORE], 'readwrite')
      const store = transaction.objectStore(TAG_POOLS_STORE)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

export const stockDB = new StockDatabase()
