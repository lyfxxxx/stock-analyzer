import { describe, it, expect } from 'vitest'
import { validateExcelData, isValidNumber, validateStockCode } from '../validator'
import type { ExcelData } from '@/types/stock'

describe('Validator', () => {
  describe('validateExcelData', () => {
    it('should validate complete data successfully', () => {
      const excelData: ExcelData = {
        benefit: [
          ['科目', '2023', '2022', '2021'],
          ['营业收入', '100', '90', '80'],
          ['归属于母公司股东利润', '50', '45', '40']
        ],
        debt: [
          ['科目', '2023', '2022', '2021'],
          ['总现金', '200', '180', '160'],
          ['短期借款', '50', '40', '30'],
          ['长期借款', '100', '90', '80']
        ],
        cash: [
          ['科目', '2023', '2022', '2021'],
          ['经营活动现金流量净额', '80', '70', '60'],
          ['资本性支出', '-30', '-25', '-20']
        ],
        keyIndex: []
      }

      const result = validateExcelData(excelData)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should return error when benefit data is missing', () => {
      const excelData: Partial<ExcelData> = {
        debt: [['科目', '2023'], ['总现金', '100']],
        cash: [['科目', '2023'], ['经营活动现金流量净额', '50']]
      }

      const result = validateExcelData(excelData as ExcelData)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          file: '利润表',
          field: '文件',
          message: expect.stringContaining('未上传')
        })
      )
    })

    it('should return error when debt data is missing', () => {
      const excelData: Partial<ExcelData> = {
        benefit: [['科目', '2023'], ['归属于母公司股东利润', '50']],
        cash: [['科目', '2023'], ['经营活动现金流量净额', '50']]
      }

      const result = validateExcelData(excelData as ExcelData)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          file: '资产负债表',
          field: '文件',
          message: expect.stringContaining('未上传')
        })
      )
    })

    it('should return error when cash data is missing', () => {
      const excelData: Partial<ExcelData> = {
        benefit: [['科目', '2023'], ['归属于母公司股东利润', '50']],
        debt: [['科目', '2023'], ['总现金', '100']]
      }

      const result = validateExcelData(excelData as ExcelData)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          file: '现金流量表',
          field: '文件',
          message: expect.stringContaining('未上传')
        })
      )
    })

    it('should return error when 归属于母公司股东利润 is missing', () => {
      const excelData: ExcelData = {
        benefit: [
          ['科目', '2023'],
          ['营业收入', '100']
        ],
        debt: [
          ['科目', '2023'],
          ['总现金', '200'],
          ['短期借款', '50'],
          ['长期借款', '100']
        ],
        cash: [
          ['科目', '2023'],
          ['经营活动现金流量净额', '80'],
          ['资本性支出', '-30']
        ],
        keyIndex: []
      }

      const result = validateExcelData(excelData)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          file: '利润表',
          field: '归母净利润',
          message: expect.stringContaining('未找到')
        })
      )
    })

    it('should return error when required debt fields are missing', () => {
      const excelData: ExcelData = {
        benefit: [
          ['科目', '2023'],
          ['归属于母公司股东利润', '50'],
          ['营业收入', '100']
        ],
        debt: [
          ['科目', '2023'],
          ['总现金', '200']
        ],
        cash: [
          ['科目', '2023'],
          ['经营活动现金流量净额', '80']
        ],
        keyIndex: []
      }

      const result = validateExcelData(excelData)

      // Should fail because 短期借款 and 长期借款 are missing
      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          file: '资产负债表',
          field: '短期借款',
          message: expect.stringContaining('未找到')
        })
      )
    })

    it('should validate 购建固定资产 as capital expenditure', () => {
      const excelData: ExcelData = {
        benefit: [
          ['科目', '2023'],
          ['归属于母公司股东利润', '50'],
          ['营业收入', '100']
        ],
        debt: [
          ['科目', '2023'],
          ['总现金', '200'],
          ['短期借款', '50'],
          ['长期借款', '100']
        ],
        cash: [
          ['科目', '2023'],
          ['经营活动现金流量净额', '80'],
          ['购建固定资产', '-30']
        ],
        keyIndex: []
      }

      const result = validateExcelData(excelData)

      expect(result.isValid).toBe(true)
    })

    it('should return error when operating cash flow is missing', () => {
      const excelData: ExcelData = {
        benefit: [
          ['科目', '2023'],
          ['归属于母公司股东利润', '50']
        ],
        debt: [
          ['科目', '2023'],
          ['总现金', '200'],
          ['短期借款', '50'],
          ['长期借款', '100']
        ],
        cash: [
          ['科目', '2023'],
          ['资本性支出', '-30']
        ],
        keyIndex: []
      }

      const result = validateExcelData(excelData)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          file: '现金流量表',
          field: '经营活动现金流净额',
          message: expect.stringContaining('未找到')
        })
      )
    })

    it('should return data when validation passes', () => {
      const excelData: ExcelData = {
        benefit: [
          ['科目', '2023'],
          ['营业收入', '100'],
          ['归属于母公司股东利润', '50']
        ],
        debt: [
          ['科目', '2023'],
          ['总现金', '200'],
          ['短期借款', '50'],
          ['长期借款', '100']
        ],
        cash: [
          ['科目', '2023'],
          ['经营活动现金流量净额', '80'],
          ['资本性支出', '-30']
        ],
        keyIndex: []
      }

      const result = validateExcelData(excelData)

      expect(result.isValid).toBe(true)
      expect(result.data).toEqual(excelData)
    })

    it('should not return data when validation fails', () => {
      const excelData: ExcelData = {
        benefit: [],
        debt: [],
        cash: [],
        keyIndex: []
      }

      const result = validateExcelData(excelData)

      expect(result.isValid).toBe(false)
      expect(result.data).toBeUndefined()
    })

    it('should validate H股 data format successfully', () => {
      const excelData: ExcelData = {
        benefit: [
          ['科目', '2023', '2022', '2021'],
          ['营业收入', '100', '90', '80'],
          ['归属于母公司股东利润', '50', '45', '40']
        ],
        debt: [
          ['科目', '2023', '2022', '2021'],
          ['总现金', '200', '180', '160'],
          ['短期借款', '50', '40', '30'],
          ['长期借款', '100', '90', '80']
        ],
        cash: [
          ['科目', '2023', '2022', '2021'],
          ['经营活动现金流量净额', '80', '70', '60'],
          ['资本性支出', '-30', '-25', '-20']
        ],
        keyIndex: []
      }

      const result = validateExcelData(excelData)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate A股 data format successfully', () => {
      const excelData: ExcelData = {
        benefit: [
          ['科目', '2023', '2022', '2021'],
          ['营业收入', '100', '90', '80'],
          ['归属于母公司所有者的净利润', '50', '45', '40']
        ],
        debt: [
          ['科目', '2023', '2022', '2021'],
          ['总现金', '200', '180', '160'],
          ['短期借款', '50', '40', '30'],
          ['长期借款', '100', '90', '80']
        ],
        cash: [
          ['科目', '2023', '2022', '2021'],
          ['经营活动产生的现金流量净额', '80', '70', '60'],
          ['购建固定资产、无形资产和其他长期资产支付的现金', '-30', '-25', '-20']
        ],
        keyIndex: []
      }

      const result = validateExcelData(excelData)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('isValidNumber', () => {
    it('should return true for valid numbers', () => {
      expect(isValidNumber(100)).toBe(true)
      expect(isValidNumber(0)).toBe(true)
      expect(isValidNumber(-50)).toBe(true)
      expect(isValidNumber(100.5)).toBe(true)
    })

    it('should return true for valid numeric strings', () => {
      expect(isValidNumber('100')).toBe(true)
      expect(isValidNumber('100.5')).toBe(true)
      expect(isValidNumber('-50')).toBe(true)
    })

    it('should return true for strings with units', () => {
      expect(isValidNumber('100亿元')).toBe(true)
      expect(isValidNumber('50万元')).toBe(true)
      expect(isValidNumber('1,000')).toBe(true)
    })

    it('should return false for invalid strings', () => {
      expect(isValidNumber('invalid')).toBe(false)
      expect(isValidNumber('')).toBe(false)
      expect(isValidNumber('abc')).toBe(false)
    })

    it('should return false for non-finite numbers', () => {
      expect(isValidNumber(Infinity)).toBe(false)
      expect(isValidNumber(-Infinity)).toBe(false)
      expect(isValidNumber(NaN)).toBe(false)
    })

    it('should return false for null and undefined', () => {
      expect(isValidNumber(null)).toBe(false)
      expect(isValidNumber(undefined)).toBe(false)
    })

    it('should return false for objects and arrays', () => {
      expect(isValidNumber({})).toBe(false)
      expect(isValidNumber([])).toBe(false)
    })
  })

  describe('validateStockCode', () => {
    it('should return error for empty code', () => {
      expect(validateStockCode('', 'HK')).toEqual({ isValid: false, message: '请输入股票代码' })
    })

    it('should validate HK stock code correctly', () => {
      expect(validateStockCode('00700', 'HK').isValid).toBe(true)
      expect(validateStockCode('09988', 'HK').isValid).toBe(true)
      expect(validateStockCode('12345', 'HK').isValid).toBe(true)
      expect(validateStockCode('1234', 'HK')).toEqual({ isValid: false, message: '港股代码应为5位数字，如: 00700' })
      expect(validateStockCode('123456', 'HK')).toEqual({ isValid: false, message: '港股代码应为5位数字，如: 00700' })
      expect(validateStockCode('abcde', 'HK')).toEqual({ isValid: false, message: '港股代码应为5位数字，如: 00700' })
    })

    it('should validate Shanghai A-share code correctly', () => {
      expect(validateStockCode('600519', 'A').isValid).toBe(true)
      expect(validateStockCode('600000', 'A').isValid).toBe(true)
      expect(validateStockCode('688888', 'A').isValid).toBe(true)
    })

    it('should validate Shenzhen A-share code correctly', () => {
      expect(validateStockCode('000001', 'A').isValid).toBe(true)
      expect(validateStockCode('300750', 'A').isValid).toBe(true)
      expect(validateStockCode('001896', 'A').isValid).toBe(true)
    })

    it('should reject invalid A-share code', () => {
      expect(validateStockCode('500519', 'A')).toEqual({ 
        isValid: false, 
        message: 'A股代码应以6（上海）、0或3（深圳）开头，如: 600519、000001、300750' 
      })
      expect(validateStockCode('123456', 'A')).toEqual({ 
        isValid: false, 
        message: 'A股代码应以6（上海）、0或3（深圳）开头，如: 600519、000001、300750' 
      })
      expect(validateStockCode('12345', 'A')).toEqual({ isValid: false, message: 'A股代码应为6位数字' })
    })

    it('should trim whitespace from code', () => {
      expect(validateStockCode('  00700  ', 'HK').isValid).toBe(true)
      expect(validateStockCode('  600519  ', 'A').isValid).toBe(true)
    })
  })
})
