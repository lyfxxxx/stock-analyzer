import type { Page } from '@playwright/test'

const DB_NAME = 'StockAnalyzerDB'
const STORE_NAME = 'stocks'
const DB_VERSION = 2

/**
 * Clear all data from IndexedDB for test isolation
 */
export async function clearAllDatabases(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const databases = await indexedDB.databases()
    for (const db of databases) {
      if (db.name) {
        await new Promise<void>((resolve, reject) => {
          const request = indexedDB.deleteDatabase(db.name!)
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
        })
      }
    }
  })
}

/**
 * Clear only the StockAnalyzerDB
 */
export async function clearStockDatabase(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  })
}

/**
 * Insert a single stock into IndexedDB
 */
export async function seedStock(page: Page, stock: any): Promise<void> {
  await page.evaluate(
    async ({ dbName, dbVersion, storeName, stockData }) => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion)

        request.onerror = () => reject(request.error)

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' })
            store.createIndex('code', 'code', { unique: false })
            store.createIndex('updatedAt', 'updatedAt', { unique: false })
          }
        }

        request.onsuccess = () => {
          const db = request.result
          const transaction = db.transaction([storeName], 'readwrite')
          const store = transaction.objectStore(storeName)
          const putRequest = store.put(stockData)

          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(putRequest.error)
        }
      })
    },
    { dbName: DB_NAME, dbVersion: DB_VERSION, storeName: STORE_NAME, stockData: stock }
  )
}

/**
 * Insert multiple stocks into IndexedDB
 */
export async function seedMultipleStocks(page: Page, stocks: any[]): Promise<void> {
  for (const stock of stocks) {
    await seedStock(page, stock)
  }
}

/**
 * Get all stocks from IndexedDB
 */
export async function getAllStocks(page: Page): Promise<any[]> {
  return page.evaluate(async ({ dbName, storeName }) => {
    return new Promise<any[]>((resolve, reject) => {
      const request = indexedDB.open(dbName, 2)

      request.onerror = () => reject(request.error)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: 'id' })
          store.createIndex('code', 'code', { unique: false })
          store.createIndex('updatedAt', 'updatedAt', { unique: false })
        }
      }

      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction([storeName], 'readonly')
        const store = transaction.objectStore(storeName)
        const getAllRequest = store.getAll()

        getAllRequest.onsuccess = () => resolve(getAllRequest.result || [])
        getAllRequest.onerror = () => reject(getAllRequest.error)
      }
    })
  }, { dbName: DB_NAME, storeName: STORE_NAME })
}

/**
 * Delete a specific stock from IndexedDB by id
 */
export async function deleteStock(page: Page, stockId: string): Promise<void> {
  await page.evaluate(
    async ({ dbName, storeName, id }) => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(dbName, 2)

        request.onerror = () => reject(request.error)

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' })
            store.createIndex('code', 'code', { unique: false })
            store.createIndex('updatedAt', 'updatedAt', { unique: false })
          }
        }

        request.onsuccess = () => {
          const db = request.result
          const transaction = db.transaction([storeName], 'readwrite')
          const store = transaction.objectStore(storeName)
          const deleteRequest = store.delete(id)

          deleteRequest.onsuccess = () => resolve()
          deleteRequest.onerror = () => reject(deleteRequest.error)
        }
      })
    },
    { dbName: DB_NAME, storeName: STORE_NAME, id: stockId }
  )
}
