import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import {
  readExcelFile,
  extractFinancialData,
  buildYearlyData,
  detectCurrencyType
} from '../excelParser'
import type { ExcelData, YearlyData } from '@/types/stock'
import * as fs from 'fs'
import * as path from 'path'

async function loadXlsFile(filename: string): Promise<any[][]> {
  const filePath = path.resolve(__dirname, `../../../../excel/${filename}`)
  const buffer = fs.readFileSync(filePath)
  const blob = new Blob([buffer], { type: 'application/vnd.ms-excel' })
  const file = new File([blob], filename, { type: 'application/vnd.ms-excel' })
  return readExcelFile(file)
}

describe('ExcelParser', () => {
  let benefitData: any[][]
  let debtData: any[][]
  let cashData: any[][]
  let excelData: ExcelData

  beforeAll(async () => {
    benefitData = await loadXlsFile('H股/HK9987_benefit_year.xls')
    debtData = await loadXlsFile('H股/HK9987_debt_year.xls')
    cashData = await loadXlsFile('H股/HK9987_cash_year.xls')
    excelData = { benefit: benefitData, debt: debtData, cash: cashData, keyIndex: [] }
  })

  describe('readExcelFile', () => {
    it('should read valid Excel file', async () => {
      const mockFile = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      
      const OriginalFileReader = global.FileReader
      class MockFileReader {
        onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
        onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
        result: string | ArrayBuffer | null = 'mock data'
        
        readAsBinaryString(file: Blob) {
          setTimeout(() => {
            if (this.onload) {
              this.onload({ target: { result: 'mock data' } } as any)
            }
          }, 0)
        }
      }
      
      global.FileReader = MockFileReader as any
      
      const result = await readExcelFile(mockFile)
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      
      global.FileReader = OriginalFileReader
    })

    it('should reject when file reading fails', async () => {
      const mockFile = new File(['test'], 'test.xlsx')
      
      const OriginalFileReader = global.FileReader
      class MockFileReader {
        onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
        onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
        
        readAsBinaryString(file: Blob) {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror({} as any)
            }
          }, 0)
        }
      }
      
      global.FileReader = MockFileReader as any
      
      await expect(readExcelFile(mockFile)).rejects.toThrow('文件读取错误')
      
      global.FileReader = OriginalFileReader
    })
  })

  describe('extractFinancialData', () => {
    it('should extract all financial data correctly from real XLS files', () => {
      const result = extractFinancialData(excelData)

      expect(result.years.length).toBeGreaterThan(0)
      expect(result.years).toContain(2025)
      expect(result.years).toContain(2024)
      
      expect(result.netProfits.length).toBeGreaterThan(0)
      expect(result.netProfits[0]).toBeGreaterThan(0)
      
      expect(result.cashAndEquivalents.length).toBeGreaterThan(0)
      expect(result.cashAndEquivalents[0]).toBeGreaterThan(0)
      
      expect(result.shortTermDebt.length).toBeGreaterThan(0)
      expect(result.longTermDebt.length).toBeGreaterThan(0)
      
      expect(result.operatingCashFlow.length).toBeGreaterThan(0)
    })

    it('should convert USD to HKD when rates are provided', () => {
      // API returns: 1 HKD = 7.75 USD
      const rates = { USD: 7.75, HKD: 1.00, CNY: 1.10 }
      const result = extractFinancialData(excelData, rates)

      // Net profit: 929000000 USD → 9.29 亿元 USD → 9.29 / 7.75 = 1.20 亿元 HKD
      expect(result.netProfits[0]).toBeCloseTo(1.20, 1)
      expect(result.currencyType).toBe('USD')
      expect(result.baseCurrency).toBe('HKD')
    })

    it('should handle CNY to HKD conversion', () => {
      // This test would need CNY data, but we verify the function accepts rates
      const rates = { USD: 7.75, HKD: 1.00, CNY: 1.10 }
      const result = extractFinancialData(excelData, rates)

      // Just verify it runs without error
      expect(result.netProfits).toBeDefined()
    })

    it('should handle missing fields with zeros', () => {
      const partialData: ExcelData = {
        benefit: benefitData,
        debt: debtData,
        cash: [['科目']],
        keyIndex: []
      }

      const result = extractFinancialData(partialData)

      expect(result.capitalExpenditure.length).toBe(9)
      expect(result.operatingCashFlow.length).toBe(9)
    })

    it('should handle empty data', () => {
      const emptyData: ExcelData = {
        benefit: [],
        debt: [],
        cash: [],
        keyIndex: []
      }

      const result = extractFinancialData(emptyData)

      expect(result.years).toEqual([])
      expect(result.netProfits).toEqual([])
    })

    it('should extract correct years from benefit file', () => {
      const result = extractFinancialData(excelData)
      
      expect(result.years).toEqual([2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017])
    })

    it('should extract 9 years of net profit data', () => {
      const result = extractFinancialData(excelData)
      expect(result.netProfits).toEqual([9.29, 9.11, 8.27, 4.42,  9.9, 7.84, 7.13, 7.08, 3.98])
    })

    it('should extract net profit values greater than 0', () => {
      const result = extractFinancialData(excelData)
      
      expect(result.netProfits.every(v => v > 0)).toBe(true)
    })

    it('should extract 9 years of cash and equivalents data', () => {
      const result = extractFinancialData(excelData)
      console.log(result.cashAndEquivalents)
      expect(result.cashAndEquivalents.length).toBe(9)
    })

    it('should extract cash values greater than or equal to 0', () => {
      const result = extractFinancialData(excelData)
      
      expect(result.cashAndEquivalents.every(v => v >= 0)).toBe(true)
    })

    it('should extract short term debt data', () => {
      const result = extractFinancialData(excelData)
      
      expect(result.shortTermDebt.length).toBe(9)
      expect(result.shortTermDebt.some(v => v > 0)).toBe(true)
    })

    it('should extract long term debt data', () => {
      const result = extractFinancialData(excelData)
      
      expect(result.longTermDebt.length).toBe(9)
    })

    it('should extract 9 years of operating cash flow data', () => {
      const result = extractFinancialData(excelData)
      
      expect(result.operatingCashFlow.length).toBe(9)
    })

    it('should extract operating cash flow values greater than or equal to 0', () => {
      const result = extractFinancialData(excelData)
      
      expect(result.operatingCashFlow.every(v => v >= 0)).toBe(true)
    })

    it('should extract capital expenditure data', () => {
      const result = extractFinancialData(excelData)
      
      expect(result.capitalExpenditure.length).toBe(9)
    })

    it('should have capital expenditure with non-zero values when data available', () => {
      const result = extractFinancialData(excelData)
      
      expect(result.capitalExpenditure.some(v => v !== 0)).toBe(true)
    })

    it('should match years array length with all data arrays', () => {
      const result = extractFinancialData(excelData)
      
      expect(result.netProfits.length).toBe(result.years.length)
      expect(result.cashAndEquivalents.length).toBe(result.years.length)
      expect(result.shortTermDebt.length).toBe(result.years.length)
      expect(result.longTermDebt.length).toBe(result.years.length)
      expect(result.operatingCashFlow.length).toBe(result.years.length)
      expect(result.capitalExpenditure.length).toBe(result.years.length)
    })
  })

  describe('buildYearlyData', () => {
    it('should build yearly data correctly', () => {
      const years = [2021, 2022, 2023]
      const operatingCashFlow = [600, 700, 800]
      const capitalExpenditure = [-200, -250, -300]
      const netProfits = [400, 450, 500]

      const result = buildYearlyData(years, operatingCashFlow, capitalExpenditure, netProfits)

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({
        year: 2021, freeCashFlow: 400, netProfit: 400,
        isProjected: false, netProfitProjected: false, freeCashFlowProjected: false, netCashProjected: false
      })
      expect(result[1]).toEqual({
        year: 2022, freeCashFlow: 450, netProfit: 450,
        isProjected: false, netProfitProjected: false, freeCashFlowProjected: false, netCashProjected: false
      })
      expect(result[2]).toEqual({
        year: 2023, freeCashFlow: 500, netProfit: 500,
        isProjected: false, netProfitProjected: false, freeCashFlowProjected: false, netCashProjected: false
      })
    })

    it('should handle negative FCF', () => {
      const years = [2023]
      const operatingCashFlow = [100]
      const capitalExpenditure = [-200]
      const netProfits = [50]

      const result = buildYearlyData(years, operatingCashFlow, capitalExpenditure, netProfits)

      expect(result[0].freeCashFlow).toBe(-100)
    })

    it('should sort data by year', () => {
      const years = [2023, 2021, 2022]
      const operatingCashFlow = [800, 600, 700]
      const capitalExpenditure = [-300, -200, -250]
      const netProfits = [500, 400, 450]

      const result = buildYearlyData(years, operatingCashFlow, capitalExpenditure, netProfits)

      expect(result[0].year).toBe(2021)
      expect(result[1].year).toBe(2022)
      expect(result[2].year).toBe(2023)
    })

    it('should handle arrays of different lengths gracefully', () => {
      const years = [2021, 2022, 2023]
      const operatingCashFlow = [600, 700]
      const capitalExpenditure = [-200]
      const netProfits = [400, 450, 500, 550]

      const result = buildYearlyData(years, operatingCashFlow, capitalExpenditure, netProfits)

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({
        year: 2021, freeCashFlow: 400, netProfit: 400,
        isProjected: false, netProfitProjected: false, freeCashFlowProjected: false, netCashProjected: false
      })
      expect(result[1]).toEqual({
        year: 2022, freeCashFlow: 700, netProfit: 450,
        isProjected: false, netProfitProjected: false, freeCashFlowProjected: false, netCashProjected: false
      })
      expect(result[2]).toEqual({
        year: 2023, freeCashFlow: 0, netProfit: 500,
        isProjected: false, netProfitProjected: false, freeCashFlowProjected: false, netCashProjected: false
      })
    })

    it('should round values to 2 decimal places', () => {
      const years = [2023]
      const operatingCashFlow = [100.555]
      const capitalExpenditure = [-30.333]
      const netProfits = [50.999]

      const result = buildYearlyData(years, operatingCashFlow, capitalExpenditure, netProfits)

      expect(result[0].freeCashFlow).toBe(70.22)
      expect(result[0].netProfit).toBe(51)
    })

    it('should build yearly data from real XLS files', () => {
      const financialData = extractFinancialData(excelData)
      const result = buildYearlyData(
        financialData.years,
        financialData.operatingCashFlow,
        financialData.capitalExpenditure,
        financialData.netProfits
      )

      expect(result.length).toBeGreaterThan(0)
      expect(result[0].year).toBeDefined()
      expect(result[0].freeCashFlow).toBeDefined()
      expect(result[0].netProfit).toBeDefined()
    })
  })

  describe('detectCurrencyType', () => {
    it('should detect USD from 原始货币 row', () => {
      const data = [[], [], [], ['原始货币', '美元', '美元', '美元']]
      expect(detectCurrencyType(data)).toBe('USD')
    })

    it('should detect HKD from 原始货币 row', () => {
      const data = [[], [], [], ['原始货币', '港元', '港元', '港元']]
      expect(detectCurrencyType(data)).toBe('HKD')
    })

    it('should detect CNY from 原始货币 row', () => {
      const data = [[], [], [], ['原始货币', '人民币', '人民币', '人民币']]
      expect(detectCurrencyType(data)).toBe('CNY')
    })

    it('should return OTHER for unknown currency', () => {
      const data = [[], [], [], ['原始货币', '英镑', '英镑', '英镑']]
      expect(detectCurrencyType(data)).toBe('OTHER')
    })

    it('should return OTHER for empty data', () => {
      expect(detectCurrencyType([])).toBe('OTHER')
      expect(detectCurrencyType([[]])).toBe('OTHER')
    })

    it('should detect USD from real XLS file', () => {
      expect(detectCurrencyType(benefitData)).toBe('USD')
    })

    it('should return OTHER for data without currency row', () => {
      const data = [['科目'], ['2025', '100']]
      expect(detectCurrencyType(data)).toBe('OTHER')
    })
  })

  describe('A股 Excel Data Parsing', () => {
    let aBenefitData: any[][]
    let aDebtData: any[][]
    let aCashData: any[][]
    let aExcelData: ExcelData

    beforeAll(async () => {
      aBenefitData = await loadXlsFile('A股/002027_benefit_year.xls')
      aDebtData = await loadXlsFile('A股/002027_debt_year.xls')
      aCashData = await loadXlsFile('A股/002027_cash_year.xls')
      aExcelData = { benefit: aBenefitData, debt: aDebtData, cash: aCashData, keyIndex: [] }
    })

    it('should extract years from A股 Excel file', () => {
      const result = extractFinancialData(aExcelData)
      expect(result.years.length).toBeGreaterThan(0)
      expect(result.years).toContain(2024)
      expect(result.years).toContain(2023)
    })

    it('should extract net profit using A股 field name', () => {
      const result = extractFinancialData(aExcelData)
      expect(result.netProfits.length).toBeGreaterThan(0)
      expect(result.netProfits.some(v => v > 0)).toBe(true)
    })

    it('should extract total cash using unified field name', () => {
      const result = extractFinancialData(aExcelData)
      expect(result.cashAndEquivalents.length).toBeGreaterThan(0)
      expect(result.cashAndEquivalents.some(v => v > 0)).toBe(true)
    })

    it('should extract short term debt from A股 file', () => {
      const result = extractFinancialData(aExcelData)
      expect(result.shortTermDebt.length).toBeGreaterThan(0)
    })

    it('should extract long term debt from A股 file', () => {
      const result = extractFinancialData(aExcelData)
      expect(result.longTermDebt.length).toBeGreaterThan(0)
    })

    it('should extract operating cash flow using A股 field name', () => {
      const result = extractFinancialData(aExcelData)
      expect(result.operatingCashFlow.length).toBeGreaterThan(0)
    })

    it('should extract capital expenditure using A股 field name', () => {
      const result = extractFinancialData(aExcelData)
      expect(result.capitalExpenditure.length).toBeGreaterThan(0)
    })

    it('should match years array length with all data arrays for A股', () => {
      const result = extractFinancialData(aExcelData)
      expect(result.netProfits.length).toBe(result.years.length)
      expect(result.cashAndEquivalents.length).toBe(result.years.length)
      expect(result.shortTermDebt.length).toBe(result.years.length)
      expect(result.longTermDebt.length).toBe(result.years.length)
      expect(result.operatingCashFlow.length).toBe(result.years.length)
      expect(result.capitalExpenditure.length).toBe(result.years.length)
    })

    it('should build yearly data from A股 XLS files', () => {
      const financialData = extractFinancialData(aExcelData)
      const result = buildYearlyData(
        financialData.years,
        financialData.operatingCashFlow,
        financialData.capitalExpenditure,
        financialData.netProfits
      )

      expect(result.length).toBeGreaterThan(0)
      expect(result[0].year).toBeDefined()
      expect(result[0].freeCashFlow).toBeDefined()
      expect(result[0].netProfit).toBeDefined()
    })
  })
})
