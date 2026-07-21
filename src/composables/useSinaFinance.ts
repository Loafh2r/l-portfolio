import type { KLinePoint } from '@/types'

/**
 * 将新浪的 symbol 格式转换成接口所需的格式
 * @param code 用户输入的代码，如 '600519'、'000001'、'510300'
 * @param market 市场：0=深圳, 1=上海
 * @returns 新浪格式的 symbol，如 'sh600519'
 */
function toSinaSymbol(code: string, market: number): string {
  const prefix = market === 1 ? 'sh' : 'sz'
  return `${prefix}${code}`
}

/**
 * 获取股票/ETF 日 K 线（新浪数据源）
 * @param code - 纯数字代码，如 '510300'
 * @param market - 0=深圳, 1=上海
 * @param dataLen - 获取条数，默认 1000
 */
export async function fetchSinaKLine(
  code: string,
  market: number,
  dataLen: number = 1000,
): Promise<KLinePoint[]> {
  const symbol = toSinaSymbol(code, market)

  // 开发环境用代理，生产环境需要处理跨域（新浪不支持 CORS）
  // 暂时先用代理方式，生产部署时需配置 vercel.json 代理
  const url = `/sina/quotes_service/api/json_v2.php/CN_MarketData.getKLineData`

  const params = new URLSearchParams({
    symbol,
    scale: '240', // 日线
    ma: 'no',
    datalen: dataLen.toString(),
  })

  const fullUrl = `${url}?${params.toString()}`

  const response = await fetch(fullUrl)
  // 新浪返回的 JSON 有时带 BOM 头或异常字符，需清理
  const text = await response.text()
  const cleaned = text.replace(/^\(|\)$/g, '') // 去掉可能的括号
  const rawData = JSON.parse(cleaned)

  if (!Array.isArray(rawData)) {
    console.error('新浪K线数据格式异常:', rawData)
    return []
  }

  return rawData.map(
    (item: any): KLinePoint => ({
      date: item.day,
      open: parseFloat(item.open),
      close: parseFloat(item.close),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      volume: parseFloat(item.volume),
    }),
  )
}
