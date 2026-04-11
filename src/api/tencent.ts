import type { ApiTestResult, StockData, CurrencyType } from '@/types/stock'
import type {
  FinancialReportData,
  FinancialReportError,
  ReportType,
} from '@/types/financialReport'
import { validateApiResponse } from '@/utils/validateApiResponse'
import { financialReportDataSchema } from '@/validation/apiSchemas'
import { fetchExchangeRates } from './exchangeRate'
import { logger } from '@/utils/logger'

const TENCENT_BASE_URL = 'https://proxy.finance.qq.com/ifzqgtimg/stock'

// 腾讯 API 返回的数据类型
interface TencentCashFlowRaw {
  reportDate: string
  fiscalYear: string
  reportType: string
  profitBeforeTax: number | null  // 除税前利润
  operatingCashFlow: number | null  // 经营活动产生的现金流量净额
  investingCashFlow: number | null  // 投资活动产生的现金流量净额
  financingCashFlow: number | null  // 筹资活动产生的现金流量净额
  netCashIncrease: number | null  // 现金及现金等价物净增加额
  cashEndBalance: number | null  // 期末现金及现金等价物余额
}

interface TencentApiResponse {
  code: number
  msg: string
  data?: {
    data: unknown[][][]
    rttype?: string[]
  }
}

// 解析中文数字和单位
function parseTencentValue(value: string | number | null): number {
  if (value === null || value === undefined || value === '--') {
    return 0
  }
  if (typeof value === 'number') {
    return value
  }
  
  // 去除逗号
  const cleaned = value.replace(/,/g, '')
  
  // 单位转换
  let multiplier = 1
  if (cleaned.endsWith('亿')) {
    multiplier = 100000000
  } else if (cleaned.endsWith('万')) {
    multiplier = 10000
  }
  
  const num = parseFloat(cleaned.replace(/[亿万元]/g, ''))
  return isNaN(num) ? 0 : num * multiplier
}

// 从原始数据中提取报表年份
function extractReportYear(data: unknown[]): { year: number; reportDate: string } | null {
  try {
    // 第一行是报表日期信息
    const firstRow = data[0]
    if (!firstRow || !Array.isArray(firstRow)) return null
    
    const dateInfo = firstRow[1]
    if (!dateInfo || !Array.isArray(dateInfo)) return null
    
    const reportDate = dateInfo[0] as string
    if (!reportDate) return null
    
    // 格式: 20250630
    const year = parseInt(reportDate.substring(0, 4))
    
    return { year, reportDate }
  } catch {
    return null
  }
}

// 在原始数据中查找指定行的值
function findRowValue(data: unknown[], keyword: string): { value: number | null; yoy: string | null } {
  for (const row of data) {
    if (!Array.isArray(row) || row.length < 2) continue
    
    const labelCell = row[0]
    if (!Array.isArray(labelCell) || labelCell.length < 1) continue
    
    const label = labelCell[0] as string
    if (!label || !label.includes(keyword)) continue
    
    // 找到匹配行，解析值
    const valueCell = row[1]
    if (!Array.isArray(valueCell)) continue
    
    const valueStr = valueCell[0] as string
    const yoy = valueCell.length >= 3 ? valueCell[2] as string : null
    
    return { value: parseTencentValue(valueStr), yoy }
  }
  
  return { value: null, yoy: null }
}

