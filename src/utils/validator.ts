import type { ExcelData, ValidationError, ExcelValidationResult } from '@/types/stock'

/**
 * Validate Excel data structure and required fields
 */
export function validateExcelData(data: ExcelData): ExcelValidationResult {
  const errors: ValidationError[] = []

  // Check if all required files are present
  if (!data.benefit || data.benefit.length === 0) {
    errors.push({
      file: '利润表',
      field: '文件',
      message: '利润表文件未上传或为空'
    })
  }

  if (!data.debt || data.debt.length === 0) {
    errors.push({
      file: '资产负债表',
      field: '文件',
      message: '资产负债表文件未上传或为空'
    })
  }

  if (!data.cash || data.cash.length === 0) {
    errors.push({
      file: '现金流量表',
      field: '文件',
      message: '现金流量表文件未上传或为空'
    })
  }

  // If files are missing, return early
  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  // Validate profit statement fields
  const benefitErrors = validateBenefitData(data.benefit)
  errors.push(...benefitErrors)

  // Validate balance sheet fields
  const debtErrors = validateDebtData(data.debt)
  errors.push(...debtErrors)

  // Validate cash flow fields
  const cashErrors = validateCashData(data.cash)
  errors.push(...cashErrors)

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? data : undefined
  }
}

function validateBenefitData(data: any[][]): ValidationError[] {
  const errors: ValidationError[] = []
  const hasNetProfit = data.some(row => 
    row[0] && (
      String(row[0]).includes('归属于母公司股东利润') || 
      String(row[0]).includes('归属于母公司所有者的净利润')
    )
  )
  if (!hasNetProfit) {
    errors.push({
      file: '利润表',
      field: '归母净利润',
      message: '未找到"归属于母公司股东利润"或"归属于母公司所有者的净利润"数据行'
    })
  }

  return errors
}

function validateDebtData(data: any[][]): ValidationError[] {
  const errors: ValidationError[] = []
  const hasCash = data.some(row => 
    row[0] && String(row[0]).includes('总现金')
  )
  if (!hasCash) {
    errors.push({
      file: '资产负债表',
      field: '总现金',
      message: '未找到"总现金"数据行'
    })
  }

  const hasShortTermDebt = data.some(row => 
    row[0] && String(row[0]).includes('短期借款')
  )
  if (!hasShortTermDebt) {
    errors.push({
      file: '资产负债表',
      field: '短期借款',
      message: '未找到"短期借款"数据行'
    })
  }

  const hasLongTermDebt = data.some(row => 
    row[0] && String(row[0]).includes('长期借款')
  )
  if (!hasLongTermDebt) {
    errors.push({
      file: '资产负债表',
      field: '长期借款',
      message: '未找到"长期借款"数据行'
    })
  }

  return errors
}

function validateCashData(data: any[][]): ValidationError[] {
  const errors: ValidationError[] = []
  const operatingFound = data.some(row => 
    row[0] && (
      String(row[0]).includes('经营活动现金流量净额') ||
      String(row[0]).includes('经营活动产生的现金流量净额')
    )
  )
  if (!operatingFound) {
    errors.push({
      file: '现金流量表',
      field: '经营活动现金流净额',
      message: '未找到"经营活动现金流量净额"或"经营活动产生的现金流量净额"数据行'
    })
  }

  const hasCapitalExpenditure = data.some(row => 
    row[0] && (
      String(row[0]).includes('资本支出') ||
      String(row[0]).includes('资本性支出') ||
      String(row[0]).includes('购建固定资产')
    )
  )
  if (!hasCapitalExpenditure) {
    errors.push({
      file: '现金流量表',
      field: '资本支出',
      message: '未找到"资本支出"或"购建固定资产"数据行'
    })
  }

  return errors
}

/**
 * Check if value is a valid number
 */
export function isValidNumber(value: any): boolean {
  if (typeof value === 'number') return !isNaN(value) && isFinite(value)
  if (typeof value === 'string') {
    const num = parseFloat(value.replace(/[亿元万元,\s]/g, ''))
    return !isNaN(num) && isFinite(num)
  }
  return false
}

/**
 * Validate stock code format
 * HK: 5 digits (e.g., 00700)
 * A-shares Shanghai: 6 digits starting with 6 (e.g., 600519)
 * A-shares Shenzhen: 6 digits starting with 0 or 3 (e.g., 000001, 300750)
 */
export interface StockCodeValidationResult {
  isValid: boolean
  message?: string
}

export function validateStockCode(code: string, market: 'HK' | 'A'): StockCodeValidationResult {
  if (!code) {
    return { isValid: false, message: '请输入股票代码' }
  }

  const trimmedCode = code.trim()

  if (market === 'HK') {
    if (!/^\d{5}$/.test(trimmedCode)) {
      return { isValid: false, message: '港股代码应为5位数字，如: 00700' }
    }
  } else {
    if (!/^\d{6}$/.test(trimmedCode)) {
      return { isValid: false, message: 'A股代码应为6位数字' }
    }
    
    if (trimmedCode.startsWith('6')) {
      return { isValid: true }
    }
    if (trimmedCode.startsWith('0') || trimmedCode.startsWith('3')) {
      return { isValid: true }
    }
    
    return { 
      isValid: false, 
      message: 'A股代码应以6（上海）、0或3（深圳）开头，如: 600519、000001、300750' 
    }
  }

  return { isValid: true }
}
