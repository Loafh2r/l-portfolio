// 这个没写呢，只复制了，需要修改一下，标准回撤可以有，峰值和当前收益率也可以有
// 需要加盈利最大回撤，现在的好像是目前回撤算的不太对
// 其他的好像不太需要可以去掉？

import type {
  KLinePoint,
  Transaction,
  PortfolioResult,
  DrawdownStats,
  ProfitDrawdownStats,
} from '@/types'

/**
 * 计算投资产品的各种数据
 *
 * @param klineData  - 按日期升序排列的 K 线数据
 * @param transactions - 该产品的所有买入记录
 * @returns portfolioResult
 */
export function calculatePortfolioResult(
  klineData: KLinePoint[],
  transactions: Transaction[],
): PortfolioResult | null {
  // 至少要有一条买入记录和 K 线数据
  if (!klineData.length || !transactions.length) return null

  const portfolioResult: PortfolioResult = {
    costBasis: null,
    totalCost: null,
    currentValue: null,
    maxValue: null,
    maxValueDate: null,
    minValue: null,
    minValueDate: null,
    currentProfitRate: null,

    maxDrawdown: null,
    maxDrawdownStart: null,
    maxDrawdownEnd: null,
    maxProfitDrawdown: null,

    buildMaxProfit: null,
    profitDrawdownStart: null,
    profitDrawdownEnd: null,
    currentProfitDrawdown: null,
  }

  // 1. 计算加权平均成本、总份额、总投入
  let totalCost = 0
  let totalShares = 0
  for (const t of transactions) {
    totalCost += t.price * t.quantity
    totalShares += t.quantity
  }
  const costBasis = totalCost / totalShares // 加权平均成本价

  // 2. 构建每日持仓市值序列（从第一笔买入日开始）
  //    先将买入记录按日期排序，方便后续判断
  //    并记录最后一天买入，即建仓时间的，从彻底建仓后计算盈利回撤
  //    因此如果建仓时间过短，也无法计算盈利回撤
  const sortedTx = [...transactions].sort((a, b) =>
    a.date.localeCompare(b.date),
  )
  const finalBuyDate = sortedTx[sortedTx.length - 1].date

  // 3. 计算K线最高值和最低值，和建仓后的最高值和最低值
  //    以及各个指标，最大回撤，最大盈利回撤，当前盈利情况

  // 计算K线中的最高值和最低值以及最大回撤
  const kLineDrawdown = calculateDrawdown(klineData)

  // 记录一下当前的数据返回结果
  portfolioResult.costBasis = costBasis
  portfolioResult.totalCost = totalCost
  portfolioResult.currentValue = klineData[klineData.length - 1].close
  portfolioResult.maxValue = kLineDrawdown.globalPeak
  portfolioResult.maxValueDate = kLineDrawdown.globalPeakDate
  portfolioResult.minValue = kLineDrawdown.globalTrough
  portfolioResult.minValueDate = kLineDrawdown.globalTroughDate
  portfolioResult.currentProfitRate =
    portfolioResult.currentValue / portfolioResult.costBasis

  portfolioResult.maxDrawdown = kLineDrawdown.maxDrawdown
  portfolioResult.maxDrawdownStart = kLineDrawdown.maxDrawdownStart
  portfolioResult.maxDrawdownEnd = kLineDrawdown.maxDrawdownEnd

  // 建仓后的K线数据（从最后一笔买入日开始）
  const builtKline = klineData.filter((k) => k.date >= finalBuyDate)

  // 如果没有刚建仓，没有盈利回撤数据
  if (builtKline.length == 0) {
    return portfolioResult
  }

  const builtPortfolioResult = calculateProfitDrawdown(builtKline, costBasis)
  Object.assign(portfolioResult, builtPortfolioResult)

  return portfolioResult
}

/**
 * 计算单只股票的全局极值和最大回撤（基于日K线价格）
 *
 * @param klineData - 按日期升序排列的 K 线数组（至少包含 high 和 low 字段）
 * @returns 统计结果，若数组为空则返回 null
 */