// 获取港股现金流量表数据
async function fetchHKCashFlow(code: string): Promise<TencentCashFlowRaw[]> {
  const url = `${TENCENT_BASE_URL}/corp/hkcwbb/detail?num=4&_appName=android&type=xjll&rttype=1&symbol=hk${code.padStart(5, '0')}`
  
  const response = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    headers: {
      'Accept': '*/*',
      'Referer': 'https://gu.qq.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  
  const data: TencentApiResponse = await response.json()
  
  if (data.code !== 0 || !data.data?.data) {
    throw new Error(data.msg || 'API返回数据异常')
  }
  
  const yearsData = data.data.data as unknown[][]
  const results: TencentCashFlowRaw[] = []
  
  for (const yearData of yearsData) {
    if (!Array.isArray(yearData)) continue
    
    const reportInfo = extractReportYear(yearData)
    if (!reportInfo) continue
    
    // 查找各指标
    const profitBeforeTax = findRowValue(yearData, '除税前利润')
    const operatingCF = findRowValue(yearData, '经营活动产生的现金流量净额')
    const investingCF = findRowValue(yearData, '投资活动产生的现金流量净额')
    const financingCF = findRowValue(yearData, '筹资活动产生的现金流量净额')
    const netCashIncrease = findRowValue(yearData, '现金及现金等价物净增加额')
    const cashEndBalance = findRowValue(yearData, '期末现金及现金等价物余额')
    
    results.push({
      reportDate: reportInfo.reportDate,
      fiscalYear: reportInfo.reportDate.substring(0, 4) + '-12-31',
      reportType: '1',  // 年度报表
      profitBeforeTax: profitBeforeTax.value,
      operatingCashFlow: operatingCF.value,
      investingCashFlow: investingCF.value,
      financingCashFlow: financingCF.value,
      netCashIncrease: netCashIncrease.value,
      cashEndBalance: cashEndBalance.value
    })
  }
  
  // 按年份排序（从新到旧）
  results.sort((a, b) => b.reportDate.localeCompare(a.reportDate))
  
  return results
}

export async function testTencentAPI(): Promise<ApiTestResult> {
  const url = `${TENCENT_BASE_URL}/corp/hkcwbb/detail?num=4&_appName=android&type=xjll&rttype=1&symbol=hk00001`
  const start = performance.now()
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': '*/*',
        'Referer': 'https://gu.qq.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    const latency = Math.round(performance.now() - start)
    
    if (response.ok) {
      const data = await response.json()
      if (data.code === 0 && data.data?.data) {
        return {
          source: '腾讯证券',
          status: 'success',
          message: `连接正常，返回 ${data.data.data.length} 年数据`,
          latency
        }
      } else {
        return {
          source: '腾讯证券',
          status: 'error',
          message: data.msg || '数据结构异常',
          latency
        }
      }
    } else {
      return {
        source: '腾讯证券',
        status: 'error',
        message: `HTTP ${response.status}`,
        latency
      }
    }
  } catch (error) {
    return {
      source: '腾讯证券',
      status: 'error',
      message: error instanceof Error ? error.message : '网络错误',
      latency: Math.round(performance.now() - start)
    }
  }
}

export async function fetchTencentHKFinancialReport(
  code: string
): Promise<{ data: FinancialReportData | null; error: FinancialReportError | null }> {
  try {
    const cashFlowData = await fetchHKCashFlow(code)
    
    if (cashFlowData.length === 0) {
      return {
        data: null,
        error: {
          code: 'NO_DATA',
          message: '无法获取财务报表数据'
        }
      }
    }
    
    const { rates } = await fetchExchangeRates()
    
    logger.debug('tencent', '========== 腾讯港股财务数据获取开始 ==========')
    logger.debug('tencent', `股票代码: ${code}`)
    logger.debug('tencent', `汇率 CNY/HKD: CNY=${rates['CNY']}, USD=${rates['USD']}, HKD=${rates['HKD']}`)
    
    // 转换为应用所需格式（单位：亿元）
    const years: number[] = []
    const netProfits: number[] = []  // 净利润（这里用除税前利润近似）
    const cashAndEquivalents: number[] = []  // 现金及等价物
    const shortTermDebt: number[] = []
    const longTermDebt: number[] = []
    const operatingCashFlow: number[] = []
    const capitalExpenditure: number[] = []
    const reportTypesArr: ReportType[] = []
    const isProjected: boolean[] = []
    const netProfitProjected: boolean[] = []
    const freeCashFlowProjected: boolean[] = []
    const netCashProjected: boolean[] = []
    const currentRatio: (number | null)[] = []
    const currentRatioProjected: boolean[] = []
    
    // 港股年报是已发布的，不是预测
    const isProjectedData = false
    
    for (const item of cashFlowData) {
      const year = parseInt(item.reportDate.substring(0, 4))
      
      // 腾讯返回的是"除税前利润"，我们用这个近似净利润
      // 运营现金流直接从API获取
      const operatingCF = item.operatingCashFlow || 0
      // 投资现金流近似资本开支（取负值）
      const capEx = item.investingCashFlow || 0
      const freeCashFlow = operatingCF - Math.abs(capEx)
      
      // 现金及现金等价物期末余额
      const cash = item.cashEndBalance || 0
      
      // 港股没有短期/长期负债的详细数据，设为0
      const shortDebt = 0
      const longDebt = 0
      
      years.push(year)
      netProfits.push(Math.round((item.profitBeforeTax || 0) * 100) / 100)
      cashAndEquivalents.push(Math.round(cash * 100) / 100)
      shortTermDebt.push(shortDebt)
      longTermDebt.push(longDebt)
      operatingCashFlow.push(Math.round(operatingCF * 100) / 100)
      capitalExpenditure.push(Math.round(capEx * 100) / 100)
      reportTypesArr.push('annual')
      isProjected.push(isProjectedData)
      netProfitProjected.push(isProjectedData)
      freeCashFlowProjected.push(isProjectedData)
      netCashProjected.push(isProjectedData)
      currentRatio.push(null)
      currentRatioProjected.push(false)
      
      logger.debug('tencent', `年份: ${year}, 除税前利润: ${item.profitBeforeTax}, 运营现金流: ${operatingCF}, 资本开支: ${capEx}`)
    }
    
    logger.debug('tencent', '========== 腾讯港股财务数据获取结束 ==========')
    
    return {
      data: validateApiResponse({
        years,
        netProfits,
        cashAndEquivalents,
        shortTermDebt,
        longTermDebt,
        operatingCashFlow,
        capitalExpenditure,
        currentRatio,
        currentRatioProjected,
        peRatio: netProfits.map(() => null),
        peRatioProjected: netProfits.map(() => false),
        currencyType: 'HKD' as CurrencyType,
        baseCurrency: 'HKD',
        source: 'api',
        reportTypes: reportTypesArr,
        isProjected,
        netProfitProjected,
        freeCashFlowProjected,
        netCashProjected,
      }, financialReportDataSchema),
      error: null
    }
  } catch (err) {
    return {
      data: null,
      error: {
        code: 'NETWORK_ERROR',
        message: '网络请求失败',
        details: err instanceof Error ? err.message : String(err)
      }
    }
  }
}
