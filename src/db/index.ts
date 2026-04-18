import { logger } from '@/utils/logger'

const DB_NAME = 'StockAnalyzerDB'
const DB_VERSION = 3
const STORE_NAME = 'stocks'

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
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
            store.createIndex('code', 'code', { unique: false })
            store.createIndex('updatedAt', 'updatedAt', { unique: false })
          }
        }
      })
    }
    return this.initPromise
  }

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
}

export const stockDB = new StockDatabase()
