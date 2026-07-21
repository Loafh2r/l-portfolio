/** 格式化为金额 */
export function fmtMoney(v: number | null | undefined): string {
  if (v == null) return '--'
  return `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** 格式化为百分比收益率 */
export function fmtPct(v: number | null | undefined): string {
  if (v == null) return '--'
  const pct = (v * 100).toFixed(2)
  return `${v >= 0 ? '+' : ''}${pct}%`
}

/** 格式化为价格 */
export function fmtPrice(v: number | null | undefined): string {
  if (v == null) return '--'
  return v.toFixed(4)
}

/** 格式化回撤百分比（始终显示负号） */
export function fmtDrawdown(v: number | null | undefined): string {
  if (v == null) return '--'
  return `-${(v * 100).toFixed(2)}%`
}

/** 收益率颜色 class */
export function profitClass(v: number | null | undefined): string {
  if (v == null) return 'text-neutral'
  return v > 0 ? 'text-profit' : v < 0 ? 'text-loss' : 'text-neutral'
}

/** 产品类型标签 */
export function typeLabel(type: string): string {
  const map: Record<string, string> = { stock: '股票', etf: 'ETF', fund: '基金' }
  return map[type] || type
}

/** 市场标签 */
export function marketLabel(market: number): string {
  return market === 1 ? '上海' : '深圳'
}

/** 格式化日期 */
export function fmtDate(v: string | null | undefined): string {
  return v || '--'
}
