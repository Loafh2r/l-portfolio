// 投资产品
export interface Investment {
  id: string // UUID
  code: string // 产品代码 (如 "510300", "000001")
  name: string // 产品名称
  type: 'stock' | 'etf' | 'fund' // 产品类型
  market: number // 市场代码: 0=深圳, 1=上海 (股票/ETF用)
  createdAt: string // ISO date
}

// 买入记录
export interface Transaction {
  id: string // UUID
  investmentId: string // 关联投资产品
  price: number // 买入单价
  quantity: number // 买入份额
  date: string // 买入日期 ISO
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
  costBasis: number | null // 加权平均成本
  totalCost: number | null // 总投入
  currentValue: number | null // 当前市值
  maxValue: number | null // 最高市值
  maxValueDate: string | null // 最高市值日期
  minValue: number | null // 最低市值
  minValueDate: string | null // 最低市值日期
  currentProfitRate: number | null // 当前收益率

  // 最大回撤数据
  maxDrawdown: number | null // 标准最大回撤百分比
  maxDrawdownStart: string | null // 回撤开始日期
  maxDrawdownEnd: string | null // 回撤结束日期

  // 建仓后盈利回撤数据
  buildMaxProfit: number | null // 建仓后最大盈利率
  maxProfitDrawdown: number | null // 最大盈利回撤百分比
  profitDrawdownStart: string | null // 回撤开始日期 (峰值日)
  profitDrawdownEnd: string | null // 回撤结束日期 (谷底日)
  currentProfitDrawdown: number | null // 当前和最大盈利相比回撤多少
}

// 回撤统计结果（基于价格序列）
export interface DrawdownStats {
  globalPeak: number // 全局最高价
  globalPeakDate: string // 全局最高价日期
  globalTrough: number // 全局最低价
  globalTroughDate: string // 全局最低价日期
  maxDrawdown: number // 最大回撤百分比（0~1）
  maxDrawdownStart: string // 最大回撤起点日期（峰值日）
  maxDrawdownEnd: string // 最大回撤终点日期（谷底日）
}

/**
 * 盈利回撤统计结果（基于建仓后K线 + 成本价）
 */
export interface ProfitDrawdownStats {
  buildMaxProfit: number | null // 建仓后最大盈利率（如 1.5 表示 150%），从未盈利则为 负数、0 或 null
  maxProfitDrawdown: number | null // 历史最大盈利回撤百分比（0~1），从未盈利则为 null
  profitDrawdownStart: string | null // 历史最大回撤开始日期（峰值收益率日期），从未盈利则为 null
  profitDrawdownEnd: string | null // 历史最大回撤结束日期（谷底日期），从未盈利则为 null
  currentProfitDrawdown: number | null // 当前盈利回撤（当前收益率相对峰值收益率的回吐），从未盈利则为 null
}
