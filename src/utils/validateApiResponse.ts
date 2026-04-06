import { z } from 'zod'
import { logger } from '@/utils/logger'

/**
 * Generic API response validation wrapper.
 * Validates unknown data against a Zod schema and returns the typed result.
 * Throws a descriptive error if validation fails.
 */
export function validateApiResponse<T>(data: unknown, schema: z.ZodType<T>): T {
  const result = schema.safeParse(data)

  if (!result.success) {
    const errorMessages = result.error.issues
      .map((e) => `${String(e.path.join('.'))}: ${e.message}`)
      .join(', ')
    logger.error('validateApiResponse', 'API response validation failed:', errorMessages)
    throw new Error(`API response validation failed: ${errorMessages}`)
  }

  return result.data
}
