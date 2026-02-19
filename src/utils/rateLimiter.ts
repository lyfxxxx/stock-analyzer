type QueueItem<T> = {
  fn: () => Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
}

class RateLimiter {
  private queue: QueueItem<unknown>[] = []
  private isProcessing = false
  private lastCallTime = 0
  private readonly minInterval: number

  constructor(minIntervalMs: number = 500) {
    this.minInterval = minIntervalMs
  }

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        fn: fn as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      })
      this.processQueue()
    })
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return
    }

    this.isProcessing = true

    while (this.queue.length > 0) {
      const now = Date.now()
      const timeSinceLastCall = now - this.lastCallTime

      if (timeSinceLastCall < this.minInterval) {
        await this.sleep(this.minInterval - timeSinceLastCall)
      }

      const item = this.queue.shift()
      if (!item) continue

      this.lastCallTime = Date.now()

      try {
        const result = await item.fn()
        item.resolve(result)
      } catch (error) {
        item.reject(error instanceof Error ? error : new Error(String(error)))
      }
    }

    this.isProcessing = false
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  clear(): void {
    this.queue = []
  }

  getQueueLength(): number {
    return this.queue.length
  }
}

export const financialReportRateLimiter = new RateLimiter(500)

export { RateLimiter }
