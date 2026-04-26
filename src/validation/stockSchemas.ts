import { z } from 'zod'

// ============================================================
// TargetPriceConfig Schema
// ============================================================
export const targetPriceConfigSchema = z.object({
  enabled: z.boolean(),
  valuationType: z.union([z.literal(1), z.literal(2)]),
  targetValuation: z.number(),
})

// ============================================================
// StockData Schema
// Mirrors StockData from src/types/stock.ts
// ============================================================
export const stockDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  market: z.enum(['HK', 'A']),
  marketCap: z.number(),
  netCash: z.number(),
  freeCashFlow: z.number(),
  netProfit: z.number(),
  currentRatio: z.union([z.number(), z.null()]),
  peRatio: z.union([z.number(), z.null()]),
  valuation1: z.union([z.number(), z.null()]),
  valuation2: z.number(),
  yearlyData: z.array(
    z.object({
      year: z.number(),
      freeCashFlow: z.number(),
      netProfit: z.number(),
      isProjected: z.boolean().optional(),
      netProfitProjected: z.boolean().optional(),
      freeCashFlowProjected: z.boolean().optional(),
      netCashProjected: z.boolean().optional(),
      currentRatio: z.union([z.number(), z.null()]).optional(),
      currentRatioProjected: z.boolean().optional(),
      peRatio: z.union([z.number(), z.null()]).optional(),
      peRatioProjected: z.boolean().optional(),
      roe: z.union([z.number(), z.null()]).optional(),
      roa: z.union([z.number(), z.null()]).optional(),
      dividendPayoutRatio: z.union([z.number(), z.null()]).optional(),
    })
  ),
  createdAt: z.number(),
  updatedAt: z.number(),
  baseCurrency: z.enum(['USD', 'HKD', 'CNY', 'OTHER']),
  rateSource: z.enum(['api', 'fallback']).optional(),
  isUsingProjectedData: z.boolean().optional(),
  netProfitProjected: z.boolean().optional(),
  freeCashFlowProjected: z.boolean().optional(),
  netCashProjected: z.boolean().optional(),
  currentRatioProjected: z.boolean().optional(),
  peRatioProjected: z.boolean().optional(),
  totalShares: z.union([z.number(), z.null()]),
  targetPriceConfig: z.union([targetPriceConfigSchema, z.null()]),
  roe: z.union([z.number(), z.null()]).optional(),
  roa: z.union([z.number(), z.null()]).optional(),
  pbRatio: z.union([z.number(), z.null()]).optional(),
  dividendPayoutRatio: z.union([z.number(), z.null()]).optional(),
  prrBase: z.union([z.number(), z.null()]).optional(),
  prrAdjusted: z.union([z.number(), z.null()]).optional(),
  prrCycle: z.union([z.number(), z.null()]).optional(),
  prrIndex: z.union([z.number(), z.null()]).optional(),
  prrDerived: z.union([z.number(), z.null()]).optional(),
  prrSelectedFormula: z.enum(['base', 'adjusted', 'cycle', 'index', 'derived']).optional(),
  prrTargetPriceConfig: z.union([
    z.object({
      enabled: z.boolean(),
      formulaType: z.enum(['base', 'adjusted', 'cycle', 'index', 'derived']),
      targetPR: z.number(),
    }),
    z.null(),
  ]).optional(),
  targetPriceMethod: z.enum(['traditional', 'prr']).optional(),
})
