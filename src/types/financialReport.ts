import type { CurrencyType } from './stock'

export type ReportType = 'annual' | 'Q1' | 'H1' | 'Q3'

export interface FinancialReportData {
  years: number[]
  netProfits: number[]
  cashAndEquivalents: number[]
  shortTermDebt: number[]
  longTermDebt: number[]
  operatingCashFlow: number[]
  capitalExpenditure: number[]
  currentRatio: (number | null)[]
  currentRatioProjected: boolean[]
  peRatio: (number | null)[]
  peRatioProjected: boolean[]
  currencyType: CurrencyType
  baseCurrency: 'HKD'
  source: 'api'
  reportTypes: ReportType[]
  isProjected: boolean[]
  netProfitProjected: boolean[]
  freeCashFlowProjected: boolean[]
  netCashProjected: boolean[]
}

export interface FinancialReportError {
  code: 'NETWORK_ERROR' | 'PARSE_ERROR' | 'NO_DATA' | 'INCOMPLETE_DATA'
  message: string
  details?: string
}

export type MarketType = 'A' | 'HK'

export interface AStockBalanceSheetItem {
  SECUCODE: string
  SECURITY_CODE: string
  SECURITY_NAME_ABBR: string
  REPORT_DATE: string
  MONETARYFUNDS: number | null
  TRADE_FINASSET_NOTFVTPL: number | null
  SHORT_LOAN: number | null
  LONG_LOAN: number | null
  TOTAL_CURRENT_ASSETS: number | null
  TOTAL_CURRENT_LIAB: number | null
}

export interface AStockIncomeStatementItem {
  SECUCODE: string
  SECURITY_CODE: string
  SECURITY_NAME_ABBR: string
  REPORT_DATE: string
  PARENT_NETPROFIT: number | null
}

export interface AStockCashFlowItem {
  SECUCODE: string
  SECURITY_CODE: string
  SECURITY_NAME_ABBR: string
  REPORT_DATE: string
  NETCASH_OPERATE: number | null
  CONSTRUCT_LONG_ASSET: number | null
}

export interface HKStockBalanceSheetItem {
  SECUCODE: string
  SECURITY_CODE: string
  SECURITY_NAME_ABBR: string
  REPORT_DATE: string
  STD_ITEM_CODE: string
  STD_ITEM_NAME: string
  AMOUNT: number | null
}

export interface HKStockIncomeStatementItem {
  SECUCODE: string
  SECURITY_CODE: string
  SECURITY_NAME_ABBR: string
  REPORT_DATE: string
  STD_ITEM_CODE: string
  STD_ITEM_NAME: string
  AMOUNT: number | null
}

export interface HKStockCashFlowItem {
  SECUCODE: string
  SECURITY_CODE: string
  SECURITY_NAME_ABBR: string
  REPORT_DATE: string
  STD_ITEM_CODE: string
  STD_ITEM_NAME: string
  AMOUNT: number | null
}

export const HK_BALANCE_SHEET_CODES = {
  CASH_AND_EQUIVALENTS: '004002010',
  SHORT_TERM_DEPOSITS: '004002011',
  MEDIUM_LONG_TERM_DEPOSITS: '004001030',
  SHORT_TERM_INVESTMENTS: '004002008',
  RESTRICTED_CASH: '004002009',
  TOTAL_CURRENT_ASSETS: '004002999',
  SHORT_TERM_LOAN: '004011010',
  TOTAL_CURRENT_LIAB: '004011999',
  LONG_TERM_LOAN: '004020001',
} as const

export const HK_INCOME_STATEMENT_CODES = {
  SHAREHOLDER_PROFIT: '004025002',
} as const

export const HK_CASH_FLOW_CODES = {
  OPERATING_CASH_FLOW: '003999',
  CAPITAL_EXPENDITURE: '005005',
  INVESTMENT_OTHER: '005997',
  INTANGIBLE_ASSETS: '005007',
} as const
