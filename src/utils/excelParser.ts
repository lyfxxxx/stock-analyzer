import * as XLSX from 'xlsx'
import type { ExcelData, YearlyData, CurrencyType } from '@/types/stock'
import { parseNumber } from './calculator'

/**
 * Detect currency type from Excel data (USD, HKD, CNY)
 * Usually found in row 4 (index 3) labeled as "原始货币"
 */
export function detectCurrencyType(data: any[][]): CurrencyType {
  if (!data || data.length < 4) return 'OTHER'
  
  const currencyRow = data[3]
  if (!currencyRow) return 'OTHER'
  
  const cell = String(currencyRow[1] || '')
  if (cell.includes('美元') || cell.includes('USD')) return 'USD'
  if (cell.includes('港元') || cell.includes('港币') || cell.includes('HKD')) return 'HKD'
  if (cell.includes('人民币') || cell.includes('CNY') || cell.includes('人民币元')) return 'CNY'
  
  return 'OTHER'
}

/**
 * Detect currency unit from Excel data (元, 万元, 亿元)
 * Assume original data is in "元" (yuan)
 */
function detectCurrencyUnit(data: any[][]): '元' | '万元' | '亿元' | null {
  // 假设 Excel 原始数据统一以"元"为单位
  return '元'
}

/**
 * Convert value to 亿元 based on detected unit
 * If no unit detected, assume data is already in 亿元
 */
function convertToHundredMillion(value: number, unit: '元' | '万元' | '亿元' | null): number {
  if (unit === null) return value // No conversion if unit not detected
  
  switch (unit) {
    case '亿元':
      return value // Already in hundred million
    case '万元':
      return value / 100 // 1万 = 0.01亿
    case '元':
    default:
      return value / 100000000 // 1亿 = 100000000元
  }
}

/**
 * Read Excel file and return worksheet data
 */
export async function readExcelFile(file: File): Promise<any[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          reject(new Error('文件读取失败'))
          return
        }

        let workbook
        if (file.name.endsWith('.csv')) {
          // CSV files use readAsText result (string), XLS/XLSX use binary string
          const text = data as string
          workbook = XLSX.read(text, { type: 'string' })
        } else {
          // XLS and XLSX files use readAsBinaryString result
          workbook = XLSX.read(data, { type: 'binary' })
        }
        
        const sheetName = workbook.SheetNames[0]
        if (!sheetName) {
          reject(new Error('Excel文件中没有工作表'))
          return
        }
        const firstSheet = workbook.Sheets[sheetName]
        if (!firstSheet) {
          reject(new Error('无法读取工作表'))
          return
        }
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
        
        resolve(jsonData as any[][])
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('文件读取错误'))
    }

    // Use different reading method based on file type
    if (file.name.endsWith('.csv')) {
      // CSV files need GBK encoding to read Chinese characters correctly
      reader.readAsText(file, 'GBK')
    } else {
      reader.readAsBinaryString(file)
    }
  })
}

/**
 * Extract financial data from Excel sheets
 * @param excelData - The Excel data object
 * @param rates - Optional exchange rates for currency conversion (base: HKD)
 *                 rates is HKD-based: 1 HKD = X USD = Y CNY
 *                 If provided, will convert: 元 → 亿元 + 货币 → HKD
 *                 If not provided, will only convert: 元 → 亿元
 */
export function extractFinancialData(
  excelData: ExcelData,
  rates?: Record<string, number>
): {
  years: number[]
  netProfits: number[]
  cashAndEquivalents: number[]
  shortTermDebt: number[]
  longTermDebt: number[]
  operatingCashFlow: number[]
  capitalExpenditure: number[]
  currencyType: CurrencyType
  baseCurrency: 'HKD'
} {
  const years = extractYears(excelData.benefit)
  const currencyUnit = detectCurrencyUnit(excelData.benefit)
  const currencyType = detectCurrencyType(excelData.benefit)
  
  // Convert to HKD: divide by rate (since rates are HKD-based)
  // e.g., 1 HKD = 7.75 USD, so 1 USD = 1/7.75 HKD
  const toHKD = rates ? (rates[currencyType] || 1) : 1
  
  const convert = rates 
    ? (values: number[]) => convertToHundredMillionArray(values, currencyUnit).map(v => v / toHKD)
    : (values: number[]) => convertToHundredMillionArray(values, currencyUnit)
  
  const netProfitData = extractRowData(excelData.benefit, ['归属于母公司股东利润', '归属于母公司所有者的净利润'], years.length)
  const cashData = extractRowData(excelData.debt, ['总现金'], years.length)
  const shortDebtData = extractRowData(excelData.debt, '短期借款', years.length)
  const longDebtData = extractRowData(excelData.debt, '长期借款', years.length)
  const operatingCFData = extractRowData(excelData.cash, ['经营活动现金流量净额', '经营活动产生的现金流量净额'], years.length)
  const capExData = extractCapitalExpenditure(excelData.cash, years.length)
  
  return {
    years,
    currencyType,
    baseCurrency: 'HKD' as const,
    netProfits: convert(netProfitData),
    cashAndEquivalents: convert(cashData),
    shortTermDebt: convert(shortDebtData),
    longTermDebt: convert(longDebtData),
    operatingCashFlow: convert(operatingCFData),
    capitalExpenditure: convert(capExData)
  }
}

/**
 * Convert array of values to 亿元
 */
