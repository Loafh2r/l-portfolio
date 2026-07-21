import type {
  KLinePoint,
  Transaction,
  PortfolioResult,
  DrawdownStats,
  ProfitDrawdownStats,
} from '@/types'

/**
 * 计算投资产品的各种指标
 */
export function calculatePortfolioResult(
  klineData: KLinePoint[],
  transactions: Transaction[],
): PortfolioResult | null {
  if (!klineData.length || !transactions.length) return null

  const result: PortfolioResult = {
    costBasis: null,
    totalCost: null,
    totalShares: null,
    currentPrice: null,
    currentValue: null,
    maxValue: null,
    maxValueDate: null,
    minValue: null,
    minValueDate: null,
    currentProfitRate: null,
    maxDrawdown: null,
    maxDrawdownStart: null,
    maxDrawdownEnd: null,
    buildMaxProfit: null,
    maxProfitDrawdown: null,
    profitDrawdownStart: null,
    profitDrawdownEnd: null,
    currentProfitDrawdown: null,
  }

  // 1. 加权平均成本、总份额、总投入
  let totalCost = 0
  let totalShares = 0
  for (const t of transactions) {
    totalCost += t.price * t.quantity
    totalShares += t.quantity
  }
  const costBasis = totalCost / totalShares

  // 2. 当前价格 & 市值
  const currentPrice = klineData[klineData.length - 1].close
  const currentValue = currentPrice * totalShares

  // 3. 当前收益率 = (当前价 - 成本) / 成本
  const currentProfitRate = (currentPrice - costBasis) / costBasis

  // 4. 标准最大回撤（全局 K 线）
  const drawdown = calculateDrawdown(klineData)

  result.costBasis = costBasis
  result.totalCost = totalCost
  result.totalShares = totalShares
  result.currentPrice = currentPrice
  result.currentValue = currentValue
  result.currentProfitRate = currentProfitRate
  result.maxDrawdown = drawdown.maxDrawdown
  result.maxDrawdownStart = drawdown.maxDrawdownStart
  result.maxDrawdownEnd = drawdown.maxDrawdownEnd

  // 5. 建仓后数据（最高/最低/盈利回撤 都只算建仓后）
  const sortedTx = [...transactions].sort((a, b) => a.date.localeCompare(b.date))
  const finalBuyDate = sortedTx[sortedTx.length - 1].date
  const builtKline = klineData.filter((k) => k.date >= finalBuyDate)

  if (builtKline.length === 0) return result

  // 建仓后最高/最低
  const builtDrawdown = calculateDrawdown(builtKline)
  result.maxValue = builtDrawdown.globalPeak
  result.maxValueDate = builtDrawdown.globalPeakDate
  result.minValue = builtDrawdown.globalTrough
  result.minValueDate = builtDrawdown.globalTroughDate

  // 建仓后盈利回撤
  const profitDd = calculateProfitDrawdown(builtKline, costBasis)
  if (profitDd) {
    Object.assign(result, profitDd)
  }

  return result
}

/**
 * 标准最大回撤（基于 K 线价格）
 */
export function calculateDrawdown(klineData: KLinePoint[]): DrawdownStats {
  let globalPeakPrice = klineData[0].high
  let globalPeakDate = klineData[0].date
  let globalTroughPrice = klineData[0].low
  let globalTroughDate = klineData[0].date

  let maxDrawdown = 0
  let maxDrawdownStart = ''
  let maxDrawdownEnd = ''
  let currentPeakPrice = klineData[0].high
  let currentPeakDate = klineData[0].date

  for (let i = 1; i < klineData.length; i++) {
    const k = klineData[i]

    if (k.high > globalPeakPrice) {
      globalPeakPrice = k.high
      globalPeakDate = k.date
    }
    if (k.low < globalTroughPrice) {
      globalTroughPrice = k.low
      globalTroughDate = k.date
    }
    if (k.high > currentPeakPrice) {
      currentPeakPrice = k.high
      currentPeakDate = k.date
    }

    const dd = (currentPeakPrice - k.low) / currentPeakPrice
    if (dd > maxDrawdown) {
      maxDrawdown = dd
      maxDrawdownStart = currentPeakDate
      maxDrawdownEnd = k.date
    }
  }

  return {
    globalPeak: globalPeakPrice,
    globalPeakDate,
    globalTrough: globalTroughPrice,
    globalTroughDate,
    maxDrawdown,
    maxDrawdownStart,
    maxDrawdownEnd,
  }
}

/**
 * 盈利回撤计算
 * peak_profit_rate = (peak - cost) / cost
 * current_profit_rate = (close - cost) / cost
 * drawdown = (peak_profit_rate - current_profit_rate) / peak_profit_rate
 */
export function calculateProfitDrawdown(
  klineData: KLinePoint[],
  costBasis: number,
): ProfitDrawdownStats | null {
  if (!klineData?.length || !costBasis || costBasis <= 0) return null

  let peakProfitRate = -Infinity
  let peakProfitDate = klineData[0].date
  let maxProfitDrawdown: number | null = null
  let profitDrawdownStart: string | null = null
  let profitDrawdownEnd: string | null = null
  let currentProfitDrawdown: number | null = null

  for (let i = 0; i < klineData.length; i++) {
    const currentProfitRate = (klineData[i].close - costBasis) / costBasis

    if (currentProfitRate > peakProfitRate) {
      peakProfitRate = currentProfitRate
      peakProfitDate = klineData[i].date
    }

    if (peakProfitRate > 0) {
      const dd = Math.max(0, (peakProfitRate - currentProfitRate) / peakProfitRate)
      currentProfitDrawdown = dd

      if (maxProfitDrawdown === null || dd > maxProfitDrawdown) {
        maxProfitDrawdown = dd
        profitDrawdownStart = peakProfitDate
        profitDrawdownEnd = klineData[i].date
      }
    }
  }

  return {
    buildMaxProfit: peakProfitRate === -Infinity ? null : peakProfitRate,
    maxProfitDrawdown,
    profitDrawdownStart,
    profitDrawdownEnd,
    currentProfitDrawdown,
  }
}