export function calculateDrawdown(klineData: KLinePoint[]): DrawdownStats {
  // --- 初始化所有需要记录的变量 ---
  // 全局极值（整个时间范围）
  let globalPeakPrice = klineData[0].high
  let globalPeakDate = klineData[0].date
  let globalTroughPrice = klineData[0].low
  let globalTroughDate = klineData[0].date

  // 最大回撤相关（必须按时间顺序：峰值在前，谷底在后）
  let maxDrawdown = 0
  let maxDrawdownStart = ''
  let maxDrawdownEnd = ''

  // 当前峰值（用于追踪回撤的动态最高点）
  let currentPeakPrice = klineData[0].high
  let currentPeakDate = klineData[0].date

  // --- 从第二天开始遍历 ---
  for (let i = 1; i < klineData.length; i++) {
    const k = klineData[i]

    // 1. 更新全局最高价（峰值）
    if (k.high > globalPeakPrice) {
      globalPeakPrice = k.high
      globalPeakDate = k.date
    }

    // 2. 更新全局最低价（谷底）
    if (k.low < globalTroughPrice) {
      globalTroughPrice = k.low
      globalTroughDate = k.date
    }

    // 3. 更新“当前峰值”（用于回撤计算，只有创新高才更新）
    if (k.high > currentPeakPrice) {
      currentPeakPrice = k.high
      currentPeakDate = k.date
    }

    // 4. 计算从“当前峰值”到“今天最低价”的回撤
    const drawdown = (currentPeakPrice - k.low) / currentPeakPrice

    // 5. 如果回撤创新高，记录最大回撤及其起止日期
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown
      maxDrawdownStart = currentPeakDate // 峰值日
      maxDrawdownEnd = k.date // 谷底日
    }
  }

  // 返回结果
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
 * 计算建仓后的盈利回撤（Profit Drawdown）
 *
 * 核心逻辑：追踪建仓后「峰值收益率（peak_profit_rate）」和「当前收益率（current_profit_rate）」，
 * 计算盈利回撤 = (peak - current) / peak。
 *
 * 若从未盈利（peak_profit_rate ≤ 0），所有回撤字段返回 null。
 *
 * @param klineData  - 建仓后的 K 线数据（按日期升序，从建仓日当天开始）
 * @param costBasis  - 加权平均成本价（总投入 / 总份额）
 * @returns 盈利回撤统计结果，若数据无效或从未盈利则回撤字段为 null
 */
export function calculateProfitDrawdown(
  klineData: KLinePoint[],
  costBasis: number,
): ProfitDrawdownStats | null {
  // 数据校验
  if (!klineData || klineData.length === 0 || !costBasis || costBasis <= 0) {
    return null
  }

  // --- 初始化变量 ---
  let peakProfitRate = -999 // 历史峰值收益率（如 0.5 = 50%）
  let peakProfitDate = klineData[0].date

  // 最大盈利回撤相关（初始为 null，只有盈利后才会有值）
  let maxProfitDrawdown: number | null = null
  let profitDrawdownStart: string | null = null
  let profitDrawdownEnd: string | null = null

  // 当前盈利回撤（最后会赋值为最后一根K线的回撤值）
  let currentProfitDrawdown: number | null = null

  // --- 遍历 K 线（从第一根开始） ---
  for (let i = 0; i < klineData.length; i++) {
    const k = klineData[i]

    // 1. 计算当前收益率
    const currentProfitRate = (k.close - costBasis) / costBasis

    // 2. 更新峰值收益率（只有创新高才更新）
    if (currentProfitRate > peakProfitRate) {
      peakProfitRate = currentProfitRate
      peakProfitDate = k.date
    }

    // 如果没有盈利一直跌也不显示盈利回撤
    if (peakProfitRate > 0) {
      // 3a. 计算当前盈利回撤
      const drawdown = (peakProfitRate - currentProfitRate) / peakProfitRate
      // 防止负数（极端情况：当前收益率超过峰值，比如分红、拆股导致）
      const clampedDrawdown = Math.max(0, drawdown)

      // 记录当前盈利回撤（最后一次循环结束就是最新的）
      currentProfitDrawdown = clampedDrawdown

      // 4b. 更新历史最大盈利回撤
      if (maxProfitDrawdown === null || clampedDrawdown > maxProfitDrawdown) {
        maxProfitDrawdown = clampedDrawdown
        profitDrawdownStart = peakProfitDate
        profitDrawdownEnd = k.date
      }
    }
  }

  return {
    buildMaxProfit: peakProfitRate,
    maxProfitDrawdown: maxProfitDrawdown,
    profitDrawdownStart: profitDrawdownStart,
    profitDrawdownEnd: profitDrawdownEnd,
    currentProfitDrawdown: currentProfitDrawdown,
  }
}