function convertToHundredMillionArray(values: number[], unit: '元' | '万元' | '亿元' | null): number[] {
  return values.map(v => convertToHundredMillion(v, unit))
}

/**
 * Extract years from first row (header row)
 */
function extractYears(data: any[][]): number[] {
  if (!data || data.length < 2) return []
  
  // Find the row with years (usually row 1 or 2)
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i]
    if (!row) continue
    const years: number[] = []
    
    for (let j = 1; j < row.length; j++) {
      const cell = row[j]
      if (cell) {
        const year = parseInt(String(cell).substring(0, 4))
        if (!isNaN(year) && year > 2000 && year < 2100) {
          years.push(year)
        }
      }
    }
    
    if (years.length > 0) {
      return years.sort((a, b) => b - a) // Keep descending order to match Excel data
    }
  }
  
  return []
}

/**
 * Extract years from any Excel sheet header row
 */
function extractYearsFromSheet(data: any[][]): number[] {
  if (!data || data.length < 2) return []
  
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i]
    if (!row) continue
    const years: number[] = []
    
    for (let j = 1; j < row.length; j++) {
      const cell = row[j]
      if (cell) {
        const year = parseInt(String(cell).substring(0, 4))
        if (!isNaN(year) && year > 2000 && year < 2100) {
          years.push(year)
        }
      }
    }
    
    if (years.length > 0) {
      return years.sort((a, b) => b - a) // Keep descending order
    }
  }
  
  return []
}

/**
 * Extract data row by field name - supports multiple field name variations
 * Now properly handles data that may have fewer columns than expected years
 */
function extractRowData(data: any[][], fieldNames: string | string[], expectedLength: number): number[] {
  if (!data || data.length === 0) return new Array(expectedLength).fill(0)
  
  // First, get the years from the header to understand column mapping
  const years = extractYearsFromSheet(data)
  if (years.length === 0) {
    // Fallback: just try to extract any values we can find
    return extractRowDataSimple(data, fieldNames, expectedLength)
  }
  
  const fields = Array.isArray(fieldNames) ? fieldNames : [fieldNames]
  
  // Find the row containing any of the field names
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (!row) continue
    
    const rowText = String(row[0] || '')
    const matchedField = fields.find(f => rowText.includes(f))
    
    if (matchedField) {
      // Map values to year positions
      const result = new Array(expectedLength).fill(0)
      
      // The row should have years in columns 1-9 corresponding to years[0-8]
      // But some rows may have empty cells at the beginning
      for (let col = 1; col < row.length; col++) {
        // Find which year this column corresponds to
        const colIndex = col - 1
        if (colIndex < years.length) {
          const year = years[colIndex]
          if (year === undefined) continue
          // Find the position in our expected output
          const targetIndex = years.indexOf(year)
          if (targetIndex !== -1) {
            result[targetIndex] = parseNumber(row[col])
          }
        }
      }
      
      return result
    }
  }
  
  return new Array(expectedLength).fill(0)
}

/**
 * Simple fallback extraction without year mapping
 */
function extractRowDataSimple(data: any[][], fieldNames: string | string[], expectedLength: number): number[] {
  const fields = Array.isArray(fieldNames) ? fieldNames : [fieldNames]
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (!row) continue
    
    const rowText = String(row[0] || '')
    const matchedField = fields.find(f => rowText.includes(f))
    
    if (matchedField) {
      const values: number[] = []
      
      for (let j = 1; j < row.length && values.length < expectedLength; j++) {
        values.push(parseNumber(row[j]))
      }
      
      while (values.length < expectedLength) {
        values.push(0)
      }
      
      return values
    }
  }
  
  return new Array(expectedLength).fill(0)
}

/**
 * Extract capital expenditure (handle different field names)
 */
function extractCapitalExpenditure(data: any[][], expectedLength: number): number[] {
  // Try different field names
  const fieldNames = ['资本支出', '资本性支出', '购建固定资产']
  
  for (const fieldName of fieldNames) {
    const result = extractRowData(data, fieldName, expectedLength)
    if (result.some(v => v !== 0)) {
      return result.map(v => -Math.abs(v)) // Ensure negative (cash outflow)
    }
  }
  
  return new Array(expectedLength).fill(0)
}

/**
 * Build yearly data array from extracted financial data
 */
export function buildYearlyData(
  years: number[],
  operatingCashFlow: number[],
  capitalExpenditure: number[],
  netProfits: number[],
  isProjected?: boolean[],
  netProfitProjected?: boolean[],
  freeCashFlowProjected?: boolean[],
  netCashProjected?: boolean[]
): YearlyData[] {
  const yearlyData: YearlyData[] = []

  for (let i = 0; i < years.length; i++) {
    const year = years[i]
    if (year === undefined) continue
    const fcf = (operatingCashFlow[i] ?? 0) + (capitalExpenditure[i] ?? 0)
    yearlyData.push({
      year,
      freeCashFlow: Math.round(fcf * 100) / 100,
      netProfit: Math.round((netProfits[i] ?? 0) * 100) / 100,
      isProjected: isProjected?.[i] ?? false,
      netProfitProjected: netProfitProjected?.[i] ?? false,
      freeCashFlowProjected: freeCashFlowProjected?.[i] ?? false,
      netCashProjected: netCashProjected?.[i] ?? false
    })
  }

  return yearlyData.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    if (a.isProjected !== b.isProjected) return a.isProjected ? 1 : -1
    return 0
  })
}
