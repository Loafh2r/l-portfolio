// 投资产品
export interface Investment {
  id: string
  code: string
  name: string
  type: 'stock' | 'etf' | 'fund'
  market: number // 0=深圳, 1=上海
  createdAt: string
}

// 买入记录
export interface Transaction {
  id: string
  investmentId: string
  price: number
  quantity: number
  date: string // YYYY-MM-DD
}

// K 线数据点
export interface KLinePoint {
  date: string
  open: number
  close: number
  high: number
  low: number
  volume: number
}

// 投资结果
export interface PortfolioResult {
  // 基础数据
  costBasis: number | null          // 加权平均成本
  totalCost: number | null          // 总投入金额
  totalShares: number | null        // 总份额
  currentPrice: number | null       // 当前价格（最新收盘价）
  currentValue: number | null       // 当前市值 = currentPrice × totalShares
  maxValue: number | null           // 建仓后最高价
  maxValueDate: string | null       // 最高价日期
  minValue: number | null           // 建仓后最低价
  minValueDate: string | null       // 最低价日期
  currentProfitRate: number | null  // 当前收益率 = (currentPrice - costBasis) / costBasis

  // 最大回撤数据（基于 K 线价格）
  maxDrawdown: number | null
  maxDrawdownStart: string | null
  maxDrawdownEnd: string | null

  // 建仓后盈利回撤数据
  buildMaxProfit: number | null         // 建仓后最大盈利率，负数表示从未盈利
  maxProfitDrawdown: number | null      // 最大盈利回撤百分比
  profitDrawdownStart: string | null    // 回撤开始日期 (峰值日)
  profitDrawdownEnd: string | null      // 回撤结束日期 (谷底日)
  currentProfitDrawdown: number | null  // 当前盈利回撤
}

// 回撤统计结果（基于价格序列）
export interface DrawdownStats {
  globalPeak: number
  globalPeakDate: string
  globalTrough: number
  globalTroughDate: string
  maxDrawdown: number
  maxDrawdownStart: string
  maxDrawdownEnd: string
}

// 盈利回撤统计结果
export interface ProfitDrawdownStats {
  buildMaxProfit: number | null
  maxProfitDrawdown: number | null
  profitDrawdownStart: string | null
  profitDrawdownEnd: string | null
  currentProfitDrawdown: number | null
}

/** 导出数据结构 */
export interface ExportData {
  version: number
  exportedAt: string
  investments: Investment[]
  transactions: Transaction[]
}
